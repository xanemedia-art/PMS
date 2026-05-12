import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './src/db/schema.js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const queryClient = postgres(process.env.DATABASE_URL || '');
const db = drizzle(queryClient, { schema });

async function seed() {
  console.log('Seeding database...');
  
  try {
    // Check if tables have data
    const existingHotels = await db.select().from(schema.hotels);
    if (existingHotels.length > 0) {
      console.log('Database already seeded (Hotels table is not empty). Aborting to prevent duplicates.');
      process.exit(0);
    }

    // Insert Hotel
    const newHotel = await db.insert(schema.hotels).values({
      name: process.env.HOTEL_NAME || 'New Hotel',
      address: process.env.HOTEL_ADDRESS || 'Hotel Address',
    }).returning();
    
    const hotelId = newHotel[0].id;

    // Insert Users
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@hotel.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
    const agentPasswordHash = await bcrypt.hash('agent123', 10);

    const users = await db.insert(schema.users).values([
      {
        hotelId,
        name: 'Admin User',
        email: adminEmail,
        passwordHash: adminPasswordHash,
        role: 'admin',
      },
      {
        hotelId,
        name: 'Travel Agent 1',
        email: 'agent@travel.com',
        passwordHash: agentPasswordHash,
        role: 'agent',
      }
    ]).returning();

    const adminUser = users[0];

    // Insert Room Types
    const roomTypes = await db.insert(schema.roomTypes).values([
      {
        hotelId,
        name: 'Deluxe Room',
        price: 150.00,
        capacity: 2,
      },
      {
        hotelId,
        name: 'Ocean View Suite',
        price: 300.00,
        capacity: 4,
      }
    ]).returning();

    // Insert Rooms
    const rooms = await db.insert(schema.rooms).values([
      { hotelId, roomTypeId: roomTypes[0].id, number: '101', status: 'available' },
      { hotelId, roomTypeId: roomTypes[0].id, number: '102', status: 'occupied' },
      { hotelId, roomTypeId: roomTypes[1].id, number: '201', status: 'available' },
      { hotelId, roomTypeId: roomTypes[1].id, number: '202', status: 'maintenance' },
    ]).returning();

    // Insert Dummy Booking
    const date = new Date();
    date.setDate(date.getDate() + 3);

    await db.insert(schema.bookings).values({
      hotelId,
      roomId: rooms[1].id,
      bookedById: adminUser.id,
      guestName: 'John Doe',
      guestEmail: 'john@example.com',
      checkInDate: new Date().toISOString().split('T')[0],
      checkOutDate: date.toISOString().split('T')[0],
      status: 'confirmed',
    });

    // Insert Housekeeping Task
    await db.insert(schema.housekeepingTasks).values({
      hotelId,
      roomId: rooms[2].id,
      notes: 'Deep cleaning required',
      status: 'dirty',
    });

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await queryClient.end();
  }
}

seed();

