import express from 'express';
import { db } from '../../db';
import { plans } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.middleware';

const router = express.Router();

router.use(authenticateToken);

// Get all plans for the hotel
router.get('/', async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const hotelPlans = await db.select().from(plans).where(eq(plans.hotelId, hotelId));
    res.json(hotelPlans);
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// Create a new plan
router.post('/', requireRole(['admin', 'manager']), async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const { name, price, priceMultiplier, description } = req.body;
    
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const newPlan = await db.insert(plans).values({
      hotelId,
      name,
      priceMultiplier: priceMultiplier || price || 1.0,
      description
    }).returning();
    
    res.status(201).json(newPlan[0]);
  } catch (error) {
    console.error('Error creating plan:', error);
    res.status(500).json({ error: 'Failed to create plan' });
  }
});

// Delete a plan
router.delete('/:id', requireRole(['admin', 'manager']), async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const { id } = req.params;
    
    await db.delete(plans).where(and(eq(plans.id, parseInt(id)), eq(plans.hotelId, hotelId)));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting plan:', error);
    res.status(500).json({ error: 'Failed to delete plan' });
  }
});

export default router;
