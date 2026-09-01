/**
 * Centralized Calculation Engine for Silver Jewellery ERP
 * Uses decimal-safe arithmetic (avoids raw JS float pitfalls).
 * All calculations must NOT be duplicated in UI components.
 */

import type { PatternStoneConfig, OrderItemCalculation, StoneRequirement } from '@/types/erp';

type RoundingMode = 'ceiling' | 'floor' | 'round';

/** Round a decimal with configurable mode */
export function applyRounding(value: number, mode: RoundingMode): number {
  switch (mode) {
    case 'ceiling': return Math.ceil(value);
    case 'floor':   return Math.floor(value);
    case 'round':   return Math.round(value);
  }
}

/** Safe division to avoid float precision issues */
function safeDivide(a: number, b: number): number {
  if (b === 0) return 0;
  // Use toFixed trick for common decimal pitfalls
  const result = a / b;
  return parseFloat(result.toPrecision(12));
}

/** Safe multiply */
function safeMultiply(a: number, b: number): number {
  return parseFloat((a * b).toPrecision(12));
}

export interface GramOrderInput {
  orderGrams: number;
  patternWeightGrams: number;
  treeSize: number;
  stoneConfig: PatternStoneConfig[];
  roundingMode: RoundingMode;
}

export interface PieceOrderInput {
  orderPieces: number;
  patternWeightGrams: number;
  treeSize: number;
  stoneConfig: PatternStoneConfig[];
  roundingMode: RoundingMode;
}

function buildStoneRequirements(
  stoneConfig: PatternStoneConfig[],
  finishedPieces: number,
): StoneRequirement[] {
  return stoneConfig.map((cfg) => ({
    stoneType: cfg.stoneType,
    stoneId: cfg.stoneId,
    stoneName: cfg.stoneName,
    stoneSize: cfg.stoneSize,
    shape: cfg.shape,
    qtyPerPiece: cfg.qtyPerPiece,
    finishedPieces,
    requiredQty: safeMultiply(finishedPieces, cfg.qtyPerPiece),
  }));
}

/**
 * GRAM-BASED ORDER CALCULATION
 * Finished Pieces = Order Grams ÷ Pattern Weight (show theoretical)
 * Manufacturing Pieces = applyRounding(theoreticalPieces)
 * Wax Trees = ceiling(finishedPieces ÷ treeSize)
 * Stones = finishedPieces × stoneQtyPerPiece (NEVER from trees)
 */
export function calculateGramOrder(input: GramOrderInput): OrderItemCalculation {
  const { orderGrams, patternWeightGrams, treeSize, stoneConfig, roundingMode } = input;

  const theoreticalPieces = safeDivide(orderGrams, patternWeightGrams);
  const finishedPieces = applyRounding(theoreticalPieces, roundingMode);
  const waxTreesRequired = Math.ceil(safeDivide(finishedPieces, treeSize));
  const stoneRequirements = buildStoneRequirements(stoneConfig, finishedPieces);
  const totalStones = stoneRequirements.reduce((sum, s) => sum + s.requiredQty, 0);

  return {
    theoreticalPieces,
    finishedPieces,
    expectedWeightGrams: null,
    waxTreesRequired,
    totalStones,
    stoneRequirements,
  };
}

/**
 * PIECE-BASED ORDER CALCULATION
 * Finished Pieces = entered pieces (NEVER reconverted from grams)
 * Expected Weight = pieces × patternWeight (informational only)
 * Wax Trees = ceiling(finishedPieces ÷ treeSize)
 * Stones = finishedPieces × stoneQtyPerPiece
 */
export function calculatePieceOrder(input: PieceOrderInput): OrderItemCalculation {
  const { orderPieces, patternWeightGrams, treeSize, stoneConfig, roundingMode } = input;

  const finishedPieces = orderPieces; // Direct – no conversion
  const expectedWeightGrams = safeMultiply(finishedPieces, patternWeightGrams);
  const waxTreesRequired = applyRounding(safeDivide(finishedPieces, treeSize), 'ceiling');
  const stoneRequirements = buildStoneRequirements(stoneConfig, finishedPieces);
  const totalStones = stoneRequirements.reduce((sum, s) => sum + s.requiredQty, 0);

  // Suppress unused param warning
  void roundingMode;

  return {
    theoreticalPieces: null,
    finishedPieces,
    expectedWeightGrams,
    waxTreesRequired,
    totalStones,
    stoneRequirements,
  };
}

/** Format number with commas */
export function formatNumber(n: number, decimals = 0): string {
  return n.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatWeight(grams: number): string {
  return `${grams.toFixed(3)} g`;
}

/** Generate WhatsApp message from template */
export function buildWaxMessage(
  template: string,
  data: {
    party: string;
    pattern: string;
    orderQuantity: string;
    finishedPieces: number;
    treeSize: number;
    waxTrees: number;
    orderNumber: string;
  },
): string {
  return template
    .replace('{{party}}', data.party)
    .replace('{{pattern}}', data.pattern)
    .replace('{{orderQuantity}}', data.orderQuantity)
    .replace('{{finishedPieces}}', String(data.finishedPieces))
    .replace('{{treeSize}}', String(data.treeSize))
    .replace('{{waxTrees}}', String(data.waxTrees))
    .replace('{{orderNumber}}', data.orderNumber);
}

export function buildStoneMessage(
  template: string,
  data: {
    party: string;
    pattern: string;
    finishedPieces: number;
    stoneRequirements: StoneRequirement[];
    orderNumber: string;
  },
): string {
  const stoneTable = data.stoneRequirements
    .map((s) => `${s.stoneSize} ${s.stoneName}: ${formatNumber(s.requiredQty)}`)
    .join('\n') + `\nTOTAL: ${formatNumber(data.stoneRequirements.reduce((a, b) => a + b.requiredQty, 0))}`;

  return template
    .replace('{{party}}', data.party)
    .replace('{{pattern}}', data.pattern)
    .replace('{{finishedPieces}}', String(data.finishedPieces))
    .replace('{{stoneTable}}', stoneTable)
    .replace('{{orderNumber}}', data.orderNumber);
}
