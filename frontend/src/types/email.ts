export type EmailStatus = 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED';

export interface EmailRecord {
  id: string;
  userId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt?: string | null;
  status: EmailStatus;
  senderId?: string | null;
  jobId?: string | null;
  createdAt: string;
  updatedAt: string;
  sender?: {
    email: string;
  } | null;
}

export interface EmailListResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  emails: EmailRecord[];
}
