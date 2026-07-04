import dotenv from 'dotenv';
dotenv.config();
import { db } from './src/db/index.js';
import { users } from './src/db/schema.js';

async function main() {
  try {
    const allUsers = await db.select().from(users);
    console.log('--- USERS ---');
    console.log(allUsers.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, hotelId: u.hotelId })));
  } catch (err) {
    console.error('Error querying users:', err);
  }
  process.exit(0);
}

main();
