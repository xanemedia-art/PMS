import { db } from './src/db/index.js';
import { housekeepingTasks } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

async function clearOldTasks() {
  try {
    const result = await db.delete(housekeepingTasks).where(eq(housekeepingTasks.status, 'clean')).returning();
    console.log(`Successfully deleted ${result.length} old 'clean' tasks.`);
  } catch (err) {
    console.error('Error clearing tasks:', err);
  }
  process.exit(0);
}

clearOldTasks();
