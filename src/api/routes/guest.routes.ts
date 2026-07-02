import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../../db/index.js';
import { rooms, bookings, housekeepingTasks, restaurantOrders, guestChats, hotels, restaurantMenu, bookingExpenses, plans, roomTypes, users, agentRoomPrices } from '../../db/schema.js';
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

// Fetch available menu items scoped to the guest's hotel property
router.get('/menu', authenticateGuestToken, async (req: GuestRequest, res: Response) => {
  try {
    const { hotelId } = req.guest!;
    const menu = await db.select()
      .from(restaurantMenu)
      .where(
        and(
          eq(restaurantMenu.hotelId, hotelId),
          eq(restaurantMenu.isAvailable, true)
        )
      )
      .orderBy(restaurantMenu.category, restaurantMenu.name);
    res.json(menu);
  } catch (error) {
    console.error('Fetch menu error:', error);
    res.status(500).json({ error: 'Failed to fetch restaurant menu' });
  }
});

// Fetch active and past restaurantOrders placed by the guest
router.get('/orders', authenticateGuestToken, async (req: GuestRequest, res: Response) => {
  try {
    const { bookingId } = req.guest!;
    const orders = await db.select()
      .from(restaurantOrders)
      .where(eq(restaurantOrders.bookingId, bookingId))
      .orderBy(desc(restaurantOrders.createdAt));
    res.json(orders);
  } catch (error) {
    console.error('Fetch orders error:', error);
    res.status(500).json({ error: 'Failed to fetch restaurant orders' });
  }
});

// Edit items and totalAmount of the guest's own order only if status is pending
router.patch('/orders/:orderId', authenticateGuestToken, async (req: GuestRequest, res: Response) => {
  try {
    const { bookingId } = req.guest!;
    const orderId = parseInt(req.params.orderId);
    const { items, totalAmount } = req.body;

    if (!items || totalAmount === undefined) {
      res.status(400).json({ error: 'Items and totalAmount are required' });
      return;
    }

    // Check ownership and pending status
    const orderResult = await db.select()
      .from(restaurantOrders)
      .where(and(eq(restaurantOrders.id, orderId), eq(restaurantOrders.bookingId, bookingId)))
      .limit(1);

    if (orderResult.length === 0) {
      res.status(404).json({ error: 'Order not found or access denied' });
      return;
    }

    const order = orderResult[0];
    if (order.status !== 'pending') {
      res.status(400).json({ error: 'Order can only be modified while pending' });
      return;
    }

    const updated = await db.update(restaurantOrders)
      .set({
        items: typeof items === 'string' ? items : JSON.stringify(items),
        totalAmount: parseFloat(totalAmount)
      })
      .where(eq(restaurantOrders.id, orderId))
      .returning();

    res.json(updated[0]);
  } catch (error) {
    console.error('Update guest order error:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Cancel order only if status is pending
router.patch('/orders/:orderId/cancel', authenticateGuestToken, async (req: GuestRequest, res: Response) => {
  try {
    const { bookingId } = req.guest!;
    const orderId = parseInt(req.params.orderId);

    // Check ownership and pending status
    const orderResult = await db.select()
      .from(restaurantOrders)
      .where(and(eq(restaurantOrders.id, orderId), eq(restaurantOrders.bookingId, bookingId)))
      .limit(1);

    if (orderResult.length === 0) {
      res.status(404).json({ error: 'Order not found or access denied' });
      return;
    }

    const order = orderResult[0];
    if (order.status !== 'pending') {
      res.status(400).json({ error: 'Order can only be cancelled while pending' });
      return;
    }

    const updated = await db.update(restaurantOrders)
      .set({ status: 'cancelled' })
      .where(eq(restaurantOrders.id, orderId))
      .returning();

    res.json(updated[0]);
  } catch (error) {
    console.error('Cancel guest order error:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// Fetch running bill breakdown for the checked-in guest
router.get('/bill', authenticateGuestToken, async (req: GuestRequest, res: Response) => {
  try {
    const { bookingId, hotelId } = req.guest!;

    const bookingResult = await db.select({
      booking: bookings,
      roomNumber: rooms.number,
      roomTypeName: roomTypes.name,
      roomBasePrice: roomTypes.price,
    })
    .from(bookings)
    .leftJoin(rooms, eq(bookings.roomId, rooms.id))
    .leftJoin(roomTypes, eq(bookings.roomTypeId, roomTypes.id))
    .where(
      and(
        eq(bookings.id, bookingId),
        eq(bookings.hotelId, hotelId)
      )
    ).limit(1);

    if (bookingResult.length === 0) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    const { booking: b, roomNumber, roomTypeName, roomBasePrice } = bookingResult[0];
    
    // Calculate lodging nights
    let nights = 1;
    try {
      const checkIn = new Date(b.checkInDate);
      const checkOut = new Date(b.checkOutDate);
      const diffTime = checkOut.getTime() - checkIn.getTime();
      nights = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
    } catch (err) {
      nights = 1;
    }

    // Get hotel GST configurations
    const hotelResult = await db.select().from(hotels).where(eq(hotels.id, hotelId)).limit(1);
    const hotelConf = hotelResult[0];
    const roomGstRate = hotelConf?.roomGstRate ?? 12.0;
    const foodGstRate = hotelConf?.foodGstRate ?? 5.0;
    const roomSacCode = hotelConf?.roomSacCode ?? '996311';
    const foodSacCode = hotelConf?.foodSacCode ?? '99633';

    // 1. Room Charges details
    let roomPrice = roomBasePrice || 0;
    if (b.bookedById) {
      const creator = await db.select().from(users).where(eq(users.id, b.bookedById)).limit(1);
      if (creator.length > 0 && creator[0].role === 'agent' && b.roomTypeId) {
        const agentPrice = await db.select().from(agentRoomPrices).where(and(
          eq(agentRoomPrices.hotelId, hotelId),
          eq(agentRoomPrices.agentId, b.bookedById),
          eq(agentRoomPrices.roomTypeId, b.roomTypeId)
        )).limit(1);
        if (agentPrice.length > 0) {
          roomPrice = agentPrice[0].price;
        }
      }
    }

    let multiplier = 1.0;
    let planName = 'EP (Room Only)';
    if (b.planId) {
      const p = await db.select().from(plans).where(eq(plans.id, b.planId)).limit(1);
      if (p.length > 0) {
        multiplier = p[0].priceMultiplier ?? 1.0;
        planName = p[0].name;
      }
    }

    const roomRatePerNight = roomPrice * multiplier;
    const roomTotalBase = roomRatePerNight * (b.roomCount || 1) * nights;

    const roomItem = {
      type: 'room',
      description: `Room Rent (${roomTypeName || 'N/A'} - Room ${roomNumber || 'N/A'}) - ${nights} Night(s), ${b.roomCount || 1} Room(s) - Plan: ${planName}`,
      sacCode: roomSacCode,
      rate: roomRatePerNight,
      quantity: (b.roomCount || 1) * nights,
      taxableValue: roomTotalBase,
      gstRate: roomGstRate,
      cgstRate: roomGstRate / 2,
      sgstRate: roomGstRate / 2,
      taxAmount: roomTotalBase * (roomGstRate / 100),
    };

    // 2. Restaurant Orders (delivered)
    const orders = await db.select().from(restaurantOrders).where(
      and(
        eq(restaurantOrders.bookingId, bookingId),
        eq(restaurantOrders.status, 'delivered')
      )
    );

    const orderItems = orders.map((order) => {
      const total = order.totalAmount || 0;
      const taxable = total / (1 + (foodGstRate / 100));
      const tax = total - taxable;

      return {
        id: order.id,
        type: 'restaurant',
        description: `Restaurant Order #${order.id} (${order.type === 'room_service' ? 'Room Service' : 'Dine In'}) - ${new Date(order.createdAt).toLocaleDateString('en-IN')}`,
        sacCode: foodSacCode,
        rate: taxable,
        quantity: 1,
        taxableValue: taxable,
        gstRate: foodGstRate,
        cgstRate: foodGstRate / 2,
        sgstRate: foodGstRate / 2,
        taxAmount: tax,
      };
    });

    // 3. Custom added expenses
    const expenses = await db.select().from(bookingExpenses).where(
      eq(bookingExpenses.bookingId, bookingId)
    );

    const expenseItems = expenses.map((exp) => {
      const taxable = exp.amount * (exp.quantity || 1);
      const gst = exp.gstRate ?? 18.0;
      const tax = taxable * (gst / 100);

      return {
        id: exp.id,
        type: 'expense',
        description: exp.name,
        sacCode: exp.sacCode || '999799',
        rate: exp.amount,
        quantity: exp.quantity || 1,
        taxableValue: taxable,
        gstRate: gst,
        cgstRate: gst / 2,
        sgstRate: gst / 2,
        taxAmount: tax,
      };
    });

    // Combine all billing items
    const allItems = [roomItem, ...orderItems, ...expenseItems];
    
    // Totals
    const totalTaxable = allItems.reduce((sum, item) => sum + item.taxableValue, 0);
    const totalTax = allItems.reduce((sum, item) => sum + item.taxAmount, 0);
    const totalAmount = totalTaxable + totalTax;

    res.json({
      booking: {
        id: b.id,
        guestName: b.guestName,
        guestEmail: b.guestEmail,
        guestPhone: b.guestPhone,
        checkInDate: b.checkInDate,
        checkOutDate: b.checkOutDate,
        status: b.status,
      },
      hotel: {
        name: hotelConf?.name,
        address: hotelConf?.address,
        gstin: hotelConf?.gstin,
        stateName: hotelConf?.billingStateName,
        stateCode: hotelConf?.billingStateCode,
      },
      items: allItems,
      totals: {
        taxable: totalTaxable,
        tax: totalTax,
        amount: totalAmount,
      }
    });
  } catch (error) {
    console.error('Fetch guest bill breakdown error:', error);
    res.status(500).json({ error: 'Internal server error' });
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
