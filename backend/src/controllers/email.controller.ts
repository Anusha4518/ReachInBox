import { Request, Response } from 'express';
import { emailService } from '../services/email.service.js';
import { extractEmailsFromBuffer, extractEmailsFromString } from '../utils/csvParser.js';

export const scheduleEmails = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { subject, body, scheduledAt, delayBetweenEmails, maxEmailsPerHour, senderEmail } = req.body;

    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      res.status(400).json({ error: 'Validation Error', message: 'Subject is required' });
      return;
    }

    if (!body || typeof body !== 'string' || !body.trim()) {
      res.status(400).json({ error: 'Validation Error', message: 'Email body is required' });
      return;
    }

    if (!scheduledAt) {
      res.status(400).json({ error: 'Validation Error', message: 'Scheduled date and time is required' });
      return;
    }

    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      res.status(400).json({ error: 'Validation Error', message: 'Invalid scheduled date format' });
      return;
    }

    // Collect recipient emails from uploaded file or request body
    let recipientEmails: string[] = [];

    if (req.file) {
      const parsed = extractEmailsFromBuffer(req.file.buffer, req.file.mimetype, req.file.originalname);
      recipientEmails = parsed.validEmails;
    } else if (req.body.recipients) {
      if (Array.isArray(req.body.recipients)) {
        recipientEmails = req.body.recipients;
      } else if (typeof req.body.recipients === 'string') {
        const parsed = extractEmailsFromString(req.body.recipients);
        recipientEmails = parsed.validEmails;
      }
    }

    if (recipientEmails.length === 0) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'No valid recipient email addresses found. Please upload a CSV/TXT file or provide email leads.',
      });
      return;
    }

    const delaySec = delayBetweenEmails ? parseInt(delayBetweenEmails, 10) : undefined;
    const maxPerHour = maxEmailsPerHour ? parseInt(maxEmailsPerHour, 10) : undefined;

    const result = await emailService.createScheduledEmails({
      userId,
      subject: subject.trim(),
      body: body.trim(),
      scheduledAt: scheduledDate,
      recipientEmails,
      delaySeconds: delaySec,
      maxPerHour,
      senderEmail,
    });

    res.status(201).json({
      success: true,
      message: `Successfully scheduled ${result.count} email(s)`,
      count: result.count,
      sender: result.sender,
      emails: result.emails,
    });
  } catch (error: any) {
    console.error('Error scheduling emails:', error);
    res.status(500).json({
      error: 'Failed to schedule emails',
      message: error.message,
    });
  }
};

/**
 * Preview recipient file without scheduling.
 * Used by the frontend Compose modal to live-validate and count email leads.
 */
export const previewRecipientsFile = (req: Request, res: Response): void => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  try {
    const result = extractEmailsFromBuffer(req.file.buffer, req.file.mimetype, req.file.originalname);
    res.status(200).json({
      validEmails: result.validEmails,
      validCount: result.validEmails.length,
      invalidCount: result.invalidCount,
      totalParsed: result.totalParsed,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to parse file', message: error.message });
  }
};

export const getScheduledEmails = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as any)?.id;
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '20', 10);

    const data = await emailService.getScheduledEmails(userId, page, limit);
    res.status(200).json(data);
  } catch (error: any) {
    console.error('Error fetching scheduled emails:', error);
    res.status(500).json({ error: 'Failed to fetch scheduled emails', message: error.message });
  }
};

export const getSentEmails = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as any)?.id;
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '20', 10);

    const data = await emailService.getSentEmails(userId, page, limit);
    res.status(200).json(data);
  } catch (error: any) {
    console.error('Error fetching sent emails:', error);
    res.status(500).json({ error: 'Failed to fetch sent emails', message: error.message });
  }
};

export const getEmailById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as any)?.id;
    const emailId = req.params.id;

    const email = await emailService.getEmailById(userId, emailId);
    if (!email) {
      res.status(404).json({ error: 'Email not found' });
      return;
    }

    res.status(200).json({ email });
  } catch (error: any) {
    console.error('Error fetching email details:', error);
    res.status(500).json({ error: 'Failed to fetch email details', message: error.message });
  }
};
