// Core ERP types for Silver Jewellery Manufacturing ERP

export type ID = string;

export interface BusinessSettings {
  businessName: string;
  logo: string; // base64 or URL
  address: string;
  city: string;
  state: string;
  country: string;
  mobile: string;
  whatsapp: string;
  email: string;
  gst: string;
  otherInfo: string;
}

export interface AppSettings {
  roundingMode: 'ceiling' | 'floor' | 'round';
  backupFolder: string;
  lastBackup: string | null;
  waxMessageTemplate: string;
  stoneMessageTemplate: string;
  orderNumberPrefix: string;
  orderNumberCounter: number;
  // Aliases used by SettingsPage form
  orderPrefix?: string;
  orderStartNumber?: number;
}

export interface User {
  id: ID;
  userId: string;
  passwordHash: string;
  role: 'admin' | 'manager' | 'operator';
  createdAt: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  userId: string;
  role: string;
  isSetupComplete: boolean;
}

// Customer
export interface Customer {
  id: ID;
  customerId: string;
  partyName: string;
  contactPerson: string;
  mobile: string;
  alternateNumber: string;
  whatsapp: string;
  address: string;
  city: string;
  state: string;
  email: string;
  gst: string;
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Stone Categories
export interface StoneCategory {
  id: ID;
  name: string;
  type: 'micro' | 'ad';
  isActive: boolean;
  createdAt: string;
}

// Micro Diamond
export interface MicroDiamond {
  id: ID;
  stoneId: string;
  stoneName: string;
  categoryId: ID;
  size: string; // e.g. "1.30 mm"
  shape: string;
  gradeType: string;
  colour: string;
  individualWeight: number | null;
  weightUnit: string;
  stonesPerGram: number | null;
  quantity: number; // remaining quantity in stock
  totalQuantity: number; // total quantity ever added (cumulative)
  weight: number; // total weight in grams
  price_per_1000: number; // price per 1000 stones
  supplier: string;
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// AD Diamond
export interface ADDiamond {
  id: ID;
  stoneId: string;
  stoneName: string;
  categoryId: ID;
  shape_id: number; // foreign key to ad_shapes
  shape: string;
  size: string; // e.g. "3x2 mm"
  length: number | null;
  width: number | null;
  weight: number; // total weight in grams
  quantity: number; // remaining quantity in stock
  totalQuantity: number; // total quantity ever added (cumulative)
  price_per_piece: number; // price per piece
  supplier: string;
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Item Category
export interface ItemCategory {
  id: ID;
  name: string;
  isActive: boolean;
  createdAt: string;
}

// Stone config on a pattern
export interface PatternStoneConfig {
  id: ID;
  stoneType: 'micro' | 'ad';
  stoneId: ID;
  stoneName: string;
  stoneSize: string;
  shape: string;
  qtyPerPiece: number;
}

// Pattern / Item
export interface Pattern {
  id: ID;
  patternNumber: string; // e.g. P-9001
  patternName: string;
  categoryId: ID;
  categoryName: string;
  subcategory: string;
  patternSize: string;
  weightPerPiece: number; // in grams
  weightUnit: string;
  treeSize: number; // pieces per tree
  stoneConfig: PatternStoneConfig[];
  totalStonesPerPiece: number; // auto-calculated
  images: string[]; // base64 or URLs
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Order
export type OrderType = 'grams' | 'pieces' | 'mixed';
export type QuantityType = 'grams' | 'pieces';
export type OrderStatus =
  | 'draft'
  | 'confirmed'
  | 'pending'
  | 'assigned'
  | 'wax_in_progress'
  | 'wax_completed'
  | 'stone_setting_pending'
  | 'stone_setting_in_progress'
  | 'stone_setting_completed'
  | 'production_completed'
  | 'ready'
  | 'delivered'
  | 'cancelled';

export interface StoneRequirement {
  stoneType: 'micro' | 'ad';
  stoneId: ID;
  stoneName: string;
  stoneSize: string;
  shape: string;
  qtyPerPiece: number;
  finishedPieces: number;
  requiredQty: number;
}

export interface OrderItemCalculation {
  theoreticalPieces: number | null; // decimal for gram orders
  finishedPieces: number;
  expectedWeightGrams: number | null; // for piece orders
  waxTreesRequired: number;
  totalStones: number;
  stoneRequirements: StoneRequirement[];
}

// Snapshot of pattern at order creation time
export interface OrderItemSnapshot {
  patternNumber: string;
  patternName: string;
  patternSize: string;
  weightPerPiece: number;
  treeSize: number;
  stoneConfig: PatternStoneConfig[];
  totalStonesPerPiece: number;
}

export interface OrderItem {
  id: ID;
  patternId: ID;
  snapshot: OrderItemSnapshot;
  quantityType: QuantityType;
  orderQuantity: number;
  calculation: OrderItemCalculation;
  status: OrderStatus;
  notes: string;
}

export interface StatusHistory {
  status: OrderStatus;
  changedAt: string;
  changedBy: string;
  notes: string;
}

export interface KarigarAssignment {
  type: 'wax' | 'stone';
  karigarId: ID;
  karigarName: string;
  assignedAt: string;
  notes: string;
}

export interface OrderAttachment {
  id: ID;
  name: string;
  type: string;
  data: string; // base64
  uploadedAt: string;
}

export interface Order {
  id: ID;
  orderNumber: string; // ORD-2026-0001
  customerId: ID;
  customerName: string;
  customerMobile: string;
  customerWhatsapp: string;
  orderType: OrderType;
  items: OrderItem[];
  status: OrderStatus;
  statusHistory: StatusHistory[];
  karigarAssignments: KarigarAssignment[];
  attachments: OrderAttachment[];
  notes: string;
  touch: string; // Touch information for the order
  orderDate: string;
  createdAt: string;
  updatedAt: string;
  stoneUsage?: StoneUsageRecord[]; // Track stone usage for this order
}

export interface StoneUsageRecord {
  stoneType: 'micro' | 'ad';
  stoneId: ID;
  stoneName: string; // e.g., "1.30mm" or "Oval 3x2mm"
  quantityUsed: number;
  itemId: ID; // Reference to OrderItem
}

// Karigar
export interface Karigar {
  id: ID;
  karigarId: string;
  name: string;
  mobile: string;
  whatsapp: string;
  type: string; // 'wax' | 'stone' | custom
  address: string;
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Pattern Dice Range — maps a numeric pattern number range to a wax karigar
export interface PatternDiceRange {
  id: ID;
  karigarId: ID;
  karigarName: string;
  fromNumber: number; // inclusive
  toNumber: number;   // inclusive
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// Activity Log
export type ActivityType =
  | 'login'
  | 'customer_created' | 'customer_edited' | 'customer_deleted'
  | 'pattern_created' | 'pattern_edited' | 'pattern_deleted'
  | 'stone_created' | 'stone_edited' | 'stone_deleted'
  | 'order_created' | 'order_edited' | 'order_status_changed'
  | 'karigar_assigned' | 'karigar_created' | 'karigar_edited'
  | 'pdf_generated' | 'jpg_generated' | 'whatsapp_opened'
  | 'backup_created' | 'restore_performed'
  | 'demo_data_loaded';

export interface ActivityLog {
  id: ID;
  type: ActivityType;
  // Normalised action name derived from type (e.g. 'created', 'updated', 'deleted')
  action: string;
  description: string;
  entityId?: ID;
  entityType: string;
  userId: string;
  createdAt: string;
  createdBy: string;
}

// Backup record
export interface BackupRecord {
  id: ID;
  filename: string;
  size: number;
  createdAt: string;
  data: string; // JSON snapshot of DB
}

// Full DB snapshot for backup/restore
export interface DatabaseSnapshot {
  version: number;
  exportedAt: string;
  businessSettings: BusinessSettings;
  appSettings: AppSettings;
  customers: Customer[];
  stoneCategories: StoneCategory[];
  microDiamonds: MicroDiamond[];
  adDiamonds: ADDiamond[];
  itemCategories: ItemCategory[];
  patterns: Pattern[];
  orders: Order[];
  karigars: Karigar[];
  patternDiceRanges: PatternDiceRange[];
  activityLogs: ActivityLog[];
}
