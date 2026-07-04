import { pgTable, text, integer, real, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// --- CORE TABLES ---

// 1. Tenants (Hotels)
export const hotels = pgTable('hotels', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address'),
  createdAt: timestamp('created_at').defaultNow(),
  features: text('features').default('bookings,housekeeping,restaurant,expenses,agents'),
  parentId: integer('parent_id'), // Self-reference to hotels.id for chains. Null = Independent/Primary
  subscriptionStatus: text('subscription_status').default('trialing'), // 'trialing' | 'active' | 'expired'
  subscriptionEndsAt: timestamp('subscription_ends_at'),
  subscriptionDues: real('subscription_dues').default(0),
  subscriptionPrice: real('subscription_price').default(6000.0),
  slug: text('slug').unique(),
  gstin: text('gstin'),
  billingStateName: text('billing_state_name'),
  billingStateCode: text('billing_state_code'),
  roomGstRate: real('room_gst_rate').default(12.0),
  foodGstRate: real('food_gst_rate').default(5.0),
  roomSacCode: text('room_sac_code').default('996311'),
  foodSacCode: text('food_sac_code').default('99633'),
});

// 2. Users (Includes Admins, Staff, and Agents restricted per hotel)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  hotelId: integer('hotel_id').references(() => hotels.id).notNull(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'manager', 'staff', 'agent', 'housekeeping', 'front_desk', 'restaurant', 'management'] }).notNull(),
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
  guestPin: text('guest_pin'), // 4-digit PIN for guest portal login
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
  showGoogleReview: boolean('show_google_review').default(false),
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
  invoiceNumber: text('invoice_number'),
  gstin: text('gstin'),
  billingStateName: text('billing_state_name'),
  billingStateCode: text('billing_state_code'),
  guestGstin: text('guest_gstin'),
  guestStateName: text('guest_state_name'),
  guestStateCode: text('guest_state_code'),
  cgstAmount: real('cgst_amount').default(0.0),
  sgstAmount: real('sgst_amount').default(0.0),
  igstAmount: real('igst_amount').default(0.0),
  transactionType: text('transaction_type').default('intra_state'),
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

// 10. Restaurant & Kitchen Inventory
export const restaurantInventory = pgTable('restaurant_inventory', {
  id: serial('id').primaryKey(),
  hotelId: integer('hotel_id').references(() => hotels.id).notNull(),
  name: text('name').notNull(),
  quantity: real('quantity').default(0).notNull(),
  unit: text('unit').default('pcs').notNull(), // kg, pcs, liters, etc.
  minStock: real('min_stock').default(0).notNull(), // Threshold for alerts
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 11. Restaurant Orders & Room Service KOTs
export const restaurantOrders = pgTable('restaurant_orders', {
  id: serial('id').primaryKey(),
  hotelId: integer('hotel_id').references(() => hotels.id).notNull(),
  bookingId: integer('booking_id').references(() => bookings.id), // Nullable for direct/walk-in restaurant guests
  roomId: integer('room_id').references(() => rooms.id), // Nullable for direct/walk-in
  tableNumber: text('table_number'), // Nullable if room service
  items: text('items').notNull(), // JSON string: [{ name: string, quantity: number, price: number }]
  totalAmount: real('total_amount').notNull(),
  status: text('status', { enum: ['pending', 'preparing', 'delivered', 'cancelled'] }).default('pending').notNull(),
  type: text('type', { enum: ['room_service', 'dine_in', 'takeaway'] }).default('dine_in').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 12. Guest Chats
export const guestChats = pgTable('guest_chats', {
  id: serial('id').primaryKey(),
  hotelId: integer('hotel_id').references(() => hotels.id).notNull(),
  bookingId: integer('booking_id').references(() => bookings.id).notNull(),
  sender: text('sender', { enum: ['guest', 'staff'] }).notNull(),
  message: text('message').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 13. Restaurant Menu Items
export const restaurantMenu = pgTable('restaurant_menu', {
  id: serial('id').primaryKey(),
  hotelId: integer('hotel_id').references(() => hotels.id).notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(), // Starters, Mains, Drinks, Desserts, etc.
  price: real('price').notNull(),
  description: text('description'),
  isAvailable: boolean('is_available').default(true).notNull(),
});

// 14. Password Resets
export const passwordResets = pgTable('password_resets', {
  id: serial('id').primaryKey(),
  email: text('email').notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 15. Onboarding OTPs for email validation
export const onboardingOtps = pgTable('onboarding_otps', {
  id: serial('id').primaryKey(),
  email: text('email').notNull(),
  otp: text('otp').notNull(),
  payload: text('payload').notNull(), // JSON string of registration details
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 16. Agent Room Prices for Dynamic Agent-Specific Pricing
export const agentRoomPrices = pgTable('agent_room_prices', {
  id: serial('id').primaryKey(),
  hotelId: integer('hotel_id').references(() => hotels.id).notNull(),
  agentId: integer('agent_id').references(() => users.id).notNull(),
  roomTypeId: integer('room_type_id').references(() => roomTypes.id).notNull(),
  price: real('price').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 17. Booking-wise Custom Added Expenses
export const bookingExpenses = pgTable('booking_expenses', {
  id: serial('id').primaryKey(),
  hotelId: integer('hotel_id').references(() => hotels.id).notNull(),
  bookingId: integer('booking_id').references(() => bookings.id).notNull(),
  name: text('name').notNull(),
  amount: real('amount').notNull(),
  sacCode: text('sac_code').default('999799'),
  gstRate: real('gst_rate').default(18.0),
  quantity: integer('quantity').default(1),
  createdAt: timestamp('created_at').defaultNow(),
});





