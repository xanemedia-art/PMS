import express from 'express';
import { db } from '../../db/index.js';
import { guestChats, restaurantOrders, housekeepingTasks, bookings, rooms } from '../../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;

    // 1. Fetch recent guest chats
    const chats = await db.select({
      id: guestChats.id,
      message: guestChats.message,
      createdAt: guestChats.createdAt,
      bookingId: guestChats.bookingId,
      roomNumber: rooms.number
    })
    .from(guestChats)
    .innerJoin(bookings, eq(guestChats.bookingId, bookings.id))
    .innerJoin(rooms, eq(bookings.roomId, rooms.id))
    .where(and(eq(guestChats.hotelId, hotelId), eq(guestChats.sender, 'guest')))
    .orderBy(desc(guestChats.createdAt))
    .limit(10);

    // 2. Fetch pending restaurant orders
    const orders = await db.select({
      id: restaurantOrders.id,
      totalAmount: restaurantOrders.totalAmount,
      createdAt: restaurantOrders.createdAt,
      bookingId: restaurantOrders.bookingId,
      roomNumber: rooms.number
    })
    .from(restaurantOrders)
    .leftJoin(rooms, eq(restaurantOrders.roomId, rooms.id))
    .where(and(eq(restaurantOrders.hotelId, hotelId), eq(restaurantOrders.status, 'pending')))
    .orderBy(desc(restaurantOrders.createdAt))
    .limit(10);

    // 3. Fetch dirty housekeeping tasks
    const tasks = await db.select({
      id: housekeepingTasks.id,
      status: housekeepingTasks.status,
      notes: housekeepingTasks.notes,
      updatedAt: housekeepingTasks.updatedAt,
      roomNumber: rooms.number
    })
    .from(housekeepingTasks)
    .innerJoin(rooms, eq(housekeepingTasks.roomId, rooms.id))
    .where(and(eq(housekeepingTasks.hotelId, hotelId), eq(housekeepingTasks.status, 'dirty')))
    .orderBy(desc(housekeepingTasks.updatedAt))
    .limit(10);

    // Combine them into a single list
    const combinedNotifications = [
      ...chats.map(c => ({
        id: `chat-${c.id}`,
        type: 'chat',
        title: 'New Guest Message',
        message: `Room ${c.roomNumber}: "${c.message.length > 40 ? c.message.substring(0, 40) + '...' : c.message}"`,
        createdAt: c.createdAt,
        referenceId: c.bookingId,
      })),
      ...orders.map(o => ({
        id: `order-${o.id}`,
        type: 'order',
        title: 'New Food Order',
        message: `Room ${o.roomNumber || 'Walk-in'} ordered service (₹${o.totalAmount})`,
        createdAt: o.createdAt,
        referenceId: o.id,
      })),
      ...tasks.map(t => ({
        id: `housekeeping-${t.id}`,
        type: 'housekeeping',
        title: 'Housekeeping Request',
        message: `Room ${t.roomNumber} needs cleaning: "${t.notes || 'Cleaning needed'}"`,
        createdAt: t.updatedAt,
        referenceId: t.id,
      }))
    ];

    // Sort by createdAt descending
    combinedNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(combinedNotifications.slice(0, 15));
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

export default router;
