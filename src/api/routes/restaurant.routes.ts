import express from 'express';
import { db } from '../../db/index.js';
import { restaurantInventory, restaurantOrders, bookings, rooms, restaurantMenu, restaurantCategories } from '../../db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.middleware.js';

const router = express.Router();

let categoriesTableInitialized = false;
async function ensureCategoriesTable() {
  if (categoriesTableInitialized) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS restaurant_categories (
        id SERIAL PRIMARY KEY,
        hotel_id INTEGER REFERENCES hotels(id) NOT NULL,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    categoriesTableInitialized = true;
  } catch (err: any) {
    console.warn('ensureCategoriesTable warning:', err?.message);
  }
}

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

// Update restaurant order items, quantities, table number, totalAmount, or status
router.patch('/orders/:id', async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const id = parseInt(req.params.id);
    const { items, tableNumber, totalAmount, status } = req.body;

    const updateFields: any = {};
    if (items !== undefined) {
      updateFields.items = typeof items === 'string' ? items : JSON.stringify(items);
    }
    if (tableNumber !== undefined) {
      updateFields.tableNumber = tableNumber;
    }
    if (totalAmount !== undefined) {
      updateFields.totalAmount = parseFloat(totalAmount);
    }
    if (status !== undefined) {
      if (!['pending', 'preparing', 'delivered', 'cancelled'].includes(status)) {
        res.status(400).json({ error: 'Invalid order status' });
        return;
      }
      updateFields.status = status;
    }

    if (Object.keys(updateFields).length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    const updated = await db.update(restaurantOrders)
      .set(updateFields)
      .where(and(eq(restaurantOrders.id, id), eq(restaurantOrders.hotelId, hotelId)))
      .returning();

    if (updated.length === 0) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    res.json(updated[0]);
  } catch (error) {
    console.error('Update restaurant order error:', error);
    res.status(500).json({ error: 'Failed to update order' });
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


// --- RESTAURANT CATEGORIES MANAGEMENT ---

// Get all categories for active hotel
router.get('/admin/categories', async (req: AuthRequest, res) => {
  try {
    await ensureCategoriesTable();
    const hotelId = req.user!.hotelId;

    // Fetch registered categories
    let cats = await db.select()
      .from(restaurantCategories)
      .where(eq(restaurantCategories.hotelId, hotelId))
      .orderBy(restaurantCategories.name);

    // If hotel has never initialized categories, seed from existing menu or defaults
    if (cats.length === 0) {
      const existingMenuItems = await db.select({ category: restaurantMenu.category })
        .from(restaurantMenu)
        .where(eq(restaurantMenu.hotelId, hotelId));

      const distinctCats = Array.from(new Set(existingMenuItems.map(m => m.category).filter(Boolean)));
      const initialCats = distinctCats.length > 0 ? distinctCats : ['Starters', 'Mains', 'Drinks', 'Desserts'];

      for (const catName of initialCats) {
        try {
          await db.insert(restaurantCategories).values({ hotelId, name: catName });
        } catch (e) {}
      }

      cats = await db.select()
        .from(restaurantCategories)
        .where(eq(restaurantCategories.hotelId, hotelId))
        .orderBy(restaurantCategories.name);
    }

    // Count items per category
    const menuItems = await db.select({ category: restaurantMenu.category })
      .from(restaurantMenu)
      .where(eq(restaurantMenu.hotelId, hotelId));

    const counts: Record<string, number> = {};
    for (const item of menuItems) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }

    const result = cats.map(c => ({
      id: c.id,
      name: c.name,
      itemCount: counts[c.name] || 0,
    }));

    res.json(result);
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch restaurant categories' });
  }
});

// Add new custom category
router.post('/admin/categories', async (req: AuthRequest, res) => {
  try {
    await ensureCategoriesTable();
    const hotelId = req.user!.hotelId;
    const { name } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Category name is required' });
      return;
    }

    const trimmedName = name.trim();

    // Check if already exists (case-insensitive)
    const existing = await db.select()
      .from(restaurantCategories)
      .where(and(
        eq(restaurantCategories.hotelId, hotelId),
        sql`LOWER(${restaurantCategories.name}) = LOWER(${trimmedName})`
      ));

    if (existing.length > 0) {
      res.status(400).json({ error: 'Category already exists' });
      return;
    }

    const newCat = await db.insert(restaurantCategories).values({
      hotelId,
      name: trimmedName,
    }).returning();

    res.status(201).json(newCat[0]);
  } catch (error: any) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Delete a category
router.delete('/admin/categories/:name', async (req: AuthRequest, res) => {
  try {
    await ensureCategoriesTable();
    const hotelId = req.user!.hotelId;
    const catName = decodeURIComponent(req.params.name).trim();
    const deleteItems = req.query.deleteItems === 'true' || req.body?.deleteItems === true;

    if (!catName) {
      res.status(400).json({ error: 'Category name is required' });
      return;
    }

    if (deleteItems) {
      // Purge all menu items belonging to this category
      await db.delete(restaurantMenu)
        .where(and(eq(restaurantMenu.hotelId, hotelId), eq(restaurantMenu.category, catName)));
    } else {
      // Reassign menu items in this category to "General"
      await db.update(restaurantMenu)
        .set({ category: 'General' })
        .where(and(eq(restaurantMenu.hotelId, hotelId), eq(restaurantMenu.category, catName)));

      // Ensure "General" exists in categories
      const generalCheck = await db.select()
        .from(restaurantCategories)
        .where(and(eq(restaurantCategories.hotelId, hotelId), eq(restaurantCategories.name, 'General')));
      if (generalCheck.length === 0) {
        try {
          await db.insert(restaurantCategories).values({ hotelId, name: 'General' });
        } catch (e) {}
      }
    }

    // Delete the category from restaurant_categories
    await db.delete(restaurantCategories)
      .where(and(eq(restaurantCategories.hotelId, hotelId), eq(restaurantCategories.name, catName)));

    res.json({ success: true, message: `Category "${catName}" deleted successfully` });
  } catch (error: any) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
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

// Bulk upload menu items
router.post('/admin/menu/bulk', async (req: AuthRequest, res) => {
  try {
    await ensureCategoriesTable();
    const hotelId = req.user!.hotelId;
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'An array of menu items is required' });
      return;
    }

    const validItems: any[] = [];
    const categoriesToRegister = new Set<string>();

    for (const item of items) {
      const name = (item.name || '').trim();
      const category = (item.category || 'General').trim();
      const price = parseFloat(item.price);
      const description = (item.description || '').trim();
      const isAvailable = item.isAvailable !== false;

      if (!name || isNaN(price) || price < 0) {
        continue; // Skip invalid entries
      }

      validItems.push({
        hotelId,
        name,
        category: category || 'General',
        price,
        description: description || null,
        isAvailable,
      });

      if (category) {
        categoriesToRegister.add(category);
      }
    }

    if (validItems.length === 0) {
      res.status(400).json({ error: 'No valid menu items found in the upload payload' });
      return;
    }

    // Auto-register any new categories in restaurantCategories
    for (const catName of categoriesToRegister) {
      const catExists = await db.select()
        .from(restaurantCategories)
        .where(and(
          eq(restaurantCategories.hotelId, hotelId),
          sql`LOWER(${restaurantCategories.name}) = LOWER(${catName})`
        ));
      if (catExists.length === 0) {
        try {
          await db.insert(restaurantCategories).values({ hotelId, name: catName });
        } catch (e) {}
      }
    }

    // Insert items in batch
    const inserted = await db.insert(restaurantMenu).values(validItems).returning();

    res.json({
      success: true,
      count: inserted.length,
      items: inserted,
      message: `Successfully imported ${inserted.length} menu items!`
    });
  } catch (error: any) {
    console.error('Bulk menu upload error:', error);
    res.status(500).json({ error: 'Failed to bulk upload menu items' });
  }
});

// Add new menu item
router.post('/admin/menu', async (req: AuthRequest, res) => {
  try {
    await ensureCategoriesTable();
    const hotelId = req.user!.hotelId;
    const { name, category, price, description, isAvailable } = req.body;

    if (!name || price === undefined || !category) {
      res.status(400).json({ error: 'Name, category, and price are required' });
      return;
    }

    const trimmedCat = category.trim();

    // Ensure category exists in restaurantCategories
    const catExists = await db.select()
      .from(restaurantCategories)
      .where(and(
        eq(restaurantCategories.hotelId, hotelId),
        sql`LOWER(${restaurantCategories.name}) = LOWER(${trimmedCat})`
      ));
    if (catExists.length === 0) {
      try {
        await db.insert(restaurantCategories).values({ hotelId, name: trimmedCat });
      } catch (e) {}
    }

    const newItem = await db.insert(restaurantMenu).values({
      hotelId,
      name: name.trim(),
      category: trimmedCat,
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
    await ensureCategoriesTable();
    const hotelId = req.user!.hotelId;
    const id = parseInt(req.params.id);
    const { name, category, price, description, isAvailable } = req.body;

    const updateFields: any = {};
    if (name !== undefined) updateFields.name = name.trim();
    if (category !== undefined) {
      updateFields.category = category.trim();
      // Ensure category exists
      const catExists = await db.select()
        .from(restaurantCategories)
        .where(and(
          eq(restaurantCategories.hotelId, hotelId),
          sql`LOWER(${restaurantCategories.name}) = LOWER(${updateFields.category})`
        ));
      if (catExists.length === 0) {
        try {
          await db.insert(restaurantCategories).values({ hotelId, name: updateFields.category });
        } catch (e) {}
      }
    }
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
