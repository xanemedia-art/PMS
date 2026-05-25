import { db } from '../src/db/index.js';
import { rooms } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

async function fixRoom() {
  try {
    await db.update(rooms).set({ status: 'occupied' }).where(eq(rooms.number, '102'));
    console.log('Room 102 status set to occupied successfully!');
  } catch (err: any) {
    console.error(err);
  }
}

fixRoom();
