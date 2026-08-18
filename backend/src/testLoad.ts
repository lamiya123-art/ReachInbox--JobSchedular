import { prisma } from './db/client';
import { addEmailJobToQueue, emailQueue } from './queue/emailQueue';

async function run1000JobLoadTest() {
  const TOTAL_JOBS = 1000;
  const campaignId = `load-test-${Date.now()}`;
  const now = new Date();

  console.log('====================================================');
  console.log('   REACHINBOX 1000+ JOB LOAD TEST                  ');
  console.log('====================================================\n');
  console.log(`Campaign: ${campaignId}`);

  const sender = await prisma.sender.findFirst();
  if (!sender) {
    throw new Error('No default sender found. Run `npm run seed` first.');
  }

  // Target time starting 10 minutes in the future to ensure deterministic delayed state
  const baseStartTime = now.getTime() + 10 * 60 * 1000;
  const delayMsStep = 500;

  const startTime = Date.now();

  // 1. Create 1000 DB records in database
  const jobDataBatch = Array.from({ length: TOTAL_JOBS }).map((_, index) => {
    const scheduledFor = new Date(baseStartTime + index * delayMsStep);
    return {
      campaignId,
      senderId: sender.id,
      recipient: `loadtest_${index + 1}@domain.io`,
      subject: `Load Test Email #${index + 1}`,
      body: `<p>Campaign load test email body #${index + 1}</p>`,
      scheduledFor,
      nextAttemptAt: scheduledFor,
      status: 'PENDING',
    };
  });

  await prisma.emailJob.createMany({
    data: jobDataBatch,
  });

  const dbRowsCreated = await prisma.emailJob.count({
    where: { campaignId },
  });

  const createdJobs = await prisma.emailJob.findMany({
    where: { campaignId },
    select: { id: true, scheduledFor: true },
  });

  // 2. Enqueue all 1000 delayed jobs into BullMQ
  let enqueuedCount = 0;
  const batchSize = 100;
  for (let i = 0; i < createdJobs.length; i += batchSize) {
    const batch = createdJobs.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (job) => {
        const delay = Math.max(0, new Date(job.scheduledFor).getTime() - Date.now());
        const bullJobId = await addEmailJobToQueue(job.id, delay);
        await prisma.emailJob.update({
          where: { id: job.id },
          data: { bullJobId, status: 'QUEUED' },
        });
        enqueuedCount++;
      })
    );
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  // 3. Campaign-Specific Verification of BullMQ Job Hashes & States
  const createdJobsWithBullId = await prisma.emailJob.findMany({
    where: { campaignId },
    select: { id: true, bullJobId: true },
  });

  let campaignBullJobsFound = 0;
  let campaignJobsMissing = 0;
  let campaignJobsDuplicated = 0;
  let campaignJobsLost = 0;

  const seenBullIds = new Set<string>();

  for (let i = 0; i < createdJobsWithBullId.length; i += batchSize) {
    const batch = createdJobsWithBullId.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (job) => {
        if (!job.bullJobId) {
          campaignJobsMissing++;
          return;
        }
        if (seenBullIds.has(job.bullJobId)) {
          campaignJobsDuplicated++;
        } else {
          seenBullIds.add(job.bullJobId);
        }

        const bullJob = await emailQueue.getJob(job.bullJobId);
        if (bullJob) {
          campaignBullJobsFound++;
        } else {
          campaignJobsLost++;
        }
      })
    );
  }

  const dbQueuedCount = await prisma.emailJob.count({
    where: { campaignId, status: 'QUEUED' },
  });

  // 4. Global BullMQ Queue State Inspection
  const delayedCount = await emailQueue.getJobCountByTypes('delayed');
  const waitingCount = await emailQueue.getJobCountByTypes('waiting');
  const activeCount = await emailQueue.getJobCountByTypes('active');
  const completedCount = await emailQueue.getJobCountByTypes('completed');
  const failedCount = await emailQueue.getJobCountByTypes('failed');

  console.log(`Expected jobs:                  ${TOTAL_JOBS}`);
  console.log(`Database rows:                  ${dbRowsCreated}`);
  console.log(`DB QUEUED rows:                 ${dbQueuedCount}`);
  console.log(`BullMQ campaign jobs:           ${campaignBullJobsFound}`);

  console.log('\nGlobal BullMQ state (all campaigns):');
  console.log(`  Delayed:                      ${delayedCount}`);
  console.log(`  Waiting:                      ${waitingCount}`);
  console.log(`  Active:                       ${activeCount}`);
  console.log(`  Completed:                    ${completedCount}`);
  console.log(`  Failed:                       ${failedCount}`);

  console.log('\nCampaign verification:');
  console.log(`  Campaign jobs missing:        ${campaignJobsMissing}`);
  console.log(`  Campaign jobs duplicated:     ${campaignJobsDuplicated}`);
  console.log(`  Campaign jobs lost:           ${campaignJobsLost}`);

  console.log(`\nEnqueue duration:               ${durationSec} seconds`);

  console.log(
    '\nNote: Global BullMQ counts include jobs from other campaigns. Campaign-specific verification is used to prove that all 1000 jobs created by this test were persisted and scheduled.'
  );

  console.log('\n====================================================');
  if (
    dbRowsCreated === TOTAL_JOBS &&
    dbQueuedCount === TOTAL_JOBS &&
    campaignBullJobsFound === TOTAL_JOBS &&
    campaignJobsMissing === 0 &&
    campaignJobsDuplicated === 0 &&
    campaignJobsLost === 0
  ) {
    console.log(`SUCCESS: ${TOTAL_JOBS}/${TOTAL_JOBS} campaign jobs persisted and scheduled successfully.`);
    console.log('====================================================');
    process.exit(0);
  } else {
    console.error(`FAILURE: Expected ${TOTAL_JOBS} campaign jobs, but recorded discrepancies.`);
    console.log('====================================================');
    process.exit(1);
  }
}

run1000JobLoadTest().catch((err) => {
  console.error('Load test failed with error:', err);
  process.exit(1);
});
