import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/db/schema.js';
import dotenv from 'dotenv';
dotenv.config();

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

async function check() {
  try {
    const hotels = await db.select().from(schema.hotels).limit(1);
    const users = await db.select({ id: schema.users.id, name: schema.users.name, role: schema.users.role }).from(schema.users).limit(10);
    const rooms = await db.select().from(schema.rooms).limit(5);
    const roomTypes = await db.select().from(schema.roomTypes).limit(5);
    const plans = await db.select().from(schema.plans).limit(5);
    const bookings = await db.select({ id: schema.bookings.id, status: schema.bookings.status, guestName: schema.bookings.guestName }).from(schema.bookings).limit(5);
    const expenses = await db.select().from(schema.expenses).limit(5);
    const housekeeping = await db.select().from(schema.housekeepingTasks).limit(5);
    const invoices = await db.select({ id: schema.invoices.id, status: schema.invoices.status, totalAmount: schema.invoices.totalAmount }).from(schema.invoices).limit(5);

    console.log('=== SUPABASE CONNECTION CHECK ===');
    console.log('[hotels]', JSON.stringify(hotels, null, 2));
    console.log('[users]', JSON.stringify(users, null, 2));
    console.log('[rooms]', JSON.stringify(rooms, null, 2));
    console.log('[roomTypes]', JSON.stringify(roomTypes, null, 2));
    console.log('[plans]', JSON.stringify(plans, null, 2));
    console.log('[bookings]', JSON.stringify(bookings, null, 2));
    console.log('[expenses]', JSON.stringify(expenses, null, 2));
    console.log('[housekeepingTasks]', JSON.stringify(housekeeping, null, 2));
    console.log('[invoices]', JSON.stringify(invoices, null, 2));
    console.log('=== ALL TABLES ACCESSIBLE ===');
  } catch(e: any) {
    console.error('DB ERROR:', e.message);
  } finally {
    await client.end();
  }
}
check();
