import { db } from '../src/db/index.js';
import { users } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function reset() {
  try {
    const hash = await bcrypt.hash('Sharma_@224165', 10);
    await db.update(users).set({ passwordHash: hash }).where(eq(users.email, 'admin@hotel.com'));
    console.log('Admin password updated to Sharma_@224165 successfully!');
  } catch (err: any) {
    console.error(err);
  }
}

reset();
