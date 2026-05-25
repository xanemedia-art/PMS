import express from 'express';
import { db } from '../../db/index.js';
import { expenses } from '../../db/schema.js';
import { eq, and, gte, sql } from 'drizzle-orm';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticateToken);

// Get all expenses for the current hotel
router.get('/', requireRole(['admin', 'manager', 'staff']), async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    
    const allExpenses = await db.select()
      .from(expenses)
      .where(eq(expenses.hotelId, hotelId))
      .orderBy(sql`${expenses.createdAt} DESC`);
      
    res.json(allExpenses);
  } catch (error) {
    console.error('Fetch expenses error:', error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// Get expense trend data
router.get('/trend', requireRole(['admin', 'manager', 'staff']), async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const { startDate } = req.query;
    
    let conditions = eq(expenses.hotelId, hotelId);
    
    if (startDate) {
      conditions = and(conditions, gte(expenses.createdAt, new Date(startDate as string))) as any;
    }
    
    const trendData = await db.select({
      date: sql<string>`DATE(${expenses.createdAt})`,
      totalAmount: sql<number>`SUM(${expenses.amount})`,
    })
    .from(expenses)
    .where(conditions)
    .groupBy(sql`DATE(${expenses.createdAt})`)
    .orderBy(sql`DATE(${expenses.createdAt})`);
    
    res.json(trendData);
  } catch (error) {
    console.error('Fetch expense trend error:', error);
    res.status(500).json({ error: 'Failed to fetch expense trend' });
  }
});

// Create a new expense
router.post('/', requireRole(['admin', 'manager', 'staff']), async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const { name, type, amount, description } = req.body;
    
    if (!name || !type || amount === undefined) {
      return res.status(400).json({ error: 'Name, type, and amount are required' });
    }
    
    const newExpense = await db.insert(expenses).values({
      hotelId,
      name,
      type,
      amount: parseFloat(amount),
      description,
    }).returning();
    
    res.status(201).json(newExpense[0]);
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

// Delete an expense
router.delete('/:id', requireRole(['admin', 'manager']), async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid expense ID' });
      return;
    }
    
    const deleted = await db.delete(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.hotelId, hotelId)))
      .returning();
      
    if (deleted.length === 0) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }
    
    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

export default router;
