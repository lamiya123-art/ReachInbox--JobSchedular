import { prisma } from './db/client';
import { addEmailJobToQueue } from './queue/emailQueue';
import { reconcilePendingJobs } from './services/reconciler';

async function runRestartTest() {
  console.log('====================================================');
  console.log('      REACHINBOX PROCESS RESTART RECOVERY TEST      ');
  console.log('====================================================');

  const sender = await prisma.sender.findFirst();
  if (!sender) {
    throw new Error('No default sender found. Run `npm run seed` first.');
  }

  const campaignId = `restart-test-${Date.now()}`;
  const now = new Date();

  // Case A: Create an orphaned PENDING job (simulating crash mid-request before BullMQ enqueue)
  const orphanedJob = await prisma.emailJob.create({
    data: {
      campaignId,
      senderId: sender.id,
      recipient: 'orphaned@restart.test',
      subject: 'Orphaned Job Recovery Test',
      body: '<p>Orphaned PENDING job</p>',
      scheduledFor: new Date(now.getTime() + 1000),
      nextAttemptAt: new Date(now.getTime() + 1000),
      status: 'PENDING',
      bullJobId: null,
    },
  });

  // Case B: Create a QUEUED job with bullJobId (simulating normal restart where Redis holds delayed job)
  const queuedJobDB = await prisma.emailJob.create({
    data: {
      campaignId,
      senderId: sender.id,
      recipient: 'queued@restart.test',
      subject: 'Queued Job Survival Test',
      body: '<p>Queued job</p>',
      scheduledFor: new Date(now.getTime() + 5000),
      nextAttemptAt: new Date(now.getTime() + 5000),
      status: 'QUEUED',
    },
  });
  const bullJobId = await addEmailJobToQueue(queuedJobDB.id, 5000);
  await prisma.emailJob.update({
    where: { id: queuedJobDB.id },
    data: { bullJobId },
  });

  // Case C: Create a SENT job (simulating completed job)
  const sentJob = await prisma.emailJob.create({
    data: {
      campaignId,
      senderId: sender.id,
      recipient: 'sent@restart.test',
      subject: 'Already Sent Job Test',
      body: '<p>Already sent</p>',
      scheduledFor: now,
      nextAttemptAt: now,
      status: 'SENT',
      sentAt: now,
      bullJobId: `completed-${Date.now()}`,
    },
  });

  console.log('[Restart Test] Simulated states created in DB:');
  console.log(` - Case A (Orphaned PENDING): ${orphanedJob.id} (bullJobId: null)`);
  console.log(` - Case B (Normal QUEUED): ${queuedJobDB.id} (bullJobId: ${bullJobId})`);
  console.log(` - Case C (Already SENT): ${sentJob.id} (bullJobId: ${sentJob.bullJobId})`);

  console.log('\n[Restart Test] Triggering startup reconciler pass...');
  const reconciledCount = await reconcilePendingJobs();

  console.log(`[Restart Test] Reconciled count: ${reconciledCount}`);

  // Verification checks
  const updatedOrphaned = await prisma.emailJob.findUnique({ where: { id: orphanedJob.id } });
  const updatedQueued = await prisma.emailJob.findUnique({ where: { id: queuedJobDB.id } });
  const updatedSent = await prisma.emailJob.findUnique({ where: { id: sentJob.id } });

  console.log('\n====================================================');
  console.log(' RECOVERY VERIFICATION CHECKS:');
  console.log(` ✓ Case A status: ${updatedOrphaned?.status} (bullJobId: ${updatedOrphaned?.bullJobId ? 'ASSIGNED' : 'NONE'})`);
  console.log(` ✓ Case B status: ${updatedQueued?.status} (bullJobId preserved: ${updatedQueued?.bullJobId === bullJobId})`);
  console.log(` ✓ Case C status: ${updatedSent?.status} (unchanged: ${updatedSent?.status === 'SENT'})`);
  console.log('====================================================');

  if (
    updatedOrphaned?.status === 'QUEUED' &&
    updatedOrphaned?.bullJobId &&
    updatedQueued?.status === 'QUEUED' &&
    updatedSent?.status === 'SENT' &&
    reconciledCount === 1
  ) {
    console.log(' SUCCESS: Restart recovery and idempotency guarantees verified!');
    process.exit(0);
  } else {
    console.error(' FAILURE: Restart recovery verification failed.');
    process.exit(1);
  }
}

runRestartTest().catch((err) => {
  console.error('Restart test error:', err);
  process.exit(1);
});
