/**
 * Order PDF generator.
 *
 * Produces shareable, print-ready PDFs using jsPDF + jspdf-autotable.
 *
 * A single order can be rendered in three flavours:
 *   - "wax"   → wax work order (trees, weights, wax karigar distribution)
 *   - "stone" → stone work order (stone requirements, stone usage, stone karigars)
 *   - "both"  → the complete order (everything)
 *
 * Batch export of many orders (e.g. "all orders" or a single party's orders)
 * is supported via generateOrdersPdf, which lays every order out on its own
 * page (optionally preceded by an index/summary page).
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  Order,
  OrderItem,
  StoneRequirement,
  StoneUsageRecord,
} from "@/types/erp";
import { getBusinessSettings } from "@/lib/db";
import { ORDER_STATUS_LABELS } from "@/lib/orderStatus";
import { buildSplitTargets } from "@/lib/karigarSplit";
import { normalizeSize, normalizeShape } from "@/lib/stoneAvailability";
import { formatDate } from "@/lib/utils";

export type OrderPdfWorkType = "wax" | "stone" | "both";

export interface OrderPdfOptions {
  /** Which work flavour to render. Defaults to "both". */
  workType?: OrderPdfWorkType;
  /** Optional heading override. */
  title?: string;
  /** Optional file name (without the .pdf extension). */
  fileName?: string;
}

export interface OrdersPdfOptions extends OrderPdfOptions {
  /** Optional heading for the batch cover/index. */
  indexTitle?: string;
  /** Set to false to skip the leading index/summary page. */
  includeIndex?: boolean;
}

const PAGE_WIDTH = 210; // A4 portrait width (mm)
const PAGE_HEIGHT = 297;
const MARGIN = 14;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BOTTOM_LIMIT = PAGE_HEIGHT - 16; // reserve room for the footer
const BRAND_COLOR: [number, number, number] = [30, 58, 95];
const ACCENT_COLOR: [number, number, number] = [184, 150, 90];
const LIGHT_GRAY: [number, number, number] = [244, 246, 248];

const WORK_TYPE_LABELS: Record<OrderPdfWorkType, string> = {
  wax: "Wax Work Order",
  stone: "Stone Work Order",
  both: "Order Details (Wax + Stone)",
};

function safeText(value: unknown, fallback = "—"): string {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function orderTypeLabel(type?: Order["orderType"]): string {
  if (type === "grams") return "Only Grams";
  if (type === "pieces") return "Only Pieces";
  if (type === "mixed") return "Grams + Pieces";
  return "Pieces";
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

interface OrderTotals {
  pieces: number;
  trees: number;
  stones: number;
  weight: number;
}

function computeTotals(order: Order): OrderTotals {
  let pieces = 0;
  let trees = 0;
  let stones = 0;
  let weight = 0;
  for (const item of order.items) {
    pieces += item.calculation?.finishedPieces ?? 0;
    trees += item.calculation?.waxTreesRequired ?? 0;
    stones += item.calculation?.totalStones ?? 0;
    const w =
      item.quantityType === "grams"
        ? item.orderQuantity
        : (item.calculation?.expectedWeightGrams ??
          item.orderQuantity * (item.snapshot?.weightPerPiece ?? 0));
    weight += w || 0;
  }
  return { pieces, trees, stones, weight: round3(weight) };
}

/** Aggregate the per-item stone requirements into a single de-duplicated list. */
function aggregateStoneRequirements(items: OrderItem[]): StoneRequirement[] {
  const map = new Map<string, StoneRequirement>();
  for (const item of items) {
    for (const req of item.calculation?.stoneRequirements ?? []) {
      const key = `${req.stoneType}|${normalizeSize(req.stoneSize)}|${normalizeShape(
        req.shape,
      )}`;
      const existing = map.get(key);
      if (existing) {
        existing.requiredQty += req.requiredQty;
        existing.finishedPieces += req.finishedPieces;
      } else {
        map.set(key, { ...req });
      }
    }
  }
  return Array.from(map.values());
}

/**
 * Ensure there is at least `needed` mm of vertical space left on the page.
 * When there is not, a new page is added and the top margin is returned.
 */
function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > BOTTOM_LIMIT) {
    doc.addPage();
    return MARGIN + 2;
  }
  return y;
}

function sectionHeading(doc: jsPDF, y: number, text: string): number {
  y = ensureSpace(doc, y, 12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND_COLOR);
  doc.text(text, MARGIN, y);
  return y + 5;
}

function drawBusinessHeader(doc: jsPDF): number {
  const business = getBusinessSettings();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...BRAND_COLOR);
  doc.text(safeText(business.businessName, "Silver Jewellery ERP"), MARGIN, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  const addressLines: string[] = [];
  if (business.address) addressLines.push(business.address);
  const cityLine = [business.city, business.state, business.country]
    .filter(Boolean)
    .join(", ");
  if (cityLine) addressLines.push(cityLine);
  const contactParts = [business.mobile, business.email].filter(Boolean);
  if (contactParts.length) addressLines.push(contactParts.join("  |  "));
  if (business.gst) addressLines.push(`GST: ${business.gst}`);

  let y = 22;
  addressLines.forEach((line) => {
    doc.text(line, MARGIN, y);
    y += 4;
  });

  y += 1;
  doc.setDrawColor(...BRAND_COLOR);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  return y + 6;
}

function drawOrderInfo(doc: jsPDF, order: Order, y: number): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const infoLeft: [string, string][] = [
    ["Order No.", safeText(order.orderNumber)],
    ["Order Date", formatDate(order.orderDate)],
    ["Customer", safeText(order.customerName)],
  ];
  const infoRight: [string, string][] = [
    ["Status", ORDER_STATUS_LABELS[order.status] ?? safeText(order.status)],
    ["Type", orderTypeLabel(order.orderType)],
    ["Touch", safeText(order.touch, "—")],
  ];
  if (order.customerMobile) infoRight.push(["Mobile", order.customerMobile]);

  const col2X = MARGIN + CONTENT_WIDTH / 2;
  const rowGap = 7;
  const maxRows = Math.max(infoLeft.length, infoRight.length);

  for (let i = 0; i < maxRows; i++) {
    const left = infoLeft[i];
    const right = infoRight[i];
    if (left) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 100, 100);
      doc.text(`${left[0]}:`, MARGIN, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(left[1], MARGIN + 24, y);
    }
    if (right) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 100, 100);
      doc.text(`${right[0]}:`, col2X, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(right[1], col2X + 20, y);
    }
    y += rowGap;
  }
  return y + 2;
}

function drawItemsTable(
  doc: jsPDF,
  order: Order,
  workType: OrderPdfWorkType,
  y: number,
): number {
  const showWax = workType === "wax" || workType === "both";
  const showStone = workType === "stone" || workType === "both";

  const head: string[] = ["Pattern", "Type", "Order Qty", "Fin. Pcs", "Wt/Pc"];
  const columnStyles: Record<number, { cellWidth: number; halign?: "right" | "center" | "left" }> = {
    0: { cellWidth: 56 },
    1: { cellWidth: 20, halign: "center" },
    2: { cellWidth: 24, halign: "right" },
    3: { cellWidth: 20, halign: "right" },
    4: { cellWidth: 20, halign: "right" },
  };

  let colIdx = 5;
  if (showWax) {
    head.push("Trees", "Tree Size");
    columnStyles[colIdx] = { cellWidth: 16, halign: "right" };
    columnStyles[colIdx + 1] = { cellWidth: 20, halign: "right" };
    colIdx += 2;
  }
  if (showStone) {
    head.push("Stones");
    columnStyles[colIdx] = { cellWidth: 26, halign: "right" };
  }

  const body = order.items.map((item) => {
    const row: string[] = [
      `${item.snapshot?.patternNumber ?? "—"} - ${item.snapshot?.patternName ?? ""}`.trim(),
      item.quantityType === "grams" ? "Grams" : "Pieces",
      item.quantityType === "grams"
        ? `${item.orderQuantity} g`
        : `${item.orderQuantity} pcs`,
      String(item.calculation?.finishedPieces ?? 0),
      `${item.snapshot?.weightPerPiece ?? 0} g`,
    ];
    if (showWax) {
      row.push(String(item.calculation?.waxTreesRequired ?? 0));
      row.push(String(item.snapshot?.treeSize ?? "—"));
    }
    if (showStone) {
      row.push((item.calculation?.totalStones ?? 0).toLocaleString());
    }
    return row;
  });

  autoTable(doc, {
    head: [head],
    body,
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 8, cellPadding: 2, valign: "middle" },
    headStyles: {
      fillColor: BRAND_COLOR,
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: LIGHT_GRAY },
    columnStyles,
  });

  // @ts-expect-error autoTable attaches lastAutoTable to the doc instance
  return (doc.lastAutoTable?.finalY ?? y) + 6;
}

function drawSummary(
  doc: jsPDF,
  totals: OrderTotals,
  workType: OrderPdfWorkType,
  y: number,
): number {
  y = sectionHeading(doc, y, "Summary");

  const rows: [string, string][] = [];
  rows.push(["Total Finished Pieces", totals.pieces.toLocaleString()]);
  rows.push(["Total Silver Weight", `${round3(totals.weight)} g`]);
  if (workType === "wax" || workType === "both") {
    rows.push(["Total Wax Trees", String(totals.trees)]);
  }
  if (workType === "stone" || workType === "both") {
    rows.push(["Total Stones", totals.stones.toLocaleString()]);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  rows.forEach(([label, value]) => {
    y = ensureSpace(doc, y, 6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.text(`${label}:`, MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(value, MARGIN + 48, y);
    y += 6;
  });
  return y + 2;
}

function drawKarigarAssignments(
  doc: jsPDF,
  order: Order,
  type: "wax" | "stone",
  y: number,
): number {
  const assignments = (order.karigarAssignments ?? []).filter(
    (a) => a.type === type,
  );
  if (assignments.length === 0) return y;

  const targets = buildSplitTargets(order.items);
  y = sectionHeading(
    doc,
    y,
    type === "wax" ? "Wax Karigar Distribution" : "Stone Karigar Distribution",
  );

  const body = assignments.map((a) => {
    const target = targets.find((t) => t.id === a.itemId);
    return [
      safeText(a.karigarName),
      target?.label ?? "Whole order",
      (a.allottedPieces ?? 0).toLocaleString(),
      a.allottedGrams ? `${a.allottedGrams} g` : "—",
    ];
  });

  autoTable(doc, {
    head: [["Karigar", "Pattern", "Pieces", "Weight"]],
    body,
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: {
      fillColor: type === "wax" ? BRAND_COLOR : ACCENT_COLOR,
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: LIGHT_GRAY },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 72 },
      2: { cellWidth: 26, halign: "right" },
      3: { cellWidth: 30, halign: "right" },
    },
  });

  // @ts-expect-error autoTable attaches lastAutoTable to the doc instance
  return (doc.lastAutoTable?.finalY ?? y) + 6;
}

function drawStoneRequirements(doc: jsPDF, order: Order, y: number): number {
  const requirements = aggregateStoneRequirements(order.items);
  if (requirements.length === 0) return y;

  y = sectionHeading(doc, y, "Stone Requirements");

  const body = requirements.map((r) => [
    r.stoneType === "micro" ? "Micro" : "AD",
    safeText(r.stoneName, r.stoneSize),
    safeText(r.stoneSize),
    safeText(r.shape, "—"),
    String(r.qtyPerPiece),
    r.requiredQty.toLocaleString(),
  ]);

  autoTable(doc, {
    head: [["Type", "Stone", "Size", "Shape", "Qty/Pc", "Total Qty"]],
    body,
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: {
      fillColor: ACCENT_COLOR,
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [255, 248, 220] },
    columnStyles: {
      0: { cellWidth: 18, halign: "center" },
      1: { cellWidth: 52 },
      2: { cellWidth: 32, halign: "center" },
      3: { cellWidth: 28, halign: "center" },
      4: { cellWidth: 24, halign: "right" },
      5: { cellWidth: 26, halign: "right" },
    },
  });

  // @ts-expect-error autoTable attaches lastAutoTable to the doc instance
  return (doc.lastAutoTable?.finalY ?? y) + 6;
}

function drawStoneUsage(doc: jsPDF, usage: StoneUsageRecord[], y: number): number {
  if (!usage || usage.length === 0) return y;

  y = sectionHeading(doc, y, "Stone Usage");

  const body = usage.map((u) => [
    u.stoneType === "micro" ? "Micro Diamond" : "AD Diamond",
    safeText(u.stoneName),
    safeText(u.stoneSize, "—"),
    u.quantityUsed.toLocaleString(),
  ]);
  const total = usage.reduce((s, u) => s + (u.quantityUsed || 0), 0);

  autoTable(doc, {
    head: [["Stone Type", "Stone Name", "Size", "Quantity Used"]],
    body,
    foot: [["", "", "Total", total.toLocaleString()]],
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: ACCENT_COLOR, textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: LIGHT_GRAY, textColor: 0, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [255, 248, 220] },
    columnStyles: {
      0: { cellWidth: 34 },
      1: { cellWidth: 66 },
      2: { cellWidth: 38, halign: "center" },
      3: { cellWidth: 44, halign: "right" },
    },
  });

  // @ts-expect-error autoTable attaches lastAutoTable to the doc instance
  return (doc.lastAutoTable?.finalY ?? y) + 6;
}

function drawNotes(doc: jsPDF, order: Order, y: number): number {
  if (!order.notes || !order.notes.trim()) return y;
  y = ensureSpace(doc, y, 16);
  y = sectionHeading(doc, y, "Notes");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  const lines = doc.splitTextToSize(order.notes, CONTENT_WIDTH);
  doc.text(lines, MARGIN, y);
  return y + lines.length * 4.5;
}

/** Render a complete order (header + all sections) onto the current page. */
function renderOrder(
  doc: jsPDF,
  order: Order,
  workType: OrderPdfWorkType,
  title: string,
): void {
  let y = drawBusinessHeader(doc);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...BRAND_COLOR);
  doc.text(title, MARGIN, y);
  y += 7;

  y = drawOrderInfo(doc, order, y);
  y = drawItemsTable(doc, order, workType, y);

  const totals = computeTotals(order);
  y = drawSummary(doc, totals, workType, y);

  if (workType === "wax" || workType === "both") {
    y = drawKarigarAssignments(doc, order, "wax", y);
  }
  if (workType === "stone" || workType === "both") {
    y = drawStoneRequirements(doc, order, y);
    y = drawKarigarAssignments(doc, order, "stone", y);
    y = drawStoneUsage(doc, order.stoneUsage ?? [], y);
  }

  drawNotes(doc, order, y);
}

function drawFooters(doc: jsPDF, footerLabel: string): void {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`${footerLabel} · Generated on ${formatDate(new Date().toISOString())}`, MARGIN, PAGE_HEIGHT - 8);
    doc.text(
      `Page ${i} of ${pageCount}`,
      PAGE_WIDTH - MARGIN,
      PAGE_HEIGHT - 8,
      { align: "right" },
    );
  }
}

function sanitizeFilePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9-_]/g, "_");
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Generate and download a PDF for a single order.
 */
export function generateOrderPdf(
  order: Order,
  options: OrderPdfOptions = {},
): void {
  const workType = options.workType ?? "both";
  const title = options.title ?? WORK_TYPE_LABELS[workType];

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  renderOrder(doc, order, workType, title);
  drawFooters(doc, `${title} · ${order.orderNumber}`);

  const name =
    options.fileName ??
    `${sanitizeFilePart(order.orderNumber)}-${workType}-${todayStamp()}`;
  doc.save(`${name}.pdf`);
}

/**
 * Generate and download a single PDF containing many orders (one per page).
 * Optionally preceded by an index / summary page.
 */
export function generateOrdersPdf(
  orders: Order[],
  options: OrdersPdfOptions = {},
): void {
  if (orders.length === 0) return;

  const workType = options.workType ?? "both";
  const title = options.title ?? WORK_TYPE_LABELS[workType];
  const includeIndex = options.includeIndex ?? orders.length > 1;

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  // ── Index / summary page ──────────────────────────────────────────────────
  if (includeIndex) {
    let y = drawBusinessHeader(doc);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...BRAND_COLOR);
    doc.text(options.indexTitle ?? "Orders Summary", MARGIN, y);
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `${orders.length} order${orders.length !== 1 ? "s" : ""} · ${title} · Generated on ${formatDate(new Date().toISOString())}`,
      MARGIN,
      y,
    );
    y += 5;

    const body = orders.map((o) => {
      const totals = computeTotals(o);
      return [
        o.orderNumber,
        o.customerName,
        formatDate(o.orderDate),
        ORDER_STATUS_LABELS[o.status] ?? o.status,
        String(o.items.length),
        totals.pieces.toLocaleString(),
        totals.stones.toLocaleString(),
      ];
    });

    autoTable(doc, {
      head: [["Order #", "Customer", "Date", "Status", "Items", "Pcs", "Stones"]],
      body,
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: BRAND_COLOR, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
      columnStyles: {
        0: { cellWidth: 32 },
        1: { cellWidth: 52 },
        2: { cellWidth: 24 },
        3: { cellWidth: 30 },
        4: { cellWidth: 14, halign: "right" },
        5: { cellWidth: 16, halign: "right" },
        6: { cellWidth: 22, halign: "right" },
      },
    });
  }

  // ── One page per order ────────────────────────────────────────────────────
  orders.forEach((order) => {
    doc.addPage();
    renderOrder(doc, order, workType, title);
  });

  drawFooters(doc, title);

  const name =
    options.fileName ??
    `orders-${workType}-${todayStamp()}`;
  doc.save(`${name}.pdf`);
}
