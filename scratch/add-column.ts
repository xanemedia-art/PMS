import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config();

const queryClient = postgres(process.env.DATABASE_URL || '');
async function main() {
  try {
    await queryClient`ALTER TABLE room_types ADD COLUMN image_url text`;
    console.log('Added column image_url');
  } catch (e) {
    console.log('Column might already exist or error:', e);
  } finally {
    process.exit(0);
  }
}
main();
