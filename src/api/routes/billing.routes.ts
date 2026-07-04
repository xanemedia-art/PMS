import express from 'express';
import { db } from '../../db/index.js';
import { bookings, rooms, housekeepingTasks, plans, invoices, restaurantOrders, hotels, roomTypes, bookingExpenses, users, agentRoomPrices } from '../../db/schema.js';
import { eq, and, ne, lt, gt, desc, sql } from 'drizzle-orm';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.middleware.js';

const router = express.Router();

// Authenticate all billing routes
router.use(authenticateToken);

// Helper function to calculate lodging nights
function calculateNights(checkInStr: string, checkOutStr: string): number {
  try {
    const checkIn = new Date(checkInStr);
    const checkOut = new Date(checkOutStr);
    const diffTime = checkOut.getTime() - checkIn.getTime();
    const nights = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
    return nights;
  } catch (err) {
    return 1;
  }
}

// 1. GET /api/billing/active: Get running bill summaries of all currently checked-in guests
router.get('/active', async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;

    // Get checked in bookings
    const activeBookings = await db.select({
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
        eq(bookings.hotelId, hotelId),
        eq(bookings.status, 'checked_in')
      )
    );

    // Get hotel GST configurations
    const hotelResult = await db.select().from(hotels).where(eq(hotels.id, hotelId)).limit(1);
    const hotelConf = hotelResult[0];
    const roomGstRate = hotelConf?.roomGstRate ?? 12.0;
    const foodGstRate = hotelConf?.foodGstRate ?? 5.0;

    const results = [];

    for (const item of activeBookings) {
      const b = item.booking;
      const nights = calculateNights(b.checkInDate, b.checkOutDate);

      // Determine Room Base Rate
      let roomPrice = item.roomBasePrice || 0;

      // Check if there is agent-specific pricing override
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
      if (b.planId) {
        const p = await db.select().from(plans).where(eq(plans.id, b.planId)).limit(1);
        if (p.length > 0) {
          multiplier = p[0].priceMultiplier ?? 1.0;
        }
      }

      const roomTotalBase = roomPrice * (b.roomCount || 1) * nights * multiplier;

      // Fetch restaurant orders
      const orders = await db.select().from(restaurantOrders).where(
        and(
          eq(restaurantOrders.bookingId, b.id),
          eq(restaurantOrders.status, 'delivered')
        )
      );
      const foodTotalBase = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

      // Fetch custom expenses
      const expenses = await db.select().from(bookingExpenses).where(
        and(
          eq(bookingExpenses.bookingId, b.id)
        )
      );
      const expensesTotalBase = expenses.reduce((sum, exp) => sum + ((exp.amount || 0) * (exp.quantity || 1)), 0);

      // Calculate approximate tax values for UI preview
      const roomTax = roomTotalBase * (roomGstRate / 100);
      const foodTax = foodTotalBase * (foodGstRate / 100);
      
      let customExpensesTax = 0;
      for (const exp of expenses) {
        customExpensesTax += (exp.amount * exp.quantity) * ((exp.gstRate ?? 18.0) / 100);
      }

      const totalTaxable = roomTotalBase + foodTotalBase + expensesTotalBase;
      const totalTax = roomTax + foodTax + customExpensesTax;
      const totalAmount = totalTaxable + totalTax;

      results.push({
        id: b.id,
        guestName: b.guestName,
        guestPhone: b.guestPhone,
        roomNumber: item.roomNumber || 'N/A',
        roomTypeName: item.roomTypeName || 'N/A',
        checkInDate: b.checkInDate,
        checkOutDate: b.checkOutDate,
        nights,
        roomCount: b.roomCount || 1,
        totalTaxable,
        totalTax,
        totalAmount,
        status: b.status,
      });
    }

    res.json(results);
  } catch (error) {
    console.error('Fetch active guest billing list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. GET /api/billing/:bookingId/running-bill: Detailed breakdown of the running bill
router.get('/:bookingId/running-bill', async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const bookingId = parseInt(req.params.bookingId);

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
    const nights = calculateNights(b.checkInDate, b.checkOutDate);

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
      description: `Room Rent (${roomTypeName} - Room ${roomNumber}) - ${nights} Night(s), ${b.roomCount} Room(s) - Plan: ${planName}`,
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
      // Restaurant orders are stored with total amount that already includes GST in the restaurant module,
      // but for proper GST split breakdown, we reverse-engineer/assume the totalAmount as taxableValue + GST (5%)
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
      const taxable = exp.amount * exp.quantity;
      const gst = exp.gstRate ?? 18.0;
      const tax = taxable * (gst / 100);

      return {
        id: exp.id,
        type: 'expense',
        description: exp.name,
        sacCode: exp.sacCode || '999799',
        rate: exp.amount,
        quantity: exp.quantity,
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
    console.error('Fetch running bill breakdown error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. POST /api/billing/:bookingId/expenses: Add a custom expense to the booking
router.post('/:bookingId/expenses', async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const bookingId = parseInt(req.params.bookingId);
    const { name, amount, sacCode, gstRate, quantity } = req.body;

    if (!name || amount === undefined) {
      res.status(400).json({ error: 'Expense Name and Amount are required' });
      return;
    }

    // Verify booking belongs to this hotel
    const bookingCheck = await db.select().from(bookings).where(
      and(
        eq(bookings.id, bookingId),
        eq(bookings.hotelId, hotelId)
      )
    ).limit(1);

    if (bookingCheck.length === 0) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    const newExpense = await db.insert(bookingExpenses).values({
      hotelId,
      bookingId,
      name,
      amount: parseFloat(amount),
      sacCode: sacCode || '999799',
      gstRate: gstRate !== undefined ? parseFloat(gstRate) : 18.0,
      quantity: quantity ? parseInt(quantity) : 1,
    }).returning();

    res.status(201).json({ message: 'Custom expense added successfully', expense: newExpense[0] });
  } catch (error) {
    console.error('Add billing expense error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 4. DELETE /api/billing/expenses/:expenseId: Delete custom expense from booking
router.delete('/expenses/:expenseId', async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const expenseId = parseInt(req.params.expenseId);

    const deleted = await db.delete(bookingExpenses).where(
      and(
        eq(bookingExpenses.id, expenseId),
        eq(bookingExpenses.hotelId, hotelId)
      )
    ).returning();

    if (deleted.length === 0) {
      res.status(404).json({ error: 'Billing expense item not found' });
      return;
    }

    res.json({ message: 'Custom expense deleted successfully' });
  } catch (error) {
    console.error('Delete billing expense error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 5. POST /api/billing/:bookingId/checkout: Finalize stay and create actual GST invoice
router.post('/:bookingId/checkout', async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const bookingId = parseInt(req.params.bookingId);
    const { guestGstin, guestStateName, guestStateCode, transactionType } = req.body;

    // 1. Fetch booking details
    const bookingResult = await db.select({
      booking: bookings,
      roomNumber: rooms.number,
      roomTypeName: roomTypes.name,
      roomBasePrice: roomTypes.price,
      roomId: bookings.roomId,
    })
    .from(bookings)
    .leftJoin(rooms, eq(bookings.roomId, rooms.id))
    .leftJoin(roomTypes, eq(bookings.roomTypeId, roomTypes.id))
    .where(
      and(
        eq(bookings.id, bookingId),
        eq(bookings.hotelId, hotelId),
        ne(bookings.status, 'checked_out')
      )
    ).limit(1);

    if (bookingResult.length === 0) {
      res.status(404).json({ error: 'Booking not found or already checked out' });
      return;
    }

    const { booking: b, roomNumber, roomTypeName, roomBasePrice, roomId } = bookingResult[0];

    // 2. Fetch hotel details
    const hotelResult = await db.select().from(hotels).where(eq(hotels.id, hotelId)).limit(1);
    const hotelConf = hotelResult[0];
    if (!hotelConf) {
      res.status(400).json({ error: 'Hotel details not configured' });
      return;
    }

    const roomGstRate = hotelConf.roomGstRate ?? 12.0;
    const foodGstRate = hotelConf.foodGstRate ?? 5.0;

    // 3. Compute billing details (same logic as running-bill)
    const nights = calculateNights(b.checkInDate, b.checkOutDate);
    
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
    if (b.planId) {
      const p = await db.select().from(plans).where(eq(plans.id, b.planId)).limit(1);
      if (p.length > 0) {
        multiplier = p[0].priceMultiplier ?? 1.0;
      }
    }

    const roomRatePerNight = roomPrice * multiplier;
    const roomTotalBase = roomRatePerNight * (b.roomCount || 1) * nights;

    // Restaurant orders (delivered)
    const orders = await db.select().from(restaurantOrders).where(
      and(
        eq(restaurantOrders.bookingId, bookingId),
        eq(restaurantOrders.status, 'delivered')
      )
    );
    const foodTotalBase = orders.reduce((sum, order) => {
      const total = order.totalAmount || 0;
      return sum + (total / (1 + (foodGstRate / 100)));
    }, 0);

    // Custom expenses
    const expenses = await db.select().from(bookingExpenses).where(
      eq(bookingExpenses.bookingId, bookingId)
    );
    const expensesTotalBase = expenses.reduce((sum, exp) => sum + (exp.amount * exp.quantity), 0);

    // Base taxable value
    const baseAmount = roomTotalBase;
    const extrasAmount = foodTotalBase + expensesTotalBase;
    const totalTaxable = baseAmount + extrasAmount;

    // Tax calculation
    const roomTax = roomTotalBase * (roomGstRate / 100);
    const foodTax = orders.reduce((sum, order) => {
      const total = order.totalAmount || 0;
      const taxable = total / (1 + (foodGstRate / 100));
      return sum + (total - taxable);
    }, 0);
    const customTax = expenses.reduce((sum, exp) => sum + ((exp.amount * exp.quantity) * ((exp.gstRate ?? 18.0) / 100)), 0);

    const totalTax = roomTax + foodTax + customTax;
    const grandTotal = totalTaxable + totalTax;

    // Tax splits
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    const tType = transactionType || 'intra_state';
    if (tType === 'inter_state') {
      igstAmount = totalTax;
    } else {
      cgstAmount = totalTax / 2;
      sgstAmount = totalTax / 2;
    }

    // 4. Generate unique serial invoice number
    const year = new Date().getFullYear();
    const countResult = await db.select({ count: sql`count(*)` }).from(invoices).where(eq(invoices.hotelId, hotelId));
    const invCount = Number(countResult[0]?.count || 0) + 1;
    const serialStr = invCount.toString().padStart(4, '0');
    const invoiceNumber = `INV-${year}-${serialStr}`;

    // 5. Run Database operations in transaction
    await db.transaction(async (tx) => {
      // Create finalized invoice
      await tx.insert(invoices).values({
        hotelId,
        bookingId,
        baseAmount: roomTotalBase,
        extrasAmount: foodTotalBase + expensesTotalBase,
        taxAmount: totalTax,
        totalAmount: grandTotal,
        status: 'paid', // Default checkout to paid invoice
        issuedAt: new Date(),
        invoiceNumber,
        gstin: hotelConf.gstin || null,
        billingStateName: hotelConf.billingStateName || null,
        billingStateCode: hotelConf.billingStateCode || null,
        guestGstin: guestGstin || null,
        guestStateName: guestStateName || null,
        guestStateCode: guestStateCode || null,
        cgstAmount,
        sgstAmount,
        igstAmount,
        transactionType: tType,
      });

      // Update Booking status to checked_out
      await tx.update(bookings).set({ status: 'checked_out' }).where(eq(bookings.id, bookingId));

      // Update Room status to dirty
      if (roomId) {
        await tx.update(rooms).set({ status: 'dirty' }).where(eq(rooms.id, roomId));
        // Add a housekeeping task
        await tx.insert(housekeepingTasks).values({
          hotelId,
          roomId,
          status: 'dirty',
          notes: 'Guest checked out. Clean room and prepare for next occupancy.',
        });
      }
    });

    res.json({ message: 'Guest checked out successfully', invoiceNumber });
  } catch (error) {
    console.error('Guest checkout processing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 6. GET /api/billing/invoices: List all finalized billing invoices
router.get('/invoices', async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;

    const list = await db.select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      bookingId: invoices.bookingId,
      guestName: bookings.guestName,
      roomNumber: rooms.number,
      totalAmount: invoices.totalAmount,
      status: invoices.status,
      issuedAt: invoices.issuedAt,
    })
    .from(invoices)
    .leftJoin(bookings, eq(invoices.bookingId, bookings.id))
    .leftJoin(rooms, eq(bookings.roomId, rooms.id))
    .where(eq(invoices.hotelId, hotelId))
    .orderBy(desc(invoices.issuedAt));

    res.json(list);
  } catch (error) {
    console.error('Fetch invoices history list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 7. GET /api/billing/invoices/:invoiceId: Get details of a single finalized invoice
router.get('/invoices/:invoiceId', async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const invoiceId = parseInt(req.params.invoiceId);

    const invResult = await db.select({
      invoice: invoices,
      guestName: bookings.guestName,
      guestPhone: bookings.guestPhone,
      guestEmail: bookings.guestEmail,
      checkInDate: bookings.checkInDate,
      checkOutDate: bookings.checkOutDate,
      roomNumber: rooms.number,
      roomTypeName: roomTypes.name,
      roomBasePrice: roomTypes.price,
      roomCount: bookings.roomCount,
      planId: bookings.planId,
      bookedById: bookings.bookedById,
      roomTypeId: bookings.roomTypeId,
    })
    .from(invoices)
    .leftJoin(bookings, eq(invoices.bookingId, bookings.id))
    .leftJoin(rooms, eq(bookings.roomId, rooms.id))
    .leftJoin(roomTypes, eq(bookings.roomTypeId, roomTypes.id))
    .where(
      and(
        eq(invoices.id, invoiceId),
        eq(invoices.hotelId, hotelId)
      )
    ).limit(1);

    if (invResult.length === 0) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const info = invResult[0];
    
    // Security restriction for agents: only allow viewing their own bookings' invoices
    if (req.user!.role === 'agent' && info.bookedById !== req.user!.userId) {
      res.status(403).json({ error: 'Forbidden: You can only access invoices for bookings created by you.' });
      return;
    }
    
    const b = info.invoice;

    // Fetch dynamic configs at invoice generation time or configurations
    const hotelResult = await db.select().from(hotels).where(eq(hotels.id, hotelId)).limit(1);
    const hotelConf = hotelResult[0];
    const roomGstRate = hotelConf?.roomGstRate ?? 12.0;
    const foodGstRate = hotelConf?.foodGstRate ?? 5.0;
    const roomSacCode = hotelConf?.roomSacCode ?? '996311';
    const foodSacCode = hotelConf?.foodSacCode ?? '99633';

    // Build items lists (similar to running-bill, but representing historical items)
    const nights = calculateNights(info.checkInDate, info.checkOutDate);

    // Room charges
    let roomPrice = info.roomBasePrice || 0;
    if (info.bookedById) {
      const creator = await db.select().from(users).where(eq(users.id, info.bookedById)).limit(1);
      if (creator.length > 0 && creator[0].role === 'agent' && info.roomTypeId) {
        const agentPrice = await db.select().from(agentRoomPrices).where(and(
          eq(agentRoomPrices.hotelId, hotelId),
          eq(agentRoomPrices.agentId, info.bookedById),
          eq(agentRoomPrices.roomTypeId, info.roomTypeId)
        )).limit(1);
        if (agentPrice.length > 0) {
          roomPrice = agentPrice[0].price;
        }
      }
    }

    let multiplier = 1.0;
    let planName = 'EP (Room Only)';
    if (info.planId) {
      const p = await db.select().from(plans).where(eq(plans.id, info.planId)).limit(1);
      if (p.length > 0) {
        multiplier = p[0].priceMultiplier ?? 1.0;
        planName = p[0].name;
      }
    }

    const roomRatePerNight = roomPrice * multiplier;
    const roomTotalBase = roomRatePerNight * (info.roomCount || 1) * nights;

    const roomItem = {
      description: `Room Rent (${info.roomTypeName} - Room ${info.roomNumber}) - ${nights} Night(s), ${info.roomCount} Room(s) - Plan: ${planName}`,
      sacCode: roomSacCode,
      rate: roomRatePerNight,
      quantity: (info.roomCount || 1) * nights,
      taxableValue: roomTotalBase,
      gstRate: roomGstRate,
      cgstRate: roomGstRate / 2,
      sgstRate: roomGstRate / 2,
      taxAmount: roomTotalBase * (roomGstRate / 100),
    };

    // Restaurant orders (delivered)
    const orders = await db.select().from(restaurantOrders).where(
      and(
        eq(restaurantOrders.bookingId, b.bookingId),
        eq(restaurantOrders.status, 'delivered'),
        lt(restaurantOrders.createdAt, b.issuedAt)
      )
    );
    const orderItems = orders.map((order) => {
      const total = order.totalAmount || 0;
      const taxable = total / (1 + (foodGstRate / 100));
      const tax = total - taxable;

      return {
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

    // Custom added expenses
    const expenses = await db.select().from(bookingExpenses).where(
      and(
        eq(bookingExpenses.bookingId, b.bookingId),
        lt(bookingExpenses.createdAt, b.issuedAt)
      )
    );
    const expenseItems = expenses.map((exp) => {
      const taxable = exp.amount * exp.quantity;
      const gst = exp.gstRate ?? 18.0;
      const tax = taxable * (gst / 100);

      return {
        description: exp.name,
        sacCode: exp.sacCode || '999799',
        rate: exp.amount,
        quantity: exp.quantity,
        taxableValue: taxable,
        gstRate: gst,
        cgstRate: gst / 2,
        sgstRate: gst / 2,
        taxAmount: tax,
      };
    });

    const items = [roomItem, ...orderItems, ...expenseItems];

    res.json({
      invoice: {
        ...b,
        hotelName: hotelConf?.name || 'Xane Partner Hotel',
        hotelAddress: hotelConf?.address || 'India'
      },
      guest: {
        name: info.guestName,
        phone: info.guestPhone,
        email: info.guestEmail,
        checkInDate: info.checkInDate,
        checkOutDate: info.checkOutDate,
        roomNumber: info.roomNumber,
      },
      items,
    });
  } catch (error) {
    console.error('Fetch invoice details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
