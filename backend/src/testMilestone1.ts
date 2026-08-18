async function runTest() {
  console.log('=== Milestone 1 Verification Test ===');

  const startTime = new Date(Date.now() + 5000).toISOString();
  console.log(`[Test] Scheduling email for: ${startTime} (5 seconds from now)`);

  const scheduleRes = await fetch('http://localhost:4000/emails/schedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subject: 'Milestone 1 Test Email',
      body: '<h1>Hello from ReachInbox Scheduler!</h1><p>This is a test email delayed by BullMQ.</p>',
      recipients: ['test.recipient@example.com'],
      startTime,
      delayMs: 2000,
    }),
  }).then((r) => r.json());

  console.log('[Test] Schedule Response:', JSON.stringify(scheduleRes, null, 2));

  console.log('[Test] Querying GET /emails/scheduled...');
  const scheduledList = await fetch('http://localhost:4000/emails/scheduled').then((r) => r.json());
  console.log(`[Test] Scheduled jobs count: ${scheduledList.total}`);

  console.log('[Test] Waiting 10 seconds for BullMQ worker to process the job...');
  await new Promise((resolve) => setTimeout(resolve, 10000));

  console.log('[Test] Querying GET /emails/sent...');
  const sentList = await fetch('http://localhost:4000/emails/sent').then((r) => r.json());
  console.log('[Test] Sent items count:', sentList.total);
  if (sentList.items && sentList.items.length > 0) {
    console.log('[Test] Latest Sent Job Record:', {
      id: sentList.items[0].id,
      recipient: sentList.items[0].recipient,
      subject: sentList.items[0].subject,
      status: sentList.items[0].status,
      sentAt: sentList.items[0].sentAt,
      bullJobId: sentList.items[0].bullJobId,
    });
  }
}

runTest().catch(console.error);
