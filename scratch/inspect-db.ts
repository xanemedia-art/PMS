import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/db/schema.js';
import dotenv from 'dotenv';
dotenv.config();

const queryClient = postgres(process.env.DATABASE_URL || '');
const db = drizzle(queryClient, { schema });

async function inspect() {
  const allBookings = await db.select().from(schema.bookings);
  console.log('--- ALL BOOKINGS ---');
  console.table(allBookings.map(b => ({
    id: b.id,
    guest: b.guestName,
    status: b.status,
    in: b.checkInDate,
    out: b.checkOutDate
  })));
  process.exit(0);
}

inspect();
