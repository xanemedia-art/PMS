import dotenv from 'dotenv';
dotenv.config();
import { db } from './src/db/index.js';
import { hotels } from './src/db/schema.js';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    const futureDate = new Date('2028-12-31T00:00:00.000Z');
    
    const result = await db.update(hotels)
      .set({
        subscriptionStatus: 'active',
        subscriptionEndsAt: futureDate,
        subscriptionDues: 0
      });
      
    console.log('Successfully updated subscriptions for all hotels to active status (valid until 2028-12-31) and cleared outstanding dues.');
  } catch (err) {
    console.error('Error updating subscriptions:', err);
  }
  process.exit(0);
}

main();
