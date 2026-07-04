import express from 'express';
import { db } from '../../db/index.js';
import { housekeepingTasks, rooms } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticateToken);

// Get housekeeping tasks
router.get('/', async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    
    const tasks = await db.select({
      id: housekeepingTasks.id,
      roomId: housekeepingTasks.roomId,
      roomNumber: rooms.number,
      status: housekeepingTasks.status,
      assignedToId: housekeepingTasks.assignedToId,
      notes: housekeepingTasks.notes,
      updatedAt: housekeepingTasks.updatedAt
    })
    .from(housekeepingTasks)
    .leftJoin(rooms, eq(housekeepingTasks.roomId, rooms.id))
    .where(eq(housekeepingTasks.hotelId, hotelId));

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch housekeeping tasks' });
  }
});

// Update housekeeping status
router.patch('/:id/status', requireRole(['admin', 'manager', 'staff', 'housekeeping']), async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const id = parseInt(req.params.id);
    const { status } = req.body;

    if (status === 'clean') {
      const task = await db.select().from(housekeepingTasks).where(and(eq(housekeepingTasks.id, id), eq(housekeepingTasks.hotelId, hotelId))).limit(1);
      if (task.length === 0) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }
      
      // Mark room as available
      await db.update(rooms).set({ status: 'available' }).where(eq(rooms.id, task[0].roomId));
      
      // Delete the housekeeping task completely to declutter
      await db.delete(housekeepingTasks).where(and(eq(housekeepingTasks.id, id), eq(housekeepingTasks.hotelId, hotelId)));
      
      res.json({ id, status: 'clean' });
      return;
    }

    const updated = await db.update(housekeepingTasks)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(housekeepingTasks.id, id), eq(housekeepingTasks.hotelId, hotelId)))
      .returning();

    if (updated.length === 0) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task status' });
  }
});

// Create task
router.post('/', requireRole(['admin', 'manager', 'staff']), async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const { roomId, notes, assignedToId } = req.body;

    const newTask = await db.insert(housekeepingTasks).values({
      hotelId,
      roomId,
      notes,
      assignedToId,
      status: 'dirty'
    }).returning();

    await db.update(rooms).set({ status: 'dirty' }).where(eq(rooms.id, roomId));

    res.json(newTask[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Delete a housekeeping task manually
router.delete('/:id', requireRole(['admin', 'manager', 'staff']), async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid task ID' });
      return;
    }

    const deleted = await db.delete(housekeepingTasks)
      .where(and(eq(housekeepingTasks.id, id), eq(housekeepingTasks.hotelId, hotelId)))
      .returning();

    if (deleted.length === 0) {
      res.status(404).json({ error: 'Housekeeping task not found' });
      return;
    }

    res.json({ success: true, message: 'Housekeeping task deleted successfully' });
  } catch (error) {
    console.error('Delete housekeeping task error:', error);
    res.status(500).json({ error: 'Failed to delete housekeeping task' });
  }
});

export default router;
