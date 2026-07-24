import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../../db/index.js';
import { 
  hotels, 
  users, 
  rooms, 
  roomTypes, 
  plans, 
  bookings, 
  invoices, 
  housekeepingTasks, 
  expenses, 
  restaurantInventory, 
  restaurantOrders, 
  guestChats, 
  restaurantMenu,
  bookingExpenses,
  agentRoomPrices
} from '../../db/schema.js';
import { eq, and, ne } from 'drizzle-orm';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'changeme123';

// Helper to authenticate super-admin role
const requireSuperAdmin = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  if (!req.user || req.user.role !== 'super_admin') {
    res.status(403).json({ error: 'Forbidden: Super-Admin access required' });
    return;
  }
  next();
};

// POST /api/super-admin/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const superEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@xane.com';
    const superPassword = process.env.SUPER_ADMIN_PASSWORD || 'supersecretpms123';

    if (email !== superEmail || password !== superPassword) {
      res.status(401).json({ error: 'Invalid super-admin credentials' });
      return;
    }

    // Generate JWT for super-admin
    const token = jwt.sign(
      { userId: 0, hotelId: 0, role: 'super_admin' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: 0,
        name: 'Super Admin',
        email: superEmail,
        role: 'super_admin',
        hotelId: 0,
        features: 'bookings,housekeeping,restaurant,expenses,agents'
      }
    });
  } catch (error) {
    console.error('Super-admin login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/super-admin/hotels (requires super-admin auth)
router.get('/hotels', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const allHotels = await db.select().from(hotels);
    
    // Fetch statistics for each hotel
    const hotelsWithStats = await Promise.all(allHotels.map(async (hotel) => {
      const hotelRooms = await db.select().from(rooms).where(eq(rooms.hotelId, hotel.id));
      const hotelUsers = await db.select().from(users).where(eq(users.hotelId, hotel.id));
      const hotelBookings = await db.select().from(bookings).where(eq(bookings.hotelId, hotel.id));
      
      return {
        ...hotel,
        stats: {
          roomsCount: hotelRooms.length,
          usersCount: hotelUsers.length,
          bookingsCount: hotelBookings.length
        }
      };
    }));

    res.json(hotelsWithStats);
  } catch (error) {
    console.error('Super-admin fetch hotels error:', error);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// POST /api/super-admin/hotels (requires super-admin auth)
router.post('/hotels', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { name, address, adminName, adminEmail, adminPassword, slug } = req.body;

    if (!name || !adminName || !adminEmail || !adminPassword) {
      res.status(400).json({ error: 'Hotel name, admin details are required' });
      return;
    }

    // Check if email already registered
    const existingUser = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
    if (existingUser.length > 0) {
      res.status(400).json({ error: 'Admin email address already registered' });
      return;
    }

    // Generate unique slug
    let finalSlug = slug ? slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (!finalSlug) {
      finalSlug = 'hotel';
    }

    let uniqueSlug = finalSlug;
    let counter = 1;
    while (true) {
      const existing = await db.select().from(hotels).where(eq(hotels.slug, uniqueSlug)).limit(1);
      if (existing.length === 0) break;
      uniqueSlug = `${finalSlug}-${counter}`;
      counter++;
    }

    // 1. Create Hotel
    const hotelResult = await db.insert(hotels).values({
      name,
      address: address || 'Not specified',
      slug: uniqueSlug,
      features: 'bookings,housekeeping,restaurant,expenses,agents' // Default all features enabled
    }).returning();
    const hotelId = hotelResult[0].id;

    // 2. Hash Password and Create Admin User
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await db.insert(users).values({
      hotelId,
      name: adminName,
      email: adminEmail,
      passwordHash,
      role: 'admin',
    });

    // 3. Provision Starter Data
    // 3a. Room Types
    const rtResult = await db.insert(roomTypes).values([
      { hotelId, name: 'Deluxe Room', price: 2500, capacity: 2 },
      { hotelId, name: 'Executive Suite', price: 5000, capacity: 4 }
    ]).returning();

    // 3b. Rooms
    await db.insert(rooms).values([
      { hotelId, roomTypeId: rtResult[0].id, number: '101', status: 'available' },
      { hotelId, roomTypeId: rtResult[0].id, number: '102', status: 'available' },
      { hotelId, roomTypeId: rtResult[1].id, number: '201', status: 'available' },
      { hotelId, roomTypeId: rtResult[1].id, number: '202', status: 'available' }
    ]);

    // 3c. Plans (Meal Plans)
    await db.insert(plans).values([
      { hotelId, name: 'Room Only (EP)', priceMultiplier: 1.0, description: 'Only room charges, food charged extra.' },
      { hotelId, name: 'Bed & Breakfast (CP)', priceMultiplier: 1.15, description: 'Daily breakfast included.' },
      { hotelId, name: 'Half Board (MAP)', priceMultiplier: 1.3, description: 'Breakfast and dinner included.' }
    ]);

    // 3d. Restaurant Menu Items
    await db.insert(restaurantMenu).values([
      { hotelId, name: 'Club Sandwich', category: 'Starters', price: 220, description: 'Classic triple-decker sandwich with chicken, lettuce, tomato, and mayo.' },
      { hotelId, name: 'Tomato Bruschetta', category: 'Starters', price: 180, description: 'Toasted baguette with tomato, garlic, and basil.' },
      { hotelId, name: 'Butter Chicken with Rice', category: 'Mains', price: 380, description: 'Creamy chicken tikka gravy served with fragrant basmati rice.' },
      { hotelId, name: 'Penne Arrabbiata', category: 'Mains', price: 320, description: 'Pasta in spicy tomato sauce with olives and basil.' },
      { hotelId, name: 'Fresh Lime Soda', category: 'Drinks', price: 90, description: 'Refreshing sweet and salty soda.' },
      { hotelId, name: 'Hot Cappuccino', category: 'Drinks', price: 120, description: 'Freshly brewed espresso shot with steamed foamy milk.' }
    ]);

    res.status(201).json({
      message: 'Hotel onboarded successfully with starter data by Super-Admin!',
      hotel: hotelResult[0]
    });
  } catch (error) {
    console.error('Super-admin create hotel error:', error);
    res.status(500).json({ error: 'Failed to complete hotel onboarding' });
  }
});

// PATCH /api/super-admin/hotels/:id (requires super-admin auth)
router.patch('/hotels/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { 
      name, 
      address, 
      features: newFeatures, 
      subscriptionStatus, 
      subscriptionEndsAt, 
      subscriptionDues, 
      subscriptionPrice,
      slug
    } = req.body;

    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid hotel ID' });
      return;
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (newFeatures !== undefined) updateData.features = newFeatures;
    if (subscriptionStatus !== undefined) updateData.subscriptionStatus = subscriptionStatus;
    if (subscriptionEndsAt !== undefined) {
      updateData.subscriptionEndsAt = subscriptionEndsAt ? new Date(subscriptionEndsAt) : null;
    }
    if (subscriptionDues !== undefined) {
      updateData.subscriptionDues = subscriptionDues !== null ? parseFloat(subscriptionDues) : 0;
    }
    if (subscriptionPrice !== undefined) {
      updateData.subscriptionPrice = subscriptionPrice !== null ? parseFloat(subscriptionPrice) : 6000.0;
    }
    if (slug !== undefined) {
      const formattedSlug = slug ? slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '';
      if (!formattedSlug) {
        res.status(400).json({ error: 'Unique sub-URL slug cannot be empty' });
        return;
      }
      // Check if slug is already claimed by another hotel
      const existing = await db.select().from(hotels).where(and(eq(hotels.slug, formattedSlug), ne(hotels.id, id))).limit(1);
      if (existing.length > 0) {
        res.status(400).json({ error: 'This unique sub-URL slug is already claimed by another property' });
        return;
      }
      updateData.slug = formattedSlug;
    }

    const result = await db.update(hotels)
      .set(updateData)
      .where(eq(hotels.id, id))
      .returning();

    if (result.length === 0) {
      res.status(404).json({ error: 'Hotel not found' });
      return;
    }

    res.json({
      message: 'Hotel details updated successfully!',
      hotel: result[0]
    });
  } catch (error) {
    console.error('Super-admin update hotel error:', error);
    res.status(500).json({ error: 'Failed to update hotel' });
  }
});

// DELETE /api/super-admin/hotels/:id (requires super-admin auth)
router.delete('/hotels/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid hotel ID' });
      return;
    }

    // Verify hotel exists first
    const hotelResult = await db.select().from(hotels).where(eq(hotels.id, id)).limit(1);
    if (hotelResult.length === 0) {
      res.status(404).json({ error: 'Hotel not found' });
      return;
    }

    // Cascade delete in correct order of dependency
    await db.delete(bookingExpenses).where(eq(bookingExpenses.hotelId, id));
    await db.delete(agentRoomPrices).where(eq(agentRoomPrices.hotelId, id));
    await db.delete(invoices).where(eq(invoices.hotelId, id));
    await db.delete(guestChats).where(eq(guestChats.hotelId, id));
    await db.delete(restaurantOrders).where(eq(restaurantOrders.hotelId, id));
    await db.delete(housekeepingTasks).where(eq(housekeepingTasks.hotelId, id));
    await db.delete(bookings).where(eq(bookings.hotelId, id));
    await db.delete(rooms).where(eq(rooms.hotelId, id));
    await db.delete(roomTypes).where(eq(roomTypes.hotelId, id));
    await db.delete(plans).where(eq(plans.hotelId, id));
    await db.delete(restaurantInventory).where(eq(restaurantInventory.hotelId, id));
    await db.delete(restaurantMenu).where(eq(restaurantMenu.hotelId, id));
    await db.delete(expenses).where(eq(expenses.hotelId, id));
    await db.delete(users).where(eq(users.hotelId, id));
    await db.delete(hotels).where(eq(hotels.id, id));

    res.json({ message: 'Hotel and all associated records deleted successfully!' });
  } catch (error) {
    console.error('Super-admin delete hotel error:', error);
    res.status(500).json({ error: 'Failed to delete hotel workspace' });
  }
});

// POST /api/super-admin/hotels/:id/reset-credentials (requires super-admin auth)
router.post('/hotels/:id/reset-credentials', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { email, password } = req.body;

    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid hotel ID' });
      return;
    }

    if (!email && !password) {
      res.status(400).json({ error: 'Either email or password is required to reset credentials' });
      return;
    }

    // Check if hotel exists
    const hotelResult = await db.select().from(hotels).where(eq(hotels.id, id)).limit(1);
    if (hotelResult.length === 0) {
      res.status(404).json({ error: 'Hotel not found' });
      return;
    }

    // Find the primary administrator user for this hotel
    const adminUser = await db.select().from(users).where(and(eq(users.hotelId, id), eq(users.role, 'admin'))).limit(1);
    if (adminUser.length === 0) {
      res.status(404).json({ error: 'Administrator user not found for this hotel' });
      return;
    }

    const updateData: any = {};
    if (email) {
      // Check if email already registered by another user
      const existingUser = await db.select().from(users).where(and(eq(users.email, email), ne(users.id, adminUser[0].id))).limit(1);
      if (existingUser.length > 0) {
        res.status(400).json({ error: 'Email address already registered by another user' });
        return;
      }
      updateData.email = email;
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      updateData.passwordHash = passwordHash;
    }

    await db.update(users)
      .set(updateData)
      .where(eq(users.id, adminUser[0].id));

    res.json({ message: 'Administrator credentials updated successfully!' });
  } catch (error) {
    console.error('Super-admin reset credentials error:', error);
    res.status(500).json({ error: 'Failed to reset administrator credentials' });
  }
});

export default router;

