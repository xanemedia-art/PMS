import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';

async function migrate() {
  try {
    console.log('Running migrations...');
    try { await db.execute(sql`ALTER TABLE bookings ADD COLUMN room_type_id integer;`); } catch (e: any) { console.log('room_type_id:', e.message); }
    try { await db.execute(sql`ALTER TABLE bookings ADD COLUMN pax integer DEFAULT 1 NOT NULL;`); } catch (e: any) { console.log('pax:', e.message); }
    try { await db.execute(sql`ALTER TABLE bookings ADD COLUMN room_count integer DEFAULT 1 NOT NULL;`); } catch (e: any) { console.log('room_count:', e.message); }
    try { await db.execute(sql`ALTER TABLE bookings ALTER COLUMN room_id DROP NOT NULL;`); } catch (e: any) { console.log('room_id nullable:', e.message); }
    console.log('Migration completed.');
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

migrate();
