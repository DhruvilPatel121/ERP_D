/**
 * Local database layer using localStorage for persistence.
 * Implements the full ERP data model with all CRUD operations.
 */

import type {
  BusinessSettings, AppSettings, AuthState,
  Customer, StoneCategory, MicroDiamond, ADDiamond,
  ItemCategory, Pattern, Order, Karigar, ActivityLog,
  BackupRecord, DatabaseSnapshot, ActivityType, ID,
  PatternDiceRange,
} from '@/types/erp';
import { nanoid } from '@/lib/utils';

const KEYS = {
  auth: 'erp_auth',
  business: 'erp_business',
  appSettings: 'erp_app_settings',
  customers: 'erp_customers',
  stoneCategories: 'erp_stone_categories',
  microDiamonds: 'erp_micro_diamonds',
  adDiamonds: 'erp_ad_diamonds',
  itemCategories: 'erp_item_categories',
  patterns: 'erp_patterns',
  orders: 'erp_orders',
  karigars: 'erp_karigars',
  patternDiceRanges: 'erp_pattern_dice_ranges',
  activityLogs: 'erp_activity_logs',
  backups: 'erp_backups',
  setupComplete: 'erp_setup_complete',
} as const;

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

const now = () => new Date().toISOString();

// ── Auth & Setup ─────────────────────────────────────────────────────────────

export function isSetupComplete(): boolean {
  return localStorage.getItem(KEYS.setupComplete) === 'true';
}

export function completeSetup(): void {
  localStorage.setItem(KEYS.setupComplete, 'true');
}

export function getAuthState(): AuthState {
  return load<AuthState>(KEYS.auth, {
    isAuthenticated: false,
    userId: '',
    role: 'admin',
    isSetupComplete: isSetupComplete(),
  });
}

export function setAuthState(state: Partial<AuthState>): void {
  const current = getAuthState();
  save(KEYS.auth, { ...current, ...state });
}

// Simple hash (demo — in Electron would use bcrypt)
export function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `hashed_${hash}_${password.length}`;
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// ── Business Settings ────────────────────────────────────────────────────────

export function getBusinessSettings(): BusinessSettings {
  return load<BusinessSettings>(KEYS.business, {
    businessName: 'Silver Jewellery ERP',
    logo: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    mobile: '',
    whatsapp: '',
    email: '',
    gst: '',
    otherInfo: '',
  });
}

export function saveBusinessSettings(s: BusinessSettings): void {
  save(KEYS.business, s);
}

// ── App Settings ─────────────────────────────────────────────────────────────

export const DEFAULT_WAX_TEMPLATE = `Wax Work Order
Order No: {{orderNumber}}
Party: {{party}}
Pattern: {{pattern}}
Order: {{orderQuantity}}
Finished Pieces: {{finishedPieces}}
Tree Size: {{treeSize}}
Wax Trees: {{waxTrees}}`;

export const DEFAULT_STONE_TEMPLATE = `Stone Setting Work Order
Order No: {{orderNumber}}
Party: {{party}}
Pattern: {{pattern}}
Finished Pieces: {{finishedPieces}}
{{stoneTable}}`;

export function getAppSettings(): AppSettings {
  return load<AppSettings>(KEYS.appSettings, {
    roundingMode: 'ceiling',
    backupFolder: '',
    lastBackup: null,
    waxMessageTemplate: DEFAULT_WAX_TEMPLATE,
    stoneMessageTemplate: DEFAULT_STONE_TEMPLATE,
    orderNumberPrefix: 'ORD',
    orderNumberCounter: 0,
  });
}

export function saveAppSettings(s: AppSettings): void {
  save(KEYS.appSettings, s);
}

export function generateOrderNumber(): string {
  const settings = getAppSettings();
  const year = new Date().getFullYear();
  settings.orderNumberCounter++;
  saveAppSettings(settings);
  return `${settings.orderNumberPrefix}-${year}-${String(settings.orderNumberCounter).padStart(4, '0')}`;
}

// ── Customers ────────────────────────────────────────────────────────────────

export function getCustomers(): Customer[] {
  return load<Customer[]>(KEYS.customers, []);
}

export function saveCustomers(customers: Customer[]): void {
  save(KEYS.customers, customers);
}

export function addCustomer(customer: Omit<Customer, 'id' | 'customerId' | 'createdAt' | 'updatedAt'>): Customer {
  const customers = getCustomers();
  const newCustomer: Customer = {
    ...customer,
    id: nanoid(),
    customerId: `CUST-${String(customers.length + 1).padStart(4, '0')}`,
    createdAt: now(),
    updatedAt: now(),
  };
  customers.push(newCustomer);
  saveCustomers(customers);
  logActivity('customer_created', `Customer "${newCustomer.partyName}" created`, newCustomer.id, 'customer');
  return newCustomer;
}

export function updateCustomer(id: ID, updates: Partial<Customer>): Customer | null {
  const customers = getCustomers();
  const idx = customers.findIndex((c) => c.id === id);
  if (idx < 0) return null;
  customers[idx] = { ...customers[idx], ...updates, updatedAt: now() };
  saveCustomers(customers);
  logActivity('customer_edited', `Customer "${customers[idx].partyName}" updated`, id, 'customer');
  return customers[idx];
}

export function deleteCustomer(id: ID): void {
  const customers = getCustomers().filter((c) => c.id !== id);
  saveCustomers(customers);
}

export function getCustomerById(id: ID): Customer | undefined {
  return getCustomers().find((c) => c.id === id);
}

// ── Stone Categories ─────────────────────────────────────────────────────────

export function getStoneCategories(): StoneCategory[] {
  return load<StoneCategory[]>(KEYS.stoneCategories, []);
}

export function saveStoneCategories(cats: StoneCategory[]): void {
  save(KEYS.stoneCategories, cats);
}

export function addStoneCategory(name: string, type: 'micro' | 'ad'): StoneCategory {
  const cats = getStoneCategories();
  const cat: StoneCategory = { id: nanoid(), name, type, isActive: true, createdAt: now() };
  cats.push(cat);
  saveStoneCategories(cats);
  return cat;
}

// ── Micro Diamonds ───────────────────────────────────────────────────────────

export function getMicroDiamonds(): MicroDiamond[] {
  return load<MicroDiamond[]>(KEYS.microDiamonds, []);
}

export function saveMicroDiamonds(stones: MicroDiamond[]): void {
  save(KEYS.microDiamonds, stones);
}

export function addMicroDiamond(stone: Omit<MicroDiamond, 'id' | 'stoneId' | 'createdAt' | 'updatedAt'>): MicroDiamond {
  const stones = getMicroDiamonds();
  const s: MicroDiamond = {
    ...stone,
    id: nanoid(),
    stoneId: `MCR-${String(stones.length + 1).padStart(4, '0')}`,
    createdAt: now(),
    updatedAt: now(),
  };
  stones.push(s);
  saveMicroDiamonds(stones);
  logActivity('stone_created', `Micro Diamond "${s.stoneName}" (${s.size}) added`, s.id, 'stone');
  return s;
}

export function updateMicroDiamond(id: ID, updates: Partial<MicroDiamond>): MicroDiamond | null {
  const stones = getMicroDiamonds();
  const idx = stones.findIndex((s) => s.id === id);
  if (idx < 0) return null;
  stones[idx] = { ...stones[idx], ...updates, updatedAt: now() };
  saveMicroDiamonds(stones);
  return stones[idx];
}

export function deleteMicroDiamond(id: ID): void {
  saveMicroDiamonds(getMicroDiamonds().filter((s) => s.id !== id));
}

// ── AD Diamonds ───────────────────────────────────────────────────────────────

export function getADDiamonds(): ADDiamond[] {
  return load<ADDiamond[]>(KEYS.adDiamonds, []);
}

export function saveADDiamonds(stones: ADDiamond[]): void {
  save(KEYS.adDiamonds, stones);
}

export function addADDiamond(stone: Omit<ADDiamond, 'id' | 'stoneId' | 'createdAt' | 'updatedAt'>): ADDiamond {
  const stones = getADDiamonds();
  const s: ADDiamond = {
    ...stone,
    id: nanoid(),
    stoneId: `AD-${String(stones.length + 1).padStart(4, '0')}`,
    createdAt: now(),
    updatedAt: now(),
  };
  stones.push(s);
  saveADDiamonds(stones);
  logActivity('stone_created', `AD Diamond "${s.stoneName}" (${s.size}) added`, s.id, 'stone');
  return s;
}

export function updateADDiamond(id: ID, updates: Partial<ADDiamond>): ADDiamond | null {
  const stones = getADDiamonds();
  const idx = stones.findIndex((s) => s.id === id);
  if (idx < 0) return null;
  stones[idx] = { ...stones[idx], ...updates, updatedAt: now() };
  saveADDiamonds(stones);
  return stones[idx];
}

export function deleteADDiamond(id: ID): void {
  saveADDiamonds(getADDiamonds().filter((s) => s.id !== id));
}

// ── Item Categories ───────────────────────────────────────────────────────────

export function getItemCategories(): ItemCategory[] {
  return load<ItemCategory[]>(KEYS.itemCategories, []);
}

export function saveItemCategories(cats: ItemCategory[]): void {
  save(KEYS.itemCategories, cats);
}

export function addItemCategory(name: string): ItemCategory {
  const cats = getItemCategories();
  const cat: ItemCategory = { id: nanoid(), name, isActive: true, createdAt: now() };
  cats.push(cat);
  saveItemCategories(cats);
  return cat;
}

// ── Patterns ──────────────────────────────────────────────────────────────────

export function getPatterns(): Pattern[] {
  return load<Pattern[]>(KEYS.patterns, []);
}

export function savePatterns(patterns: Pattern[]): void {
  save(KEYS.patterns, patterns);
}

export function addPattern(pattern: Omit<Pattern, 'id' | 'createdAt' | 'updatedAt' | 'totalStonesPerPiece'>): Pattern {
  const patterns = getPatterns();
  const totalStonesPerPiece = pattern.stoneConfig.reduce((sum, s) => sum + s.qtyPerPiece, 0);
  const p: Pattern = {
    ...pattern,
    id: nanoid(),
    totalStonesPerPiece,
    createdAt: now(),
    updatedAt: now(),
  };
  patterns.push(p);
  savePatterns(patterns);
  logActivity('pattern_created', `Pattern "${p.patternNumber} - ${p.patternName}" created`, p.id, 'pattern');
  return p;
}

export function updatePattern(id: ID, updates: Partial<Pattern>): Pattern | null {
  const patterns = getPatterns();
  const idx = patterns.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  const stoneConfig = updates.stoneConfig ?? patterns[idx].stoneConfig;
  const totalStonesPerPiece = stoneConfig.reduce((sum, s) => sum + s.qtyPerPiece, 0);
  patterns[idx] = { ...patterns[idx], ...updates, totalStonesPerPiece, updatedAt: now() };
  savePatterns(patterns);
  logActivity('pattern_edited', `Pattern "${patterns[idx].patternNumber}" updated`, id, 'pattern');
  return patterns[idx];
}

export function deletePattern(id: ID): void {
  savePatterns(getPatterns().filter((p) => p.id !== id));
}

export function getPatternById(id: ID): Pattern | undefined {
  return getPatterns().find((p) => p.id === id);
}

export function searchPatterns(query: string): Pattern[] {
  const q = query.toLowerCase().replace(/[-\s]/g, '');
  return getPatterns().filter((p) =>
    p.patternNumber.toLowerCase().replace(/[-\s]/g, '').includes(q) ||
    p.patternName.toLowerCase().includes(q.toLowerCase()),
  );
}

// ── Orders ────────────────────────────────────────────────────────────────────

export function getOrders(): Order[] {
  return load<Order[]>(KEYS.orders, []);
}

export function saveOrders(orders: Order[]): void {
  save(KEYS.orders, orders);
}

export function addOrder(order: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>): Order {
  const orders = getOrders();
  const o: Order = {
    ...order,
    id: nanoid(),
    orderNumber: generateOrderNumber(),
    createdAt: now(),
    updatedAt: now(),
  };
  orders.push(o);
  saveOrders(orders);
  logActivity('order_created', `Order "${o.orderNumber}" created for ${o.customerName}`, o.id, 'order');
  return o;
}

export function updateOrder(id: ID, updates: Partial<Order>): Order | null {
  const orders = getOrders();
  const idx = orders.findIndex((o) => o.id === id);
  if (idx < 0) return null;
  orders[idx] = { ...orders[idx], ...updates, updatedAt: now() };
  saveOrders(orders);
  if (updates.status) {
    logActivity('order_status_changed', `Order "${orders[idx].orderNumber}" status → ${updates.status}`, id, 'order');
  } else {
    logActivity('order_edited', `Order "${orders[idx].orderNumber}" updated`, id, 'order');
  }
  return orders[idx];
}

export function deleteOrder(id: ID): void {
  saveOrders(getOrders().filter((o) => o.id !== id));
}

export function getOrderById(id: ID): Order | undefined {
  return getOrders().find((o) => o.id === id);
}

export function duplicateOrder(id: ID): Order | null {
  const original = getOrderById(id);
  if (!original) return null;
  const duplicate = addOrder({
    ...original,
    status: 'draft',
    statusHistory: [{ status: 'draft', changedAt: now(), changedBy: 'admin', notes: `Duplicated from ${original.orderNumber}` }],
    karigarAssignments: [],
    attachments: [],
    orderDate: now(),
  });
  return duplicate;
}

// ── Karigars ──────────────────────────────────────────────────────────────────

export function getKarigars(): Karigar[] {
  return load<Karigar[]>(KEYS.karigars, []);
}

export function saveKarigars(karigars: Karigar[]): void {
  save(KEYS.karigars, karigars);
}

export function addKarigar(karigar: Omit<Karigar, 'id' | 'karigarId' | 'createdAt' | 'updatedAt'>): Karigar {
  const karigars = getKarigars();
  const k: Karigar = {
    ...karigar,
    id: nanoid(),
    karigarId: `KAR-${String(karigars.length + 1).padStart(4, '0')}`,
    createdAt: now(),
    updatedAt: now(),
  };
  karigars.push(k);
  saveKarigars(karigars);
  logActivity('karigar_created', `Karigar "${k.name}" added`, k.id, 'karigar');
  return k;
}

export function updateKarigar(id: ID, updates: Partial<Karigar>): Karigar | null {
  const karigars = getKarigars();
  const idx = karigars.findIndex((k) => k.id === id);
  if (idx < 0) return null;
  karigars[idx] = { ...karigars[idx], ...updates, updatedAt: now() };
  saveKarigars(karigars);
  logActivity('karigar_edited', `Karigar "${karigars[idx].name}" updated`, id, 'karigar');
  return karigars[idx];
}

export function deleteKarigar(id: ID): void {
  saveKarigars(getKarigars().filter((k) => k.id !== id));
}

// ── Pattern Dice Ranges ───────────────────────────────────────────────────────

export function getPatternDiceRanges(): PatternDiceRange[] {
  return load<PatternDiceRange[]>(KEYS.patternDiceRanges, []);
}

export function savePatternDiceRanges(ranges: PatternDiceRange[]): void {
  save(KEYS.patternDiceRanges, ranges);
}

export function addPatternDiceRange(
  range: Omit<PatternDiceRange, 'id' | 'createdAt' | 'updatedAt'>,
): PatternDiceRange {
  const ranges = getPatternDiceRanges();
  const r: PatternDiceRange = { ...range, id: nanoid(), createdAt: now(), updatedAt: now() };
  ranges.push(r);
  savePatternDiceRanges(ranges);
  return r;
}

export function updatePatternDiceRange(id: ID, updates: Partial<PatternDiceRange>): PatternDiceRange | null {
  const ranges = getPatternDiceRanges();
  const idx = ranges.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  ranges[idx] = { ...ranges[idx], ...updates, updatedAt: now() };
  savePatternDiceRanges(ranges);
  return ranges[idx];
}

export function deletePatternDiceRange(id: ID): void {
  savePatternDiceRanges(getPatternDiceRanges().filter((r) => r.id !== id));
}

/**
 * Given a numeric pattern number, find which wax karigar owns that dice range.
 * Pattern numbers like "P-555", "9001", "555" are all normalized to their integer part.
 */
export function findKarigarForPattern(patternNumber: string): PatternDiceRange | null {
  const num = parseInt(patternNumber.replace(/[^\d]/g, ''), 10);
  if (isNaN(num)) return null;
  const ranges = getPatternDiceRanges();
  return ranges.find((r) => num >= r.fromNumber && num <= r.toNumber) ?? null;
}

// ── Activity Log ──────────────────────────────────────────────────────────────

export function getActivityLogs(): ActivityLog[] {
  return load<ActivityLog[]>(KEYS.activityLogs, []);
}

export function logActivity(type: ActivityType, description: string, entityId?: ID, entityType?: string): void {
  const logs = getActivityLogs();
  // Derive a short action label from the activity type (e.g. 'customer_created' → 'created')
  const actionParts = type.split('_');
  const action = actionParts[actionParts.length - 1] ?? type;
  logs.unshift({
    id: nanoid(),
    type,
    action,
    description,
    entityId,
    entityType: entityType ?? '',
    userId: 'admin',
    createdAt: now(),
    createdBy: 'admin',
  });
  // Keep last 1000 logs
  if (logs.length > 1000) logs.splice(1000);
  save(KEYS.activityLogs, logs);
}

// ── Backup & Restore ──────────────────────────────────────────────────────────

export function getBackups(): BackupRecord[] {
  return load<BackupRecord[]>(KEYS.backups, []);
}

export function createBackup(): BackupRecord {
  const snapshot: DatabaseSnapshot = {
    version: 1,
    exportedAt: now(),
    businessSettings: getBusinessSettings(),
    appSettings: getAppSettings(),
    customers: getCustomers(),
    stoneCategories: getStoneCategories(),
    microDiamonds: getMicroDiamonds(),
    adDiamonds: getADDiamonds(),
    itemCategories: getItemCategories(),
    patterns: getPatterns(),
    orders: getOrders(),
    karigars: getKarigars(),
    patternDiceRanges: getPatternDiceRanges(),
    activityLogs: getActivityLogs(),
  };

  const data = JSON.stringify(snapshot);
  const ts = new Date();
  const filename = `SilverERP_Backup_${ts.toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`;

  const backups = getBackups();
  const record: BackupRecord = {
    id: nanoid(),
    filename,
    size: data.length,
    createdAt: now(),
    data,
  };
  backups.unshift(record);
  // Keep last 20 backups
  if (backups.length > 20) backups.splice(20);
  save(KEYS.backups, backups);

  // Update last backup time
  const settings = getAppSettings();
  settings.lastBackup = now();
  saveAppSettings(settings);

  logActivity('backup_created', `Backup created: ${filename}`);
  return record;
}

export function restoreBackup(data: string): boolean {
  try {
    const snapshot = JSON.parse(data) as DatabaseSnapshot;
    saveBusinessSettings(snapshot.businessSettings);
    saveAppSettings(snapshot.appSettings);
    saveCustomers(snapshot.customers);
    saveStoneCategories(snapshot.stoneCategories);
    saveMicroDiamonds(snapshot.microDiamonds);
    saveADDiamonds(snapshot.adDiamonds);
    saveItemCategories(snapshot.itemCategories);
    savePatterns(snapshot.patterns);
    saveOrders(snapshot.orders);
    saveKarigars(snapshot.karigars);
    if (snapshot.patternDiceRanges) savePatternDiceRanges(snapshot.patternDiceRanges);
    logActivity('restore_performed', `Database restored from backup (${snapshot.exportedAt})`);
    return true;
  } catch {
    return false;
  }
}

// ── Aliases for backward-compat imports ──────────────────────────────────────

/** Alias: saveAppSettings */
export const updateAppSettings = saveAppSettings;

/** Alias: getActivityLogs */
export const getActivityLog = getActivityLogs;

/** Snapshot the entire database as a JSON-serialisable object */
export function exportBackup(): DatabaseSnapshot {
  return {
    version: 1,
    exportedAt: now(),
    businessSettings: getBusinessSettings(),
    appSettings: getAppSettings(),
    customers: getCustomers(),
    stoneCategories: getStoneCategories(),
    microDiamonds: getMicroDiamonds(),
    adDiamonds: getADDiamonds(),
    itemCategories: getItemCategories(),
    patterns: getPatterns(),
    orders: getOrders(),
    karigars: getKarigars(),
    patternDiceRanges: getPatternDiceRanges(),
    activityLogs: getActivityLogs(),
  };
}

/** Restore the entire database from a snapshot object */
export function importBackup(snapshot: DatabaseSnapshot): void {
  saveBusinessSettings(snapshot.businessSettings);
  saveAppSettings(snapshot.appSettings);
  saveCustomers(snapshot.customers);
  saveStoneCategories(snapshot.stoneCategories);
  saveMicroDiamonds(snapshot.microDiamonds);
  saveADDiamonds(snapshot.adDiamonds);
  saveItemCategories(snapshot.itemCategories);
  savePatterns(snapshot.patterns);
  saveOrders(snapshot.orders);
  saveKarigars(snapshot.karigars);
  if (snapshot.patternDiceRanges) savePatternDiceRanges(snapshot.patternDiceRanges);
  logActivity('restore_performed', `Database restored from backup (${snapshot.exportedAt})`);
}

// ── Global Search ─────────────────────────────────────────────────────────────

export interface SearchResult {
  type: 'customer' | 'pattern' | 'order' | 'karigar' | 'stone';
  id: ID;
  title: string;
  subtitle: string;
  url: string;
}

export function globalSearch(query: string): SearchResult[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const results: SearchResult[] = [];

  getCustomers().forEach((c) => {
    if (c.partyName.toLowerCase().includes(q) || c.mobile.includes(q) || c.customerId.toLowerCase().includes(q)) {
      results.push({ type: 'customer', id: c.id, title: c.partyName, subtitle: `${c.customerId} · ${c.mobile}`, url: `/customers/${c.id}` });
    }
  });

  getPatterns().forEach((p) => {
    if (p.patternNumber.toLowerCase().includes(q.replace(/[-\s]/g, '')) || p.patternName.toLowerCase().includes(q)) {
      results.push({ type: 'pattern', id: p.id, title: `${p.patternNumber} - ${p.patternName}`, subtitle: `${p.categoryName} · ${p.weightPerPiece}g`, url: `/patterns/${p.id}` });
    }
  });

  getOrders().forEach((o) => {
    if (o.orderNumber.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q)) {
      results.push({ type: 'order', id: o.id, title: o.orderNumber, subtitle: `${o.customerName} · ${o.status}`, url: `/orders/${o.id}` });
    }
  });

  getKarigars().forEach((k) => {
    if (k.name.toLowerCase().includes(q) || k.mobile.includes(q)) {
      results.push({ type: 'karigar', id: k.id, title: k.name, subtitle: `${k.karigarId} · ${k.type}`, url: `/karigars/${k.id}` });
    }
  });

  getMicroDiamonds().forEach((s) => {
    if (s.stoneName.toLowerCase().includes(q) || s.size.toLowerCase().includes(q)) {
      results.push({ type: 'stone', id: s.id, title: `${s.stoneName} (${s.size})`, subtitle: `Micro · ${s.stoneId}`, url: `/stones/micro` });
    }
  });

  return results.slice(0, 20);
}

// ── Dashboard Stats ────────────────────────────────────────────────────────────

export function getDashboardStats() {
  const orders = getOrders();
  const today = new Date().toDateString();
  const thisMonth = new Date().toISOString().slice(0, 7);

  return {
    totalCustomers: getCustomers().filter((c) => c.isActive).length,
    totalPatterns: getPatterns().filter((p) => p.isActive).length,
    totalStones: getMicroDiamonds().filter((s) => s.isActive).length + getADDiamonds().filter((s) => s.isActive).length,
    activeOrders: orders.filter((o) => !['completed', 'delivered', 'cancelled'].includes(o.status)).length,
    pendingOrders: orders.filter((o) => o.status === 'pending').length,
    ordersInProduction: orders.filter((o) => ['wax_in_progress', 'wax_completed', 'stone_setting_in_progress', 'stone_setting_pending'].includes(o.status)).length,
    completedOrders: orders.filter((o) => o.status === 'production_completed' || o.status === 'delivered').length,
    waxPending: orders.filter((o) => o.status === 'assigned' || o.status === 'wax_in_progress').length,
    stoneSettingPending: orders.filter((o) => o.status === 'stone_setting_pending').length,
    todayOrders: orders.filter((o) => new Date(o.orderDate).toDateString() === today).length,
    monthlyOrders: orders.filter((o) => o.orderDate.startsWith(thisMonth)).length,
    recentActivity: getActivityLogs().slice(0, 10),
  };
}

// ── Demo Data ─────────────────────────────────────────────────────────────────

export function loadDemoData(): void {
  // Categories
  const ringCat = addItemCategory('Ring');
  const pendantCat = addItemCategory('Pendant');
  addItemCategory('Earring');
  addItemCategory('Bracelet');
  addItemCategory('Necklace');

  const microCat = addStoneCategory('Round Micro', 'micro');
  const adCat = addStoneCategory('AD Oval', 'ad');

  // Micro Diamonds
  const m130 = addMicroDiamond({ stoneName: 'Round Micro', categoryId: microCat.id, size: '1.30 mm', shape: 'Round', gradeType: 'VS', colour: 'White', individualWeight: null, weightUnit: 'gram', stonesPerGram: null, supplier: '', notes: '', isActive: true });
  const m160 = addMicroDiamond({ stoneName: 'Round Micro', categoryId: microCat.id, size: '1.60 mm', shape: 'Round', gradeType: 'VS', colour: 'White', individualWeight: null, weightUnit: 'gram', stonesPerGram: null, supplier: '', notes: '', isActive: true });
  const m190 = addMicroDiamond({ stoneName: 'Round Micro', categoryId: microCat.id, size: '1.90 mm', shape: 'Round', gradeType: 'VS', colour: 'White', individualWeight: null, weightUnit: 'gram', stonesPerGram: null, supplier: '', notes: '', isActive: true });

  // AD Diamond
  const adOval = addADDiamond({ stoneName: 'AD Oval', categoryId: adCat.id, shape: 'Oval', size: '3×2 mm', length: 3, width: 2, weight: null, supplier: '', notes: '', isActive: true });

  void ringCat;

  // Customers
  addCustomer({ partyName: 'ABC Jewellers', contactPerson: 'Amit Sharma', mobile: '9876543210', alternateNumber: '', whatsapp: '9876543210', address: '12 Gold Street', city: 'Mumbai', state: 'Maharashtra', email: 'abc@jewellers.com', gst: '27ABCDE1234F1Z5', notes: 'Premium client', isActive: true });
  addCustomer({ partyName: 'Rajesh Jewellers', contactPerson: 'Rajesh Patel', mobile: '9812345678', alternateNumber: '', whatsapp: '9812345678', address: '45 Silver Lane', city: 'Surat', state: 'Gujarat', email: 'rajesh@jewellers.com', gst: '24ABCPD1234G1Z2', notes: '', isActive: true });

  // Patterns
  addPattern({
    patternNumber: 'P-9001',
    patternName: 'Designer Silver Pendant',
    categoryId: pendantCat.id,
    categoryName: 'Pendant',
    subcategory: 'Round',
    patternSize: 'Medium',
    weightPerPiece: 0.50,
    weightUnit: 'gram',
    treeSize: 10,
    stoneConfig: [
      { id: nanoid(), stoneType: 'micro', stoneId: m130.id, stoneName: m130.stoneName, stoneSize: m130.size, shape: m130.shape, qtyPerPiece: 2 },
      { id: nanoid(), stoneType: 'micro', stoneId: m160.id, stoneName: m160.stoneName, stoneSize: m160.size, shape: m160.shape, qtyPerPiece: 4 },
      { id: nanoid(), stoneType: 'micro', stoneId: m190.id, stoneName: m190.stoneName, stoneSize: m190.size, shape: m190.shape, qtyPerPiece: 1 },
      { id: nanoid(), stoneType: 'ad', stoneId: adOval.id, stoneName: adOval.stoneName, stoneSize: adOval.size, shape: adOval.shape, qtyPerPiece: 1 },
    ],
    images: [],
    notes: 'Classic pendant with micro setting',
    isActive: true,
  });

  addPattern({
    patternNumber: 'P-9002',
    patternName: 'Silver Ring Classic',
    categoryId: ringCat.id,
    categoryName: 'Ring',
    subcategory: 'Band',
    patternSize: 'Size 8',
    weightPerPiece: 0.75,
    weightUnit: 'gram',
    treeSize: 8,
    stoneConfig: [
      { id: nanoid(), stoneType: 'micro', stoneId: m130.id, stoneName: m130.stoneName, stoneSize: m130.size, shape: m130.shape, qtyPerPiece: 6 },
    ],
    images: [],
    notes: 'Classic band ring',
    isActive: true,
  });

  // Karigars
  addKarigar({ name: 'Demo Wax Karigar', mobile: '9000012345', whatsapp: '9000012345', type: 'wax', address: 'Workshop 1, Zaveri Bazaar', notes: 'Expert wax worker', isActive: true });
  addKarigar({ name: 'Demo Stone Karigar', mobile: '9000054321', whatsapp: '9000054321', type: 'stone', address: 'Workshop 2, Zaveri Bazaar', notes: 'Stone setting specialist', isActive: true });

  logActivity('demo_data_loaded', 'Demo data loaded successfully');
}
