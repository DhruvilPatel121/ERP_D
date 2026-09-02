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

  constructor() {
    if (typeof window !== 'undefined' && window.electronAPI) {
      this.api = window.electronAPI;
    } else {
      throw new Error('Electron API not available. This app must run in Electron.');
    }
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
