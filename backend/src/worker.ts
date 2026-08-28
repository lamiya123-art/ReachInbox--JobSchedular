import { Worker, Job } from 'bullmq';
import { connectionOptions, redisClient } from './queue/connection';
import { QUEUE_NAME, EmailJobData } from './queue/emailQueue';
import { prisma } from './db/client';
import { sendEmail } from './services/mailer';
import { checkSenderRateLimit } from './services/rateLimiter';
import { reconcilePendingJobs } from './services/reconciler';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const concurrency = parseInt(process.env.WORKER_CONCURRENCY || '5', 10);
const minDelayMs = parseInt(process.env.MIN_DELAY_MS || '2000', 10);

console.log(
  `[Worker] Initializing worker for queue "${QUEUE_NAME}" (Concurrency: ${concurrency}, Min Delay: ${minDelayMs}ms)`
);

async function processEmailJob(job: Job<EmailJobData>) {
  const { emailJobId } = job.data;
  console.log(`[Worker] Processing BullMQ job ${job.id} for EmailJob: ${emailJobId}`);

  const emailJob = await prisma.emailJob.findUnique({
    where: { id: emailJobId },
    include: { sender: true },
  });

  if (!emailJob) {
    console.error(`[Worker] EmailJob record ${emailJobId} not found in database!`);
    return;
  }

  // Idempotency Check: If already SENT, skip
  if (emailJob.status === 'SENT') {
    console.log(`[Worker] EmailJob ${emailJobId} is already SENT. Skipping (Idempotent execution).`);
    return;
  }

  // Atomic Job Claiming: Transition from QUEUED/PENDING/RESCHEDULED -> PROCESSING
  const claimResult = await prisma.emailJob.updateMany({
    where: {
      id: emailJobId,
      status: { in: ['PENDING', 'QUEUED', 'RESCHEDULED'] },
    },
    data: {
      status: 'PROCESSING',
    },
  });

  if (claimResult.count === 0) {
    console.log(`[Worker] Job ${emailJobId} was already claimed or processed. Skipping.`);
    return;
  }

  // Sender-scoped Minimum Delay Throttling Across Concurrent Worker Instances
  if (minDelayMs > 0) {
    const lastSentKey = `rate:lastsent:${emailJob.senderId}`;
    const lastSentMsStr = await redisClient.get(lastSentKey);
    if (lastSentMsStr) {
      const elapsed = Date.now() - Number(lastSentMsStr);
      if (elapsed < minDelayMs) {
        const waitTime = minDelayMs - elapsed;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
    await redisClient.set(lastSentKey, String(Date.now()), 'EX', 60);
  }

  // Sender Hourly Rate Limit Check (Atomic Redis Counter)
  const maxHourlyLimit = parseInt(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER || '200', 10);
  const rateLimit = await checkSenderRateLimit(emailJob.senderId, maxHourlyLimit);
  if (!rateLimit.allowed && rateLimit.nextWindowStart) {
    const delayToNextWindow = rateLimit.nextWindowStart.getTime() - Date.now();
    console.warn(
      `[Worker] Rate limit exceeded for Sender ${emailJob.sender.email} (${rateLimit.currentCount}/${maxHourlyLimit}). Rescheduling job ${emailJobId} to ${rateLimit.nextWindowStart.toISOString()}`
    );

    // Update DB row: status = RESCHEDULED, nextAttemptAt = nextWindowStart
    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: {
        status: 'RESCHEDULED',
        nextAttemptAt: rateLimit.nextWindowStart,
      },
    });

    // Move BullMQ job to delayed queue for next window start
    await job.moveToDelayed(rateLimit.nextWindowStart.getTime(), job.token);
    return;
  }

  // Send Email via Ethereal SMTP
  try {
    console.log(`[Worker] Dispatching email to ${emailJob.recipient} via sender ${emailJob.sender.email}...`);

    const mailResult = await sendEmail({
      fromName: emailJob.sender.name,
      fromEmail: emailJob.sender.email,
      to: emailJob.recipient,
      subject: emailJob.subject,
      body: emailJob.body,
    });

    if (mailResult?.previewUrl) {
      console.log(`[Worker] 📧 View email in Ethereal Sandbox Inbox: ${mailResult.previewUrl}`);
    }

    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        attempts: { increment: 1 },
      },
    });

    console.log(`[Worker] Successfully sent email for EmailJob ${emailJobId} to ${emailJob.recipient}`);
  } catch (error: any) {
    console.error(`[Worker] Failed to send email for EmailJob ${emailJobId}:`, error.message);

    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: {
        status: 'FAILED',
        lastError: error.message || 'Unknown delivery error',
        attempts: { increment: 1 },
      },
    });

    throw error;
  }
}

const worker = new Worker<EmailJobData>(QUEUE_NAME, processEmailJob, {
  connection: connectionOptions,
  concurrency,
});

worker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed successfully.`);
});

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed with error: ${err.message}`);
});

reconcilePendingJobs()
  .then((count) => {
    console.log(`[Worker] Startup reconciliation finished. Reconciled ${count} job(s). Ready to process jobs.`);
  })
  .catch((err) => {
    console.error('[Worker] Startup reconciliation failed:', err);
  });
