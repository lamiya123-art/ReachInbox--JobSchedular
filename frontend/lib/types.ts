export type EmailStatus = 'PENDING' | 'QUEUED' | 'SENT' | 'FAILED' | 'RESCHEDULED';

export interface Sender {
  id: string;
  name: string;
  email: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  createdAt: string;
}

export interface EmailJob {
  id: string;
  campaignId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledFor: string;
  nextAttemptAt: string;
  status: EmailStatus;
  bullJobId?: string | null;
  attempts: number;
  lastError?: string | null;
  sentAt?: string | null;
  createdAt: string;
  updatedAt: string;
  sender?: Sender;
}

export interface User {
  id: string;
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  createdAt: string;
}

export interface ScheduleEmailPayload {
  subject: string;
  body: string;
  recipients: string[];
  startTime?: string;
  delayMs?: number;
  hourlyLimit?: number;
  senderId?: string;
}

export interface EmailListResponse {
  total: number;
  page: number;
  limit: number;
  items: EmailJob[];
}
