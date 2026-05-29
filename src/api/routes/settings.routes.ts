import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../../db/index.js';
import { users, hotels, rooms, roomTypes, plans } from '../../db/schema.js';
import { eq, and, or, sql } from 'drizzle-orm';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.middleware.js';

const router = express.Router();

// All settings routes require authentication
router.use(authenticateToken);

// --- PROFILE ROUTES ---

// Get current user profile
router.get('/profile', async (req: AuthRequest, res) => {
  try {
    const userResult = await db.select().from(users).where(eq(users.id, req.user!.userId)).limit(1);
    if (userResult.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const { passwordHash, ...user } = userResult[0];
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.patch('/profile', async (req: AuthRequest, res) => {
  try {
    const { name, email, password } = req.body;
    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (password) updateData.passwordHash = await bcrypt.hash(password, 10);

    await db.update(users).set(updateData).where(eq(users.id, req.user!.userId));
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- HOTEL ROUTES ---

// Get hotel details
router.get('/hotel', async (req: AuthRequest, res) => {
  try {
    const hotelResult = await db.select().from(hotels).where(eq(hotels.id, req.user!.hotelId)).limit(1);
    if (hotelResult.length === 0) return res.status(404).json({ error: 'Hotel not found' });
    res.json(hotelResult[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update hotel details (Admin/Manager only)
router.patch('/hotel', requireRole(['admin', 'manager']), async (req: AuthRequest, res) => {
  try {
    const { name, address } = req.body;
    await db.update(hotels).set({ name, address }).where(eq(hotels.id, req.user!.hotelId));
    res.json({ message: 'Hotel updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- TEAM ROUTES (Admin only) ---

// List all team members
router.get('/team', requireRole(['admin']), async (req: AuthRequest, res) => {
  try {
    const team = await db.select().from(users).where(eq(users.hotelId, req.user!.hotelId));
    const sanitizedTeam = team.map(({ passwordHash, ...user }) => user);
    res.json(sanitizedTeam);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add team member
router.post('/team', requireRole(['admin']), async (req: AuthRequest, res) => {
  try {
    const { name, email, password, role } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    
    await db.insert(users).values({
      hotelId: req.user!.hotelId,
      name,
      email,
      passwordHash,
      role
    });
    
    res.status(201).json({ message: 'Team member added successfully' });

    // Send welcome email to new staff member asynchronously
    (async () => {
      try {
        const hotelResult = await db.select().from(hotels).where(eq(hotels.id, req.user!.hotelId)).limit(1);
        const hotelName = hotelResult[0]?.name || 'Hotel';
        const { getStaffWelcomeHtml, sendEmail } = await import('../utils/email.js');
        await sendEmail({
          to: email,
          subject: `Welcome to ${hotelName} - Your Staff Account is Ready`,
          text: `Hello ${name},\n\nYou have been added to the ${hotelName} team with the role of ${role}. Login at /login with your email (${email}) and the password set by your administrator.`,
          html: getStaffWelcomeHtml(name, email, role, hotelName, password)
        });
      } catch (mailErr) {
        console.error('Failed to send staff welcome email:', mailErr);
      }
    })();
  } catch (error) {
    if ((error as any).code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove team member
router.delete('/team/:id', requireRole(['admin']), async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (userId === req.user!.userId) return res.status(400).json({ error: 'Cannot remove yourself' });
    
    await db.delete(users).where(and(eq(users.id, userId), eq(users.hotelId, req.user!.hotelId)));
    res.json({ message: 'Team member removed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- INVENTORY ROUTES ---
// (Room types, rooms, and plans are already in rooms.routes.ts and plans.routes.ts)
// I'll add DELETE routes for them here if they don't exist yet.

router.delete('/room-types/:id', requireRole(['admin', 'manager']), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(roomTypes).where(and(eq(roomTypes.id, id), eq(roomTypes.hotelId, req.user!.hotelId)));
    res.json({ message: 'Room type deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Cannot delete: Type might be in use by rooms' });
  }
});

router.delete('/rooms/:id', requireRole(['admin', 'manager']), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(rooms).where(and(eq(rooms.id, id), eq(rooms.hotelId, req.user!.hotelId)));
    res.json({ message: 'Room deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Cannot delete: Room might be in use by bookings' });
  }
});

router.delete('/plans/:id', requireRole(['admin', 'manager']), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(plans).where(and(eq(plans.id, id), eq(plans.hotelId, req.user!.hotelId)));
    res.json({ message: 'Plan deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Cannot delete: Plan might be in use by bookings' });
  }
});

// --- MULTI-PROPERTY CRUD (Admin only) ---

// Get all properties (hotels) in the active chain
router.get('/hotels', async (req: AuthRequest, res) => {
  try {
    const userHotelId = req.user!.hotelId;
    const currentHotelResult = await db.select().from(hotels).where(eq(hotels.id, userHotelId)).limit(1);
    const currentHotel = currentHotelResult[0];

    if (!currentHotel) {
      res.json([]);
      return;
    }

    const chainParentId = currentHotel.parentId || currentHotel.id;

    // Fetch all properties in the chain
    const chainHotels = await db.select()
      .from(hotels)
      .where(
        sql`id = ${chainParentId} OR parent_id = ${chainParentId}`
      );

    res.json(chainHotels);
  } catch (error) {
    console.error('Fetch chain hotels error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new property under the active chain
router.post('/hotels', requireRole(['admin']), async (req: AuthRequest, res) => {
  try {
    const { name, address } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Hotel name is required' });
      return;
    }

    const userHotelId = req.user!.hotelId;
    const currentHotelResult = await db.select().from(hotels).where(eq(hotels.id, userHotelId)).limit(1);
    const currentHotel = currentHotelResult[0];

    if (!currentHotel) {
      res.status(400).json({ error: 'Current hotel context not found' });
      return;
    }

    const chainParentId = currentHotel.parentId || currentHotel.id;

    // Sub-properties automatically receive a 14-day trial
    const newHotel = await db.insert(hotels).values({
      name,
      address: address || null,
      parentId: chainParentId,
      subscriptionStatus: 'trialing',
      subscriptionEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      subscriptionDues: 0
    }).returning();

    res.status(201).json(newHotel[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update property
router.patch('/hotels/:id', requireRole(['admin']), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, address } = req.body;

    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid hotel ID' });
      return;
    }

    const updated = await db.update(hotels)
      .set({ name, address })
      .where(eq(hotels.id, id))
      .returning();

    if (updated.length === 0) {
      res.status(404).json({ error: 'Hotel not found' });
      return;
    }

    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete property
router.delete('/hotels/:id', requireRole(['admin']), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid hotel ID' });
      return;
    }

    // Do not allow deleting the current hotel the user is logged into to prevent locking themselves out
    if (id === req.user!.hotelId) {
      res.status(400).json({ error: 'Cannot delete the property you are currently managing' });
      return;
    }

    await db.delete(hotels).where(eq(hotels.id, id));
    res.json({ message: 'Property deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Cannot delete: Property has active data or is referenced by other records' });
  }
});

export default router;
