import { prisma } from '../db/client';
import { addEmailJobToQueue } from '../queue/emailQueue';

export async function reconcilePendingJobs(): Promise<number> {
  console.log('[Reconciler] Running startup reconciliation pass for orphaned PENDING jobs...');
  
  // Find jobs that are in PENDING status and lack a bullJobId (e.g. app crashed mid-request before BullMQ enqueue)
  const orphanedJobs = await prisma.emailJob.findMany({
    where: {
      status: 'PENDING',
      bullJobId: null,
    },
  });

  if (orphanedJobs.length === 0) {
    console.log('[Reconciler] No orphaned PENDING jobs found.');
    return 0;
  }

  console.log(`[Reconciler] Found ${orphanedJobs.length} orphaned PENDING job(s). Re-enqueuing...`);
  let reconciledCount = 0;

  for (const job of orphanedJobs) {
    try {
      const now = new Date().getTime();
      const targetTime = new Date(job.nextAttemptAt || job.scheduledFor).getTime();
      const delayMs = Math.max(0, targetTime - now);

      const bullJobId = await addEmailJobToQueue(job.id, delayMs);

      await prisma.emailJob.update({
        where: { id: job.id },
        data: {
          bullJobId,
          status: 'QUEUED',
        },
      });

      reconciledCount++;
      console.log(`[Reconciler] Reconciled job ${job.id} -> BullMQ Job ID: ${bullJobId}`);
    } catch (err: any) {
      console.error(`[Reconciler] Failed to reconcile job ${job.id}:`, err.message);
    }
  }

  return reconciledCount;
}
