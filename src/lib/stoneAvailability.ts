/**
 * Stone inventory availability checker.
 *
 * Aggregates the stone requirements of one or more order items and compares
 * them against the current micro / AD diamond stock. Returns the list of
 * stones that are insufficient so the UI can block order creation and tell the
 * user exactly what needs to be restocked.
 */

import type {
  ADDiamond,
  MicroDiamond,
  OrderItem,
  StoneRequirement,
} from "@/types/erp";

/** Normalise a stone size string so "1.30 mm", "1.30mm", "1.3 x 2" match. */
export function normalizeSize(size: string): string {
  if (!size) return "";
  return size
    .toLowerCase()
    .replace(/×/g, "x")
    .replace(/\*/g, "x")
    .replace(/\s*x\s*/g, "x")
    .replace(/\s+/g, "")
    .trim();
}

/** Normalise a stone shape string (case-insensitive, trimmed). */
export function normalizeShape(shape: string): string {
  if (!shape) return "";
  return shape.toLowerCase().trim();
}

export interface InsufficientStone {
  stoneType: "micro" | "ad";
  stoneName: string;
  stoneSize: string;
  shape?: string;
  requiredQty: number;
  availableQty: number;
  shortBy: number;
}

export interface StoneAvailabilityResult {
  ok: boolean;
  insufficient: InsufficientStone[];
}

/**
 * Walk the order items, sum up every stone requirement (deduplicated by
 * type + size + shape) and check each against the live inventory.
 */
export function checkStoneAvailability(
  items: OrderItem[],
  microDiamonds: MicroDiamond[],
  adDiamonds: ADDiamond[],
): StoneAvailabilityResult {
  // Aggregate requirements by a composite key so the same stone used in
  // multiple pattern items is summed up once.
  const aggregated = new Map<string, StoneRequirement>();

  for (const item of items) {
    const reqs = item.calculation?.stoneRequirements ?? [];
    for (const req of reqs) {
      const key = `${req.stoneType}|${normalizeSize(req.stoneSize)}|${normalizeShape(req.shape)}`;
      const existing = aggregated.get(key);
      if (existing) {
        existing.requiredQty += req.requiredQty;
        existing.finishedPieces += req.finishedPieces;
      } else {
        aggregated.set(key, { ...req });
      }
    }
  }

  const insufficient: InsufficientStone[] = [];

  for (const req of aggregated.values()) {
    if (req.stoneType === "micro") {
      const stock = microDiamonds.find(
        (m) =>
          normalizeSize(m.size) === normalizeSize(req.stoneSize) &&
          m.isActive !== false,
      );
      const available = stock?.quantity ?? 0;
      if (available < req.requiredQty) {
        insufficient.push({
          stoneType: "micro",
          stoneName: stock?.stoneName || `${req.stoneSize}`,
          stoneSize: req.stoneSize,
          requiredQty: req.requiredQty,
          availableQty: available,
          shortBy: req.requiredQty - available,
        });
      }
    } else {
      // AD diamond — match by size AND shape
      const stock = adDiamonds.find(
        (a) =>
          normalizeSize(a.size) === normalizeSize(req.stoneSize) &&
          normalizeShape(a.shape) === normalizeShape(req.shape) &&
          a.isActive !== false,
      );
      const available = stock?.quantity ?? 0;
      if (available < req.requiredQty) {
        insufficient.push({
          stoneType: "ad",
          stoneName: stock?.stoneName || `${req.shape} ${req.stoneSize}`,
          stoneSize: req.stoneSize,
          shape: req.shape,
          requiredQty: req.requiredQty,
          availableQty: available,
          shortBy: req.requiredQty - available,
        });
      }
    }
  }

  return {
    ok: insufficient.length === 0,
    insufficient,
  };
}

/** Build a human-readable restock message from an availability result. */
export function buildRestockMessage(result: StoneAvailabilityResult): string {
  if (result.ok) return "";
  const lines = result.insufficient.map((s) => {
    const label =
      s.stoneType === "micro"
        ? `Micro ${s.stoneName}`
        : `AD ${s.stoneName}`;
    return `- ${label}: need ${s.requiredQty.toLocaleString()}, only ${s.availableQty.toLocaleString()} in stock (short by ${s.shortBy.toLocaleString()})`;
  });
  return lines.join("\n");
}
