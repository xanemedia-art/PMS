import express from 'express';
import { db } from '../../db/index.js';
import { restaurantInventory, restaurantOrders, bookings, rooms, restaurantMenu } from '../../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.middleware.js';

const router = express.Router();

// Menu endpoint is public so guests can view it
router.get('/menu', async (req, res) => {
  try {
    const hotelId = req.query.hotelId ? parseInt(req.query.hotelId as string) : 1;
    const menu = await db.select()
      .from(restaurantMenu)
      .where(and(eq(restaurantMenu.hotelId, hotelId), eq(restaurantMenu.isAvailable, true)))
      .orderBy(restaurantMenu.category, restaurantMenu.name);
    res.json(menu);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch restaurant menu' });
  }
});

// Require admin/manager/staff auth for all other routes
router.use(authenticateToken);

// --- RESTAURANT ORDERS (KOTs) ---

// Get all orders (room service, dine-in, etc.)
router.get('/orders', async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;

    const orders = await db.select({
      id: restaurantOrders.id,
      hotelId: restaurantOrders.hotelId,
      bookingId: restaurantOrders.bookingId,
      roomId: restaurantOrders.roomId,
      tableNumber: restaurantOrders.tableNumber,
      items: restaurantOrders.items,
      totalAmount: restaurantOrders.totalAmount,
      status: restaurantOrders.status,
      type: restaurantOrders.type,
      createdAt: restaurantOrders.createdAt,
      roomNumber: rooms.number,
      guestName: bookings.guestName
    })
    .from(restaurantOrders)
    .leftJoin(rooms, eq(restaurantOrders.roomId, rooms.id))
    .leftJoin(bookings, eq(restaurantOrders.bookingId, bookings.id))
    .where(eq(restaurantOrders.hotelId, hotelId))
    .orderBy(desc(restaurantOrders.createdAt));

    res.json(orders);
  } catch (error) {
    console.error('Fetch restaurant orders error:', error);
    res.status(500).json({ error: 'Failed to fetch restaurant orders' });
  }
});

// Create a restaurant order (Dine-in or Takeaway)
router.post('/orders', async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const { bookingId, roomId, tableNumber, items, totalAmount, type } = req.body;

    if (!items || !totalAmount) {
      res.status(400).json({ error: 'Items and total amount are required' });
      return;
    }

    const newOrder = await db.insert(restaurantOrders).values({
      hotelId,
      bookingId: bookingId ? parseInt(bookingId) : null,
      roomId: roomId ? parseInt(roomId) : null,
      tableNumber,
      items: typeof items === 'string' ? items : JSON.stringify(items),
      totalAmount,
      status: 'pending',
      type: type || 'dine_in'
    }).returning();

    res.json(newOrder[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Update order/KOT status
router.patch('/orders/:id/status', async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const id = parseInt(req.params.id);
    const { status } = req.body;

    if (!['pending', 'preparing', 'delivered', 'cancelled'].includes(status)) {
      res.status(400).json({ error: 'Invalid order status' });
      return;
    }

    const updated = await db.update(restaurantOrders)
      .set({ status })
      .where(and(eq(restaurantOrders.id, id), eq(restaurantOrders.hotelId, hotelId)))
      .returning();

    if (updated.length === 0) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});


// --- RESTAURANT INVENTORY ---

// Get inventory items
router.get('/inventory', async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const items = await db.select()
      .from(restaurantInventory)
      .where(eq(restaurantInventory.hotelId, hotelId))
      .orderBy(restaurantInventory.name);

    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// Create inventory item
router.post('/inventory', requireRole(['admin', 'manager']), async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const { name, quantity, unit, minStock } = req.body;

    if (!name || quantity === undefined) {
      res.status(400).json({ error: 'Name and quantity are required' });
      return;
    }

    const newItem = await db.insert(restaurantInventory).values({
      hotelId,
      name,
      quantity: parseFloat(quantity),
      unit: unit || 'pcs',
      minStock: minStock ? parseFloat(minStock) : 0
    }).returning();

    res.json(newItem[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create inventory item' });
  }
});

// Update inventory item quantity/minStock
router.patch('/inventory/:id', async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const id = parseInt(req.params.id);
    const { name, quantity, unit, minStock } = req.body;

    const updateFields: any = {};
    if (name !== undefined) updateFields.name = name;
    if (quantity !== undefined) updateFields.quantity = parseFloat(quantity);
    if (unit !== undefined) updateFields.unit = unit;
    if (minStock !== undefined) updateFields.minStock = parseFloat(minStock);
    updateFields.updatedAt = new Date();

    const updated = await db.update(restaurantInventory)
      .set(updateFields)
      .where(and(eq(restaurantInventory.id, id), eq(restaurantInventory.hotelId, hotelId)))
      .returning();

    if (updated.length === 0) {
      res.status(404).json({ error: 'Inventory item not found' });
      return;
    }

    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update inventory item' });
  }
});

// Delete inventory item
router.delete('/inventory/:id', requireRole(['admin', 'manager']), async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const id = parseInt(req.params.id);

    const deleted = await db.delete(restaurantInventory)
      .where(and(eq(restaurantInventory.id, id), eq(restaurantInventory.hotelId, hotelId)))
      .returning();

    if (deleted.length === 0) {
      res.status(404).json({ error: 'Inventory item not found' });
      return;
    }

    res.json({ success: true, message: 'Inventory item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete inventory item' });
  }
});


// --- RESTAURANT MENU MANAGEMENT (STAFF) ---

// Get all menu items (including unavailable ones) for active hotel
router.get('/admin/menu', async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const menu = await db.select()
      .from(restaurantMenu)
      .where(eq(restaurantMenu.hotelId, hotelId))
      .orderBy(restaurantMenu.category, restaurantMenu.name);
    res.json(menu);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch restaurant menu' });
  }
});

// Add new menu item
router.post('/admin/menu', async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const { name, category, price, description, isAvailable } = req.body;

    if (!name || price === undefined || !category) {
      res.status(400).json({ error: 'Name, category, and price are required' });
      return;
    }

    const newItem = await db.insert(restaurantMenu).values({
      hotelId,
      name,
      category,
      price: parseFloat(price),
      description: description || null,
      isAvailable: isAvailable ?? true
    }).returning();

    res.json(newItem[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create menu item' });
  }
});

// Edit existing menu item
router.patch('/admin/menu/:id', async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const id = parseInt(req.params.id);
    const { name, category, price, description, isAvailable } = req.body;

    const updateFields: any = {};
    if (name !== undefined) updateFields.name = name;
    if (category !== undefined) updateFields.category = category;
    if (price !== undefined) updateFields.price = parseFloat(price);
    if (description !== undefined) updateFields.description = description || null;
    if (isAvailable !== undefined) updateFields.isAvailable = isAvailable;

    const updated = await db.update(restaurantMenu)
      .set(updateFields)
      .where(and(eq(restaurantMenu.id, id), eq(restaurantMenu.hotelId, hotelId)))
      .returning();

    if (updated.length === 0) {
      res.status(404).json({ error: 'Menu item not found' });
      return;
    }

    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

// Delete menu item
router.delete('/admin/menu/:id', async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const id = parseInt(req.params.id);

    const deleted = await db.delete(restaurantMenu)
      .where(and(eq(restaurantMenu.id, id), eq(restaurantMenu.hotelId, hotelId)))
      .returning();

    if (deleted.length === 0) {
      res.status(404).json({ error: 'Menu item not found' });
      return;
    }

    res.json({ success: true, message: 'Menu item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
});

// Delete a restaurant order (KOT)
router.delete('/orders/:id', requireRole(['admin', 'manager']), async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid order ID' });
      return;
    }

    const deleted = await db.delete(restaurantOrders)
      .where(and(eq(restaurantOrders.id, id), eq(restaurantOrders.hotelId, hotelId)))
      .returning();

    if (deleted.length === 0) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    res.json({ success: true, message: 'Order ticket deleted successfully' });
  } catch (error) {
    console.error('Delete restaurant order error:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

export default router;
