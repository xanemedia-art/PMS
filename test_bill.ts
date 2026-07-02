import { db } from './src/db/index.js';
import { bookings, rooms, roomTypes, hotels, users, agentRoomPrices, plans, restaurantOrders, bookingExpenses, restaurantMenu } from './src/db/schema.js';
import { eq, and } from 'drizzle-orm';

async function test() {
  try {
    const hotelRecords = await db.select().from(hotels);
    console.log(`Hotels count: ${hotelRecords.length}`);
    for (const h of hotelRecords) {
      console.log(`- Hotel ID: ${h.id}, Name: ${h.name}`);
    }

    const menuItems = await db.select().from(restaurantMenu);
    console.log(`Menu items count: ${menuItems.length}`);
    for (const item of menuItems.slice(0, 5)) {
      console.log(`- Item ID: ${item.id}, Name: ${item.name}, Hotel ID: ${item.hotelId}, isAvailable: ${item.isAvailable}, Category: ${item.category}`);
    }

    const bookingRecords = await db.select().from(bookings);
    console.log(`Bookings count: ${bookingRecords.length}`);
    for (const b of bookingRecords) {
      console.log(`- Booking ID: ${b.id}, Guest: ${b.guestName}, Status: ${b.status}, Hotel ID: ${b.hotelId}`);
    }

  } catch (err: any) {
    console.error("ERROR:", err);
  }
}

test().then(() => process.exit(0));
