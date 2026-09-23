import express from 'express';
import crypto from 'crypto';
import { db } from '../../db/index.js';
import { hotels, plans, roomTypes, rooms, bookings, users } from '../../db/schema.js';
import { eq, and, ne, lt, gt, inArray } from 'drizzle-orm';
import { sendEmail, getBookingConfirmationHtml } from '../utils/email.js';

const router = express.Router();

// In-memory caching for public endpoints to shield remote database round-trips
let hotelsCache: { data: any; expiry: number } | null = null;
const hotelDetailCache = new Map<number, { data: any; expiry: number }>();
const hotelSlugCache = new Map<string, { data: any; expiry: number }>();
const availabilityCache = new Map<string, { data: any; expiry: number }>();

export const clearPublicAvailabilityCache = (hotelId?: number) => {
  if (hotelId) {
    for (const key of availabilityCache.keys()) {
      if (key.startsWith(`${hotelId}:`)) {
        availabilityCache.delete(key);
      }
    }
  } else {
    availabilityCache.clear();
  }
};

// GET /api/public/hotels
router.get('/hotels', async (req, res) => {
  try {
    const now = Date.now();
    if (hotelsCache && hotelsCache.expiry > now) {
      return res.json(hotelsCache.data);
    }

    const allHotels = await db.select({
      id: hotels.id,
      name: hotels.name,
      address: hotels.address,
      slug: hotels.slug
    }).from(hotels);

    hotelsCache = { data: allHotels, expiry: now + 60000 }; // 60s cache
    res.json(allHotels);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// GET /api/public/hotel/:hotelId
router.get('/hotel/:hotelId', async (req, res) => {
  try {
    const hotelId = parseInt(req.params.hotelId);
    if (isNaN(hotelId)) {
      res.status(400).json({ error: 'Invalid hotel ID' });
      return;
    }

    const now = Date.now();
    const cached = hotelDetailCache.get(hotelId);
    if (cached && cached.expiry > now) {
      return res.json(cached.data);
    }

    const [hotel, hotelPlans] = await Promise.all([
      db.select({
        id: hotels.id,
        name: hotels.name,
        address: hotels.address,
        slug: hotels.slug,
        gstin: hotels.gstin,
        billingStateName: hotels.billingStateName,
        billingStateCode: hotels.billingStateCode,
        roomGstRate: hotels.roomGstRate,
        foodGstRate: hotels.foodGstRate,
      }).from(hotels).where(eq(hotels.id, hotelId)).limit(1),
      db.select().from(plans).where(eq(plans.hotelId, hotelId))
    ]);

    if (!hotel || hotel.length === 0) {
      res.status(404).json({ error: 'Hotel not found' });
      return;
    }

    const result = {
      hotel: hotel[0],
      plans: hotelPlans
    };

    hotelDetailCache.set(hotelId, { data: result, expiry: now + 60000 });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch hotel data' });
  }
});

// GET /api/public/hotel/s/:slug
router.get('/hotel/s/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    if (!slug) {
      res.status(400).json({ error: 'Slug parameter is required' });
      return;
    }

    const now = Date.now();
    const cached = hotelSlugCache.get(slug);
    if (cached && cached.expiry > now) {
      return res.json(cached.data);
    }

    const hotel = await db.select({
      id: hotels.id,
      name: hotels.name,
      address: hotels.address,
      slug: hotels.slug,
      gstin: hotels.gstin,
      billingStateName: hotels.billingStateName,
      billingStateCode: hotels.billingStateCode,
      roomGstRate: hotels.roomGstRate,
      foodGstRate: hotels.foodGstRate,
    }).from(hotels).where(eq(hotels.slug, slug)).limit(1);

    if (!hotel || hotel.length === 0) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }

    const hotelId = hotel[0].id;
    const hotelPlans = await db.select().from(plans).where(eq(plans.hotelId, hotelId));

    const result = {
      hotel: hotel[0],
      plans: hotelPlans
    };

    hotelSlugCache.set(slug, { data: result, expiry: now + 60000 });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch hotel data by slug' });
  }
});

// GET /api/public/hotel/:hotelId/availability
router.get('/hotel/:hotelId/availability', async (req, res) => {
  try {
    const hotelId = parseInt(req.params.hotelId);
    const { checkInDate, checkOutDate, guests } = req.query;

    if (isNaN(hotelId) || !checkInDate || !checkOutDate) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    const normalizedCheckIn = new Date(checkInDate as string).toISOString().split('T')[0];
    const normalizedCheckOut = new Date(checkOutDate as string).toISOString().split('T')[0];
    const cacheKey = `${hotelId}:${normalizedCheckIn}:${normalizedCheckOut}:${guests || ''}`;

    const now = Date.now();
    const cached = availabilityCache.get(cacheKey);
    if (cached && cached.expiry > now) {
      return res.json(cached.data);
    }

    // Parallel fetch: roomTypes, rooms, and overlappingBookings concurrently
    const [allRoomTypes, allRooms, overlappingBookingsAll] = await Promise.all([
      db.select().from(roomTypes).where(eq(roomTypes.hotelId, hotelId)),
      db.select().from(rooms).where(eq(rooms.hotelId, hotelId)),
      db.select({
        bookings: bookings,
        rooms: rooms
      }).from(bookings)
        .leftJoin(rooms, eq(bookings.roomId, rooms.id))
        .where(
          and(
            eq(bookings.hotelId, hotelId),
            inArray(bookings.status, ['confirmed', 'checked_in']),
            lt(bookings.checkInDate, normalizedCheckOut),
            gt(bookings.checkOutDate, normalizedCheckIn)
          )
        )
    ]);

    // Calculate availability per room type
    const availableRoomTypes = allRoomTypes.map(rt => {
      // Find total rooms of this type
      const maxCapacity = allRooms.filter(r => r.roomTypeId === rt.id).length;
      
      let maxOccupied = 0;
      let currentDate = new Date(normalizedCheckIn);
      const end = new Date(normalizedCheckOut);
      
      while (currentDate < end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        let occupiedOnThisDay = 0;
        
        for (const b of overlappingBookingsAll) {
          if (b.bookings.checkInDate <= dateStr && b.bookings.checkOutDate > dateStr) {
             const isMatch = (b.bookings.roomTypeId === rt.id) || (b.rooms && b.rooms.roomTypeId === rt.id);
             if (isMatch) {
               occupiedOnThisDay += (b.bookings.roomCount || 1);
             }
          }
        }
        
        if (occupiedOnThisDay > maxOccupied) {
          maxOccupied = occupiedOnThisDay;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const availableCount = Math.max(0, maxCapacity - maxOccupied);

      return {
        ...rt,
        availableCount
      };
    });

    // Filter by capacity if requested
    const filteredRoomTypes = availableRoomTypes.filter(rt => {
      if (guests && parseInt(guests as string) > rt.capacity) return false;
      return true;
    });

    const options = filteredRoomTypes.map(rt => ({
      id: rt.id.toString(),
      roomTypeId: rt.id,
      name: rt.name,
      capacity: rt.capacity,
      price: rt.price,
      availableCount: rt.availableCount,
      imageUrl: rt.imageUrl,
      images: rt.images ? JSON.parse(rt.images) : [],
      description: rt.description,
      amenities: rt.amenities ? JSON.parse(rt.amenities) : []
    }));

    availabilityCache.set(cacheKey, { data: options, expiry: now + 30000 }); // 30s cache
    res.json(options);
  } catch (error) {
    console.error('Availability check error:', error);
    res.status(500).json({ error: 'Failed to check availability' });
  }
});

// POST /api/public/hotel/:hotelId/book
router.post('/hotel/:hotelId/book', async (req, res) => {
  try {
    const hotelId = parseInt(req.params.hotelId);
    const { roomTypeId, roomCount, planId, guestName, guestEmail, guestPhone, pax, extraBeddings, notes, checkInDate, checkOutDate, totalEstimatedAmount, amountPaid, paymentStatus, guestMembers } = req.body;

    if (isNaN(hotelId) || !roomTypeId || !guestName || !checkInDate || !checkOutDate) {
        res.status(400).json({ error: 'Missing required parameters' });
        return;
    }

    const normalizedCheckIn = new Date(checkInDate).toISOString().split('T')[0];
    const normalizedCheckOut = new Date(checkOutDate).toISOString().split('T')[0];

    // Basic overbooking protection check again
    const totalRoomsOfThisType = await db.select().from(rooms).where(and(eq(rooms.roomTypeId, parseInt(roomTypeId)), eq(rooms.hotelId, hotelId)));
    const maxCapacity = totalRoomsOfThisType.length;

    const overlappingBookingsAll = await db.select({
      bookings: bookings,
      rooms: rooms
    }).from(bookings)
      .leftJoin(rooms, eq(bookings.roomId, rooms.id))
      .where(
        and(
          eq(bookings.hotelId, hotelId),
          inArray(bookings.status, ['confirmed', 'checked_in']),
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
            const isMatch = (b.bookings.roomTypeId === parseInt(roomTypeId)) || (b.rooms && b.rooms.roomTypeId === parseInt(roomTypeId));
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
      res.status(409).json({ error: 'Rooms are no longer available for the selected dates' });
      return;
    }

    const numRooms = roomCount ? parseInt(roomCount) : 1;
    const valuesToInsert = [];
    const perRoomEstimated = totalEstimatedAmount ? (parseFloat(totalEstimatedAmount) / numRooms) : null;
    const perRoomPaid = amountPaid ? (parseFloat(amountPaid) / numRooms) : perRoomEstimated;
    
    for (let i = 0; i < numRooms; i++) {
        valuesToInsert.push({
          hotelId,
          roomId: null,
          roomTypeId: parseInt(roomTypeId),
          pax: pax ? parseInt(pax) : 1,
          extraBeddings: extraBeddings ? parseInt(extraBeddings) : 0,
          roomCount: 1,
          planId: planId ? parseInt(planId) : null,
          bookedById: null, // Public booking has no bookedById
          guestName: numRooms > 1 ? `${guestName} (Room ${i + 1}/${numRooms})` : guestName,
          guestEmail,
          guestPhone,
          checkInDate: normalizedCheckIn,
          checkOutDate: normalizedCheckOut,
          status: 'pending' as const,
          paymentStatus: 'pay_at_checkout' as const,
          totalEstimatedAmount: perRoomEstimated,
          amountPaid: 0,
          paymentMethod: 'pay_at_checkout',
          notes: notes || null,
          guestMembers: guestMembers ? (typeof guestMembers === 'string' ? guestMembers : JSON.stringify(guestMembers)) : null,
          selfCheckInToken: crypto.randomUUID(),
        });
    }

    const newBookings = await db.insert(bookings).values(valuesToInsert).returning();
    clearPublicAvailabilityCache(hotelId);

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

          // Send to Guest
          if (createdBooking.guestEmail) {
            await sendEmail({
              to: createdBooking.guestEmail,
              subject: `Booking Confirmation - ${hotelInfo.name}`,
              text: `Thank you for your booking! Reference: #B-${createdBooking.id}. Guest Name: ${createdBooking.guestName}. Check-in: ${createdBooking.checkInDate}. Check-out: ${createdBooking.checkOutDate}.`,
              html: getBookingConfirmationHtml(emailData, hotelInfo)
            });
          }

          // Send to Hotel Admins (Client + Admin combination)
          const adminUsers = await db.select().from(users).where(and(eq(users.hotelId, hotelId), eq(users.role, 'admin')));
          const adminEmails = adminUsers.map(u => u.email).filter(Boolean) as string[];
          for (const adminEmail of adminEmails) {
            await sendEmail({
              to: adminEmail,
              subject: `New Booking Alert - Reference: #B-${createdBooking.id} - ${hotelInfo.name}`,
              text: `A new booking has been made! Reference: #B-${createdBooking.id}. Guest Name: ${createdBooking.guestName}. Check-in: ${createdBooking.checkInDate}. Check-out: ${createdBooking.checkOutDate}.`,
              html: getBookingConfirmationHtml(emailData, hotelInfo)
            });
          }
        } catch (mailErr) {
          console.error('Failed to dispatch public booking emails:', mailErr);
        }
      })();
    }

    res.json({
      ...newBookings[0],
      checkInUrl: newBookings[0].selfCheckInToken ? `/checkin/${newBookings[0].selfCheckInToken}` : null
    });

  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// GET /api/public/checkin/:token
router.get('/checkin/:token', async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      res.status(400).json({ error: 'Check-in token is required' });
      return;
    }

    const bookingResult = await db.select({
      booking: bookings,
      hotel: hotels,
      roomType: roomTypes,
      plan: plans,
      room: rooms
    })
    .from(bookings)
    .innerJoin(hotels, eq(bookings.hotelId, hotels.id))
    .leftJoin(roomTypes, eq(bookings.roomTypeId, roomTypes.id))
    .leftJoin(plans, eq(bookings.planId, plans.id))
    .leftJoin(rooms, eq(bookings.roomId, rooms.id))
    .where(eq(bookings.selfCheckInToken, token))
    .limit(1);

    if (bookingResult.length === 0) {
      res.status(404).json({ error: 'Reservation not found or check-in link has expired' });
      return;
    }

    const row = bookingResult[0];
    let members = [];
    if (row.booking.guestMembers) {
      try {
        members = JSON.parse(row.booking.guestMembers);
      } catch {}
    }

    let checkInDetails = null;
    if (row.booking.checkInDetails) {
      try {
        checkInDetails = JSON.parse(row.booking.checkInDetails);
      } catch {}
    }

    res.json({
      booking: {
        id: row.booking.id,
        guestName: row.booking.guestName,
        guestEmail: row.booking.guestEmail,
        guestPhone: row.booking.guestPhone,
        checkInDate: row.booking.checkInDate,
        checkOutDate: row.booking.checkOutDate,
        pax: row.booking.pax,
        roomCount: row.booking.roomCount,
        status: row.booking.status,
        paymentStatus: row.booking.paymentStatus,
        totalEstimatedAmount: row.booking.totalEstimatedAmount,
        amountPaid: row.booking.amountPaid,
        roomTypeName: row.roomType?.name || 'Sanctuary Suite',
        planName: row.plan?.name || 'Standard Rate',
        roomNumber: row.room?.number || null,
        guestMembers: members,
        checkInDetails: checkInDetails,
        selfCheckInCompleted: !!checkInDetails?.selfCheckInCompleted,
        selfCheckInToken: row.booking.selfCheckInToken
      },
      hotel: {
        id: row.hotel.id,
        name: row.hotel.name,
        address: row.hotel.address,
        slug: row.hotel.slug,
        billingStateName: row.hotel.billingStateName
      }
    });
  } catch (error) {
    console.error('Fetch check-in error:', error);
    res.status(500).json({ error: 'Failed to retrieve check-in details' });
  }
});

// POST /api/public/checkin/:token
router.post('/checkin/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { guestMembers, checkInDetails } = req.body;

    if (!token) {
      res.status(400).json({ error: 'Check-in token is required' });
      return;
    }

    const existing = await db.select().from(bookings).where(eq(bookings.selfCheckInToken, token)).limit(1);
    if (existing.length === 0) {
      res.status(404).json({ error: 'Reservation not found' });
      return;
    }

    const booking = existing[0];

    const updatedCheckInDetails = {
      ...checkInDetails,
      selfCheckInCompleted: true,
      completedAt: new Date().toISOString()
    };

    const updatePayload: any = {
      checkInDetails: JSON.stringify(updatedCheckInDetails)
    };

    if (guestMembers) {
      updatePayload.guestMembers = typeof guestMembers === 'string' ? guestMembers : JSON.stringify(guestMembers);
    }

    // If reservation is still in pending status, confirm it upon self check-in
    if (booking.status === 'pending') {
      updatePayload.status = 'confirmed';
    }

    await db.update(bookings).set(updatePayload).where(eq(bookings.id, booking.id));

    res.json({
      success: true,
      message: 'Self check-in completed successfully! Your express boarding pass is ready.',
      bookingId: booking.id,
      checkInDetails: updatedCheckInDetails
    });
  } catch (error) {
    console.error('Submit check-in error:', error);
    res.status(500).json({ error: 'Failed to complete self check-in' });
  }
});

export default router;
