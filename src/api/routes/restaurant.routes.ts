import express from 'express';
import { db } from '../../db/index.js';
import { restaurantInventory, restaurantOrders, bookings, rooms, restaurantMenu, restaurantCategories, restaurantTables, hotels } from '../../db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.middleware.js';
import { checkRateLimit } from '../utils/security.js';

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

// --- PUBLIC TABLE ORDERING ROUTES (For QR scans) ---

// Get table information, active menu, and current table order
router.get('/public/table/:hotelId/:tableNumber', async (req, res) => {
  try {
    const hotelId = parseInt(req.params.hotelId);
    const tableNumber = decodeURIComponent(req.params.tableNumber);

    if (isNaN(hotelId) || !tableNumber) {
      res.status(400).json({ error: 'Hotel ID and Table Number are required' });
      return;
    }

    const hotelResult = await db.select({
      id: hotels.id,
      name: hotels.name,
      address: hotels.address,
      slug: hotels.slug,
      foodGstRate: hotels.foodGstRate
    }).from(hotels).where(eq(hotels.id, hotelId)).limit(1);

    if (hotelResult.length === 0) {
      res.status(404).json({ error: 'Hotel not found' });
      return;
    }

    let table = await db.select().from(restaurantTables)
      .where(and(eq(restaurantTables.hotelId, hotelId), eq(restaurantTables.tableNumber, tableNumber)))
      .limit(1);

    // If table doesn't exist, create it on-demand for smooth QR scanning
    if (table.length === 0) {
      const created = await db.insert(restaurantTables).values({
        hotelId,
        tableNumber,
        capacity: 4,
        section: 'Main Dining',
        status: 'vacant'
      }).returning();
      table = created;
    }

    const menu = await db.select()
      .from(restaurantMenu)
      .where(and(eq(restaurantMenu.hotelId, hotelId), eq(restaurantMenu.isAvailable, true)))
      .orderBy(restaurantMenu.category, restaurantMenu.name);

    res.json({
      hotel: hotelResult[0],
      table: table[0],
      menu
    });
  } catch (error) {
    console.error('Public table info error:', error);
    res.status(500).json({ error: 'Failed to fetch table details' });
  }
});

// Guest places or adds to dine-in table order
router.post('/public/table/order', async (req, res) => {
  try {
    const { hotelId, tableNumber, items, totalAmount, guestName, guestPhone, notes } = req.body;

    if (!hotelId || !tableNumber || !items || !Array.isArray(items)) {
      res.status(400).json({ error: 'Invalid order payload' });
      return;
    }

    // 1. Create order record (KOT)
    const newOrder = await db.insert(restaurantOrders).values({
      hotelId: parseInt(hotelId),
      tableNumber,
      items: JSON.stringify(items),
      totalAmount: parseFloat(totalAmount) || 0,
      status: 'pending',
      type: 'dine_in'
    }).returning();

    // 2. Update table state to occupied
    await db.update(restaurantTables).set({
      status: 'occupied',
      activeOrderId: newOrder[0].id,
      currentBillAmount: parseFloat(totalAmount) || 0,
      currentOrderJson: JSON.stringify(items),
      notes: notes || (guestName ? `Guest: ${guestName} (${guestPhone || ''})` : null)
    }).where(and(eq(restaurantTables.hotelId, parseInt(hotelId)), eq(restaurantTables.tableNumber, tableNumber)));

    res.json({ success: true, order: newOrder[0] });
  } catch (error) {
    console.error('Public table order error:', error);
    res.status(500).json({ error: 'Failed to submit table order' });
  }
});

// Authenticated Charge to Room for In-House Guests
router.post('/public/table/charge-to-room', async (req, res) => {
  try {
    const { hotelId, tableNumber, roomNumber, guestPin, items, totalAmount } = req.body;

    if (!hotelId || !tableNumber || !roomNumber || !guestPin) {
      res.status(400).json({ error: 'Room number and PIN are required' });
      return;
    }

    // Rate Limiting: Max 5 PIN attempts per minute per IP / room
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const rateCheck = checkRateLimit(`charge_room_${clientIp}_${hotelId}_${roomNumber}`, 5, 60000);
    if (!rateCheck.allowed) {
      res.status(429).json({ error: 'Too many authentication attempts. Please wait 1 minute before trying again.' });
      return;
    }

    // 1. Verify room and PIN
    const roomResult = await db.select().from(rooms).where(
      and(
        eq(rooms.hotelId, parseInt(hotelId)),
        eq(rooms.number, roomNumber.trim())
      )
    ).limit(1);

    if (roomResult.length === 0) {
      res.status(404).json({ error: 'Room number not found in this hotel' });
      return;
    }

    const room = roomResult[0];

    // Check PIN match (case-insensitive trim)
    if (!room.guestPin || room.guestPin.trim() !== guestPin.trim()) {
      res.status(401).json({ error: 'Invalid Room PIN. Please check your guest PIN or ask reception.' });
      return;
    }

    // 2. Find active checked-in booking for this room
    const bookingResult = await db.select().from(bookings).where(
      and(
        eq(bookings.hotelId, parseInt(hotelId)),
        eq(bookings.roomId, room.id),
        eq(bookings.status, 'checked_in')
      )
    ).limit(1);

    const bookingId = bookingResult.length > 0 ? bookingResult[0].id : null;

    // 3. Create restaurant order attached to room and booking
    const billAmount = parseFloat(totalAmount) || 0;
    const newOrder = await db.insert(restaurantOrders).values({
      hotelId: parseInt(hotelId),
      roomId: room.id,
      bookingId: bookingId,
      tableNumber,
      items: typeof items === 'string' ? items : JSON.stringify(items),
      totalAmount: billAmount,
      status: 'delivered',
      type: 'room_service'
    }).returning();

    // 4. Free up the table
    await db.update(restaurantTables).set({
      status: 'vacant',
      activeOrderId: null,
      currentBillAmount: 0,
      currentOrderJson: null,
      notes: null
    }).where(and(eq(restaurantTables.hotelId, parseInt(hotelId)), eq(restaurantTables.tableNumber, tableNumber)));

    res.json({
      success: true,
      message: `Bill of ₹${billAmount} successfully charged to Room ${roomNumber}.`,
      order: newOrder[0]
    });
  } catch (error) {
    console.error('Charge to room error:', error);
    res.status(500).json({ error: 'Failed to charge bill to room' });
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

// --- TABLE MANAGEMENT (Staff / Admin) ---

// Get all dining tables for current hotel
router.get('/tables', async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    let tables = await db.select().from(restaurantTables)
      .where(eq(restaurantTables.hotelId, hotelId))
      .orderBy(restaurantTables.tableNumber);

    // Auto-seed default tables T-01 through T-06 if hotel has no tables yet
    if (tables.length === 0) {
      const defaultTables = [
        { hotelId, tableNumber: 'T-01', capacity: 2, section: 'Main Dining', status: 'vacant' },
        { hotelId, tableNumber: 'T-02', capacity: 4, section: 'Main Dining', status: 'vacant' },
        { hotelId, tableNumber: 'T-03', capacity: 4, section: 'Main Dining', status: 'vacant' },
        { hotelId, tableNumber: 'T-04', capacity: 6, section: 'Main Dining', status: 'vacant' },
        { hotelId, tableNumber: 'T-05', capacity: 4, section: 'Terrace', status: 'vacant' },
        { hotelId, tableNumber: 'T-06', capacity: 8, section: 'Terrace', status: 'vacant' },
      ];
      await db.insert(restaurantTables).values(defaultTables);
      tables = await db.select().from(restaurantTables)
        .where(eq(restaurantTables.hotelId, hotelId))
        .orderBy(restaurantTables.tableNumber);
    }

    res.json(tables);
  } catch (error) {
    console.error('Fetch tables error:', error);
    res.status(500).json({ error: 'Failed to fetch restaurant tables' });
  }
});

// Add a new dining table
router.post('/tables', async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const { tableNumber, capacity, section, notes } = req.body;

    if (!tableNumber) {
      res.status(400).json({ error: 'Table number is required' });
      return;
    }

    // Check duplicate
    const existing = await db.select().from(restaurantTables)
      .where(and(eq(restaurantTables.hotelId, hotelId), eq(restaurantTables.tableNumber, tableNumber.trim())))
      .limit(1);

    if (existing.length > 0) {
      res.status(400).json({ error: `Table "${tableNumber}" already exists in this hotel` });
      return;
    }

    const created = await db.insert(restaurantTables).values({
      hotelId,
      tableNumber: tableNumber.trim(),
      capacity: parseInt(capacity) || 4,
      section: section || 'Main Dining',
      notes: notes || null,
      status: 'vacant'
    }).returning();

    res.json(created[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create dining table' });
  }
});

// Delete table (only if vacant)
router.delete('/tables/:id', async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const id = parseInt(req.params.id);

    const table = await db.select().from(restaurantTables)
      .where(and(eq(restaurantTables.id, id), eq(restaurantTables.hotelId, hotelId)))
      .limit(1);

    if (table.length === 0) {
      res.status(404).json({ error: 'Table not found' });
      return;
    }

    if (table[0].status === 'occupied') {
      res.status(400).json({ error: 'Cannot delete an occupied table. Settle or vacate it first.' });
      return;
    }

    await db.delete(restaurantTables).where(eq(restaurantTables.id, id));
    res.json({ success: true, message: 'Table deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete table' });
  }
});

// Edit custom bill / items for a table (staff special order or manual adjustments)
router.patch('/tables/:id/order', async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const id = parseInt(req.params.id);
    const { items, totalAmount, status, notes } = req.body;

    const table = await db.select().from(restaurantTables)
      .where(and(eq(restaurantTables.id, id), eq(restaurantTables.hotelId, hotelId)))
      .limit(1);

    if (table.length === 0) {
      res.status(404).json({ error: 'Table not found' });
      return;
    }

    const itemsList = Array.isArray(items) ? items : [];
    const calculatedTotal = totalAmount !== undefined ? parseFloat(totalAmount) : 
      itemsList.reduce((acc: number, item: any) => acc + ((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1)), 0);

    const updated = await db.update(restaurantTables).set({
      currentOrderJson: JSON.stringify(itemsList),
      currentBillAmount: calculatedTotal,
      status: status || (itemsList.length > 0 ? 'occupied' : 'vacant'),
      notes: notes !== undefined ? notes : table[0].notes
    }).where(eq(restaurantTables.id, id)).returning();

    res.json(updated[0]);
  } catch (error) {
    console.error('Update table order error:', error);
    res.status(500).json({ error: 'Failed to update table bill' });
  }
});

// Settle table bill (Cash/Card/UPI/Charge to Room)
router.post('/tables/:id/settle', async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const id = parseInt(req.params.id);
    const { paymentMethod, roomNumber, guestPin } = req.body;

    const table = await db.select().from(restaurantTables)
      .where(and(eq(restaurantTables.id, id), eq(restaurantTables.hotelId, hotelId)))
      .limit(1);

    if (table.length === 0) {
      res.status(404).json({ error: 'Table not found' });
      return;
    }

    const curTable = table[0];
    const amount = curTable.currentBillAmount || 0;

    if (paymentMethod === 'charge_to_room') {
      if (!roomNumber) {
        res.status(400).json({ error: 'Room number is required to charge to room' });
        return;
      }

      const roomResult = await db.select().from(rooms).where(
        and(eq(rooms.hotelId, hotelId), eq(rooms.number, roomNumber.trim()))
      ).limit(1);

      if (roomResult.length === 0) {
        res.status(404).json({ error: `Room ${roomNumber} not found in this hotel` });
        return;
      }

      const room = roomResult[0];

      // If guest PIN provided, verify
      if (guestPin && room.guestPin && room.guestPin.trim() !== guestPin.trim()) {
        res.status(401).json({ error: 'Guest PIN verification failed' });
        return;
      }

      const bookingResult = await db.select().from(bookings).where(
        and(eq(bookings.hotelId, hotelId), eq(bookings.roomId, room.id), eq(bookings.status, 'checked_in'))
      ).limit(1);

      const bookingId = bookingResult.length > 0 ? bookingResult[0].id : null;

      // Create restaurantOrder charged to room
      await db.insert(restaurantOrders).values({
        hotelId,
        roomId: room.id,
        bookingId,
        tableNumber: curTable.tableNumber,
        items: curTable.currentOrderJson || '[]',
        totalAmount: amount,
        status: 'delivered',
        type: 'room_service'
      });
    } else {
      // Record regular settled order
      await db.insert(restaurantOrders).values({
        hotelId,
        tableNumber: curTable.tableNumber,
        items: curTable.currentOrderJson || '[]',
        totalAmount: amount,
        status: 'delivered',
        type: 'dine_in'
      });
    }

    // Vacate table
    const cleared = await db.update(restaurantTables).set({
      status: 'vacant',
      activeOrderId: null,
      currentBillAmount: 0,
      currentOrderJson: null,
      notes: null
    }).where(eq(restaurantTables.id, id)).returning();

    res.json({
      success: true,
      message: `Table ${curTable.tableNumber} bill of ₹${amount} settled via ${paymentMethod}.`,
      table: cleared[0]
    });
  } catch (error) {
    console.error('Settle table error:', error);
    res.status(500).json({ error: 'Failed to settle table bill' });
  }
});

export default router;
