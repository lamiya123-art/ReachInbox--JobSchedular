import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client';
import { addEmailJobToQueue } from '../queue/emailQueue';
import { getGoogleAuthUrl, handleGoogleCallback } from '../auth/googleAuth';
import crypto from 'crypto';

export const apiRouter = Router();

const scheduleSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  recipients: z.array(z.string().email('Invalid email address')).min(1, 'At least one recipient is required'),
  startTime: z.string().optional(),
  delayMs: z.number().nonnegative().optional().default(2000),
  hourlyLimit: z.number().positive().optional().default(200),
  senderId: z.string().optional(),
});

// AUTH ENDPOINTS

// GET /auth/google
apiRouter.get('/auth/google', (req: Request, res: Response) => {
  try {
    const authUrl = getGoogleAuthUrl();
    return res.redirect(authUrl);
  } catch (err: any) {
    return res.status(400).send(`
      <! baseline html>
      <html>
      <head><title>Google OAuth Setup Required</title></head>
      <body style="font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
        <div style="background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 2rem; max-width: 540px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);">
          <div style="color: #ef4444; font-size: 1.25rem; font-weight: 700; margin-bottom: 0.75rem;">Google OAuth Credentials Required</div>
          <p style="color: #94a3b8; font-size: 0.875rem; line-height: 1.5; margin-bottom: 1rem;">${err.message}</p>
          <div style="background: #0f172a; border-left: 4px solid #f59e0b; padding: 1rem; border-radius: 8px; font-size: 0.8125rem; color: #cbd5e1;">
            To enable real Google OAuth login, configure your <code>.env</code> file:
            <pre style="color: #38bdf8; margin-top: 0.5rem; font-family: monospace;">GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:4000/auth/google/callback</pre>
          </div>
          <p style="margin-top: 1.5rem; text-align: right;"><a href="http://localhost:3000/login" style="color: #22c55e; text-decoration: none; font-weight: 600; font-size: 0.875rem;">← Back to Login</a></p>
        </div>
      </body>
      </html>
    `);
  }
});

// GET /auth/google/callback
apiRouter.get('/auth/google/callback', async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string;
    if (!code) {
      return res.status(400).send('OAuth Error: No authorization code provided by Google.');
    }
    const user = await handleGoogleCallback(code);

    // Set HTTP-only cookie with real user ID
    res.cookie('reachinbox_user', user.id, {
      httpOnly: true,
      secure: false, // set to true in production HTTPS
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax',
    });

    return res.redirect('http://localhost:3000/dashboard');
  } catch (err: any) {
    console.error('[OAuth Callback Error]', err);
    return res.status(400).send(`
      <! baseline html>
      <html>
      <head><title>Google OAuth Error</title></head>
      <body style="font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
        <div style="background: #1e293b; border: 1px solid #ef4444; border-radius: 16px; padding: 2rem; max-width: 540px;">
          <div style="color: #ef4444; font-size: 1.25rem; font-weight: 700; margin-bottom: 0.75rem;">Google OAuth Error</div>
          <p style="color: #94a3b8; font-size: 0.875rem; line-height: 1.5;">${err.message}</p>
          <p style="margin-top: 1.5rem; text-align: right;"><a href="http://localhost:3000/login" style="color: #22c55e; text-decoration: none; font-weight: 600; font-size: 0.875rem;">← Back to Login</a></p>
        </div>
      </body>
      </html>
    `);
  }
});

// POST /auth/logout
apiRouter.post('/auth/logout', (req: Request, res: Response) => {
  res.clearCookie('reachinbox_user');
  return res.json({ success: true, message: 'Logged out successfully' });
});

// GET /auth/me
apiRouter.get('/auth/me', async (req: Request, res: Response) => {
  try {
    const userId = req.cookies?.reachinbox_user;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized', message: 'No active session found.' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.clearCookie('reachinbox_user');
      return res.status(401).json({ error: 'Unauthorized', message: 'User session invalid.' });
    }

    return res.json(user);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// EMAIL ENDPOINTS

// POST /emails/schedule
apiRouter.post('/emails/schedule', async (req: Request, res: Response) => {
  try {
    const parseResult = scheduleSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Validation Error', details: parseResult.error.format() });
    }

    const { subject, body, recipients, startTime, delayMs, senderId } = parseResult.data;

    let activeSenderId = senderId;
    if (!activeSenderId) {
      const defaultSender = await prisma.sender.findFirst();
      if (!defaultSender) {
        return res.status(400).json({ error: 'No sender identity found in system.' });
      }
      activeSenderId = defaultSender.id;
    }

    const campaignId = `campaign-${crypto.randomUUID()}`;
    const baseStartTime = startTime ? new Date(startTime).getTime() : Date.now();
    const now = Date.now();

    const createdJobs = [];

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      const targetSendTimeMs = baseStartTime + i * delayMs;
      const scheduledFor = new Date(targetSendTimeMs);
      const delayForQueueMs = Math.max(0, targetSendTimeMs - now);

      const emailJob = await prisma.emailJob.create({
        data: {
          campaignId,
          senderId: activeSenderId,
          recipient,
          subject,
          body,
          scheduledFor,
          nextAttemptAt: scheduledFor,
          status: 'PENDING',
        },
      });

      let bullJobId: string | null = null;
      try {
        bullJobId = await addEmailJobToQueue(emailJob.id, delayForQueueMs);

        await prisma.emailJob.update({
          where: { id: emailJob.id },
          data: {
            bullJobId,
            status: 'QUEUED',
          },
        });
      } catch (queueErr: any) {
        console.error(`[API] BullMQ queue enqueue error for job ${emailJob.id}:`, queueErr.message);
      }

      createdJobs.push({
        id: emailJob.id,
        recipient,
        scheduledFor,
        bullJobId,
        status: bullJobId ? 'QUEUED' : 'PENDING',
      });
    }

    return res.status(201).json({
      success: true,
      campaignId,
      count: createdJobs.length,
      jobs: createdJobs,
    });
  } catch (err: any) {
    console.error('[API] /emails/schedule error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

// GET /emails/scheduled
apiRouter.get('/emails/scheduled', async (req: Request, res: Response) => {
  try {
    const countOnly = req.query.count === 'true';
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '50', 10);
    const skip = (page - 1) * limit;

    const where = {
      status: {
        in: ['PENDING', 'QUEUED', 'RESCHEDULED'],
      },
    };

    if (countOnly) {
      const count = await prisma.emailJob.count({ where });
      return res.json({ count });
    }

    const [total, items] = await Promise.all([
      prisma.emailJob.count({ where }),
      prisma.emailJob.findMany({
        where,
        orderBy: { scheduledFor: 'asc' },
        skip,
        take: limit,
        include: { sender: true },
      }),
    ]);

    return res.json({ total, page, limit, items });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /emails/sent
apiRouter.get('/emails/sent', async (req: Request, res: Response) => {
  try {
    const countOnly = req.query.count === 'true';
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '50', 10);
    const skip = (page - 1) * limit;

    const where = {
      status: {
        in: ['SENT', 'FAILED'],
      },
    };

    if (countOnly) {
      const count = await prisma.emailJob.count({ where });
      return res.json({ count });
    }

    const [total, items] = await Promise.all([
      prisma.emailJob.count({ where }),
      prisma.emailJob.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: { sender: true },
      }),
    ]);

    return res.json({ total, page, limit, items });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /senders
apiRouter.get('/senders', async (req: Request, res: Response) => {
  try {
    const senders = await prisma.sender.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return res.json(senders);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
