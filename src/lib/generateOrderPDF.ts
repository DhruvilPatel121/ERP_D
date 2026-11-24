import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Order } from '@/types/erp';
import { formatDate } from '@/lib/utils';
import { ORDER_STATUS_LABELS } from '@/lib/orderStatus';

export function generateOrderPDF(order: Order) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Aaradhana Silver Manufacturing', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  doc.setFontSize(16);
  doc.text('Order Details', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Order Information
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');

  const orderInfo = [
    ['Order Number:', order.orderNumber],
    ['Order Date:', formatDate(order.orderDate)],
    ['Customer:', order.customerName],
    ['Mobile:', order.customerMobile],
    ['Order Type:', order.orderType.toUpperCase()],
    ['Status:', ORDER_STATUS_LABELS[order.status] || order.status],
  ];

  if (order.touch) {
    orderInfo.push(['Touch:', order.touch]);
  }

  autoTable(doc, {
    startY: yPosition,
    head: [['Field', 'Value']],
    body: orderInfo,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 10 },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Order Items Table
  const tableData = order.items.map((item, index) => [
    index + 1,
    item.snapshot.patternNumber,
    item.snapshot.patternName,
    item.snapshot.patternSize,
    item.snapshot.weightPerPiece + 'g',
    item.quantityType === 'grams' ? item.orderQuantity + 'g' : item.orderQuantity + ' pcs',
    item.calculation.finishedPieces + ' pcs',
    item.calculation.waxTreesRequired + ' trees',
    item.calculation.totalStones + ' stones',
    item.calculation.waxWeight + 'g',
    item.calculation.silverWeight + 'g',
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['#', 'Pattern No.', 'Pattern Name', 'Size', 'Wt/Piece', 'Order Qty', 'Finished Pcs', 'Wax Trees', 'Stones', 'Wax Wt', 'Silver Wt']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 25 },
      2: { cellWidth: 35 },
      3: { cellWidth: 20 },
      4: { cellWidth: 20 },
      5: { cellWidth: 25 },
      6: { cellWidth: 25 },
      7: { cellWidth: 20 },
      8: { cellWidth: 20 },
      9: { cellWidth: 20 },
      10: { cellWidth: 20 },
    },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Totals
  const totalPieces = order.items.reduce((sum, item) => sum + item.calculation.finishedPieces, 0);
  const totalWaxWeight = order.items.reduce((sum, item) => sum + item.calculation.waxWeight, 0);
  const totalSilverWeight = order.items.reduce((sum, item) => sum + item.calculation.silverWeight, 0);
  const totalStones = order.items.reduce((sum, item) => sum + item.calculation.totalStones, 0);

  const totals = [
    ['Total Finished Pieces:', totalPieces.toString()],
    ['Total Wax Weight:', totalWaxWeight.toFixed(2) + 'g'],
    ['Total Silver Weight:', totalSilverWeight.toFixed(2) + 'g'],
    ['Total Stones:', totalStones.toString()],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [['Total', 'Value']],
    body: totals,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 10 },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Karigar Assignments
  if (order.karigarAssignments && order.karigarAssignments.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Karigar Assignments', 14, yPosition);
    yPosition += 10;

    const karigarData = order.karigarAssignments.map((ka, index) => [
      index + 1,
      ka.type.toUpperCase(),
      ka.karigarName,
      formatDate(ka.assignedAt),
      ka.notes || '-',
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Type', 'Karigar Name', 'Assigned Date', 'Notes']],
      body: karigarData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // Stone Usage
  if (order.stoneUsage && order.stoneUsage.length > 0) {
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Stone Usage', 14, yPosition);
    yPosition += 10;

    const stoneData = order.stoneUsage.map((su, index) => [
      index + 1,
      su.stoneType.toUpperCase(),
      su.stoneName,
      su.quantityUsed.toString(),
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Stone Type', 'Stone Name', 'Quantity Used']],
      body: stoneData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // Status History
  if (order.statusHistory && order.statusHistory.length > 0) {
    if (yPosition > pageHeight - 80) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Status History', 14, yPosition);
    yPosition += 10;

    const historyData = order.statusHistory.map((sh, index) => [
      index + 1,
      ORDER_STATUS_LABELS[sh.status] || sh.status,
      formatDate(sh.changedAt),
      sh.changedBy,
      sh.notes || '-',
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Status', 'Changed At', 'Changed By', 'Notes']],
      body: historyData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 },
    });
  }

  // Notes
  if (order.notes) {
    yPosition = (doc as any).lastAutoTable.finalY + 15;
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes', 14, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(order.notes, pageWidth - 28);
    doc.text(lines, 14, yPosition);
  }

  // Footer
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Page ${i} of ${pageCount} | Generated on ${new Date().toLocaleString()}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Save PDF
  const fileName = `Order_${order.orderNumber.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}
