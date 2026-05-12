import { pgTable, text, integer, real, serial, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// --- CORE TABLES ---

// 1. Tenants (Hotels)
export const hotels = pgTable('hotels', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 2. Users (Includes Admins, Staff, and Agents restricted per hotel)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  hotelId: integer('hotel_id').references(() => hotels.id).notNull(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'manager', 'staff', 'agent'] }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 3. Room Types (Deluxe, Suite, etc. scoped to hotel)
export const roomTypes = pgTable('room_types', {
  id: serial('id').primaryKey(),
  hotelId: integer('hotel_id').references(() => hotels.id).notNull(),
  name: text('name').notNull(),
  price: real('price').notNull(),
  capacity: integer('capacity').notNull(),
  imageUrl: text('image_url'),
  images: text('images'), // JSON array of strings
  description: text('description'),
  amenities: text('amenities'), // JSON array of strings
});

// 4. Rooms (Individual units)
export const rooms = pgTable('rooms', {
  id: serial('id').primaryKey(),
  hotelId: integer('hotel_id').references(() => hotels.id).notNull(),
  roomTypeId: integer('room_type_id').references(() => roomTypes.id).notNull(),
  number: text('number').notNull(),
  status: text('status', { enum: ['available', 'occupied', 'maintenance', 'dirty'] }).default('available'),
});

// 5. Room Plans
export const plans = pgTable('plans', {
  id: serial('id').primaryKey(),
  hotelId: integer('hotel_id').references(() => hotels.id).notNull(),
  name: text('name').notNull(),
  priceMultiplier: real('price_multiplier').default(1.0),
  description: text('description'),
});

// 6. Bookings
export const bookings = pgTable('bookings', {
  id: serial('id').primaryKey(),
  hotelId: integer('hotel_id').references(() => hotels.id).notNull(),
  roomId: integer('room_id').references(() => rooms.id), // Nullable now, since admin assigns it later for agent bookings
  roomTypeId: integer('room_type_id').references(() => roomTypes.id), // Added to support booking by room type
  pax: integer('pax').default(1),
  roomCount: integer('room_count').default(1),
  planId: integer('plan_id').references(() => plans.id), // Added plan ID
  bookedById: integer('booked_by_id').references(() => users.id), // Who made the booking (Agent/Staff/Admin)
  guestName: text('guest_name').notNull(),
  guestEmail: text('guest_email'),
  guestPhone: text('guest_phone'),
  checkInDate: text('check_in_date').notNull(),
  checkOutDate: text('check_out_date').notNull(),
  status: text('status', { enum: ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'] }).default('pending'),
  agentCommission: real('agent_commission'), // Commission field
  extraBeddings: integer('extra_beddings').default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 7. Invoices (Billing & Line Items simplified)
export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  hotelId: integer('hotel_id').references(() => hotels.id).notNull(),
  bookingId: integer('booking_id').references(() => bookings.id).notNull(),
  baseAmount: real('base_amount').notNull(), // Room rate
  extrasAmount: real('extras_amount').default(0), // Food, services
  taxAmount: real('tax_amount').default(0), // GST
  totalAmount: real('total_amount').notNull(),
  status: text('status', { enum: ['unpaid', 'paid'] }).default('unpaid'),
  issuedAt: timestamp('issued_at').defaultNow(),
});

// 8. Housekeeping Tasks
export const housekeepingTasks = pgTable('housekeeping_tasks', {
  id: serial('id').primaryKey(),
  hotelId: integer('hotel_id').references(() => hotels.id).notNull(),
  roomId: integer('room_id').references(() => rooms.id).notNull(),
  assignedToId: integer('assigned_to_id').references(() => users.id), // Typically a 'staff' role user
  status: text('status', { enum: ['clean', 'dirty', 'in_progress'] }).default('dirty'),
  notes: text('notes'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 9. Expenses
export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  hotelId: integer('hotel_id').references(() => hotels.id).notNull(),
  name: text('name').notNull(),
  type: text('type').notNull(), // e.g., 'utilities', 'maintenance', 'supplies', 'food', 'other'
  amount: real('amount').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

