import { Queue, JobsOptions } from 'bullmq';
import { redisConnection, checkRedisConnection } from '../config/redis.js';
import { prisma } from '../config/db.js';
import { EmailStatus } from '@prisma/client';

export interface EmailJobData {
  emailId: string;
  userId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  senderEmail: string;
  scheduledAt: string;
}

export const EMAIL_QUEUE_NAME = 'email-queue';

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      count: 2000,
    },
    removeOnFail: {
      count: 5000,
    },
  },
});

/**
 * Enqueues a delayed job in BullMQ.
 * Uses a stable, deterministic jobId (e.g. job_UUID) to guarantee idempotency.
 */
export const enqueueEmailJob = async (email: {
  id: string;
  userId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledAt: Date;
  senderEmail: string;
  jobId?: string | null;
}) => {
  // Check if Redis is online before attempting to enqueue
  const isRedisOnline = await checkRedisConnection();
  if (!isRedisOnline) {
    throw new Error('Redis is offline. Job will run in resilient local runner.');
  }

  const targetTime = new Date(email.scheduledAt).getTime();
  const now = Date.now();
  const delay = Math.max(0, targetTime - now);

  const stableJobId = email.jobId || `job_${email.id}`;

  const jobData: EmailJobData = {
    emailId: email.id,
    userId: email.userId,
    recipientEmail: email.recipientEmail,
    subject: email.subject,
    body: email.body,
    senderEmail: email.senderEmail,
    scheduledAt: email.scheduledAt.toISOString(),
  };

  const jobOptions: JobsOptions = {
    jobId: stableJobId,
    delay,
  };

  const job = await emailQueue.add('send-email', jobData, jobOptions);
  return job;
};

/**
 * Recovers any SCHEDULED emails from MySQL that are not currently in Redis BullMQ.
 * Guarantees zero lost jobs across server or worker restarts.
 */
export const syncPendingEmailsFromDatabase = async (): Promise<number> => {
  try {
    const pendingEmails = await prisma.email.findMany({
      where: {
        status: EmailStatus.SCHEDULED,
      },
      include: {
        sender: { select: { email: true } },
        user: { select: { email: true } },
      },
    });

    let syncedCount = 0;
    for (const email of pendingEmails) {
      const stableJobId = email.jobId || `job_${email.id}`;
      // Check if job is already in queue
      const existingJob = await emailQueue.getJob(stableJobId);
      if (!existingJob) {
        await enqueueEmailJob({
          id: email.id,
          userId: email.userId,
          recipientEmail: email.recipientEmail,
          subject: email.subject,
          body: email.body,
          scheduledAt: email.scheduledAt,
          senderEmail: email.sender?.email || email.user?.email || 'noreply@reachinbox.ai',
          jobId: stableJobId,
        });
        syncedCount++;
      }
    }

    if (syncedCount > 0) {
      console.log(`🔄 Restart Recovery: Restored ${syncedCount} pending delayed email jobs to BullMQ.`);
    }

    return syncedCount;
  } catch (error) {
    console.warn('Could not sync pending emails (Redis or DB might be offline during boot):', error);
    return 0;
  }
};

