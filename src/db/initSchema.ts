import { db } from './index.js';
import { sql } from 'drizzle-orm';

let isInitialized = false;

export async function ensureDbTables() {
  if (isInitialized) return;
  try {
    // 1. Ensure staff_members table exists
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS staff_members (
        id SERIAL PRIMARY KEY,
        hotel_id INTEGER REFERENCES hotels(id) NOT NULL,
        user_id INTEGER REFERENCES users(id),
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        designation TEXT NOT NULL,
        monthly_salary REAL NOT NULL,
        salary_payout_day INTEGER DEFAULT 1 NOT NULL,
        joining_date TEXT,
        status TEXT DEFAULT 'active' NOT NULL,
        bank_details TEXT,
        last_paid_month TEXT,
        last_paid_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 2. Ensure restaurant_tables table exists
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS restaurant_tables (
        id SERIAL PRIMARY KEY,
        hotel_id INTEGER REFERENCES hotels(id) NOT NULL,
        table_number TEXT NOT NULL,
        capacity INTEGER DEFAULT 4 NOT NULL,
        section TEXT DEFAULT 'Main Dining',
        status TEXT DEFAULT 'vacant' NOT NULL,
        active_order_id INTEGER,
        current_bill_amount REAL DEFAULT 0,
        current_order_json TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE restaurant_tables ADD COLUMN IF NOT EXISTS section TEXT DEFAULT 'Main Dining';
      ALTER TABLE restaurant_tables ADD COLUMN IF NOT EXISTS current_bill_amount REAL DEFAULT 0;
      ALTER TABLE restaurant_tables ADD COLUMN IF NOT EXISTS current_order_json TEXT;
    `);

    // 3. Ensure bookings table has payment columns (IF NOT EXISTS is safe in Postgres)
    await db.execute(sql`
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pay_at_checkout';
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_estimated_amount REAL DEFAULT 0;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS amount_paid REAL DEFAULT 0;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_notes TEXT;
    `);

    // 4. Specifically purge Room 201 under Fyra Hotel as instructed
    try {
      const fyraHotelResult: any = await db.execute(sql`
        SELECT id, name FROM hotels WHERE name ILIKE '%Fyra%' LIMIT 1;
      `);

      const fyraHotel = fyraHotelResult && fyraHotelResult[0];
      if (fyraHotel) {
        const room201Result: any = await db.execute(sql`
          SELECT id, number FROM rooms WHERE hotel_id = ${fyraHotel.id} AND number = '201';
        `);
        const room201 = room201Result && room201Result[0];
        if (room201) {
          // Purge bookings referencing room 201
          await db.execute(sql`
            DELETE FROM bookings WHERE hotel_id = ${fyraHotel.id} AND room_id = ${room201.id};
          `);
          // Purge housekeeping tasks referencing room 201
          await db.execute(sql`
            DELETE FROM housekeeping_tasks WHERE hotel_id = ${fyraHotel.id} AND room_id = ${room201.id};
          `);
          // Delete room 201
          await db.execute(sql`
            DELETE FROM rooms WHERE id = ${room201.id};
          `);
          console.log(`[Init] Purged bookings and deleted Room 201 under hotel ${fyraHotel.name} (ID: ${fyraHotel.id})`);
        }
      }
    } catch (purgeErr: any) {
      console.warn('Room 201 Fyra purge warning:', purgeErr?.message);
    }

    isInitialized = true;
  } catch (err: any) {
    console.warn('Database non-destructive schema init notice:', err?.message);
  }
}
