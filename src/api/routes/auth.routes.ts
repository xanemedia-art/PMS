import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../../db/index.js';
import { users, hotels, passwordResets, roomTypes, rooms, plans, restaurantMenu, onboardingOtps } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware.js';
import crypto from 'crypto';
import { sendEmail, getPasswordResetHtml, getOnboardingOtpHtml } from '../utils/email.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'changeme123';

// POST /api/auth/signup/request-otp
router.post('/signup/request-otp', async (req, res) => {
  try {
    const { hotelName, hotelAddress, adminName, adminEmail, adminPassword } = req.body;

    if (!hotelName || !adminName || !adminEmail || !adminPassword) {
      res.status(400).json({ error: 'Missing required signup fields' });
      return;
    }

    // Check if email already registered
    const existingUser = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
    if (existingUser.length > 0) {
      res.status(400).json({ error: 'Email address already registered' });
      return;
    }

    // Generate 6-digit numeric OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Store OTP along with registration details payload
    const payload = JSON.stringify({ hotelName, hotelAddress, adminName, adminPassword });
    
    // Save to DB
    await db.insert(onboardingOtps).values({
      email: adminEmail,
      otp,
      payload,
      expiresAt
    });

    // Send email with OTP code
    const otpEmailHtml = getOnboardingOtpHtml(otp, adminName);
    await sendEmail({
      to: adminEmail,
      subject: 'Email Verification Code - Xane PMS',
      text: `Hello ${adminName},\n\nThank you for choosing Xane PMS! Your email verification code is: ${otp}. This code is valid for 10 minutes.`,
      html: otpEmailHtml
    });

    res.json({ message: 'Verification OTP has been sent to your email.' });
  } catch (error) {
    console.error('Request signup OTP error:', error);
    res.status(500).json({ error: 'Failed to request verification code' });
  }
});

// POST /api/auth/signup/verify-otp
router.post('/signup/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({ error: 'Email and verification code are required' });
      return;
    }

    // Find latest active OTP
    const otpRecordResult = await db.select()
      .from(onboardingOtps)
      .where(and(eq(onboardingOtps.email, email), eq(onboardingOtps.otp, otp)))
      .limit(1);
    const otpRecord = otpRecordResult[0];

    if (!otpRecord) {
      res.status(400).json({ error: 'Invalid verification code or email' });
      return;
    }

    // Check expiration
    if (new Date() > new Date(otpRecord.expiresAt)) {
      await db.delete(onboardingOtps).where(eq(onboardingOtps.id, otpRecord.id));
      res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
      return;
    }

    // OTP matches and is valid! Onboard hotel.
    const { hotelName, hotelAddress, adminName, adminPassword } = JSON.parse(otpRecord.payload);

    // Delete token
    await db.delete(onboardingOtps).where(eq(onboardingOtps.id, otpRecord.id));

    // Check if email already registered (security check)
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser.length > 0) {
      res.status(400).json({ error: 'Email address already registered' });
      return;
    }

    // 1. Create Hotel
    const hotelResult = await db.insert(hotels).values({
      name: hotelName,
      address: hotelAddress || 'Not specified',
    }).returning();
    const hotelId = hotelResult[0].id;

    // 2. Hash Password and Create Admin User
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const userResult = await db.insert(users).values({
      hotelId,
      name: adminName,
      email,
      passwordHash,
      role: 'admin',
    }).returning();
    const adminUser = userResult[0];

    // 3. Provision Starter Data
    // 3a. Room Types
    const rtResult = await db.insert(roomTypes).values([
      { hotelId, name: 'Deluxe Room', price: 2500, capacity: 2 },
      { hotelId, name: 'Executive Suite', price: 5000, capacity: 4 }
    ]).returning();

    // 3b. Rooms
    await db.insert(rooms).values([
      { hotelId, roomTypeId: rtResult[0].id, number: '101', status: 'available' },
      { hotelId, roomTypeId: rtResult[0].id, number: '102', status: 'available' },
      { hotelId, roomTypeId: rtResult[1].id, number: '201', status: 'available' },
      { hotelId, roomTypeId: rtResult[1].id, number: '202', status: 'available' }
    ]);

    // 3c. Plans (Meal Plans)
    await db.insert(plans).values([
      { hotelId, name: 'Room Only (EP)', priceMultiplier: 1.0, description: 'Only room charges, food charged extra.' },
      { hotelId, name: 'Bed & Breakfast (CP)', priceMultiplier: 1.15, description: 'Daily breakfast included.' },
      { hotelId, name: 'Half Board (MAP)', priceMultiplier: 1.3, description: 'Breakfast and dinner included.' }
    ]);

    // 3d. Restaurant Menu Items
    await db.insert(restaurantMenu).values([
      { hotelId, name: 'Club Sandwich', category: 'Starters', price: 220, description: 'Classic triple-decker sandwich with chicken, lettuce, tomato, and mayo.' },
      { hotelId, name: 'Tomato Bruschetta', category: 'Starters', price: 180, description: 'Toasted baguette with tomato, garlic, and basil.' },
      { hotelId, name: 'Butter Chicken with Rice', category: 'Mains', price: 380, description: 'Creamy chicken tikka gravy served with fragrant basmati rice.' },
      { hotelId, name: 'Penne Arrabbiata', category: 'Mains', price: 320, description: 'Pasta in spicy tomato sauce with olives and basil.' },
      { hotelId, name: 'Fresh Lime Soda', category: 'Drinks', price: 90, description: 'Refreshing sweet and salty soda.' },
      { hotelId, name: 'Hot Cappuccino', category: 'Drinks', price: 120, description: 'Freshly brewed espresso shot with steamed foamy milk.' }
    ]);

    // Generate JWT token automatically
    const token = jwt.sign(
      { userId: adminUser.id, hotelId: adminUser.hotelId, role: adminUser.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Hotel onboarded successfully with starter data!',
      token,
      user: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
        hotelId: adminUser.hotelId,
        features: hotelResult[0].features
      },
      hotel: hotelResult[0]
    });
  } catch (error) {
    console.error('Verify OTP signup error:', error);
    res.status(500).json({ error: 'Failed to complete hotel onboarding' });
  }
});


router.post('/login', async (req, res) => {
  try {
    const { email, password, hotelSlug } = req.body;
    
    // Find user by email
    const userResult = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = userResult[0];

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Secure tenancy isolation validation if hotelSlug is specified
    if (hotelSlug) {
      const hotelResult = await db.select().from(hotels).where(eq(hotels.slug, hotelSlug)).limit(1);
      const targetHotel = hotelResult[0];
      if (!targetHotel || user.hotelId !== targetHotel.id) {
        res.status(401).json({ error: 'Unauthorized: This account is not registered to this property portal' });
        return;
      }
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, hotelId: user.hotelId, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Fetch hotel features
    const hotelResult = await db.select().from(hotels).where(eq(hotels.id, user.hotelId)).limit(1);
    const hotel = hotelResult[0];
    const hotelFeatures = hotel ? hotel.features : '';

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        hotelId: user.hotelId,
        features: hotelFeatures
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/switch-hotel
router.post('/switch-hotel', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { hotelId } = req.body;
    if (!hotelId) {
      res.status(400).json({ error: 'Hotel ID is required' });
      return;
    }

    const targetHotelId = parseInt(hotelId);
    if (isNaN(targetHotelId)) {
      res.status(400).json({ error: 'Invalid Hotel ID' });
      return;
    }

    // Verify hotel exists
    const hotelResult = await db.select().from(hotels).where(eq(hotels.id, hotelId)).limit(1);
    if (hotelResult.length === 0) {
      res.status(404).json({ error: 'Hotel not found' });
      return;
    }

    // Security check: Only super-admin or authorized chain users can switch
    if (req.user!.role !== 'super_admin') {
      const originalHotelId = req.user!.hotelId;
      const origHotelResult = await db.select().from(hotels).where(eq(hotels.id, originalHotelId)).limit(1);
      const currentHotel = origHotelResult[0];
      const targetHotel = hotelResult[0];

      if (!currentHotel) {
        res.status(404).json({ error: 'Current hotel not found' });
        return;
      }

      const isSelf = targetHotel.id === currentHotel.id;
      const isChild = targetHotel.parentId === currentHotel.id;
      const isParent = currentHotel.parentId === targetHotel.id;
      const isSister = targetHotel.parentId !== null && currentHotel.parentId !== null && targetHotel.parentId === currentHotel.parentId;

      if (!isSelf && !isChild && !isParent && !isSister) {
        res.status(403).json({ error: 'Forbidden: You are not authorized to switch to this property' });
        return;
      }
    }

    // Generate new JWT with the new hotelId
    const token = jwt.sign(
      { userId: req.user!.userId, hotelId: hotelId, role: req.user!.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Fetch user details to return
    const userResult = await db.select().from(users).where(eq(users.id, req.user!.userId)).limit(1);
    const user = userResult[0];

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        hotelId: hotelId,
        features: hotelResult[0].features
      }
    });
  } catch (error) {
    console.error('Switch hotel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    // Check if user exists
    const userResult = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = userResult[0];

    if (!user) {
      // For security, return success even if user doesn't exist
      res.json({ message: 'If the email is registered, a password reset link has been sent.' });
      return;
    }

    // Generate secure reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiration

    // Store token
    await db.insert(passwordResets).values({
      email,
      token,
      expiresAt,
    });

    // Send email
    // In real app, this should link to the frontend URL
    const frontendUrl = process.env.FRONTEND_URL || `http://localhost:${process.env.PORT || 3000}`;
    const resetLink = `${frontendUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
    
    const emailHtml = getPasswordResetHtml(resetLink, user.name);
    await sendEmail({
      to: email,
      subject: 'Password Reset Request - Xane PMS',
      text: `Hello ${user.name},\n\nWe received a request to reset your password. Click the link below to choose a new password:\n\n${resetLink}\n\nThis link is valid for 1 hour. If you did not request this, you can ignore this email.`,
      html: emailHtml,
    });

    res.json({ message: 'If the email is registered, a password reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, token, password } = req.body;
    if (!email || !token || !password) {
      res.status(400).json({ error: 'Email, token, and new password are required' });
      return;
    }

    // Find and validate token
    const resetRecordResult = await db.select()
      .from(passwordResets)
      .where(and(eq(passwordResets.email, email), eq(passwordResets.token, token)))
      .limit(1);
    const resetRecord = resetRecordResult[0];

    if (!resetRecord) {
      res.status(400).json({ error: 'Invalid reset token or email' });
      return;
    }

    // Check expiration
    if (new Date() > new Date(resetRecord.expiresAt)) {
      // Clean up expired token
      await db.delete(passwordResets).where(eq(passwordResets.id, resetRecord.id));
      res.status(400).json({ error: 'Reset token has expired' });
      return;
    }

    // Update user password
    const newPasswordHash = await bcrypt.hash(password, 10);
    const updated = await db.update(users)
      .set({ passwordHash: newPasswordHash })
      .where(eq(users.email, email))
      .returning();

    if (updated.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Delete token after successful reset
    await db.delete(passwordResets).where(eq(passwordResets.id, resetRecord.id));

    res.json({ success: true, message: 'Password has been reset successfully.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
