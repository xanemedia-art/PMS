import { db } from '../src/db/index.js';
import { users } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function check() {
  const userList = await db.select().from(users).where(eq(users.email, 'admin@hotel.com')).limit(1);
  const user = userList[0];
  if (!user) {
    console.log('User not found');
    return;
  }
  const matchAdmin123 = await bcrypt.compare('admin123', user.passwordHash);
  const matchSharma = await bcrypt.compare('Sharma_@224165', user.passwordHash);
  
  console.log(`Checking password hashes for admin@hotel.com:`);
  console.log(`Password "admin123" matches: ${matchAdmin123}`);
  console.log(`Password "Sharma_@224165" matches: ${matchSharma}`);
}

check();
