import express from 'express';
import { db } from '../../db';
import { users, bookings } from '../../db/schema';
import { eq, and, sum, count } from 'drizzle-orm';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.middleware';
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

    // For each agent, get their booking count and total commission
    const agentsWithStats = await Promise.all(
      agents.map(async (agent) => {
        const stats = await db
          .select({
            bookingsCount: count(bookings.id),
            totalCommission: sum(bookings.agentCommission),
          })
          .from(bookings)
          .where(and(eq(bookings.hotelId, hotelId), eq(bookings.bookedById, agent.id)));

        return {
          ...agent,
          bookingsCount: Number(stats[0]?.bookingsCount ?? 0),
          totalCommission: Number(stats[0]?.totalCommission ?? 0),
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
  } catch (error) {
    console.error('Failed to create agent:', error);
    res.status(500).json({ error: 'Failed to create agent' });
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