import { prisma } from './db/client';
import { redisClient } from './queue/connection';

async function runMilestone2Test() {
  console.log('=====================================================');
  console.log('=== Milestone 2 Verification: Rate Limit & Reschedule ===');
  console.log('=====================================================');

  // 1. Get default sender
  const sender = await prisma.sender.findFirst();
  if (!sender) {
    console.error('No sender found in database.');
    return;
  }

  // 2. Clear Redis rate limit key for current UTC hour window
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hour = String(now.getUTCHours()).padStart(2, '0');
  const windowKey = `rate:${sender.id}:${year}-${month}-${day}T${hour}`;

  console.log(`[RateLimit Test] Target Redis Hour-Bucket Key Pattern: ${windowKey}`);
  await redisClient.del(windowKey);
  console.log(`[RateLimit Test] Cleared Redis counter for key: ${windowKey}`);

  // 3. Schedule 5 email jobs for the same minute with hourlyLimit = 3
  const testRecipients = [
    'user1@example.com',
    'user2@example.com',
    'user3@example.com',
    'user4@example.com',
    'user5@example.com',
  ];

  console.log(`[RateLimit Test] Scheduling batch of ${testRecipients.length} emails with limit = 3/hour...`);

  const startTime = new Date(Date.now() + 2000).toISOString();
  const scheduleRes = await fetch('http://localhost:4000/emails/schedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subject: 'Milestone 2 Rate Limit Batch Test',
      body: '<p>Testing Redis hourly rate limiting and job rescheduling.</p>',
      recipients: testRecipients,
      startTime,
      delayMs: 500, // rapid batch send
      senderId: sender.id,
      hourlyLimit: 3,
    }),
  }).then((r) => r.json());

  console.log('[RateLimit Test] Schedule Response:', {
    success: scheduleRes.success,
    campaignId: scheduleRes.campaignId,
    jobCount: scheduleRes.count,
  });

  const campaignId = scheduleRes.campaignId;

  console.log('[RateLimit Test] Waiting 15 seconds for BullMQ worker to process and enforce rate limit...');
  await new Promise((resolve) => setTimeout(resolve, 15000));

  // 4. Inspect DB status for jobs in this campaign
  const campaignJobs = await prisma.emailJob.findMany({
    where: { campaignId },
    orderBy: { scheduledFor: 'asc' },
  });

  const sentJobs = campaignJobs.filter((j) => j.status === 'SENT');
  const rescheduledJobs = campaignJobs.filter((j) => j.status === 'RESCHEDULED');
  const failedOrDropped = campaignJobs.filter((j) => j.status === 'FAILED' || j.status === 'PENDING');

  const counterValue = await redisClient.get(windowKey);

  console.log('\n=================== VERIFICATION RESULTS ===================');
  console.log(`Redis Counter Key:       ${windowKey}`);
  console.log(`Redis Counter Final Val: ${counterValue} (Limit set to 3)`);
  console.log(`Total Jobs in Campaign:  ${campaignJobs.length}`);
  console.log(`Sent Jobs Count:         ${sentJobs.length} (Expected: 3)`);
  console.log(`Rescheduled Jobs Count:  ${rescheduledJobs.length} (Expected: 2)`);
  console.log(`Dropped / Lost Jobs:     ${failedOrDropped.length} (Expected: 0)`);
  console.log('============================================================\n');

  if (rescheduledJobs.length > 0) {
    console.log('[RateLimit Test] Sample Rescheduled Job Record:');
    console.log({
      id: rescheduledJobs[0].id,
      recipient: rescheduledJobs[0].recipient,
      status: rescheduledJobs[0].status,
      nextAttemptAt: rescheduledJobs[0].nextAttemptAt,
      bullJobId: rescheduledJobs[0].bullJobId,
    });
  }

  process.exit(0);
}

runMilestone2Test().catch((err) => {
  console.error('[RateLimit Test] Error:', err);
  process.exit(1);
});
