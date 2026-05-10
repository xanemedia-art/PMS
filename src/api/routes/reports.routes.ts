import express from 'express';
import { db } from '../../db/index.js';
import { bookings, rooms, users, roomTypes, plans, invoices } from '../../db/schema.js';
import { eq, and, sql, gte, lte } from 'drizzle-orm';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole(['admin', 'manager']));

// Get basic reports dashboard data
router.get('/dashboard', async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    console.log(`Generating report for hotelId: ${hotelId}`);

    // 1. Total rooms and occupied rooms
    const roomsWithPrices = await db.select({
      id: rooms.id,
      status: rooms.status,
      price: roomTypes.price
    })
    .from(rooms)
    .leftJoin(roomTypes, eq(rooms.roomTypeId, roomTypes.id))
    .where(eq(rooms.hotelId, hotelId));

    const totalRooms = roomsWithPrices.length;
    const occupiedRoomsList = roomsWithPrices.filter(r => r.status === 'occupied');
    const occupiedRooms = occupiedRoomsList.length;
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    // Daily Revenue: Sum of prices of all currently occupied rooms
    const dailyRevenue = occupiedRoomsList.reduce((sum, r) => sum + (Number(r.price) || 0), 0);

    const today = new Date().toISOString().split('T')[0];

    // 3. Active Bookings (In-house guests)
    const activeBookings = occupiedRooms;

    // 3.1 Arrivals Today: Confirmed bookings with check-in = today
    const arrivalsTodayResult = await db.select({ count: sql`count(*)`.mapWith(Number) })
      .from(bookings)
      .where(and(
        eq(bookings.hotelId, hotelId),
        eq(bookings.checkInDate, today),
        eq(bookings.status, 'confirmed')
      ));
    const arrivalsToday = arrivalsTodayResult[0]?.count || 0;

    // 3.2 Departures Today: Checked-in bookings with check-out = today
    const departuresTodayResult = await db.select({ count: sql`count(*)`.mapWith(Number) })
      .from(bookings)
      .where(and(
        eq(bookings.hotelId, hotelId),
        eq(bookings.checkOutDate, today),
        eq(bookings.status, 'checked_in')
      ));
    const departuresToday = departuresTodayResult[0]?.count || 0;

    // 3.5 Pending Bookings count (ALL TIME)
    const pendingBookingsResult = await db.select({ count: sql`count(*)`.mapWith(Number) })
      .from(bookings)
      .where(and(
        eq(bookings.hotelId, hotelId),
        eq(bookings.status, 'pending')
      ));
    const pendingBookings = pendingBookingsResult[0]?.count || 0;

    // 3.6 Housekeeping Status
    const dirtyRoomsCount = roomsWithPrices.filter(r => r.status === 'dirty').length;

    // 3.7 All-time revenue
    const allTimeRevenueQuery = await db.select({
      total: sql`sum(${invoices.totalAmount})`.mapWith(Number)
    })
    .from(invoices)
    .where(and(eq(invoices.hotelId, hotelId), eq(invoices.status, 'paid')));
    const allTimeRevenue = allTimeRevenueQuery[0]?.total || 0;
    
    console.log(`[Dashboard] Hotel ${hotelId}: Active=${activeBookings}, Pending=${pendingBookings}, DailyRev=${dailyRevenue}`);

    // 4. Monthly Revenue Trend (Last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5); // Go back 5 months + current month = 6 months
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthExp = sql<string>`to_char(${invoices.issuedAt}, 'Mon')`;
    const yearExp = sql<number>`extract(year from ${invoices.issuedAt})`;
    const monthNumExp = sql<number>`extract(month from ${invoices.issuedAt})`;

    const monthlyRevenueRaw = await db.select({
      monthLabel: monthExp,
      total: sql`sum(${invoices.totalAmount})`.mapWith(Number),
      year: yearExp,
      month: monthNumExp
    })
    .from(invoices)
    .where(and(
      eq(invoices.hotelId, hotelId),
      eq(invoices.status, 'paid'),
      gte(invoices.issuedAt, sixMonthsAgo)
    ))
    .groupBy(monthExp, yearExp, monthNumExp)
    .orderBy(yearExp, monthNumExp);

    // Fill in missing months with zero if needed
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyRevenue: { name: string; total: number }[] = [];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = monthNames[d.getMonth()];
      const found = monthlyRevenueRaw.find(r => r.monthLabel === label);
      monthlyRevenue.push({
        name: label,
        total: found ? found.total : 0
      });
    }

    // 5. Top agents performance
    const topAgentsQuery = await db.select({
      name: users.name,
      bookingsCount: sql`count(${bookings.id})`.mapWith(Number),
      totalCommission: sql`sum(${bookings.agentCommission})`.mapWith(Number),
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.bookedById, users.id))
    .where(and(eq(bookings.hotelId, hotelId), eq(users.role, 'agent')))
    .groupBy(users.id, users.name)
    .orderBy(sql`sum(${bookings.agentCommission}) DESC`)
    .limit(5);

    res.json({
      totalRooms,
      occupiedRooms,
      occupancyRate,
      activeBookings,
      arrivalsToday,
      departuresToday,
      pendingBookings,
      dirtyRooms: dirtyRoomsCount,
      dailyRevenue,
      allTimeRevenue,
      monthlyRevenue,
      topAgents: topAgentsQuery.map(a => ({
        name: a.name,
        bookings: a.bookingsCount,
        commission: a.totalCommission || 0
      }))
    });
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

export default router;
