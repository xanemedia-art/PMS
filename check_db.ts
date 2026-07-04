import dotenv from 'dotenv';
dotenv.config();
import { db } from './src/db/index.js';
import { hotels, bookings, restaurantMenu, restaurantOrders, rooms } from './src/db/schema.js';

async function main() {
  try {
    console.log('Querying DB...');
    const allHotels = await db.select().from(hotels);
    console.log('--- HOTELS ---');
    console.log(allHotels.map(h => ({ id: h.id, name: h.name })));

    const allBookings = await db.select().from(bookings);
    console.log('--- BOOKINGS ---');
    console.log(allBookings.map(b => ({ id: b.id, hotelId: b.hotelId, guestName: b.guestName, status: b.status, roomId: b.roomId })));

    const allMenu = await db.select().from(restaurantMenu);
    console.log('--- MENU ITEMS ---');
    console.log(allMenu.map(m => ({ id: m.id, hotelId: m.hotelId, name: m.name, category: m.category, isAvailable: m.isAvailable })));

    const allRooms = await db.select().from(rooms);
    console.log('--- ROOMS ---');
    console.log(allRooms.map(r => ({ id: r.id, number: r.number, status: r.status, guestPin: r.guestPin, hotelId: r.hotelId })));

    const allOrders = await db.select().from(restaurantOrders);
    console.log('--- ORDERS ---');
    console.log(allOrders.map(o => ({ id: o.id, hotelId: o.hotelId, bookingId: o.bookingId, status: o.status })));
  } catch (err) {
    console.error('Error querying:', err);
  }
  process.exit(0);
}

main();
