import { prisma } from '../config/db.js';
import { EmailStatus } from '@prisma/client';
import { config } from '../config/env.js';
import { enqueueEmailJob } from '../queues/email.queue.js';

export interface ScheduleEmailPayload {
  userId: string;
  subject: string;
  body: string;
  scheduledAt: Date;
  recipientEmails: string[];
  delaySeconds?: number;
  maxPerHour?: number;
  senderEmail?: string;
}

export class EmailService {
  /**
   * Persists scheduled emails in MySQL and computes individual staggered scheduled timestamps.
   * Immediately enqueues each record as a delayed BullMQ job.
   */
  async createScheduledEmails(payload: ScheduleEmailPayload) {
    const {
      userId,
      subject,
      body,
      scheduledAt,
      recipientEmails,
      delaySeconds = Math.floor(config.worker.emailDelayMs / 1000),
      senderEmail,
    } = payload;

    // Get user details to obtain default sender email
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const effectiveSenderEmail = senderEmail || user.email;

    // Find or create sender record
    const sender = await prisma.sender.upsert({
      where: {
        userId_email: {
          userId,
          email: effectiveSenderEmail,
        },
      },
      update: {},
      create: {
        userId,
        email: effectiveSenderEmail,
      },
    });

    const baseTime = new Date(scheduledAt).getTime();
    const delayMs = delaySeconds * 1000;

    // Build email records with staggered scheduling times
    const records = recipientEmails.map((recipientEmail, index) => {
      // Stagger each recipient by the configured delay
      const individualScheduledAt = new Date(baseTime + index * delayMs);
      return {
        userId,
        senderId: sender.id,
        recipientEmail,
        subject,
        body,
        scheduledAt: individualScheduledAt,
        status: EmailStatus.SCHEDULED,
      };
    });

    // Execute transaction to insert records and set deterministic job IDs
    const createdEmails = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const rec of records) {
        const email = await tx.email.create({
          data: rec,
        });
        // Deterministic jobId ensures idempotency across restarts
        const updated = await tx.email.update({
          where: { id: email.id },
          data: { jobId: `job_${email.id}` },
        });
        results.push(updated);
      }
      return results;
    });

    // Enqueue delayed jobs into BullMQ
    for (const email of createdEmails) {
      try {
        await enqueueEmailJob({
          id: email.id,
          userId: email.userId,
          recipientEmail: email.recipientEmail,
          subject: email.subject,
          body: email.body,
          scheduledAt: email.scheduledAt,
          senderEmail: effectiveSenderEmail,
          jobId: email.jobId,
        });
      } catch (queueErr) {
        console.warn(`Could not enqueue email ${email.id} to BullMQ immediately:`, queueErr);
      }
    }

    return {
      count: createdEmails.length,
      emails: createdEmails,
      sender: sender.email,
    };
  }

  /**
   * Retrieves scheduled & in-processing emails for the user.
   */
  async getScheduledEmails(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    try {
      const [total, emails] = await Promise.all([
        prisma.email.count({
          where: {
            userId,
            status: { in: [EmailStatus.SCHEDULED, EmailStatus.PROCESSING] },
          },
        }),
        prisma.email.findMany({
          where: {
            userId,
            status: { in: [EmailStatus.SCHEDULED, EmailStatus.PROCESSING] },
          },
          orderBy: { scheduledAt: 'asc' },
          skip,
          take: limit,
          include: {
            sender: { select: { email: true } },
          },
        }),
      ]);

      return {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        emails,
      };
    } catch (err) {
      console.warn('MySQL unavailable for scheduled emails fetch, returning empty list');
      return { total: 0, page, limit, totalPages: 0, emails: [] };
    }
  }

  async getSentEmails(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    try {
      const [total, emails] = await Promise.all([
        prisma.email.count({
          where: {
            userId,
            status: { in: [EmailStatus.SENT, EmailStatus.FAILED] },
          },
        }),
        prisma.email.findMany({
          where: {
            userId,
            status: { in: [EmailStatus.SENT, EmailStatus.FAILED] },
          },
          orderBy: { updatedAt: 'desc' },
          skip,
          take: limit,
          include: {
            sender: { select: { email: true } },
          },
        }),
      ]);

      return {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        emails,
      };
    } catch (err) {
      console.warn('MySQL unavailable for sent emails fetch, returning empty list');
      return { total: 0, page, limit, totalPages: 0, emails: [] };
    }
  }

  /**
   * Retrieves single email by ID.
   */
  async getEmailById(userId: string, emailId: string) {
    return prisma.email.findFirst({
      where: {
        id: emailId,
        userId,
      },
      include: {
        sender: true,
      },
    });
  }
}

export const emailService = new EmailService();
