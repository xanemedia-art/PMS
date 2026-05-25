import { db } from '../src/db/index.js';
import { users } from '../src/db/schema.js';

async function queryUsers() {
  try {
    const list = await db.select().from(users);
    console.log('User list from DB:');
    list.forEach(u => {
      console.log(`User: ${u.name}, Email: ${u.email}, Role: ${u.role}, ID: ${u.id}`);
    });
  } catch (err: any) {
    console.error(err);
  }
}

queryUsers();
