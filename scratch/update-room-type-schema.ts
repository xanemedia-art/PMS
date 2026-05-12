
import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config();

const sql = postgres(process.env.DATABASE_URL!);

async function migrate() {
  try {
    console.log('Starting migration: Adding columns to room_types...');
    
    await sql`
      ALTER TABLE room_types 
      ADD COLUMN IF NOT EXISTS images text,
      ADD COLUMN IF NOT EXISTS description text,
      ADD COLUMN IF NOT EXISTS amenities text;
    `;

    console.log('Migration successful!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await sql.end();
  }
}

migrate();
