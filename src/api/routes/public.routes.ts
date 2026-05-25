import express from 'express';
import { db } from '../../db/index.js';
import { hotels, plans, roomTypes, rooms, bookings } from '../../db/schema.js';
import { eq, and, ne, lt, gt, inArray } from 'drizzle-orm';

const router = express.Router();

// GET /api/public/hotels
router.get('/hotels', async (req, res) => {
  try {
    const allHotels = await db.select({
      id: hotels.id,
      name: hotels.name,
      address: hotels.address
    }).from(hotels);
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

    const hotel = await db.select().from(hotels).where(eq(hotels.id, hotelId)).limit(1);
    if (!hotel || hotel.length === 0) {
      res.status(404).json({ error: 'Hotel not found' });
      return;
    }

    const hotelPlans = await db.select().from(plans).where(eq(plans.hotelId, hotelId));

    res.json({
      hotel: hotel[0],
      plans: hotelPlans
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch hotel data' });
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

    // Fetch all room types for the hotel
    const allRoomTypes = await db.select().from(roomTypes).where(eq(roomTypes.hotelId, hotelId));
    
    // Fetch all plans for the hotel
    const allPlans = await db.select().from(plans).where(eq(plans.hotelId, hotelId));

    // Fetch all rooms for the hotel
    const allRooms = await db.select().from(rooms).where(eq(rooms.hotelId, hotelId));

    // Fetch overlapping bookings
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
    const { roomTypeId, roomCount, planId, guestName, guestEmail, guestPhone, pax, extraBeddings, notes, checkInDate, checkOutDate } = req.body;

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
          notes: notes || null
        });
    }

    const newBookings = await db.insert(bookings).values(valuesToInsert).returning();
    res.json(newBookings[0]);

  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

export default router;
