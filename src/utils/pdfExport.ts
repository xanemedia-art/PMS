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
  let finalY = lastY + 10;
  
  // Check if we have enough space for title and some table rows, otherwise add page
  if (finalY + 40 > 285) {
    doc.addPage();
    finalY = 20;
  }

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

// Indian Rupees Number to Words translator
function numberToWords(num: number): string {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const val = Math.round(num);
  if (val === 0) return 'Zero Rupees Only';
  
  function translate(n: number): string {
    let str = '';
    if (n > 99) {
      str += a[Math.floor(n / 100)] + 'Hundred ';
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
    } else if (n > 0) {
      str += a[n];
    }
    return str;
  }

  let words = '';
  let temp = val;
  // Crores (1,00,00,000)
  if (temp >= 10000000) {
    words += translate(Math.floor(temp / 10000000)) + 'Crore ';
    temp %= 10000000;
  }
  // Lakhs (1,00,000)
  if (temp >= 100000) {
    words += translate(Math.floor(temp / 100000)) + 'Lakh ';
    temp %= 100000;
  }
  // Thousands (1,000)
  if (temp >= 1000) {
    words += translate(Math.floor(temp / 1000)) + 'Thousand ';
    temp %= 1000;
  }
  if (temp > 0) {
    words += translate(temp);
  }
  return words.trim() + ' Rupees Only';
}

export function exportGstInvoicePdf(
  invoice: any, 
  guest: any, 
  items: any[]
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const hotelName = invoice.hotelName || 'Xane PMS Partner';
  const hotelAddress = invoice.hotelAddress || 'India';
  const isInterState = invoice.transactionType === 'inter_state';

  // 1. Title & Header Band
  doc.setFillColor(15, 23, 42); // slate-900 background
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('TAX INVOICE', 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('GST Compliant Invoice', 14, 21);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(invoice.invoiceNumber || 'INV-TEMP', 150, 15);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  const issuedDate = new Date(invoice.issuedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' });
  doc.text(`Date: ${issuedDate}`, 150, 21);

  // Accent Line
  doc.setFillColor(99, 102, 241); // indigo-500
  doc.rect(0, 30, 210, 2, 'F');

  // 2. Hotel Details (Billed From) vs Guest Details (Billed To)
  doc.setTextColor(100, 116, 139); // slate-500
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('BILLED FROM (Supplier)', 14, 42);
  doc.text('BILLED TO (Recipient)', 110, 42);

  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(hotelName, 14, 48);
  doc.text(guest.name || 'Walk-in Guest', 110, 48);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // slate-600

  // Billed From Address (multi-line)
  const hotelAddrLines = doc.splitTextToSize(hotelAddress, 85);
  doc.text(hotelAddrLines, 14, 53);

  // Billed To details
  doc.text(`Phone: ${guest.phone || 'N/A'}`, 110, 53);
  doc.text(`Email: ${guest.email || 'N/A'}`, 110, 58);
  if (invoice.guestGstin) {
    doc.setFont('helvetica', 'bold');
    doc.text(`Guest GSTIN: ${invoice.guestGstin}`, 110, 63);
    doc.setFont('helvetica', 'normal');
  }

  // Draw metadata info boxes for GSTIN & State Code
  const boxY = Math.max(53 + (hotelAddrLines.length * 4), 68);
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(14, boxY, 85, 22, 2, 2, 'FD');
  doc.roundedRect(110, boxY, 86, 22, 2, 2, 'FD');

  // Billed From GST Details
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.5);
  doc.text('Hotel GST details:', 18, boxY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`GSTIN: ${invoice.gstin || 'NOT PROVIDED'}`, 18, boxY + 10);
  doc.text(`State: ${invoice.billingStateName || 'N/A'} (Code: ${invoice.billingStateCode || 'N/A'})`, 18, boxY + 15);

  // Billed To GST Details
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Place of Supply details:', 114, boxY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`State: ${invoice.guestStateName || invoice.billingStateName || 'N/A'}`, 114, boxY + 10);
  doc.text(`State Code: ${invoice.guestStateCode || invoice.billingStateCode || 'N/A'}`, 114, boxY + 15);

  // 3. Stay metadata
  const stayY = boxY + 28;
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(14, stayY, 182, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85); // slate-700
  doc.setFontSize(8.5);
  
  const checkInLoc = new Date(guest.checkInDate).toLocaleDateString('en-IN');
  const checkOutLoc = new Date(guest.checkOutDate).toLocaleDateString('en-IN');
  const nights = Math.max(1, Math.round((new Date(guest.checkOutDate).getTime() - new Date(guest.checkInDate).getTime()) / (1000 * 60 * 60 * 24)));
  doc.text(`Room: ${guest.roomNumber || 'N/A'}`, 18, stayY + 6.5);
  doc.text(`Check-In: ${checkInLoc}`, 55, stayY + 6.5);
  doc.text(`Check-Out: ${checkOutLoc}`, 105, stayY + 6.5);
  doc.text(`Total Nights: ${nights}`, 160, stayY + 6.5);

  // 4. Invoiced Items table
  const tableHeaders = isInterState 
    ? [['S.No', 'Description of Services', 'SAC', 'Qty', 'Rate', 'Taxable Val', 'IGST %', 'IGST Amt', 'Total']]
    : [['S.No', 'Description of Services', 'SAC', 'Qty', 'Rate', 'Taxable Val', 'CGST %/SGST %', 'CGST/SGST Amt', 'Total']];

  const tableBody = items.map((item, idx) => {
    const rateFormatted = `INR ${Number(item.rate).toFixed(2)}`;
    const baseFormatted = `INR ${Number(item.taxableValue).toFixed(2)}`;
    const taxAmt = Number(item.taxAmount);

    let gstFormatted = '';
    let taxAmtFormatted = '';
    if (isInterState) {
      gstFormatted = `${item.gstRate}%`;
      taxAmtFormatted = `INR ${taxAmt.toFixed(2)}`;
    } else {
      gstFormatted = `${item.cgstRate}% / ${item.sgstRate}%`;
      taxAmtFormatted = `INR ${(taxAmt/2).toFixed(2)} / ${(taxAmt/2).toFixed(2)}`;
    }

    const totalFormatted = `INR ${(Number(item.taxableValue) + taxAmt).toFixed(2)}`;

    return [
      (idx + 1).toString(),
      item.description,
      item.sacCode || '999799',
      item.quantity.toString(),
      rateFormatted,
      baseFormatted,
      gstFormatted,
      taxAmtFormatted,
      totalFormatted
    ];
  });

  autoTable(doc, {
    startY: stayY + 14,
    head: tableHeaders,
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], fontSize: 7.5, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 50 },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 10, halign: 'center' },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 20, halign: 'right' },
      6: { cellWidth: 24, halign: 'center' },
      7: { cellWidth: 28, halign: 'right' },
      8: { cellWidth: 24, halign: 'right' }
    },
    margin: { left: 14, right: 14 }
  });

  const finalTableY = (doc as any).lastAutoTable.finalY || 160;

  // 5. Invoice Totals and Tax Summary Breakdown
  let summaryY = finalTableY + 8;

  // We need at least 70mm for summary, signature block, and notes to fit comfortably
  if (summaryY + 70 > 285) {
    doc.addPage();
    summaryY = 20; // reset Y to top margin on new page
  }

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('SUMMARY OF TAXES & FEES', 14, summaryY);

  const taxableSub = Number(invoice.baseAmount) + Number(invoice.extrasAmount);
  const taxSub = Number(invoice.taxAmount);
  const finalTotal = Number(invoice.totalAmount);

  // Render totals panel
  const totalPanelX = 130;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  doc.text('Total Taxable Value:', totalPanelX, summaryY + 5);
  doc.text(`INR ${taxableSub.toFixed(2)}`, totalPanelX + 38, summaryY + 5, { align: 'right' });

  if (isInterState) {
    doc.text('Integrated GST (IGST):', totalPanelX, summaryY + 10);
    doc.text(`INR ${taxSub.toFixed(2)}`, totalPanelX + 38, summaryY + 10, { align: 'right' });
  } else {
    doc.text('Central GST (CGST):', totalPanelX, summaryY + 10);
    doc.text(`INR ${Number(invoice.cgstAmount || (taxSub/2)).toFixed(2)}`, totalPanelX + 38, summaryY + 10, { align: 'right' });

    doc.text('State GST (SGST):', totalPanelX, summaryY + 15);
    doc.text(`INR ${Number(invoice.sgstAmount || (taxSub/2)).toFixed(2)}`, totalPanelX + 38, summaryY + 15, { align: 'right' });
  }

  doc.setFillColor(241, 245, 249);
  doc.rect(totalPanelX - 2, summaryY + 19, 68, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.5);
  doc.text('GRAND TOTAL:', totalPanelX, summaryY + 24.5);
  doc.text(`INR ${finalTotal.toFixed(2)}`, totalPanelX + 38, summaryY + 24.5, { align: 'right' });

  // 6. Rupees in Words details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Rupees in Words:', 14, summaryY + 33);
  doc.setFont('helvetica', 'normal');
  doc.text(numberToWords(finalTotal), 14, summaryY + 37.5);

  // 7. Signature Placeholder
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.line(140, summaryY + 52, 196, summaryY + 52);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Authorized Signatory', 168, summaryY + 56.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`for ${hotelName}`, 168, summaryY + 60.5, { align: 'center' });

  // 8. Bottom Terms & Notes
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Thank you for your stay. Standard checkout time is 11:00 AM.', 14, summaryY + 62);
  doc.text('This is a computer-generated tax invoice and requires no physical signature.', 14, summaryY + 66);

  // Save the invoice
  doc.save(`tax-invoice-${invoice.invoiceNumber || 'temp'}.pdf`);
}

