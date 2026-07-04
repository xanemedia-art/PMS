import dotenv from 'dotenv';
dotenv.config();
import { db } from './src/db/index.js';
import { hotels } from './src/db/schema.js';

async function main() {
  try {
    const allHotels = await db.select().from(hotels);
    console.log('--- HOTELS SUBSCRIPTION DETAILS ---');
    console.log(JSON.stringify(allHotels.map(h => ({
      id: h.id,
      name: h.name,
      subscriptionStatus: h.subscriptionStatus,
      subscriptionEndsAt: h.subscriptionEndsAt,
      subscriptionDues: h.subscriptionDues
    })), null, 2));
  } catch (err) {
    console.error('Error querying hotels:', err);
  }
  process.exit(0);
}

main();
