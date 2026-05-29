import express from 'express';
import { db } from '../../db/index.js';
import { users, bookings, hotels, roomTypes, agentRoomPrices, invoices } from '../../db/schema.js';
import { eq, and, sum, count } from 'drizzle-orm';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.middleware.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

router.use(authenticateToken);

// Get all agents for the hotel (with booking stats)
router.get('/', requireRole(['admin', 'manager']), async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;

    const agents = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(and(eq(users.hotelId, hotelId), eq(users.role, 'agent')));

    // For each agent, get their booking count and total revenue
    const agentsWithStats = await Promise.all(
      agents.map(async (agent) => {
        const stats = await db
          .select({
            bookingsCount: count(bookings.id),
            totalRevenue: sum(invoices.totalAmount),
          })
          .from(bookings)
          .leftJoin(invoices, eq(bookings.id, invoices.bookingId))
          .where(and(eq(bookings.hotelId, hotelId), eq(bookings.bookedById, agent.id)));

        return {
          ...agent,
          bookingsCount: Number(stats[0]?.bookingsCount ?? 0),
          totalRevenue: Number(stats[0]?.totalRevenue ?? 0),
        };
      })
    );

    res.json(agentsWithStats);
  } catch (error) {
    console.error('Failed to fetch agents:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// Create a new agent
router.post('/', requireRole(['admin', 'manager']), async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email and password are required' });
      return;
    }

    // Check for duplicate email
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newAgent = await db
      .insert(users)
      .values({ hotelId, name, email, passwordHash, role: 'agent' })
      .returning();

    const { passwordHash: _, ...safeAgent } = newAgent[0];
    res.json(safeAgent);

    // Send welcome email to new agent asynchronously
    (async () => {
      try {
        const hotelResult = await db.select().from(hotels).where(eq(hotels.id, hotelId)).limit(1);
        const hotelName = hotelResult[0]?.name || 'Hotel';
        const { getAgentWelcomeHtml, sendEmail } = await import('../utils/email.js');
        await sendEmail({
          to: email,
          subject: `Welcome to ${hotelName} Agent Portal - Your Access Details`,
          text: `Hello ${name},\n\nYou have been added as a Travel Agent for ${hotelName}. Login at /login with your email (${email}) and the password provided by your administrator.`,
          html: getAgentWelcomeHtml(name, email, hotelName, password)
        });
      } catch (mailErr) {
        console.error('Failed to send agent welcome email:', mailErr);
      }
    })();
  } catch (error) {
    console.error('Failed to create agent:', error);
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

// GET /my-pricing
// Retrieve pricing overrides for currently logged-in agent
router.get('/my-pricing', async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const agentId = req.user!.userId;
    const prices = await db.select().from(agentRoomPrices).where(and(eq(agentRoomPrices.hotelId, hotelId), eq(agentRoomPrices.agentId, agentId)));
    res.json(prices);
  } catch (error) {
    console.error('Failed to fetch my pricing:', error);
    res.status(500).json({ error: 'Failed to fetch agent pricing' });
  }
});

// GET /:id/pricing
// Fetch room types and dynamic price overrides for a specific agent
router.get('/:id/pricing', requireRole(['admin', 'manager']), async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const agentId = parseInt(req.params.id);
    
    const hotelRoomTypes = await db.select().from(roomTypes).where(eq(roomTypes.hotelId, hotelId));
    const customPrices = await db.select().from(agentRoomPrices).where(and(eq(agentRoomPrices.hotelId, hotelId), eq(agentRoomPrices.agentId, agentId)));
    
    const merged = hotelRoomTypes.map(rt => {
      const custom = customPrices.find(cp => cp.roomTypeId === rt.id);
      return {
        roomTypeId: rt.id,
        name: rt.name,
        defaultPrice: rt.price,
        customPrice: custom ? custom.price : null
      };
    });
    
    res.json(merged);
  } catch (error) {
    console.error('Failed to fetch agent pricing overrides:', error);
    res.status(500).json({ error: 'Failed to fetch agent pricing overrides' });
  }
});

// POST /:id/pricing
// Save or delete room price overrides for a specific agent
router.post('/:id/pricing', requireRole(['admin', 'manager']), async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const agentId = parseInt(req.params.id);
    const { pricing } = req.body; // Expects { pricing: { [roomTypeId]: price } }
    
    if (!pricing || typeof pricing !== 'object') {
      res.status(400).json({ error: 'Invalid pricing payload' });
      return;
    }

    await db.transaction(async (tx) => {
      for (const [roomTypeIdStr, priceVal] of Object.entries(pricing)) {
        const roomTypeId = parseInt(roomTypeIdStr);
        const price = priceVal !== null && priceVal !== '' ? Number(priceVal) : null;
        
        // Find existing override
        const existing = await tx.select().from(agentRoomPrices).where(and(
          eq(agentRoomPrices.hotelId, hotelId),
          eq(agentRoomPrices.agentId, agentId),
          eq(agentRoomPrices.roomTypeId, roomTypeId)
        )).limit(1);

        if (price === null || isNaN(price)) {
          // Delete override if exists and new price is null
          if (existing.length > 0) {
            await tx.delete(agentRoomPrices).where(eq(agentRoomPrices.id, existing[0].id));
          }
        } else {
          if (existing.length > 0) {
            // Update override
            await tx.update(agentRoomPrices).set({ price }).where(eq(agentRoomPrices.id, existing[0].id));
          } else {
            // Insert override
            await tx.insert(agentRoomPrices).values({
              hotelId,
              agentId,
              roomTypeId,
              price
            });
          }
        }
      }
    });

    res.json({ success: true, message: 'Pricing overrides updated successfully' });
  } catch (error) {
    console.error('Update agent pricing overrides failed:', error);
    res.status(500).json({ error: 'Failed to update agent pricing overrides' });
  }
});

// Delete an agent
router.delete('/:id', requireRole(['admin']), async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const id = parseInt(req.params.id);

    const deleted = await db
      .delete(users)
      .where(and(eq(users.id, id), eq(users.hotelId, hotelId), eq(users.role, 'agent')))
      .returning();

    if (deleted.length === 0) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete agent:', error);
    res.status(500).json({ error: 'Failed to delete agent' });
  }
});

// Get agent dashboard stats
router.get('/dashboard', async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const agentId = req.user!.userId;
    const today = new Date().toISOString().split('T')[0];

    // 1. Total bookings by this agent
    const allBookings = await db.select().from(bookings).where(and(eq(bookings.hotelId, hotelId), eq(bookings.bookedById, agentId)));
    
    // 2. Active bookings for today
    const activeBookings = allBookings.filter(b => 
      ['confirmed', 'checked_in'].includes(b.status || '') && 
      b.checkInDate <= today && 
      b.checkOutDate >= today
    ).length;

    // 3. Pending bookings
    const pendingBookings = allBookings.filter(b => b.status === 'pending').length;

    // 4. Commission stats
    const totalCommission = allBookings.reduce((sum, b) => sum + (b.agentCommission || 0), 0);

    // 5. Arrivals/Departures Today
    const arrivalsToday = allBookings.filter(b => b.checkInDate === today && b.status !== 'cancelled').length;
    const departuresToday = allBookings.filter(b => b.checkOutDate === today && b.status !== 'cancelled').length;

    res.json({
      activeBookings,
      pendingBookings,
      arrivalsToday,
      departuresToday,
      estimatedCommission: totalCommission,
      totalBookings: allBookings.length,
      // Provide dummy or zero for hotel-wide stats if requested, but better to keep it agent-focused
      occupancyRate: 0, 
      dailyRevenue: 0,
      allTimeRevenue: 0
    });
  } catch (error) {
    console.error('Agent dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch agent dashboard' });
  }
});

export default router;