import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../../db/index.js';
import { rooms, bookings, housekeepingTasks, restaurantOrders, guestChats, hotels } from '../../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware.js';


const router = express.Router();

export interface GuestRequest extends Request {
  guest?: {
    bookingId: number;
    roomId: number;
    hotelId: number;
    roomNumber: string;
    guestName: string;
    role: 'guest';
  };
}

// Guest Authentication Middleware
export const authenticateGuestToken = (req: GuestRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Unauthorized guest access' });
    return;
  }

  jwt.verify(token, process.env.JWT_SECRET || 'changeme123', (err: any, guest: any) => {
    if (err || !guest || guest.role !== 'guest') {
      res.status(401).json({ error: 'Invalid guest token' });
      return;
    }

    req.guest = guest;
    next();
  });
};

// 1. Guest Login (Room Number + 4 Digit PIN)
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { roomNumber, pin } = req.body;

    if (!roomNumber || !pin) {
      res.status(400).json({ error: 'Room number and PIN are required' });
      return;
    }

    // Find the occupied room matching number and guestPin
    const roomMatches = await db.select()
      .from(rooms)
      .where(
        and(
          eq(rooms.number, roomNumber.trim()),
          eq(rooms.guestPin, pin.trim()),
          eq(rooms.status, 'occupied')
        )
      )
      .limit(1);

    if (roomMatches.length === 0) {
      res.status(401).json({ error: 'Invalid room number or PIN' });
      return;
    }

    const room = roomMatches[0];

    // Find the active (checked_in) booking for this room
    const bookingMatches = await db.select()
      .from(bookings)
      .where(
        and(
          eq(bookings.roomId, room.id),
          eq(bookings.status, 'checked_in')
        )
      )
      .limit(1);

    if (bookingMatches.length === 0) {
      res.status(401).json({ error: 'No active checked-in guest found for this room' });
      return;
    }

    const booking = bookingMatches[0];

    // Create Guest JWT Token
    const guestPayload = {
      bookingId: booking.id,
      roomId: room.id,
      hotelId: room.hotelId,
      roomNumber: room.number,
      guestName: booking.guestName,
      role: 'guest',
    };

    const token = jwt.sign(guestPayload, process.env.JWT_SECRET || 'changeme123', { expiresIn: '7d' });

    res.json({
      token,
      guest: {
        bookingId: booking.id,
        roomId: room.id,
        hotelId: room.hotelId,
        roomNumber: room.number,
        guestName: booking.guestName,
      }
    });
  } catch (error) {
    console.error('Guest login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- AUTHENTICATED GUEST ROUTES ---

// 2. Fetch active guest booking & hotel info
router.get('/booking', authenticateGuestToken, async (req: GuestRequest, res: Response) => {
  try {
    const { bookingId, hotelId } = req.guest!;
    
    const bookingDetails = await db.select({
      booking: bookings,
      hotel: hotels
    })
    .from(bookings)
    .innerJoin(hotels, eq(bookings.hotelId, hotels.id))
    .where(eq(bookings.id, bookingId))
    .limit(1);

    if (bookingDetails.length === 0) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    res.json(bookingDetails[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch booking details' });
  }
});

// 3. Request Housekeeping
router.post('/housekeeping', authenticateGuestToken, async (req: GuestRequest, res: Response) => {
  try {
    const { hotelId, roomId } = req.guest!;
    const { notes } = req.body;

    const newTask = await db.insert(housekeepingTasks).values({
      hotelId,
      roomId,
      status: 'dirty',
      notes: notes || 'Guest requested housekeeping service via Portal',
    }).returning();

    res.json(newTask[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to request housekeeping' });
  }
});

// 4. Place Room Service Order
router.post('/order', authenticateGuestToken, async (req: GuestRequest, res: Response) => {
  try {
    const { hotelId, roomId, bookingId } = req.guest!;
    const { items, totalAmount } = req.body;

    if (!items || !totalAmount) {
      res.status(400).json({ error: 'Order items and total amount are required' });
      return;
    }

    const newOrder = await db.insert(restaurantOrders).values({
      hotelId,
      bookingId,
      roomId,
      items: typeof items === 'string' ? items : JSON.stringify(items),
      totalAmount,
      status: 'pending',
      type: 'room_service',
    }).returning();

    res.json(newOrder[0]);
  } catch (error) {
    console.error('Room service order error:', error);
    res.status(500).json({ error: 'Failed to place room service order' });
  }
});

// 5. Get Live Chat History
router.get('/chat', authenticateGuestToken, async (req: GuestRequest, res: Response) => {
  try {
    const { bookingId } = req.guest!;

    const chats = await db.select()
      .from(guestChats)
      .where(eq(guestChats.bookingId, bookingId))
      .orderBy(desc(guestChats.createdAt));

    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chat logs' });
  }
});

// 6. Send Live Chat Message
router.post('/chat', authenticateGuestToken, async (req: GuestRequest, res: Response) => {
  try {
    const { hotelId, bookingId } = req.guest!;
    const { message } = req.body;

    if (!message || message.trim() === '') {
      res.status(400).json({ error: 'Message cannot be empty' });
      return;
    }

    const newChat = await db.insert(guestChats).values({
      hotelId,
      bookingId,
      sender: 'guest',
      message: message.trim(),
    }).returning();

    res.json(newChat[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send chat message' });
  }
});

// --- STAFF / ADMIN CHAT ROUTING ---

// Get all active guest chats for the hotel (grouped by room/booking)
router.get('/admin/chats', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const hotelId = req.user!.hotelId;

    // Fetch latest messages from each booking
    const allChats = await db.select({
      id: guestChats.id,
      bookingId: guestChats.bookingId,
      message: guestChats.message,
      sender: guestChats.sender,
      createdAt: guestChats.createdAt,
      guestName: bookings.guestName,
      roomNumber: rooms.number
    })
    .from(guestChats)
    .innerJoin(bookings, eq(guestChats.bookingId, bookings.id))
    .innerJoin(rooms, eq(bookings.roomId, rooms.id))
    .where(eq(guestChats.hotelId, hotelId))
    .orderBy(desc(guestChats.createdAt));

    // Group by bookingId to get unique active chats
    const uniqueChatsMap = new Map();
    for (const chat of allChats) {
      if (!uniqueChatsMap.has(chat.bookingId)) {
        uniqueChatsMap.set(chat.bookingId, {
          bookingId: chat.bookingId,
          guestName: chat.guestName,
          roomNumber: chat.roomNumber,
          lastMessage: chat.message,
          lastSender: chat.sender,
          lastMessageTime: chat.createdAt
        });
      }
    }

    res.json(Array.from(uniqueChatsMap.values()));
  } catch (error) {
    console.error('Fetch admin chats error:', error);
    res.status(500).json({ error: 'Failed to fetch admin chats' });
  }
});

// Get chat history for a booking
router.get('/admin/chats/:bookingId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const hotelId = req.user!.hotelId;
    const bookingId = parseInt(req.params.bookingId);

    const chats = await db.select()
      .from(guestChats)
      .where(and(eq(guestChats.bookingId, bookingId), eq(guestChats.hotelId, hotelId)))
      .orderBy(desc(guestChats.createdAt));

    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch booking chat history' });
  }
});

// Send message from staff to guest
router.post('/admin/chats/:bookingId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const hotelId = req.user!.hotelId;
    const bookingId = parseInt(req.params.bookingId);
    const { message } = req.body;

    if (!message || message.trim() === '') {
      res.status(400).json({ error: 'Message cannot be empty' });
      return;
    }

    const newChat = await db.insert(guestChats).values({
      hotelId,
      bookingId,
      sender: 'staff',
      message: message.trim()
    }).returning();

    res.json(newChat[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send admin chat message' });
  }
});

export default router;
