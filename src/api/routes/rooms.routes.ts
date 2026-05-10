import express from 'express';
import { db } from '../../db';
import { rooms, roomTypes } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.middleware';

const router = express.Router();

router.use(authenticateToken);

// Get all rooms for hotel
router.get('/', async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    
    // Join rooms with roomTypes
    const hotelRooms = await db.select({
      id: rooms.id,
      number: rooms.number,
      status: rooms.status,
      roomType: roomTypes.name,
      price: roomTypes.price,
      capacity: roomTypes.capacity,
      roomTypeId: roomTypes.id
    }).from(rooms)
      .leftJoin(roomTypes, eq(rooms.roomTypeId, roomTypes.id))
      .where(eq(rooms.hotelId, hotelId));

    res.json(hotelRooms);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// Get room types
router.get('/types', async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const types = await db.select().from(roomTypes).where(eq(roomTypes.hotelId, hotelId));
    res.json(types);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch room types' });
  }
});

// Create room type (Admin/Manager only)
router.post('/types', requireRole(['admin', 'manager']), async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const { name, price, capacity } = req.body;

    const newType = await db.insert(roomTypes).values({
      hotelId,
      name,
      price,
      capacity
    }).returning();

    res.json(newType[0]);
  } catch (error) {
    console.error('Create room type error:', error);
    res.status(500).json({ error: 'Failed to create room type' });
  }
});

// Create room (Admin/Manager only)
router.post('/', requireRole(['admin', 'manager']), async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const { roomTypeId, number } = req.body;

    const newRoom = await db.insert(rooms).values({
      hotelId,
      roomTypeId,
      number,
      status: 'available'
    }).returning();

    res.json(newRoom[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Update room status (e.g. maintenance)
router.patch('/:id/status', requireRole(['admin', 'manager', 'staff']), async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const id = parseInt(req.params.id);
    const { status } = req.body;

    const updated = await db.update(rooms)
      .set({ status })
      .where(and(eq(rooms.id, id), eq(rooms.hotelId, hotelId)))
      .returning();

    if (updated.length === 0) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update room' });
  }
});

export default router;
