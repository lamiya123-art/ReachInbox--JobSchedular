import { prisma } from './client';

async function main() {
  console.log('[Seed] Seeding database...');

  const defaultSender = await prisma.sender.upsert({
    where: { email: 'oliver.brown@domain.io' },
    update: {},
    create: {
      name: 'Oliver Brown',
      email: 'oliver.brown@domain.io',
      smtpHost: 'smtp.ethereal.email',
      smtpPort: 587,
      smtpUser: 'ethereal_user',
      smtpPass: 'ethereal_pass',
    },
  });

  console.log('[Seed] Default sender created/verified:', defaultSender);
}

main()
  .catch((e) => {
    console.error('[Seed] Error seeding DB:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
