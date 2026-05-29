import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper to draw clean styled headers and borders
function addDocHeader(doc: jsPDF, title: string, hotelName: string, hotelAddress: string) {
  // Cosmic Slate theme styling colors
  doc.setFillColor(15, 23, 42); // slate-900 background
  doc.rect(0, 0, 210, 40, 'F');

  // Title text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(title, 14, 18);

  // Hotel branding
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`${hotelName} — ${hotelAddress}`, 14, 25);

  // Timestamp
  const now = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.text(`Generated: ${now}`, 14, 32);

  // Header bottom highlight bar
  doc.setFillColor(99, 102, 241); // indigo-500 accent line
  doc.rect(0, 38, 210, 2, 'F');
}

// Helper to draw summary metric cards
function addMetricCard(doc: jsPDF, label: string, value: string, x: number, y: number, w: number, h: number) {
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(x, y, w, h, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(label.toUpperCase(), x + 4, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(value, x + 4, y + h - 4);
}

export function exportHotelRevenuePdf(data: any, hotelInfo: { name: string; address: string | null }) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const hotelName = hotelInfo.name || 'Xane PMS Hotel';
  const hotelAddress = hotelInfo.address || 'Goa, India';

  // 1. Header
  addDocHeader(doc, 'GENERAL REVENUE & PERFORMANCE REPORT', hotelName, hotelAddress);

  // 2. Summary Metrics
  const cardW = 43;
  const cardH = 16;
  const startY = 48;
  addMetricCard(doc, 'Expected Daily Rev', `INR ${Number(data.dailyRevenue || 0).toLocaleString('en-IN')}`, 14, startY, cardW, cardH);
  addMetricCard(doc, 'All-time Revenue', `INR ${Number(data.allTimeRevenue || 0).toLocaleString('en-IN')}`, 14 + cardW + 5, startY, cardW, cardH);
  addMetricCard(doc, 'Occupancy Rate', `${data.occupancyRate || 0}%`, 14 + (cardW + 5) * 2, startY, cardW, cardH);
  addMetricCard(doc, 'Today\'s Traffic', `${Number(data.arrivalsToday || 0) + Number(data.departuresToday || 0)} PAX`, 14 + (cardW + 5) * 3, startY, cardW, cardH);

  // 3. Monthly Revenue Trend Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Monthly Revenue Trend', 14, 76);

  const monthlyHeaders = [['Month', 'Total Revenue (INR)']];
  const monthlyBody = (data.monthlyRevenue || []).map((row: any) => [
    row.name,
    `INR ${Number(row.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
  ]);

  autoTable(doc, {
    startY: 80,
    head: monthlyHeaders,
    body: monthlyBody,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    margin: { left: 14, right: 14 }
  });

  // 4. Top Performing Agents Table
  const lastY = (doc as any).lastAutoTable?.finalY || 130;
  const finalY = lastY + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Top Performing Travel Agents', 14, finalY);

  const agentHeaders = [['Agent Name', 'Total Bookings', 'Revenue Contribution (INR)']];
  const agentBody = (data.topAgents || []).map((row: any) => [
    row.name,
    row.bookings.toString(),
    `INR ${Number(row.commission || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
  ]);

  autoTable(doc, {
    startY: finalY + 4,
    head: agentHeaders,
    body: agentBody,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    margin: { left: 14, right: 14 }
  });

  // Save the PDF document
  doc.save(`hotel-revenue-report-${new Date().toISOString().split('T')[0]}.pdf`);
}

export function exportAgentStatementPdf(agentReport: any, hotelInfo: { name: string; address: string | null }) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const hotelName = hotelInfo.name || 'Xane PMS Hotel';
  const hotelAddress = hotelInfo.address || 'Goa, India';

  // 1. Header
  addDocHeader(doc, 'TRAVEL AGENT PERFORMANCE STATEMENT', hotelName, hotelAddress);

  // 2. Agent Details card
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(14, 48, 182, 22, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('TRAVEL AGENT DETAILS', 18, 54);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(`Name: ${agentReport.name}`, 18, 60);
  doc.text(`Email: ${agentReport.email}`, 18, 65);

  // 3. Stats summary
  const cardW = 57;
  const cardH = 16;
  const startY = 76;
  addMetricCard(doc, 'Total Bookings', `${agentReport.totalBookings} stays`, 14, startY, cardW, cardH);
  addMetricCard(doc, 'Revenue Contribution', `INR ${Number(agentReport.totalRevenue || 0).toLocaleString('en-IN')}`, 14 + cardW + 5, startY, cardW, cardH);
  
  // Calculate average booking value
  const avg = agentReport.totalBookings > 0 ? (agentReport.totalRevenue / agentReport.totalBookings) : 0;
  addMetricCard(doc, 'Average Booking Value', `INR ${Math.round(avg).toLocaleString('en-IN')}`, 14 + (cardW + 5) * 2, startY, cardW, cardH);

  // 4. Bookings Detail Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Reservations Listing', 14, 104);

  const bookingsHeaders = [['B-ID', 'Guest Name', 'Category', 'Rooms', 'Check-In', 'Check-Out', 'Status', 'Total Rate (INR)']];
  const bookingsBody = (agentReport.bookings || []).map((b: any) => [
    `#B-${b.id}`,
    b.guestName,
    b.roomTypeName || 'N/A',
    (b.roomCount || 1).toString(),
    new Date(b.checkInDate).toLocaleDateString('en-IN'),
    new Date(b.checkOutDate).toLocaleDateString('en-IN'),
    b.status.replace('_', ' ').toUpperCase(),
    b.totalAmount !== null ? `INR ${Number(b.totalAmount).toLocaleString('en-IN')}` : 'N/A'
  ]);

  autoTable(doc, {
    startY: 108,
    head: bookingsHeaders,
    body: bookingsBody,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 14 },
      1: { cellWidth: 28 },
      2: { cellWidth: 24 },
      3: { cellWidth: 12 },
      4: { cellWidth: 22 },
      5: { cellWidth: 22 },
      6: { cellWidth: 24 },
      7: { cellWidth: 24 }
    },
    margin: { left: 14, right: 14 }
  });

  // Save agent statement
  const agentSafeName = agentReport.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  doc.save(`agent-statement-${agentSafeName}-${new Date().toISOString().split('T')[0]}.pdf`);
}
