import { prisma } from '../config/db.js';
import { EmailStatus } from '@prisma/client';
import { config } from '../config/env.js';
import { enqueueEmailJob } from '../queues/email.queue.js';
import { smtpService } from './smtp.service.js';

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

// In-memory email store for development when MySQL is offline or pending credentials
const inMemoryEmails: any[] = [];

export class EmailService {
  /**
   * Persists scheduled emails in MySQL (or in-memory fallback) and computes individual staggered scheduled timestamps.
   * Immediately enqueues each record as a delayed BullMQ job.
   */
  async createScheduledEmails(payload: ScheduleEmailPayload) {
    const {
      userId,
      subject,
      body,
      scheduledAt,
      recipientEmails,
      delaySeconds = Math.floor(config.worker.emailDelayMs / 1000) || 2,
      senderEmail,
    } = payload;

    let effectiveSenderEmail = senderEmail || 'user@reachinbox.ai';
    let senderId: string | null = null;
    let isDbAvailable = true;

    try {
      // 1. Try MySQL to get user and sender
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      if (user && !senderEmail) {
        effectiveSenderEmail = user.email;
      }

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
      senderId = sender.id;
    } catch {
      isDbAvailable = false;
      console.warn('MySQL unavailable, using in-memory store for email scheduling');
    }

    const baseTime = new Date(scheduledAt).getTime();
    const delayMs = delaySeconds * 1000;

    let createdEmails: any[] = [];

    if (isDbAvailable) {
      try {
        const records = recipientEmails.map((recipientEmail, index) => {
          const individualScheduledAt = new Date(baseTime + index * delayMs);
          return {
            userId,
            senderId,
            recipientEmail,
            subject,
            body,
            scheduledAt: individualScheduledAt,
            status: EmailStatus.SCHEDULED,
          };
        });

        createdEmails = await prisma.$transaction(async (tx) => {
          const results = [];
          for (const rec of records) {
            const email = await tx.email.create({ data: rec });
            const updated = await tx.email.update({
              where: { id: email.id },
              data: { jobId: `job_${email.id}` },
            });
            results.push(updated);
          }
          return results;
        });
      } catch {
        isDbAvailable = false;
      }
    }

    if (!isDbAvailable || createdEmails.length === 0) {
      // In-memory fallback
      createdEmails = recipientEmails.map((recipientEmail, index) => {
        const individualScheduledAt = new Date(baseTime + index * delayMs);
        const emailId = `eml_${Date.now()}_${index}`;
        const record = {
          id: emailId,
          userId,
          senderId: null,
          recipientEmail,
          subject,
          body,
          scheduledAt: individualScheduledAt,
          sentAt: null,
          status: 'SCHEDULED',
          jobId: `job_${emailId}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sender: { email: effectiveSenderEmail },
        };
        inMemoryEmails.push(record);
        return record;
      });
    }

    // Enqueue delayed jobs into BullMQ (with in-memory simulated worker fallback)
    for (const email of createdEmails) {
      try {
        await enqueueEmailJob({
          id: email.id,
          userId: email.userId,
          recipientEmail: email.recipientEmail,
          subject: email.subject,
          body: email.body,
          scheduledAt: new Date(email.scheduledAt),
          senderEmail: effectiveSenderEmail,
          jobId: email.jobId,
        });
      } catch {
        // If Redis is offline, simulate job execution in-memory at scheduled time
        const targetTime = new Date(email.scheduledAt).getTime();
        const timeoutMs = Math.max(0, targetTime - Date.now());

        setTimeout(async () => {
          try {
            console.log(`📨 [Simulated Worker] Delivering email to: ${email.recipientEmail}`);
            email.status = 'PROCESSING';
            const smtpRes = await smtpService.sendEmail({
              from: effectiveSenderEmail,
              to: email.recipientEmail,
              subject: email.subject,
              body: email.body,
            });
            email.status = 'SENT';
            email.sentAt = new Date().toISOString();
            console.log(`✅ [Simulated Worker] Sent to ${email.recipientEmail} (${smtpRes.previewUrl})`);
          } catch (e: any) {
            email.status = 'FAILED';
            console.error(`❌ [Simulated Worker] Failed for ${email.recipientEmail}:`, e.message);
          }
        }, timeoutMs);
      }
    }

    return {
      count: createdEmails.length,
      emails: createdEmails,
      sender: effectiveSenderEmail,
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

      if (total > 0) {
        return { total, page, limit, totalPages: Math.ceil(total / limit), emails };
      }
    } catch {
      // Fall through to in-memory
    }

    // In-memory fallback
    const filtered = inMemoryEmails
      .filter((e) => e.userId === userId && (e.status === 'SCHEDULED' || e.status === 'PROCESSING'))
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

    const pageEmails = filtered.slice(skip, skip + limit);
    return {
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit),
      emails: pageEmails,
    };
  }

  /**
   * Retrieves sent & failed emails for the user.
   */
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

      if (total > 0) {
        return { total, page, limit, totalPages: Math.ceil(total / limit), emails };
      }
    } catch {
      // Fall through to in-memory
    }

    // In-memory fallback
    const filtered = inMemoryEmails
      .filter((e) => e.userId === userId && (e.status === 'SENT' || e.status === 'FAILED'))
      .sort((a, b) => new Date(b.sentAt || b.updatedAt).getTime() - new Date(a.sentAt || a.updatedAt).getTime());

    const pageEmails = filtered.slice(skip, skip + limit);
    return {
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit),
      emails: pageEmails,
    };
  }

  /**
   * Retrieves single email by ID.
   */
  async getEmailById(userId: string, emailId: string) {
    try {
      return await prisma.email.findFirst({
        where: { id: emailId, userId },
        include: { sender: true },
      });
    } catch {
      return inMemoryEmails.find((e) => e.id === emailId && e.userId === userId) || null;
    }
  }
}

export const emailService = new EmailService();
