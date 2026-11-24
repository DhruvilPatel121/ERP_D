/**
 * Karigar work distribution helpers.
 *
 * An order can be handed over to several karigars at the same time.
 * Every allotment is stored as a KarigarAssignment that points at a single
 * order item (pattern) and carries the number of pieces that karigar has to
 * produce. Allotments never have to be equal — each row is typed manually.
 *
 * Whole-order allotments (itemId === '') are supported for legacy records and
 * for orders that are given to a karigar without splitting per pattern.
 */

import type { ID, KarigarAssignment, OrderItem } from '@/types/erp';

export type KarigarWorkType = 'wax' | 'stone';

/** A single order item that pieces can be distributed against */
export interface SplitTarget {
  id: ID;
  label: string;
  pieces: number;
  weightPerPiece: number;
  treeSize: number;
}

/** Visual meta used by the split editor and the karigar chips */
export const WORK_TYPE_META: Record<
  KarigarWorkType,
  { label: string; shortLabel: string }
> = {
  wax: { label: 'Wax Karigar', shortLabel: 'Wax' },
  stone: { label: 'Stone Setting Karigar', shortLabel: 'Stone' },
};

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** Convert order items into the flat targets the split editor works with */
export function buildSplitTargets(items: OrderItem[]): SplitTarget[] {
  return items.map((item, index) => {
    const patternNumber = item.snapshot?.patternNumber || `Item ${index + 1}`;
    const patternName = item.snapshot?.patternName || '';
    return {
      id: item.id,
      label: patternName ? `${patternNumber} — ${patternName}` : patternNumber,
      pieces: item.calculation?.finishedPieces ?? 0,
      weightPerPiece: item.snapshot?.weightPerPiece ?? 0,
      treeSize: item.snapshot?.treeSize ?? 0,
    };
  });
}

export function assignmentsOfType(
  assignments: KarigarAssignment[],
  type: KarigarWorkType,
): KarigarAssignment[] {
  return assignments.filter((a) => a.type === type);
}

/** Total pieces allotted for one type, optionally restricted to a single item */
export function allottedPieces(
  assignments: KarigarAssignment[],
  type: KarigarWorkType,
  itemId?: ID | '',
): number {
  return assignments
    .filter((a) => a.type === type && (itemId === undefined || a.itemId === itemId))
    .reduce((sum, a) => sum + (Number(a.allottedPieces) || 0), 0);
}

/** Silver grams implied by a piece count for the given target */
export function gramsForPieces(
  target: SplitTarget | undefined,
  pieces: number,
): number {
  if (!target) return 0;
  return round3((Number(pieces) || 0) * (target.weightPerPiece || 0));
}

/** Wax trees implied by a piece count for the given target */
export function treesForPieces(
  target: SplitTarget | undefined,
  pieces: number,
): number {
  if (!target || !target.treeSize) return 0;
  return Math.ceil((Number(pieces) || 0) / target.treeSize);
}

export interface SplitBalance {
  /** Pieces required by the whole order */
  totalRequired: number;
  /** Pieces already handed to karigars (includes whole-order allotments) */
  totalAllotted: number;
  /** Pieces of this item handed to karigars */
  itemAllotted: number;
  /** Pieces of this item still without a karigar (never negative) */
  itemRemaining: number;
  /** Order level pieces still without a karigar (never negative) */
  unallocated: number;
  /** True when the order total has been over-booked */
  overAllocated: boolean;
  /** True when this item has been over-booked */
  itemOverAllocated: boolean;
}

export function splitBalance(
  targets: SplitTarget[],
  assignments: KarigarAssignment[],
  type: KarigarWorkType,
  itemId: ID | '',
): SplitBalance {
  const totalRequired = targets.reduce((sum, t) => sum + t.pieces, 0);
  const totalAllotted = allottedPieces(assignments, type);
  const target = targets.find((t) => t.id === itemId);
  const itemAllotted = allottedPieces(assignments, type, itemId);
  const itemRequired = target?.pieces ?? 0;

  return {
    totalRequired,
    totalAllotted,
    itemAllotted,
    itemRemaining: Math.max(0, itemRequired - itemAllotted),
    unallocated: Math.max(0, totalRequired - totalAllotted),
    overAllocated: totalAllotted > totalRequired,
    itemOverAllocated: itemAllotted > itemRequired,
  };
}

/** Pieces still free on one item — used to clamp manual edits */
export function remainingPiecesForItem(
  targets: SplitTarget[],
  assignments: KarigarAssignment[],
  type: KarigarWorkType,
  itemId: ID | '',
  excludeAssignmentId?: ID,
): number {
  const target = targets.find((t) => t.id === itemId);
  if (!target) return 0;
  const used = assignments
    .filter(
      (a) =>
        a.type === type &&
        a.itemId === itemId &&
        a.id !== excludeAssignmentId,
    )
    .reduce((sum, a) => sum + (Number(a.allottedPieces) || 0), 0);
  return Math.max(0, target.pieces - used);
}

/** Pick the allotment that owns a specific pattern (falls back to order level) */
export function resolveAssignmentForItem(
  assignments: KarigarAssignment[],
  type: KarigarWorkType,
  itemId?: ID | '',
): KarigarAssignment | undefined {
  const sameType = assignmentsOfType(assignments, type);
  if (itemId) {
    const exact = sameType.find((a) => a.itemId === itemId);
    if (exact) return exact;
  }
  return sameType.find((a) => a.itemId === '') ?? sameType[0];
}

/** Build a ready-to-store assignment row */
export function makeAssignment(
  type: KarigarWorkType,
  target: SplitTarget | undefined,
  karigar: { id: ID; name: string } | undefined,
  pieces: number,
  notes = '',
): KarigarAssignment {
  return {
    id: '',
    type,
    karigarId: karigar?.id ?? '',
    karigarName: karigar?.name ?? '',
    itemId: target?.id ?? '',
    allottedPieces: Number(pieces) || 0,
    allottedGrams: gramsForPieces(target, pieces),
    assignedAt: new Date().toISOString(),
    notes,
  };
}

/** Split an integer total into `count` slices that always add up to the total */
export function evenSplit(total: number, count: number): number[] {
  if (count <= 0) return [];
  const safeTotal = Math.max(0, Math.floor(total));
  const base = Math.floor(safeTotal / count);
  const remainder = safeTotal - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

/** "120 pcs · 3.600 g" — used in lists, chips and CSV exports */
export function describeAllotment(
  assignment: KarigarAssignment,
  targets: SplitTarget[],
): string {
  const target = targets.find((t) => t.id === assignment.itemId);
  const pieces = Number(assignment.allottedPieces) || 0;
  const grams = target ? gramsForPieces(target, pieces) : Number(assignment.allottedGrams) || 0;
  const pieceText = `${pieces.toLocaleString('en-IN')} pcs`;
  const gramText = grams > 0 ? ` · ${grams.toFixed(3)} g` : '';
  return `${pieceText}${gramText}`;
}
