import { prisma } from './db/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  console.log('--- Checking Database via Prisma Client ---');
  console.log('DATABASE_URL from env:', process.env.DATABASE_URL);

  const users = await prisma.user.findMany();
  console.log('Users count:', users.length);
  console.log('Users:', JSON.stringify(users, null, 2));

  const senders = await prisma.sender.findMany();
  console.log('Senders count:', senders.length);
  console.log('Senders:', JSON.stringify(senders, null, 2));

  const emailJobs = await prisma.emailJob.findMany();
  console.log('EmailJobs count:', emailJobs.length);
  console.log('EmailJobs:', JSON.stringify(emailJobs, null, 2));
}

main()
  .catch((e) => {
    console.error('Database query error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
