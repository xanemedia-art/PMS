import express from 'express';
import { db } from '../../db/index.js';
import { bookings, rooms, housekeepingTasks, users, plans, invoices, restaurantOrders, guestChats, hotels, roomTypes, agentRoomPrices } from '../../db/schema.js';
import { eq, and, gte, lte, lt, gt, ne } from 'drizzle-orm';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.middleware.js';
import { sendEmail, getBookingConfirmationHtml, getCheckInConfirmationHtml, getCheckOutConfirmationHtml, getBookingCancellationHtml, getBookingStatusConfirmedHtml, getAdminBookingAlertHtml } from '../utils/email.js';

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

    // Send email notifications asynchronously
    if (newBookings.length > 0) {
      const createdBooking = newBookings[0];
      
      // Run as IIFE to not block API response
      (async () => {
        try {
          const hotelResult = await db.select().from(hotels).where(eq(hotels.id, hotelId)).limit(1);
          const hotelInfo = hotelResult[0] || { name: process.env.HOTEL_NAME || 'Hotel', address: process.env.HOTEL_ADDRESS || '' };
          
          let roomTypeName = 'Selected Room';
          if (createdBooking.roomTypeId) {
            const rtResult = await db.select().from(roomTypes).where(eq(roomTypes.id, createdBooking.roomTypeId)).limit(1);
            if (rtResult.length > 0) {
              roomTypeName = rtResult[0].name;
            }
          }

          let planName = 'Standard Plan';
          if (createdBooking.planId) {
            const planResult = await db.select().from(plans).where(eq(plans.id, createdBooking.planId)).limit(1);
            if (planResult.length > 0) {
              planName = planResult[0].name;
            }
          }

          const emailData = {
            ...createdBooking,
            roomTypeName,
            planName,
          };

          // Send based on exact combination matrix
          const adminUsers = await db.select().from(users).where(and(eq(users.hotelId, hotelId), eq(users.role, 'admin')));
          const adminEmails = adminUsers.map(u => u.email).filter(Boolean) as string[];
          const creatorResult = bookedById ? await db.select().from(users).where(eq(users.id, bookedById)).limit(1) : [];
          const creator = creatorResult[0];

          if (creator && creator.role === 'agent') {
            // Agent -> Agent + Admin
            if (creator.email) {
              await sendEmail({
                to: creator.email,
                subject: `Booking Confirmed (Created by You) - Reference: #B-${createdBooking.id} - ${hotelInfo.name}`,
                text: `You have successfully created a booking! Reference: #B-${createdBooking.id}. Guest Name: ${createdBooking.guestName}. Check-in: ${createdBooking.checkInDate}. Check-out: ${createdBooking.checkOutDate}.`,
                html: getBookingConfirmationHtml(emailData, hotelInfo)
              });
            }
            for (const adminEmail of adminEmails) {
              await sendEmail({
                to: adminEmail,
                subject: `New Agent Booking Created - Reference: #B-${createdBooking.id} - ${hotelInfo.name}`,
                text: `A new booking has been created by agent ${creator.name}! Reference: #B-${createdBooking.id}. Guest Name: ${createdBooking.guestName}. Check-in: ${createdBooking.checkInDate}. Check-out: ${createdBooking.checkOutDate}.`,
                html: getBookingConfirmationHtml(emailData, hotelInfo)
              });
            }
          } else {
            // Staff / Admin / Guest (if no creator) -> Guest only
            if (createdBooking.guestEmail) {
              await sendEmail({
                to: createdBooking.guestEmail,
                subject: `Booking Confirmation - ${hotelInfo.name}`,
                text: `Thank you for your booking! Reference: #B-${createdBooking.id}. Guest Name: ${createdBooking.guestName}. Check-in: ${createdBooking.checkInDate}. Check-out: ${createdBooking.checkOutDate}.`,
                html: getBookingConfirmationHtml(emailData, hotelInfo)
              });
            }
          }
        } catch (mailErr) {
          console.error('Failed to dispatch bookings portal emails:', mailErr);
        }
      })();
    }

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
        
        // Calculate and create invoice dynamically
        (async () => {
          try {
            const b = updated[0];
            const nights = Math.max(1, Math.round((new Date(b.checkOutDate).getTime() - new Date(b.checkInDate).getTime()) / (1000 * 60 * 60 * 24)));
            
            // Determine the room type price
            let roomPrice = 0;
            if (b.roomTypeId) {
              const rt = await db.select().from(roomTypes).where(eq(roomTypes.id, b.roomTypeId)).limit(1);
              if (rt.length > 0) {
                roomPrice = rt[0].price;
              }
            }

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

            // Meal Plan Multiplier
            let multiplier = 1.0;
            if (b.planId) {
              const p = await db.select().from(plans).where(eq(plans.id, b.planId)).limit(1);
              if (p.length > 0) {
                multiplier = p[0].priceMultiplier || 1.0;
              }
            }

            const baseAmount = roomPrice * (b.roomCount || 1) * nights * multiplier;

            // Extras: Delivered restaurant orders billed to room
            const orders = await db.select().from(restaurantOrders).where(and(
              eq(restaurantOrders.bookingId, b.id),
              eq(restaurantOrders.status, 'delivered')
            ));
            const extrasAmount = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

            // Taxes (12%)
            const taxAmount = (baseAmount + extrasAmount) * 0.12;
            const totalAmount = baseAmount + extrasAmount + taxAmount;

            // Clean up existing invoice if any exists first (safe fallback)
            await db.delete(invoices).where(eq(invoices.bookingId, b.id));
            
            await db.insert(invoices).values({
              hotelId,
              bookingId: b.id,
              baseAmount,
              extrasAmount,
              taxAmount,
              totalAmount,
              status: 'paid',
              issuedAt: new Date()
            });
            console.log(`Generated paid invoice for booking Ref #B-${b.id}. Base=${baseAmount}, Extras=${extrasAmount}, Tax=${taxAmount}, Total=${totalAmount}`);
          } catch (invErr) {
            console.error('Failed to automatically generate invoice on check-out:', invErr);
          }
        })();
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

    // Re-fetch booking to get updated roomId after room assignment
    let booking = updated[0];
    if (status === 'checked_in') {
      const refreshed = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
      if (refreshed.length > 0) booking = refreshed[0];
    }

    // Send email confirmations asynchronously
    if (booking && booking.guestEmail) {
      (async () => {
        try {
          const hotelResult = await db.select().from(hotels).where(eq(hotels.id, hotelId)).limit(1);
          const hotelInfo = hotelResult[0] || { name: process.env.HOTEL_NAME || 'Hotel', address: process.env.HOTEL_ADDRESS || '' };

          if (status === 'confirmed') {
            await sendEmail({
              to: booking.guestEmail!,
              subject: `Booking Confirmed - ${hotelInfo.name} | Ref #B-${booking.id}`,
              text: `Hello ${booking.guestName},\n\nGreat news! Your booking reference #B-${booking.id} has been confirmed by the hotel team. Check-in: ${booking.checkInDate}. Check-out: ${booking.checkOutDate}. We look forward to welcoming you!`,
              html: getBookingStatusConfirmedHtml(booking, hotelInfo)
            });
          } else if (status === 'checked_in') {
            let pinCode = '';
            let roomNum = 'TBD';
            const roomResult = booking.roomId ? await db.select().from(rooms).where(eq(rooms.id, booking.roomId)).limit(1) : [];
            if (roomResult.length > 0) {
              roomNum = roomResult[0].number;
              pinCode = roomResult[0].guestPin || '';
            }
            await sendEmail({
              to: booking.guestEmail!,
              subject: `Welcome to ${hotelInfo.name} - Check-In Confirmation`,
              text: `Hello ${booking.guestName},\n\nYou have checked in. Your assigned room is ${roomNum}. Your guest portal login PIN is: ${pinCode}.\n\nEnjoy your stay!`,
              html: getCheckInConfirmationHtml(booking, roomNum, pinCode, hotelInfo)
            });
          } else if (status === 'checked_out') {
            const adminUsers = await db.select().from(users).where(and(eq(users.hotelId, hotelId), eq(users.role, 'admin')));
            const adminEmails = adminUsers.map(u => u.email).filter(Boolean) as string[];
            const creatorResult = booking.bookedById ? await db.select().from(users).where(eq(users.id, booking.bookedById)).limit(1) : [];
            const creator = creatorResult[0];

            if (creator && creator.role === 'agent') {
              // Agent -> Agent + Admin
              if (creator.email) {
                await sendEmail({
                  to: creator.email,
                  subject: `Guest Checked Out (Booking Created by You) - Ref #B-${booking.id} - ${hotelInfo.name}`,
                  text: `Hello ${creator.name},\n\nThe guest ${booking.guestName} for booking reference #B-${booking.id} has checked out.`,
                  html: getCheckOutConfirmationHtml(booking, hotelInfo)
                });
              }
              for (const adminEmail of adminEmails) {
                await sendEmail({
                  to: adminEmail,
                  subject: `[Alert] Guest Checked Out - ${booking.guestName} | ${hotelInfo.name}`,
                  text: `${booking.guestName} has checked out. Booking Reference: #B-${booking.id}.`,
                  html: getCheckOutConfirmationHtml(booking, hotelInfo)
                });
              }
            } else if (!booking.bookedById) {
              // Guest (Public Booking) -> Client + Admin
              if (booking.guestEmail) {
                await sendEmail({
                  to: booking.guestEmail,
                  subject: `Thank you for staying with us - ${hotelInfo.name}`,
                  text: `Hello ${booking.guestName},\n\nYour check-out has been processed. Thank you for staying at ${hotelInfo.name}. We hope to see you again!`,
                  html: getCheckOutConfirmationHtml(booking, hotelInfo)
                });
              }
              for (const adminEmail of adminEmails) {
                await sendEmail({
                  to: adminEmail,
                  subject: `[Alert] Guest Checked Out - ${booking.guestName} | ${hotelInfo.name}`,
                  text: `${booking.guestName} has checked out. Booking Reference: #B-${booking.id}.`,
                  html: getCheckOutConfirmationHtml(booking, hotelInfo)
                });
              }
            } else {
              // Staff / Admin -> Guest only
              if (booking.guestEmail) {
                await sendEmail({
                  to: booking.guestEmail,
                  subject: `Thank you for staying with us - ${hotelInfo.name}`,
                  text: `Hello ${booking.guestName},\n\nYour check-out has been processed. Thank you for staying at ${hotelInfo.name}. We hope to see you again!`,
                  html: getCheckOutConfirmationHtml(booking, hotelInfo)
                });
              }
            }
          } else if (status === 'cancelled') {
            await sendEmail({
              to: booking.guestEmail!,
              subject: `Reservation Cancelled - ${hotelInfo.name}`,
              text: `Hello ${booking.guestName},\n\nThis is to confirm your booking reference #B-${booking.id} has been cancelled.`,
              html: getBookingCancellationHtml(booking, hotelInfo)
            });
          }

          // Admin notification on check-in only (checkout handled by combinations above)
          if (status === 'checked_in') {
            const adminUsers = await db.select().from(users).where(and(eq(users.hotelId, hotelId), eq(users.role, 'admin'))).limit(1);
            if (adminUsers.length > 0 && adminUsers[0].email) {
              let roomNumForAdmin = 'N/A';
              if (booking.roomId) {
                const roomRes = await db.select().from(rooms).where(eq(rooms.id, booking.roomId)).limit(1);
                if (roomRes.length > 0) roomNumForAdmin = roomRes[0].number;
              }
              const bookingForEmail = { ...booking, roomNumber: roomNumForAdmin };
              await sendEmail({
                to: adminUsers[0].email,
                subject: `[Alert] Guest Checked In - ${booking.guestName} | ${hotelInfo.name}`,
                text: `${booking.guestName} has checked in. Booking Reference: #B-${booking.id}. Room: ${roomNumForAdmin}.`,
                html: getAdminBookingAlertHtml(bookingForEmail, 'checkin', hotelInfo)
              });
            }
          }
        } catch (mailErr) {
          console.error('Failed to send status update emails:', mailErr);
        }
      })();
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
