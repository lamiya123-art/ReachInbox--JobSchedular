import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../db/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

export function getGoogleOAuthClient(): OAuth2Client {
  const clientID = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/auth/google/callback';
  return new OAuth2Client(clientID, clientSecret, redirectUri);
}

export const googleOAuthClient = getGoogleOAuthClient();

export function getGoogleAuthUrl(): string {
  const clientID = process.env.GOOGLE_CLIENT_ID || '';
  if (!clientID || clientID === 'mock-google-client-id') {
    throw new Error(
      'GOOGLE_CLIENT_ID is not configured in your .env file. Please set valid Google OAuth credentials.'
    );
  }

  const client = getGoogleOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'openid',
    ],
    prompt: 'select_account',
  });
}

export async function handleGoogleCallback(code: string) {
  if (!code) {
    throw new Error('Authorization code missing from Google callback parameter.');
  }

  const clientID = process.env.GOOGLE_CLIENT_ID || '';
  if (!clientID || clientID === 'mock-google-client-id') {
    throw new Error(
      'GOOGLE_CLIENT_ID is not configured in your .env file. Unable to exchange Google OAuth code.'
    );
  }

  const client = getGoogleOAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  if (!tokens.id_token) {
    throw new Error('No ID Token returned by Google OAuth token exchange.');
  }

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: clientID,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) {
    throw new Error('Invalid or incomplete Google user profile returned.');
  }

  const googleId = payload.sub;
  const email = payload.email;
  const name = payload.name || payload.email.split('@')[0];
  const avatarUrl = payload.picture || null;

  // Upsert the real Google authenticated user in PostgreSQL / SQLite
  const user = await prisma.user.upsert({
    where: { googleId },
    update: { email, name, avatarUrl },
    create: {
      googleId,
      email,
      name,
      avatarUrl,
    },
  });

  // Upsert corresponding Sender identity for the logged-in user
  await prisma.sender.upsert({
    where: { email },
    update: { name },
    create: {
      name,
      email,
      smtpHost: 'smtp.ethereal.email',
      smtpPort: 587,
      smtpUser: process.env.ETHEREAL_USER || 'ethereal_user',
      smtpPass: process.env.ETHEREAL_PASS || 'ethereal_pass',
    },
  });

  return user;
}
