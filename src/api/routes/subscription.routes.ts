import express from 'express';
import crypto from 'crypto';
import { db } from '../../db/index.js';
import { hotels } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.middleware.js';

const router = express.Router();

const RAZORPAY_KEY_ID = 'rzp_live_SufeFLg6s8EJfH';
const RAZORPAY_KEY_SECRET = 'egoVbpC6p4cAfPkNoW211f7f';

// Apply authentication to all subscription endpoints
router.use(authenticateToken);

// GET /api/subscription/status
// Retrieves the subscription status and dues for the active hotel context
router.get('/status', async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const hotelResult = await db.select().from(hotels).where(eq(hotels.id, hotelId)).limit(1);
    const hotel = hotelResult[0];

    if (!hotel) {
      res.status(404).json({ error: 'Hotel not found' });
      return;
    }

    const now = new Date();
    let computedStatus = hotel.subscriptionStatus || 'expired';
    
    // Check if trial/active period has expired
    if (hotel.subscriptionEndsAt) {
      const endsAt = new Date(hotel.subscriptionEndsAt);
      if (now > endsAt) {
        computedStatus = 'expired';
      }
    } else {
      computedStatus = 'expired';
    }

    let dues = hotel.subscriptionDues !== null ? hotel.subscriptionDues : 0.0;
    if (computedStatus === 'expired' && dues === 0) {
      dues = hotel.subscriptionPrice !== null && hotel.subscriptionPrice !== undefined ? hotel.subscriptionPrice : 6000.0;
    }

    res.json({
      hotelId: hotel.id,
      name: hotel.name,
      parentId: hotel.parentId,
      subscriptionStatus: computedStatus,
      subscriptionEndsAt: hotel.subscriptionEndsAt,
      subscriptionDues: dues,
      subscriptionPrice: hotel.subscriptionPrice !== null && hotel.subscriptionPrice !== undefined ? hotel.subscriptionPrice : 6000.0,
      razorpayKeyId: RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Fetch subscription status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/subscription/create-order
// Contacts Razorpay directly via REST to initiate a dynamically priced payment order
router.post('/create-order', requireRole(['admin']), async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;

    // Fetch the hotel to resolve its pricing structure
    const hotelResult = await db.select().from(hotels).where(eq(hotels.id, hotelId)).limit(1);
    const hotel = hotelResult[0];

    if (!hotel) {
      res.status(404).json({ error: 'Hotel context not found' });
      return;
    }

    const now = new Date();
    let computedStatus = hotel.subscriptionStatus || 'expired';
    if (hotel.subscriptionEndsAt) {
      const endsAt = new Date(hotel.subscriptionEndsAt);
      if (now > endsAt) {
        computedStatus = 'expired';
      }
    } else {
      computedStatus = 'expired';
    }

    let dues = hotel.subscriptionDues !== null ? hotel.subscriptionDues : 0.0;
    if (dues === 0) {
      dues = hotel.subscriptionPrice !== null && hotel.subscriptionPrice !== undefined ? hotel.subscriptionPrice : 6000.0;
    }

    const authString = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
    
    // Create an order dynamically (represented in paise, so dues * 100)
    const amountInPaise = Math.round(dues * 100);

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `receipt_hotel_${hotelId}_${Date.now()}`
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Razorpay Order API failed:', errorData);
      res.status(502).json({ error: 'Failed to create payment order with gateway' });
      return;
    }

    const order = await response.json();
    res.json(order);
  } catch (error) {
    console.error('Create payment order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/subscription/verify-payment
// Performs HMAC SHA256 verification on signatures and extends subscription on success
router.post('/verify-payment', requireRole(['admin']), async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400).json({ error: 'Missing payment parameters for validation' });
      return;
    }

    // Cryptographic validation of payment signature
    const hmac = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== razorpay_signature) {
      console.warn(`[Security Alert] Signature mismatch for payment verification. HotelId: ${hotelId}`);
      res.status(400).json({ error: 'Payment signature verification failed' });
      return;
    }

    // Retrieve active hotel details
    const hotelResult = await db.select().from(hotels).where(eq(hotels.id, hotelId)).limit(1);
    const hotel = hotelResult[0];

    if (!hotel) {
      res.status(404).json({ error: 'Hotel context not found' });
      return;
    }

    // Extend subscription ends date:
    // If hotel is currently active and has remaining time, append 30 days. Otherwise, set from now.
    const now = new Date();
    let baseDate = now;
    if (hotel.subscriptionEndsAt) {
      const endsAt = new Date(hotel.subscriptionEndsAt);
      if (endsAt > now) {
        baseDate = endsAt;
      }
    }

    const newExpiration = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days

    await db.update(hotels)
      .set({
        subscriptionStatus: 'active',
        subscriptionEndsAt: newExpiration,
        subscriptionDues: 0.0
      })
      .where(eq(hotels.id, hotelId));

    res.json({
      success: true,
      message: 'Subscription successfully extended for 30 days!',
      subscriptionEndsAt: newExpiration
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
