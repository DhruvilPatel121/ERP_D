// Database service for interacting with SQLite via Electron IPC

export interface DbResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ElectronAPI {
  dbQuery: (sql: string, params?: any[]) => Promise<DbResult>;
  dbRun: (sql: string, params?: any[]) => Promise<DbResult>;
  dbGet: (sql: string, params?: any[]) => Promise<DbResult>;
  getAppVersion: () => Promise<string>;
  getAppPath: () => Promise<string>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

class DatabaseService {
  private api: ElectronAPI;
  private isElectron: boolean;

  constructor() {
    this.isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;
    if (this.isElectron) {
      console.log('[DatabaseService] Using Electron API');
      this.api = window.electronAPI;
    } else {
      console.log('[DatabaseService] Using mock API (localStorage)');
      // Running in browser - use mock implementation for development
      this.api = this.createMockAPI();
    }
  }

  private createMockAPI(): ElectronAPI {
    // Mock data storage for browser development using localStorage
    const getMockData = () => {
      if (typeof window === 'undefined') return {};
      const stored = localStorage.getItem('mock_db_data');
      if (stored) {
        return JSON.parse(stored);
      }
      // Initialize with default data
      const defaultData = {
        micro_diamonds: [],
        ad_shapes: [
          { id: 1, shape: 'Round', created_at: new Date().toISOString() },
          { id: 2, shape: 'Heart', created_at: new Date().toISOString() },
          { id: 3, shape: 'Tilak', created_at: new Date().toISOString() },
          { id: 4, shape: 'Marquis', created_at: new Date().toISOString() },
          { id: 5, shape: 'Oval', created_at: new Date().toISOString() },
          { id: 6, shape: 'Pear', created_at: new Date().toISOString() },
          { id: 7, shape: 'Princess', created_at: new Date().toISOString() },
          { id: 8, shape: 'Cushion', created_at: new Date().toISOString() },
          { id: 9, shape: 'Emerald', created_at: new Date().toISOString() },
          { id: 10, shape: 'Radiant', created_at: new Date().toISOString() },
        ],
        ad_diamonds: [],
        customers: [],
        inventory_log: [],
      };
      localStorage.setItem('mock_db_data', JSON.stringify(defaultData));
      return defaultData;
    };

    const saveMockData = (data: any) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('mock_db_data', JSON.stringify(data));
      }
    };

    let nextId = 100;

    return {
      dbQuery: async (sql: string, params: any[] = []) => {
        const data = getMockData();
        
        if (sql.includes('micro_diamonds') && sql.includes('ORDER BY size')) {
          return { success: true, data: data.micro_diamonds.sort((a: any, b: any) => a.size.localeCompare(b.size)) };
        }
        if (sql.includes('micro_diamonds')) {
          return { success: true, data: data.micro_diamonds };
        }
        if (sql.includes('ad_shapes') && sql.includes('ORDER BY shape')) {
          return { success: true, data: data.ad_shapes.sort((a: any, b: any) => a.shape.localeCompare(b.shape)) };
        }
        if (sql.includes('ad_shapes')) {
          return { success: true, data: data.ad_shapes };
        }
        if (sql.includes('ad_diamonds') && sql.includes('WHERE shape_id')) {
          const shapeId = params[0];
          return { success: true, data: data.ad_diamonds.filter((d: any) => d.shape_id === shapeId) };
        }
        if (sql.includes('ad_diamonds')) {
          return { success: true, data: data.ad_diamonds };
        }
        if (sql.includes('customers')) {
          return { success: true, data: data.customers };
        }
        if (sql.includes('inventory_log')) {
          return { success: true, data: data.inventory_log };
        }
        return { success: true, data: [] };
      },
      dbRun: async (sql: string, params: any[] = []) => {
        const data = getMockData();
        const lastInsertRowid = nextId++;
        
        if (sql.includes('INSERT INTO micro_diamonds')) {
          const newDiamond = {
            id: lastInsertRowid,
            size: params[0],
            quantity: Number(params[1]) || 0,
            weight: Number(params[2]) || 0,
            price_per_1000: Number(params[3]) || 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          data.micro_diamonds.push(newDiamond);
          saveMockData(data);
          return { success: true, data: { lastInsertRowid, changes: 1 } };
        }
        
        if (sql.includes('UPDATE micro_diamonds')) {
          const idx = data.micro_diamonds.findIndex((d: any) => d.id === params[4]);
          if (idx !== -1) {
            data.micro_diamonds[idx] = {
              ...data.micro_diamonds[idx],
              size: params[0],
              quantity: params[1] !== undefined && params[1] !== null && params[1] !== '' ? Number(params[1]) : data.micro_diamonds[idx].quantity,
              weight: params[2] !== undefined && params[2] !== null && params[2] !== '' ? Number(params[2]) : data.micro_diamonds[idx].weight,
              price_per_1000: params[3] !== undefined && params[3] !== null && params[3] !== '' ? Number(params[3]) : data.micro_diamonds[idx].price_per_1000,
              updated_at: new Date().toISOString(),
            };
            saveMockData(data);
          }
          return { success: true, data: { lastInsertRowid, changes: 1 } };
        }
        
        if (sql.includes('DELETE FROM micro_diamonds')) {
          data.micro_diamonds = data.micro_diamonds.filter((d: any) => d.id !== params[0]);
          // Also delete related inventory logs
          data.inventory_log = data.inventory_log.filter((log: any) => log.diamond_id !== params[0] || log.diamond_type !== 'Micro');
          saveMockData(data);
          return { success: true, data: { lastInsertRowid, changes: 1 } };
        }
        
        if (sql.includes('INSERT INTO ad_diamonds')) {
          const newDiamond = {
            id: lastInsertRowid,
            shape_id: params[0],
            size: params[1],
            quantity: Number(params[2]) || 0,
            weight: Number(params[3]) || 0,
            price_per_piece: Number(params[4]) || 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          data.ad_diamonds.push(newDiamond);
          saveMockData(data);
          return { success: true, data: { lastInsertRowid, changes: 1 } };
        }
        
        if (sql.includes('UPDATE ad_diamonds')) {
          const idx = data.ad_diamonds.findIndex((d: any) => d.id === params[5]);
          if (idx !== -1) {
            data.ad_diamonds[idx] = {
              ...data.ad_diamonds[idx],
              shape_id: params[0],
              size: params[1],
              quantity: params[2] !== undefined && params[2] !== null && params[2] !== '' ? Number(params[2]) : data.ad_diamonds[idx].quantity,
              weight: params[3] !== undefined && params[3] !== null && params[3] !== '' ? Number(params[3]) : data.ad_diamonds[idx].weight,
              price_per_piece: params[4] !== undefined && params[4] !== null && params[4] !== '' ? Number(params[4]) : data.ad_diamonds[idx].price_per_piece,
              updated_at: new Date().toISOString(),
            };
            saveMockData(data);
          }
          return { success: true, data: { lastInsertRowid, changes: 1 } };
        }
        
        if (sql.includes('DELETE FROM ad_diamonds')) {
          data.ad_diamonds = data.ad_diamonds.filter((d: any) => d.id !== params[0]);
          // Also delete related inventory logs
          data.inventory_log = data.inventory_log.filter((log: any) => log.diamond_id !== params[0] || log.diamond_type !== 'AD');
          saveMockData(data);
          return { success: true, data: { lastInsertRowid, changes: 1 } };
        }
        
        if (sql.includes('INSERT INTO inventory_log')) {
          const newLog = {
            id: lastInsertRowid,
            diamond_type: params[0],
            diamond_id: params[1],
            order_id: params[2] || null,
            quantity_change: params[3] || 0,
            weight_change: params[4] || 0,
            remaining_quantity: params[5] || 0,
            remaining_weight: params[6] || 0,
            action: params[7],
            created_at: new Date().toISOString(),
          };
          data.inventory_log.push(newLog);
          saveMockData(data);
          return { success: true, data: { lastInsertRowid, changes: 1 } };
        }
        
        return { success: true, data: { lastInsertRowid, changes: 1 } };
      },
      dbGet: async (sql: string, params: any[] = []) => {
        const data = getMockData();
        
        if (sql.includes('micro_diamonds') && sql.includes('WHERE id')) {
          return { success: true, data: data.micro_diamonds.find((d: any) => d.id === params[0]) || null };
        }
        if (sql.includes('ad_diamonds') && sql.includes('WHERE ad.id')) {
          const diamond = data.ad_diamonds.find((d: any) => d.id === params[0]);
          if (diamond) {
            const shape = data.ad_shapes.find((s: any) => s.id === diamond.shape_id);
            return { success: true, data: { ...diamond, shape: shape?.shape } };
          }
          return { success: true, data: null };
        }
        if (sql.includes('ad_shapes') && sql.includes('WHERE id')) {
          return { success: true, data: data.ad_shapes.find((s: any) => s.id === params[0]) || null };
        }
        
        return { success: true, data: null };
      },
      getAppVersion: async () => '0.0.1-dev',
      getAppPath: async () => '/',
    };
  }

  // Execute a SELECT query and return all rows
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const result = await this.api.dbQuery(sql, params);
    if (!result.success) {
      throw new Error(result.error || 'Query failed');
    }
    return result.data as T[];
  }

  // Execute an INSERT, UPDATE, or DELETE
  async run(sql: string, params: any[] = []): Promise<{ lastInsertRowid: number; changes: number }> {
    const result = await this.api.dbRun(sql, params);
    if (!result.success) {
      throw new Error(result.error || 'Run failed');
    }
    return result.data as { lastInsertRowid: number; changes: number };
  }

  // Execute a SELECT query and return the first row
  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    const result = await this.api.dbGet(sql, params);
    if (!result.success) {
      throw new Error(result.error || 'Get failed');
    }
    return result.data as T;
  }

  // Example CRUD operations for your ERP
  
  // Users
  async getUsers() {
    return this.query('SELECT * FROM users ORDER BY created_at DESC');
  }

  async createUser(name: string, email?: string) {
    return this.run('INSERT INTO users (name, email) VALUES (?, ?)', [name, email]);
  }

  async updateUser(id: number, name: string, email?: string) {
    return this.run('UPDATE users SET name = ?, email = ? WHERE id = ?', [name, email, id]);
  }

  async deleteUser(id: number) {
    return this.run('DELETE FROM users WHERE id = ?', [id]);
  }

  // Products
  async getProducts() {
    return this.query('SELECT * FROM products ORDER BY created_at DESC');
  }

  async createProduct(name: string, price: number, stock: number = 0) {
    return this.run('INSERT INTO products (name, price, stock) VALUES (?, ?, ?)', [name, price, stock]);
  }

  async updateProduct(id: number, name: string, price: number, stock: number) {
    return this.run('UPDATE products SET name = ?, price = ?, stock = ? WHERE id = ?', [name, price, stock, id]);
  }

  async deleteProduct(id: number) {
    return this.run('DELETE FROM products WHERE id = ?', [id]);
  }

  // Orders
  async getOrders() {
    return this.query('SELECT * FROM orders ORDER BY created_at DESC');
  }

  async createOrder(customerName: string, total: number, status: string = 'pending') {
    return this.run('INSERT INTO orders (customer_name, total, status) VALUES (?, ?, ?)', [customerName, total, status]);
  }

  async updateOrderStatus(id: number, status: string) {
    return this.run('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
  }

  async deleteOrder(id: number) {
    return this.run('DELETE FROM orders WHERE id = ?', [id]);
  }

  // Customers
  async getCustomers() {
    return this.query('SELECT id, party_name FROM customers ORDER BY party_name ASC');
  }

  async getCustomerById(id: number) {
    return this.get('SELECT * FROM customers WHERE id = ?', [id]);
  }

  async createCustomer(partyName: string, phone?: string, address?: string, email?: string) {
    return this.run('INSERT INTO customers (party_name, phone, address, email) VALUES (?, ?, ?, ?)', [partyName, phone, address, email]);
  }

  async updateCustomer(id: number, partyName: string, phone?: string, address?: string, email?: string) {
    return this.run('UPDATE customers SET party_name = ?, phone = ?, address = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [partyName, phone, address, email, id]);
  }

  async deleteCustomer(id: number) {
    return this.run('DELETE FROM customers WHERE id = ?', [id]);
  }

  async getCustomerOrders(customerId: number) {
    return this.query('SELECT * FROM orders WHERE customer_name = (SELECT party_name FROM customers WHERE id = ?) ORDER BY created_at DESC', [customerId]);
  }

  // Micro Diamonds
  async getMicroDiamondSizes() {
    return this.query('SELECT id, size FROM micro_diamonds ORDER BY size ASC');
  }

  async getMicroDiamondById(id: number) {
    return this.get('SELECT * FROM micro_diamonds WHERE id = ?', [id]);
  }

  async createMicroDiamond(size: string, quantity: number = 0, weight: number = 0, pricePer1000: number = 0) {
    return this.run('INSERT INTO micro_diamonds (size, quantity, weight, price_per_1000) VALUES (?, ?, ?, ?)', [size, quantity, weight, pricePer1000]);
  }

  async updateMicroDiamond(id: number, size: string, quantity: number, weight: number, pricePer1000: number) {
    return this.run('UPDATE micro_diamonds SET size = ?, quantity = ?, weight = ?, price_per_1000 = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [size, quantity, weight, pricePer1000, id]);
  }

  async deleteMicroDiamond(id: number) {
    return this.run('DELETE FROM micro_diamonds WHERE id = ?', [id]);
  }

  async updateMicroDiamondInventory(id: number, quantityChange: number, weightChange: number) {
    const current = await this.getMicroDiamondById(id);
    if (!current) throw new Error('Diamond not found');
    
    const newQuantity = Math.max(0, current.quantity + quantityChange);
    const newWeight = Math.max(0, current.weight + weightChange);
    
    await this.run('UPDATE micro_diamonds SET quantity = ?, weight = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newQuantity, newWeight, id]);
    
    // Log the inventory change
    await this.run('INSERT INTO inventory_log (diamond_type, diamond_id, quantity_change, weight_change, remaining_quantity, remaining_weight, action) VALUES (?, ?, ?, ?, ?, ?, ?)', 
      ['Micro', id, quantityChange, weightChange, newQuantity, newWeight, quantityChange > 0 ? 'ADD' : 'USE']);
    
    return { newQuantity, newWeight };
  }

  // AD Shapes
  async getADShapes() {
    return this.query('SELECT id, shape FROM ad_shapes ORDER BY shape ASC');
  }

  async getADShapeById(id: number) {
    return this.get('SELECT * FROM ad_shapes WHERE id = ?', [id]);
  }

  async createADShape(shape: string) {
    return this.run('INSERT INTO ad_shapes (shape) VALUES (?)', [shape]);
  }

  async deleteADShape(id: number) {
    return this.run('DELETE FROM ad_shapes WHERE id = ?', [id]);
  }

  // AD Diamonds
  async getADDiamondSizesByShape(shapeId: number) {
    return this.query('SELECT id, size FROM ad_diamonds WHERE shape_id = ? ORDER BY size ASC', [shapeId]);
  }

  async getADDiamondById(id: number) {
    return this.get('SELECT ad.*, a.shape FROM ad_diamonds ad JOIN ad_shapes a ON ad.shape_id = a.id WHERE ad.id = ?', [id]);
  }

  async createADDiamond(shapeId: number, size: string, quantity: number = 0, weight: number = 0, pricePerPiece: number = 0) {
    return this.run('INSERT INTO ad_diamonds (shape_id, size, quantity, weight, price_per_piece) VALUES (?, ?, ?, ?, ?)', [shapeId, size, quantity, weight, pricePerPiece]);
  }

  async updateADDiamond(id: number, shapeId: number, size: string, quantity: number, weight: number, pricePerPiece: number) {
    return this.run('UPDATE ad_diamonds SET shape_id = ?, size = ?, quantity = ?, weight = ?, price_per_piece = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [shapeId, size, quantity, weight, pricePerPiece, id]);
  }

  async deleteADDiamond(id: number) {
    return this.run('DELETE FROM ad_diamonds WHERE id = ?', [id]);
  }

  async updateADDiamondInventory(id: number, quantityChange: number, weightChange: number) {
    const current = await this.getADDiamondById(id);
    if (!current) throw new Error('Diamond not found');
    
    const newQuantity = Math.max(0, current.quantity + quantityChange);
    const newWeight = Math.max(0, current.weight + weightChange);
    
    await this.run('UPDATE ad_diamonds SET quantity = ?, weight = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newQuantity, newWeight, id]);
    
    // Log the inventory change
    await this.run('INSERT INTO inventory_log (diamond_type, diamond_id, quantity_change, weight_change, remaining_quantity, remaining_weight, action) VALUES (?, ?, ?, ?, ?, ?, ?)', 
      ['AD', id, quantityChange, weightChange, newQuantity, newWeight, quantityChange > 0 ? 'ADD' : 'USE']);
    
    return { newQuantity, newWeight };
  }

  // Order Items
  async addOrderItem(orderId: number, diamondType: string, diamondId: number, quantityUsed: number, weightUsed: number) {
    const result = await this.run('INSERT INTO order_items (order_id, diamond_type, diamond_id, quantity_used, weight_used) VALUES (?, ?, ?, ?, ?)', [orderId, diamondType, diamondId, quantityUsed, weightUsed]);
    
    // Update inventory
    if (diamondType === 'Micro') {
      await this.updateMicroDiamondInventory(diamondId, -quantityUsed, -weightUsed);
    } else if (diamondType === 'AD') {
      await this.updateADDiamondInventory(diamondId, -quantityUsed, -weightUsed);
    }
    
    return result;
  }

  async getOrderItems(orderId: number) {
    return this.query(`
      SELECT oi.*, 
             CASE oi.diamond_type 
               WHEN 'Micro' THEN m.size 
               WHEN 'AD' THEN (SELECT a.shape || ' - ' || ad.size FROM ad_diamonds ad JOIN ad_shapes a ON ad.shape_id = a.id WHERE ad.id = oi.diamond_id)
             END as diamond_info
      FROM order_items oi
      WHERE oi.order_id = ?
    `, [orderId]);
  }

  // Inventory Logs
  async getInventoryLogs(diamondId: number, diamondType: string) {
    return this.query('SELECT * FROM inventory_log WHERE diamond_id = ? AND diamond_type = ? ORDER BY created_at DESC', [diamondId, diamondType]);
  }
}

// Singleton instance
let dbService: DatabaseService | null = null;

export function getDatabaseService(): DatabaseService {
  if (!dbService) {
    dbService = new DatabaseService();
  }
  return dbService;
}

export default DatabaseService;
