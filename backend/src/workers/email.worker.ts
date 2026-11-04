import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis.js';
import { prisma } from '../config/db.js';
import { config } from '../config/env.js';
import { EMAIL_QUEUE_NAME, EmailJobData, emailQueue, syncPendingEmailsFromDatabase } from '../queues/email.queue.js';
import { smtpService } from '../services/smtp.service.js';
import { rateLimiterService } from '../services/rateLimiter.service.js';
import { slackService } from '../services/slack.service.js';
import { EmailStatus } from '@prisma/client';

export const createEmailWorker = () => {
  console.log(`⚙️ Initializing Email Worker with concurrency = ${config.worker.concurrency}`);

  const worker = new Worker<EmailJobData>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobData>, token?: string) => {
      const { emailId, userId, recipientEmail, subject, body, senderEmail } = job.data;

      // 1. Idempotency Check in MySQL
      const emailRecord = await prisma.email.findUnique({
        where: { id: emailId },
      });

      if (!emailRecord) {
        console.warn(`Job ${job.id} skipped: Email record ${emailId} does not exist in DB.`);
        return { skipped: true, reason: 'Record not found' };
      }

      if (emailRecord.status === EmailStatus.SENT) {
        console.log(`Job ${job.id} skipped: Email ${emailId} was already sent previously.`);
        return { skipped: true, reason: 'Already sent' };
      }

      // 2. Mark as PROCESSING in MySQL
      await prisma.email.update({
        where: { id: emailId },
        data: { status: EmailStatus.PROCESSING },
      });

      // 3. Hourly Rate Limit Check (Redis-backed, multi-worker safe)
      const rateLimit = await rateLimiterService.checkAndIncrementHourlyLimit(
        senderEmail,
        config.worker.maxEmailsPerHour
      );

      if (!rateLimit.allowed) {
        console.warn(
          `⏳ Rate limit reached for ${senderEmail} (${rateLimit.currentCount}/${config.worker.maxEmailsPerHour} emails/hr). Delaying job by ${(rateLimit.delayUntilNextHourMs / 1000 / 60).toFixed(1)} min.`
        );

        // Update scheduled time in DB to reflect the new window
        const nextRunTime = new Date(Date.now() + rateLimit.delayUntilNextHourMs);
        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: EmailStatus.SCHEDULED,
            scheduledAt: nextRunTime,
          },
        });

        // Trigger Slack Notification (deduplicated: max 1 notification per sender per hour window)
        const shouldAlert = await rateLimiterService.shouldSendSlackAlert(
          senderEmail,
          rateLimit.hourWindow
        );
        if (shouldAlert) {
          await slackService.notifyRateLimitReached({
            userId,
            senderEmail,
            limit: config.worker.maxEmailsPerHour,
            delayUntilNextHourMinutes: Math.round(rateLimit.delayUntilNextHourMs / 60000),
          });
        }

        // Reschedule job into BullMQ for the next hour window
        if (token) {
          await job.moveToDelayed(Date.now() + rateLimit.delayUntilNextHourMs, token);
        } else {
          await emailQueue.add('send-email', job.data, {
            delay: rateLimit.delayUntilNextHourMs,
            jobId: `${job.id}_resched_${Date.now()}`,
          });
        }

        return { delayed: true, nextRunTime };
      }

      // 4. Provider Throttling Delay (minimum delay between sends)
      if (config.worker.emailDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, config.worker.emailDelayMs));
      }

      // 5. Deliver Email via Ethereal SMTP
      try {
        const result = await smtpService.sendEmail({
          from: senderEmail,
          to: recipientEmail,
          subject,
          body,
        });

        // 6. Update Status to SENT in MySQL
        const updated = await prisma.email.update({
          where: { id: emailId },
          data: {
            status: EmailStatus.SENT,
            sentAt: new Date(),
          },
        });

        return {
          success: true,
          emailId: updated.id,
          messageId: result.messageId,
          previewUrl: result.previewUrl,
        };
      } catch (sendErr: any) {
        console.error(`❌ Delivery failed for email ${emailId} to ${recipientEmail}:`, sendErr.message);

        // Update Status to FAILED in MySQL
        await prisma.email.update({
          where: { id: emailId },
          data: { status: EmailStatus.FAILED },
        });

        throw sendErr; // Triggers BullMQ retry backoff
      }
    },
    {
      connection: redisConnection,
      concurrency: config.worker.concurrency,
    }
  );

  worker.on('completed', (job) => {
    console.log(`✅ BullMQ Job ${job.id} completed successfully.`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ BullMQ Job ${job?.id} failed:`, err.message);
  });

  return worker;
};

// If run directly via `npm run worker`
if (process.argv[1]?.includes('email.worker')) {
  const worker = createEmailWorker();
  // Sync pending jobs on worker boot
  syncPendingEmailsFromDatabase().then(() => {
    console.log('🚀 Standalone BullMQ Email Worker is running and listening for jobs...');
  });

  const shutdownWorker = async () => {
    console.log('Shutting down BullMQ worker...');
    await worker.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdownWorker);
  process.on('SIGTERM', shutdownWorker);
}

