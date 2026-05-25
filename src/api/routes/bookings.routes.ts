import express from 'express';
import { db } from '../../db/index.js';
import { bookings, rooms, housekeepingTasks, users, plans, invoices, restaurantOrders, guestChats } from '../../db/schema.js';
import { eq, and, gte, lte, lt, gt, ne } from 'drizzle-orm';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticateToken);

// Get all bookings for the tenant's hotel
router.get('/', async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const userRole = req.user!.role;
    const userId = req.user!.userId;

    // Fetch all bookings for the hotel so availability can be calculated accurately
    const queryConditions = eq(bookings.hotelId, hotelId);

    const allBookings = await db.select({
      id: bookings.id,
      hotelId: bookings.hotelId,
      roomId: bookings.roomId,
      roomTypeId: bookings.roomTypeId,
      pax: bookings.pax,
      roomCount: bookings.roomCount,
      planId: bookings.planId,
      bookedById: bookings.bookedById,
      guestName: bookings.guestName,
      guestEmail: bookings.guestEmail,
      guestPhone: bookings.guestPhone,
      checkInDate: bookings.checkInDate,
      checkOutDate: bookings.checkOutDate,
      status: bookings.status,
      agentCommission: bookings.agentCommission,
      notes: bookings.notes,
      extraBeddings: bookings.extraBeddings,
      createdAt: bookings.createdAt,
      bookedBy: {
        name: users.name,
        role: users.role
      },
      plan: {
        name: plans.name
      },
      roomNumber: rooms.number
    })
    .from(bookings)
    .leftJoin(users, eq(bookings.bookedById, users.id))
    .leftJoin(rooms, eq(bookings.roomId, rooms.id))
    .leftJoin(plans, eq(bookings.planId, plans.id))
    .where(queryConditions);
    
    // Obscure sensitive data for agents looking at other people's bookings
    const sanitizedBookings = allBookings.map(b => {
      if (userRole === 'agent' && b.bookedById !== userId) {
        return {
          ...b,
          guestName: 'Occupied',
          guestEmail: null,
          agentCommission: null,
          bookedBy: { name: 'Other', role: 'staff' }
        };
      }
      return b;
    });

    res.json(sanitizedBookings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Create a booking
router.post('/', async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const bookedById = req.user!.userId;
    const userRole = req.user!.role;
    const { roomId, roomTypeId, roomCount, roomConfigs, planId, guestName, guestEmail, guestPhone, checkInDate, checkOutDate, agentCommission } = req.body;

    const normalizedCheckIn = new Date(checkInDate).toISOString().split('T')[0];
    const normalizedCheckOut = new Date(checkOutDate).toISOString().split('T')[0];

    // If roomId is provided and valid, validate it and check for overlaps
    if (roomId !== null && roomId !== undefined && !isNaN(roomId) && roomId !== '') {
      const room = await db.select().from(rooms).where(and(eq(rooms.id, parseInt(roomId)), eq(rooms.hotelId, hotelId))).limit(1);
      if (!room || room.length === 0) {
        res.status(400).json({ error: 'Invalid room' });
        return;
      }

      const overlappingBookings = await db.select().from(bookings).where(
        and(
          eq(bookings.roomId, parseInt(roomId)),
          eq(bookings.hotelId, hotelId),
          ne(bookings.status, 'cancelled'),
          ne(bookings.status, 'pending'),
          lt(bookings.checkInDate, normalizedCheckOut),
          gt(bookings.checkOutDate, normalizedCheckIn)
        )
      );

      if (overlappingBookings.length > 0) {
        res.status(409).json({ 
          error: 'Room is already booked for these dates',
          overlappingBooking: overlappingBookings[0]
        });
        return;
      }
    } else if (!roomTypeId) {
      res.status(400).json({ error: 'Either roomId or roomTypeId must be provided' });
      return;
    }

    // Overbooking Protection for Room Types
    const targetRoomTypeId = roomId 
      ? (await db.select().from(rooms).where(eq(rooms.id, parseInt(roomId))).limit(1))[0]?.roomTypeId 
      : roomTypeId ? parseInt(roomTypeId) : null;

    if (targetRoomTypeId) {
      const totalRoomsOfThisType = await db.select().from(rooms).where(and(eq(rooms.roomTypeId, targetRoomTypeId), eq(rooms.hotelId, hotelId)));
      const maxCapacity = totalRoomsOfThisType.length;

      const overlappingBookingsAll = await db.select({
        bookings: bookings,
        rooms: rooms
      }).from(bookings)
        .leftJoin(rooms, eq(bookings.roomId, rooms.id))
        .where(
          and(
            eq(bookings.hotelId, hotelId),
            ne(bookings.status, 'cancelled'),
            ne(bookings.status, 'checked_out'),
            ne(bookings.status, 'pending'),
            lt(bookings.checkInDate, normalizedCheckOut),
            gt(bookings.checkOutDate, normalizedCheckIn)
          )
        );

      let isOverbooked = false;
      const requestedRooms = roomCount ? parseInt(roomCount) : 1;
      let currentDate = new Date(normalizedCheckIn);
      const end = new Date(normalizedCheckOut);
      
      while (currentDate < end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        let occupiedOnThisDay = 0;
        
        for (const b of overlappingBookingsAll) {
          if (b.bookings.checkInDate <= dateStr && b.bookings.checkOutDate > dateStr) {
             const isMatch = (b.bookings.roomTypeId === targetRoomTypeId) || (b.rooms && b.rooms.roomTypeId === targetRoomTypeId);
             if (isMatch) {
               occupiedOnThisDay += (b.bookings.roomCount || 1);
             }
          }
        }
        
        if (occupiedOnThisDay + requestedRooms > maxCapacity) {
          isOverbooked = true;
          break;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      if (isOverbooked) {
        res.status(409).json({ error: 'Overbooking Protection: Not enough available rooms of this type for the selected dates' });
        return;
      }
    }

    const numRooms = roomCount ? parseInt(roomCount) : 1;
    const configs = Array.isArray(roomConfigs) ? roomConfigs : [];

    const valuesToInsert = [];
    for (let i = 0; i < numRooms; i++) {
       const config = configs[i] || { pax: 1, extraBeddings: 0, notes: '' };

       valuesToInsert.push({
          hotelId,
          roomId: roomId ? parseInt(roomId) : null,
          roomTypeId: roomTypeId ? parseInt(roomTypeId) : null,
          pax: config.pax ? parseInt(config.pax) : 1,
          extraBeddings: config.extraBeddings ? parseInt(config.extraBeddings) : 0,
          notes: config.notes || null,
          roomCount: 1,
          planId,
          bookedById,
          guestName: numRooms > 1 ? `${guestName} (Room ${i + 1}/${numRooms})` : guestName,
          guestEmail,
          guestPhone,
          checkInDate: normalizedCheckIn,
          checkOutDate: normalizedCheckOut,
          agentCommission: userRole === 'agent' ? agentCommission : null,
          status: 'pending'
       });
    }

    const newBookings = await db.insert(bookings).values(valuesToInsert).returning();

    res.json(newBookings[0]);
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Update booking status or assign room
router.patch('/:id/status', requireRole(['admin', 'manager', 'staff']), async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const id = parseInt(req.params.id);
    const { status, roomId } = req.body;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (roomId) updateData.roomId = roomId;

    const updated = await db.update(bookings)
      .set(updateData)
      .where(and(eq(bookings.id, id), eq(bookings.hotelId, hotelId)))
      .returning();

    if (updated.length === 0) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    if (status === 'cancelled') {
        if (updated[0].roomId) {
            await db.update(rooms).set({ status: 'available' }).where(eq(rooms.id, updated[0].roomId));
        }
    } else if (status === 'checked_out') {
        if (updated[0].roomId) {
            await db.update(rooms).set({ status: 'dirty' }).where(eq(rooms.id, updated[0].roomId));
            // Also create a housekeeping task
            await db.insert(housekeepingTasks).values({
              hotelId,
              roomId: updated[0].roomId,
              status: 'dirty',
              notes: 'Room requires cleaning after check-out'
            });
        }
    } else if (status === 'checked_in') {
        let assignedRoomId = updated[0].roomId;
        
        if (!assignedRoomId) {
            const b = updated[0];
            if (!b.roomTypeId) {
                res.status(400).json({ error: 'Cannot auto-assign room: Booking has no room type' });
                return;
            }
            
            const availableRoomsOfType = await db.select().from(rooms).where(
              and(
                eq(rooms.roomTypeId, b.roomTypeId), 
                eq(rooms.hotelId, hotelId),
                eq(rooms.status, 'available')
              )
            );
            
            const overlapping = await db.select().from(bookings).where(
              and(
                eq(bookings.hotelId, hotelId),
                ne(bookings.status, 'cancelled'),
                ne(bookings.status, 'checked_out'),
                ne(bookings.status, 'pending'),
                lt(bookings.checkInDate, b.checkOutDate),
                gt(bookings.checkOutDate, b.checkInDate),
                ne(bookings.id, id)
              )
            );
            
            const occupiedRoomIds = new Set(overlapping.map(ob => ob.roomId).filter(Boolean));
            const freeRoom = availableRoomsOfType.find(r => !occupiedRoomIds.has(r.id));
            
            if (!freeRoom) {
               await db.update(bookings).set({ status: 'confirmed' }).where(eq(bookings.id, id));
               res.status(400).json({ error: 'No available rooms found for automatic assignment.' });
               return;
            }
            
            assignedRoomId = freeRoom.id;
            await db.update(bookings).set({ roomId: assignedRoomId }).where(eq(bookings.id, id));
        }
        const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
        await db.update(rooms).set({ status: 'occupied', guestPin: randomPin }).where(eq(rooms.id, assignedRoomId));
    }
    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update booking status' });
  }
});

// Delete a booking
router.delete('/:id', requireRole(['admin', 'manager']), async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid booking ID' });
      return;
    }

    await db.transaction(async (tx) => {
      // 1. Fetch booking to check status and room
      const bookingRecord = await tx.select().from(bookings).where(and(eq(bookings.id, id), eq(bookings.hotelId, hotelId))).limit(1);
      if (bookingRecord.length === 0) {
        throw new Error('Booking not found');
      }

      const booking = bookingRecord[0];

      // 2. If checked in, free up the room and clear PIN
      if (booking.status === 'checked_in' && booking.roomId) {
        await tx.update(rooms).set({ status: 'available', guestPin: null }).where(eq(rooms.id, booking.roomId));
      }

      // 3. Delete invoices
      await tx.delete(invoices).where(and(eq(invoices.bookingId, id), eq(invoices.hotelId, hotelId)));

      // 4. Delete restaurant orders
      await tx.delete(restaurantOrders).where(and(eq(restaurantOrders.bookingId, id), eq(restaurantOrders.hotelId, hotelId)));

      // 5. Delete guest chats
      await tx.delete(guestChats).where(and(eq(guestChats.bookingId, id), eq(guestChats.hotelId, hotelId)));

      // 6. Delete the booking itself
      await tx.delete(bookings).where(and(eq(bookings.id, id), eq(bookings.hotelId, hotelId)));
    });

    res.json({ success: true, message: 'Booking and all associated records deleted successfully' });
  } catch (error: any) {
    console.error('Delete booking error:', error);
    if (error.message === 'Booking not found') {
      res.status(404).json({ error: 'Booking not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete booking' });
    }
  }
});

export default router;
