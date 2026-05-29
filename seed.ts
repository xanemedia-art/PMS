import dotenv from 'dotenv';
dotenv.config();

async function seed() {
  console.log('Production startup: Database is ready. Signups and onboarding are enabled via the UI.');
  process.exit(0);
}

seed();
