import { User, Sender, EmailListResponse, ScheduleEmailPayload } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function fetchCurrentUser(): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/auth/me`, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error('Failed to fetch current user profile');
  }
  return res.json();
}

export async function fetchSenders(): Promise<Sender[]> {
  const res = await fetch(`${API_BASE_URL}/senders`, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error('Failed to fetch senders');
  }
  return res.json();
}

export async function fetchScheduledEmails(page = 1, limit = 50): Promise<EmailListResponse> {
  const res = await fetch(`${API_BASE_URL}/emails/scheduled?page=${page}&limit=${limit}`, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error('Failed to fetch scheduled emails');
  }
  return res.json();
}

export async function fetchSentEmails(page = 1, limit = 50): Promise<EmailListResponse> {
  const res = await fetch(`${API_BASE_URL}/emails/sent?page=${page}&limit=${limit}`, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error('Failed to fetch sent emails');
  }
  return res.json();
}

export async function scheduleEmails(payload: ScheduleEmailPayload): Promise<{
  success: boolean;
  campaignId: string;
  count: number;
}> {
  const res = await fetch(`${API_BASE_URL}/emails/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || errData.message || 'Failed to schedule email batch');
  }

  return res.json();
}

export async function logoutUser(): Promise<void> {
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}
