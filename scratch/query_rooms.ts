import { db } from '../src/db/index.js';
import { rooms } from '../src/db/schema.js';

async function queryRooms() {
  try {
    const list = await db.select().from(rooms);
    console.log('Room list from DB:');
    list.forEach(r => {
      console.log(`Room: ${r.number}, Status: ${r.status}, PIN: ${r.guestPin}, ID: ${r.id}`);
    });
  } catch (err: any) {
    console.error(err);
  }
}

queryRooms();
