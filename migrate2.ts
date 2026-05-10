import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';

async function migrate() {
  try {
    console.log('Running migrations...');
    try { await db.execute(sql`ALTER TABLE bookings ADD COLUMN extra_beddings integer DEFAULT 0;`); } catch (e: any) { console.log('extra_beddings:', e.message); }
    try { await db.execute(sql`ALTER TABLE bookings ADD COLUMN notes text;`); } catch (e: any) { console.log('notes:', e.message); }
    console.log('Migration completed.');
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

migrate();
