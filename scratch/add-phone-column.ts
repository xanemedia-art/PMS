import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config();

const client = postgres(process.env.DATABASE_URL || '');

async function run() {
  try {
    console.log('Adding guest_phone column to bookings table...');
    await client`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_phone TEXT;`;
    console.log('Column added successfully.');
  } catch (err) {
    console.error('Error adding column:', err);
  } finally {
    await client.end();
  }
}

run();
