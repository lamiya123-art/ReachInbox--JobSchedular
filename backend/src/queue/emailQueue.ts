import { Queue } from 'bullmq';
import { connectionOptions } from './connection';

export const QUEUE_NAME = 'email-send';

export const emailQueue = new Queue(QUEUE_NAME, {
  connection: connectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: false,
    removeOnFail: false,
  },
});

export interface EmailJobData {
  emailJobId: string;
}

export async function addEmailJobToQueue(emailJobId: string, delayMs: number): Promise<string> {
  const actualDelay = Math.max(0, delayMs);
  const bullJobId = `job-${emailJobId}`;

  const job = await emailQueue.add(
    'send-email',
    { emailJobId },
    {
      delay: actualDelay,
      jobId: bullJobId,
    }
  );

  return job.id!;
}
