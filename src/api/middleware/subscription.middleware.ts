import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware.js';
import { db } from '../../db/index.js';
import { hotels } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

const subscriptionCache = new Map<number, { hotel: any; expiresAt: number }>();

export function invalidateSubscriptionCache(hotelId?: number) {
  if (hotelId) subscriptionCache.delete(hotelId);
  else subscriptionCache.clear();
}

export const checkSubscription = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // If no user context or if it's a super-admin, bypass subscription validation
    if (!req.user || req.user.role === 'super_admin') {
      return next();
    }

    const hotelId = req.user.hotelId;
    if (!hotelId) {
      return next();
    }

    // Exclude special endpoints from subscription blocking:
    // Allow Auth endpoints, Subscription payments, and the properties switch/view settings
    const path = req.baseUrl + req.path;
    const isExcluded = 
      path.startsWith('/api/auth') || 
      path.startsWith('/api/subscription') ||
      path.startsWith('/api/super-admin') ||
      path.startsWith('/api/public') ||
      path === '/api/upload' ||
      path === '/api/settings/hotel' ||
      path.startsWith('/api/settings/hotels');

    if (isExcluded) {
      return next();
    }

    // Check memory cache first (60-second TTL to avoid 350ms DB roundtrip on every click)
    let hotel: any = null;
    const cached = subscriptionCache.get(hotelId);
    if (cached && Date.now() < cached.expiresAt) {
      hotel = cached.hotel;
    } else {
      const hotelResult = await db.select().from(hotels).where(eq(hotels.id, hotelId)).limit(1);
      hotel = hotelResult[0];
      if (hotel) {
        subscriptionCache.set(hotelId, { hotel, expiresAt: Date.now() + 60_000 });
      }
    }

    if (!hotel) {
      res.status(404).json({ error: 'Hotel context not found' });
      return;
    }

    // Evaluate subscription expiration
    if (hotel.subscriptionEndsAt) {
      const endsAt = new Date(hotel.subscriptionEndsAt);
      if (new Date() > endsAt) {
        res.status(402).json({
          error: 'subscription_expired',
          message: 'Your property management subscription has ended. Please renew to continue accessing PMS features.',
          dues: hotel.subscriptionDues || hotel.subscriptionPrice || 6000.0
        });
        return;
      }
    } else {
      // If there is no expiration timestamp, treat it as expired (unpaid initial subscription)
      res.status(402).json({
        error: 'subscription_expired',
        message: 'No active subscription found. Please complete the subscription payment to activate.',
        dues: hotel.subscriptionPrice || 6000.0
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Subscription validation middleware error:', error);
    // Fallback: in case of error in billing evaluation, pass the request to avoid PMS lockouts
    next();
  }
};
export default checkSubscription;
