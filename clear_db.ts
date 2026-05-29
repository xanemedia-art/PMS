import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './src/db/schema.js';
import dotenv from 'dotenv';

dotenv.config();

const client = postgres(process.env.DATABASE_URL || '');
const db = drizzle(client, { schema });

async function clearDatabase() {
  console.log('Initiating full database purge for production launch...');
  try {
    // Drop in order of dependencies (leaves first, roots last)
    console.log('Purging agentRoomPrices...');
    await db.delete(schema.agentRoomPrices);

    console.log('Purging invoices...');
    await db.delete(schema.invoices);

    console.log('Purging guestChats...');
    await db.delete(schema.guestChats);

    console.log('Purging restaurantOrders...');
    await db.delete(schema.restaurantOrders);

    console.log('Purging housekeepingTasks...');
    await db.delete(schema.housekeepingTasks);

    console.log('Purging bookings...');
    await db.delete(schema.bookings);

    console.log('Purging rooms...');
    await db.delete(schema.rooms);

    console.log('Purging roomTypes...');
    await db.delete(schema.roomTypes);

    console.log('Purging plans...');
    await db.delete(schema.plans);

    console.log('Purging restaurantInventory...');
    await db.delete(schema.restaurantInventory);

    console.log('Purging restaurantMenu...');
    await db.delete(schema.restaurantMenu);

    console.log('Purging expenses...');
    await db.delete(schema.expenses);

    console.log('Purging onboardingOtps...');
    await db.delete(schema.onboardingOtps);

    console.log('Purging passwordResets...');
    await db.delete(schema.passwordResets);

    console.log('Purging users...');
    await db.delete(schema.users);

    console.log('Purging hotels...');
    await db.delete(schema.hotels);

    console.log('✓ Database purged successfully! Ready for live multitenancy registrations.');
    process.exit(0);
  } catch (error) {
    console.error('✗ Database purge failed:', error);
    process.exit(1);
  }
}

clearDatabase();
