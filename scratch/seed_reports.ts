import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DATABASE_URL || '');

async function main() {
  console.log('Seeding report data (invoices)...');
  try {
    // Get hotelId
    const hotels = await sql`SELECT id FROM hotels LIMIT 1`;
    if (hotels.length === 0) {
      console.log('No hotels found. Run seed first.');
      return;
    }
    const hotelId = hotels[0].id;

    // Get a booking to link invoices to
    const bookings = await sql`SELECT id FROM bookings LIMIT 1`;
    if (bookings.length === 0) {
      console.log('No bookings found. Run seed first.');
      return;
    }
    const bookingId = bookings[0].id;

    // Create some paid invoices for the last 6 months
    const now = new Date();
    for (let i = 0; i < 20; i++) {
      const issuedAt = new Date(now);
      issuedAt.setMonth(now.getMonth() - Math.floor(Math.random() * 6));
      issuedAt.setDate(Math.floor(Math.random() * 28) + 1);
      
      const baseAmount = Math.floor(Math.random() * 500) + 100;
      const totalAmount = baseAmount * 1.1; // adding some tax
      
      await sql`
        INSERT INTO invoices (hotel_id, booking_id, base_amount, extras_amount, tax_amount, total_amount, status, issued_at)
        VALUES (${hotelId}, ${bookingId}, ${baseAmount}, 0, ${baseAmount * 0.1}, ${totalAmount}, 'paid', ${issuedAt.toISOString()})
      `;
    }

    console.log('Successfully seeded 20 paid invoices for reporting.');
  } catch (error) {
    console.error('Error seeding invoices:', error);
  } finally {
    await sql.end();
  }
}

main();
