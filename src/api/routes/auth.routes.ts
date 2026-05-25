import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../../db/index.js';
import { users, hotels } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'changeme123';

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
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

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, hotelId: user.hotelId, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        hotelId: user.hotelId
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

    // Verify hotel exists
    const hotelResult = await db.select().from(hotels).where(eq(hotels.id, hotelId)).limit(1);
    if (hotelResult.length === 0) {
      res.status(404).json({ error: 'Hotel not found' });
      return;
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
        hotelId: hotelId
      }
    });
  } catch (error) {
    console.error('Switch hotel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
