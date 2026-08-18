import { prisma } from './db/client';

async function runMilestone3Test() {
  console.log('=====================================================');
  console.log('=== Milestone 3 Verification: Google OAuth Auth =====');
  console.log('=====================================================');

  // 1. Test GET /auth/google redirect
  console.log('[Auth Test] Testing GET /auth/google...');
  const googleRes = await fetch('http://localhost:4000/auth/google', { redirect: 'manual' });
  console.log(`[Auth Test] GET /auth/google status: ${googleRes.status} (Expected 302 redirect)`);
  console.log(`[Auth Test] Redirect Location: ${googleRes.headers.get('location')}`);

  // 2. Test GET /auth/google/callback
  console.log('\n[Auth Test] Testing GET /auth/google/callback...');
  const callbackRes = await fetch('http://localhost:4000/auth/google/callback?code=mock_dev_code', {
    redirect: 'manual',
  });

  console.log(`[Auth Test] Callback Status: ${callbackRes.status} (Expected 302 redirect)`);
  const setCookieHeader = callbackRes.headers.get('set-cookie');
  console.log(`[Auth Test] Set-Cookie Header: ${setCookieHeader}`);

  const cookieMatch = setCookieHeader ? setCookieHeader.match(/reachinbox_user=([^;]+)/) : null;
  const sessionCookie = cookieMatch ? cookieMatch[0] : '';
  const userId = cookieMatch ? cookieMatch[1] : '';

  console.log(`[Auth Test] Extracted User ID from cookie: ${userId}`);

  // 3. Verify user in Database
  if (userId) {
    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    console.log('[Auth Test] Verified User in Database:', dbUser);
  }

  // 4. Test GET /auth/me with Cookie
  console.log('\n[Auth Test] Testing GET /auth/me with Cookie...');
  const meRes = await fetch('http://localhost:4000/auth/me', {
    headers: { Cookie: sessionCookie },
  }).then((r) => r.json());

  console.log('[Auth Test] GET /auth/me Response:', meRes);

  // 5. Test POST /auth/logout
  console.log('\n[Auth Test] Testing POST /auth/logout...');
  const logoutRes = await fetch('http://localhost:4000/auth/logout', {
    method: 'POST',
    headers: { Cookie: sessionCookie },
  }).then((r) => r.json());

  console.log('[Auth Test] Logout Response:', logoutRes);

  console.log('\n=====================================================');
  console.log('=== Milestone 3 Google OAuth Verification Complete ===');
  console.log('=====================================================\n');

  process.exit(0);
}

runMilestone3Test().catch((err) => {
  console.error('[Auth Test] Error:', err);
  process.exit(1);
});
