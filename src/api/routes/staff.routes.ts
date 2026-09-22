import express from 'express';
import { db } from '../../db/index.js';
import { staffMembers, expenses } from '../../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.middleware.js';
import { ensureDbTables } from '../../db/initSchema.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole(['admin', 'manager', 'management', 'super_admin']));

// GET /api/staff
// Get all staff members for the hotel with current month payout status
router.get('/', async (req: AuthRequest, res) => {
  try {
    await ensureDbTables();
    const hotelId = req.user!.hotelId;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthNum = now.getMonth() + 1;
    const currentMonthStr = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;
    const currentDay = now.getDate();

    const staffList = await db.select()
      .from(staffMembers)
      .where(eq(staffMembers.hotelId, hotelId))
      .orderBy(desc(staffMembers.createdAt));

    // Calculate status for each staff member
    const enrichedList = staffList.map(member => {
      const isPaidThisMonth = member.lastPaidMonth === currentMonthStr;
      const payoutDay = member.salaryPayoutDay || 1;
      
      let payoutStatus: 'paid' | 'due' | 'upcoming' = 'upcoming';
      if (isPaidThisMonth) {
        payoutStatus = 'paid';
      } else if (currentDay >= payoutDay) {
        payoutStatus = 'due';
      } else {
        payoutStatus = 'upcoming';
      }

      return {
        ...member,
        currentMonth: currentMonthStr,
        payoutStatus,
        daysUntilPayout: Math.max(0, payoutDay - currentDay)
      };
    });

    const totalMonthlySalary = staffList
      .filter(m => m.status === 'active')
      .reduce((sum, m) => sum + (Number(m.monthlySalary) || 0), 0);

    const paidTotal = enrichedList
      .filter(m => m.payoutStatus === 'paid')
      .reduce((sum, m) => sum + (Number(m.monthlySalary) || 0), 0);

    const dueTotal = enrichedList
      .filter(m => m.payoutStatus === 'due')
      .reduce((sum, m) => sum + (Number(m.monthlySalary) || 0), 0);

    res.json({
      staff: enrichedList,
      summary: {
        totalStaff: staffList.length,
        activeStaff: staffList.filter(m => m.status === 'active').length,
        totalMonthlySalary: Number(totalMonthlySalary.toFixed(2)),
        paidTotal: Number(paidTotal.toFixed(2)),
        dueTotal: Number(dueTotal.toFixed(2)),
        currentMonth: currentMonthStr
      }
    });
  } catch (error: any) {
    console.error('Fetch staff error:', error);
    res.status(500).json({ error: 'Failed to fetch staff members' });
  }
});

// GET /api/staff/salary-alerts
// Returns owner salary payout alerts for Dashboard
router.get('/salary-alerts', async (req: AuthRequest, res) => {
  try {
    await ensureDbTables();
    const hotelId = req.user!.hotelId;

    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentDay = now.getDate();

    const staffList = await db.select()
      .from(staffMembers)
      .where(and(eq(staffMembers.hotelId, hotelId), eq(staffMembers.status, 'active')));

    const dueStaff = staffList.filter(m => {
      const isPaid = m.lastPaidMonth === currentMonthStr;
      return !isPaid && currentDay >= (m.salaryPayoutDay || 1);
    });

    const upcomingStaff = staffList.filter(m => {
      const isPaid = m.lastPaidMonth === currentMonthStr;
      const payoutDay = m.salaryPayoutDay || 1;
      return !isPaid && currentDay < payoutDay && (payoutDay - currentDay) <= 3;
    });

    const dueTotal = dueStaff.reduce((sum, m) => sum + (Number(m.monthlySalary) || 0), 0);

    res.json({
      hasDueAlert: dueStaff.length > 0,
      dueCount: dueStaff.length,
      dueTotal: Number(dueTotal.toFixed(2)),
      dueStaff: dueStaff.map(m => ({ id: m.id, name: m.name, designation: m.designation, salary: m.monthlySalary })),
      hasUpcomingAlert: upcomingStaff.length > 0,
      upcomingCount: upcomingStaff.length
    });
  } catch (error: any) {
    console.error('Salary alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch salary alerts' });
  }
});

// POST /api/staff
// Create staff member
router.post('/', async (req: AuthRequest, res) => {
  try {
    await ensureDbTables();
    const hotelId = req.user!.hotelId;
    const { name, email, phone, designation, monthlySalary, salaryPayoutDay, bankDetails, joiningDate } = req.body;

    if (!name || !designation || !monthlySalary) {
      res.status(400).json({ error: 'Name, designation, and monthly salary are required.' });
      return;
    }

    const newStaff = await db.insert(staffMembers).values({
      hotelId,
      name,
      email: email || null,
      phone: phone || null,
      designation,
      monthlySalary: parseFloat(monthlySalary),
      salaryPayoutDay: parseInt(salaryPayoutDay) || 1,
      bankDetails: bankDetails || null,
      joiningDate: joiningDate || new Date().toISOString().split('T')[0],
      status: 'active'
    }).returning();

    res.json(newStaff[0]);
  } catch (error: any) {
    console.error('Create staff error:', error);
    res.status(500).json({ error: 'Failed to create staff member' });
  }
});

// PATCH /api/staff/:id
// Update staff member
router.patch('/:id', async (req: AuthRequest, res) => {
  try {
    await ensureDbTables();
    const hotelId = req.user!.hotelId;
    const id = parseInt(req.params.id);
    const { name, email, phone, designation, monthlySalary, salaryPayoutDay, bankDetails, status } = req.body;

    const updated = await db.update(staffMembers)
      .set({
        name: name !== undefined ? name : undefined,
        email: email !== undefined ? email : undefined,
        phone: phone !== undefined ? phone : undefined,
        designation: designation !== undefined ? designation : undefined,
        monthlySalary: monthlySalary !== undefined ? parseFloat(monthlySalary) : undefined,
        salaryPayoutDay: salaryPayoutDay !== undefined ? parseInt(salaryPayoutDay) : undefined,
        bankDetails: bankDetails !== undefined ? bankDetails : undefined,
        status: status !== undefined ? status : undefined
      })
      .where(and(eq(staffMembers.id, id), eq(staffMembers.hotelId, hotelId)))
      .returning();

    if (updated.length === 0) {
      res.status(404).json({ error: 'Staff member not found' });
      return;
    }

    res.json(updated[0]);
  } catch (error: any) {
    console.error('Update staff error:', error);
    res.status(500).json({ error: 'Failed to update staff member' });
  }
});

// DELETE /api/staff/:id
// Remove staff member
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const id = parseInt(req.params.id);

    const deleted = await db.delete(staffMembers)
      .where(and(eq(staffMembers.id, id), eq(staffMembers.hotelId, hotelId)))
      .returning();

    if (deleted.length === 0) {
      res.status(404).json({ error: 'Staff member not found' });
      return;
    }

    res.json({ success: true, message: `Staff member ${deleted[0]?.name} removed successfully` });
  } catch (error: any) {
    console.error('Delete staff error:', error);
    res.status(500).json({ error: 'Failed to delete staff member' });
  }
});

// POST /api/staff/:id/pay-salary
// Record salary payment and automatically post an entry into expenses under 'salaries'
router.post('/:id/pay-salary', async (req: AuthRequest, res) => {
  try {
    const hotelId = req.user!.hotelId;
    const id = parseInt(req.params.id);
    const { month, paymentMethod = 'Bank Transfer', notes, recordInExpenses = true } = req.body;

    const staffQuery = await db.select().from(staffMembers)
      .where(and(eq(staffMembers.id, id), eq(staffMembers.hotelId, hotelId)))
      .limit(1);

    if (staffQuery.length === 0) {
      res.status(404).json({ error: 'Staff member not found' });
      return;
    }

    const staff = staffQuery[0];
    const targetMonth = month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    // 1. Update staff payment status
    const updated = await db.update(staffMembers)
      .set({
        lastPaidMonth: targetMonth,
        lastPaidDate: new Date()
      })
      .where(and(eq(staffMembers.id, id), eq(staffMembers.hotelId, hotelId)))
      .returning();

    // 2. Automatically log to expenses under 'salaries' so it appears in category expense reports
    if (recordInExpenses) {
      await db.insert(expenses).values({
        hotelId,
        name: `Salary - ${staff.name} (${targetMonth})`,
        type: 'salaries',
        amount: Number(staff.monthlySalary) || 0,
        description: `Staff Salary for ${staff.designation}. Paid via ${paymentMethod}${notes ? ` - ${notes}` : ''}`,
        createdAt: new Date()
      });
    }

    res.json({
      success: true,
      message: `Salary for ${staff.name} marked as paid for ${targetMonth}`,
      staff: updated[0]
    });
  } catch (error: any) {
    console.error('Pay salary error:', error);
    res.status(500).json({ error: 'Failed to record salary payment' });
  }
});

export default router;
