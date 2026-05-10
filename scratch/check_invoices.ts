import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DATABASE_URL || '');

async function main() {
  console.log('Checking invoices...');
  try {
    const invoices = await sql`SELECT count(*) FROM invoices`;
    console.log('Total invoices:', invoices[0].count);
    
    const paidInvoices = await sql`SELECT count(*) FROM invoices WHERE status = 'paid'`;
    console.log('Paid invoices:', paidInvoices[0].count);
  } catch (error) {
    console.error('Error checking invoices:', error);
  } finally {
    await sql.end();
  }
}

main();
