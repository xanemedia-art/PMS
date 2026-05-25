import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './src/db/schema.js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';


dotenv.config();

const queryClient = postgres(process.env.DATABASE_URL || '');
const db = drizzle(queryClient, { schema });

async function seed() {
  console.log('Seeding database...');
  
  try {
    let hotelId: number;
    let adminUser: any;
    let roomsList: any[];
    let roomTypesList: any[];

    // Check if tables have data
    const existingHotels = await db.select().from(schema.hotels);
    if (existingHotels.length === 0) {
      // Insert Hotel
      const newHotel = await db.insert(schema.hotels).values({
        name: process.env.HOTEL_NAME || 'New Hotel',
        address: process.env.HOTEL_ADDRESS || 'Hotel Address',
      }).returning();
      
      hotelId = newHotel[0].id;

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

      adminUser = users[0];

      // Insert Room Types
      roomTypesList = await db.insert(schema.roomTypes).values([
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
      roomsList = await db.insert(schema.rooms).values([
        { hotelId, roomTypeId: roomTypesList[0].id, number: '101', status: 'available' },
        { hotelId, roomTypeId: roomTypesList[0].id, number: '102', status: 'occupied' },
        { hotelId, roomTypeId: roomTypesList[1].id, number: '201', status: 'available' },
        { hotelId, roomTypeId: roomTypesList[1].id, number: '202', status: 'maintenance' },
      ]).returning();

      // Insert Dummy Booking
      const date = new Date();
      date.setDate(date.getDate() + 3);

      await db.insert(schema.bookings).values({
        hotelId,
        roomId: roomsList[1].id,
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
        roomId: roomsList[2].id,
        notes: 'Deep cleaning required',
        status: 'dirty',
      });
    } else {
      hotelId = existingHotels[0].id;
      const existingUsers = await db.select().from(schema.users).where(eq(schema.users.hotelId, hotelId)).limit(1);
      adminUser = existingUsers[0];
      roomsList = await db.select().from(schema.rooms).where(eq(schema.rooms.hotelId, hotelId));
      roomTypesList = await db.select().from(schema.roomTypes).where(eq(schema.roomTypes.hotelId, hotelId));
    }

    // Check if restaurant tables are already seeded
    const existingInventory = await db.select().from(schema.restaurantInventory).where(eq(schema.restaurantInventory.hotelId, hotelId)).limit(1);
    if (existingInventory.length === 0) {
      // Insert Restaurant Inventory Items
      await db.insert(schema.restaurantInventory).values([
        { hotelId, name: 'Basmati Rice', quantity: 50.0, unit: 'kg', minStock: 10.0 },
        { hotelId, name: 'Chicken Breast', quantity: 20.0, unit: 'kg', minStock: 5.0 },
        { hotelId, name: 'Eggs', quantity: 120.0, unit: 'pcs', minStock: 30.0 },
        { hotelId, name: 'Milk', quantity: 15.0, unit: 'liters', minStock: 5.0 },
        { hotelId, name: 'Coffee Beans', quantity: 8.0, unit: 'kg', minStock: 2.0 },
        { hotelId, name: 'Tomatoes', quantity: 12.0, unit: 'kg', minStock: 3.0 },
      ]);

      // Set guest PIN on room 102 (roomsList[1].id) if it exists
      if (roomsList && roomsList.length > 1) {
        // Insert Sample Booking with status checked_in to test guest portal
        const activeBooking = await db.insert(schema.bookings).values({
          hotelId,
          roomId: roomsList[1].id,
          roomTypeId: roomTypesList[0].id,
          bookedById: adminUser.id,
          guestName: 'Jane Smith',
          guestEmail: 'jane@example.com',
          guestPhone: '555-0199',
          checkInDate: new Date().toISOString().split('T')[0],
          checkOutDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
          status: 'checked_in',
        }).returning();

        await db.update(schema.rooms).set({ guestPin: '1234' }).where(eq(schema.rooms.id, roomsList[1].id));

        // Insert Restaurant Orders
        await db.insert(schema.restaurantOrders).values([
          {
            hotelId,
            bookingId: activeBooking[0].id,
            roomId: roomsList[1].id,
            items: JSON.stringify([
              { name: 'Club Sandwich', quantity: 2, price: 12.50 },
              { name: 'Fresh Orange Juice', quantity: 2, price: 5.00 }
            ]),
            totalAmount: 35.00,
            status: 'pending',
            type: 'room_service',
          },
          {
            hotelId,
            tableNumber: 'Table 4',
            items: JSON.stringify([
              { name: 'Chicken Biryani', quantity: 1, price: 18.00 },
              { name: 'Garlic Naan', quantity: 2, price: 3.50 }
            ]),
            totalAmount: 25.00,
            status: 'preparing',
            type: 'dine_in',
          }
        ]);

        // Insert Guest Chats
        await db.insert(schema.guestChats).values([
          {
            hotelId,
            bookingId: activeBooking[0].id,
            sender: 'guest',
            message: 'Hello! What is the Wi-Fi password?',
          },
          {
            hotelId,
            bookingId: activeBooking[0].id,
            sender: 'staff',
            message: 'Hi Jane, the Wi-Fi network is "Hotel_Guest_WiFi" and the password is "Guest2026!". Let us know if you need anything else.',
          },
          {
            hotelId,
            bookingId: activeBooking[0].id,
            sender: 'guest',
            message: 'Thank you! Also, can we get extra towels?',
          }
        ]);
      }
    }

    // Check if menu is seeded
    const existingMenu = await db.select().from(schema.restaurantMenu).where(eq(schema.restaurantMenu.hotelId, hotelId)).limit(1);
    if (existingMenu.length === 0) {
      await db.insert(schema.restaurantMenu).values([
        { hotelId, name: 'Club Sandwich', category: 'Starters', price: 12.50, description: 'Classic double-decker sandwich with chicken, bacon, lettuce, tomato, and mayo. Served with fries.' },
        { hotelId, name: 'Tomato Bruschetta', category: 'Starters', price: 8.00, description: 'Toasted baguette topped with diced tomatoes, garlic, basil, and balsamic glaze.' },
        { hotelId, name: 'French Fries', category: 'Starters', price: 6.00, description: 'Crispy golden fries served with ketchup and garlic aioli.' },
        
        { hotelId, name: 'Chicken Biryani', category: 'Mains', price: 18.00, description: 'Aromatic basmati rice cooked with tender spiced chicken, mint, and saffron.' },
        { hotelId, name: 'Garlic Butter Naan', category: 'Starters', price: 3.50, description: 'Soft and fluffy Indian flatbread brushed with garlic butter.' },
        { hotelId, name: 'Penne Arrabbiata', category: 'Mains', price: 15.00, description: 'Penne pasta tossed in a spicy garlic tomato sauce with olives and parmesan.' },
        { hotelId, name: 'Grilled Salmon', category: 'Mains', price: 24.50, description: 'Atlantic salmon fillet grilled to perfection, served with asparagus and lemon butter sauce.' },
        
        { hotelId, name: 'Fresh Orange Juice', category: 'Drinks', price: 5.00, description: '100% freshly squeezed orange juice.' },
        { hotelId, name: 'Cappuccino', category: 'Drinks', price: 4.50, description: 'Espresso shot with steamed milk and cocoa dusting.' },
        { hotelId, name: 'Mineral Water', category: 'Drinks', price: 2.50, description: 'Chilled spring water.' },
        
        { hotelId, name: 'Chocolate Lava Cake', category: 'Desserts', price: 9.00, description: 'Warm chocolate cake with a molten chocolate center, served with vanilla ice cream.' },
        { hotelId, name: 'New York Cheesecake', category: 'Desserts', price: 8.50, description: 'Rich and creamy cheesecake with a graham cracker crust and strawberry compote.' }
      ]);
      console.log('Restaurant Menu seeded successfully!');
    }

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await queryClient.end();
  }
}

seed();

