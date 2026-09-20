const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');

let mainWindow = null;
let db = null;

// Database initialization
function initDatabase() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'erp_database.db');
  
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  
  // Create tables if they don't exist
  createTables();
  
  console.log('Database initialized at:', dbPath);
  return db;
}

function createTables() {
  if (!db) return;
  
  // Example tables - customize based on your ERP needs
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      stock INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      total REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      party_name TEXT NOT NULL UNIQUE,
      phone TEXT,
      address TEXT,
      email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS diamond_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS micro_diamonds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      size TEXT NOT NULL,
      quantity INTEGER DEFAULT 0,
      weight REAL DEFAULT 0,
      price_per_1000 REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(size)
    );
    
    CREATE TABLE IF NOT EXISTS ad_shapes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shape TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS ad_diamonds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shape_id INTEGER NOT NULL,
      size TEXT NOT NULL,
      quantity INTEGER DEFAULT 0,
      weight REAL DEFAULT 0,
      price_per_piece REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (shape_id) REFERENCES ad_shapes(id),
      UNIQUE(shape_id, size)
    );
    
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      diamond_type TEXT NOT NULL,
      diamond_id INTEGER NOT NULL,
      quantity_used INTEGER DEFAULT 0,
      weight_used REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );
    
    CREATE TABLE IF NOT EXISTS inventory_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      diamond_type TEXT NOT NULL,
      diamond_id INTEGER NOT NULL,
      order_id INTEGER,
      quantity_change INTEGER DEFAULT 0,
      weight_change REAL DEFAULT 0,
      remaining_quantity INTEGER DEFAULT 0,
      remaining_weight REAL DEFAULT 0,
      action TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  // Insert default diamond types
  const typeCount = db.prepare('SELECT COUNT(*) as count FROM diamond_types').get() as { count: number };
  if (typeCount.count === 0) {
    db.prepare('INSERT INTO diamond_types (name) VALUES (?)').run('Micro');
    db.prepare('INSERT INTO diamond_types (name) VALUES (?)').run('AD');
  }
  
  // Insert default AD shapes
  const shapeCount = db.prepare('SELECT COUNT(*) as count FROM ad_shapes').get() as { count: number };
  if (shapeCount.count === 0) {
    const shapes = ['Round', 'Heart', 'Tilak', 'Marquis', 'Oval', 'Pear', 'Princess', 'Cushion', 'Emerald', 'Radiant'];
    const insertShape = db.prepare('INSERT INTO ad_shapes (shape) VALUES (?)');
    shapes.forEach(shape => insertShape.run(shape));
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Aaradhana Silver ERP',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Load the app
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    console.log('Loading dev server at http://localhost:5173');
    mainWindow.loadURL('http://localhost:5173').catch((err) => {
      console.error('Failed to load URL:', err);
      mainWindow?.loadFile(path.join(__dirname, '../dist/index.html'));
    });
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Log any page load errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Page failed to load:', errorCode, errorDescription, validatedURL);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page finished loading');
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer Console] ${message}`);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  try {
    initDatabase();
    createWindow();
  } catch (error) {
    console.error('Error during app initialization:', error);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (db) {
      db.close();
    }
    app.quit();
  }
});

// IPC handlers for database operations
ipcMain.handle('db-query', async (event, sql: string, params: any[] = []) => {
  if (!db) throw new Error('Database not initialized');
  
  try {
    const stmt = db.prepare(sql);
    const result = stmt.all(...params);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('db-run', async (event, sql: string, params: any[] = []) => {
  if (!db) throw new Error('Database not initialized');
  
  try {
    const stmt = db.prepare(sql);
    const result = stmt.run(...params);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('db-get', async (event, sql: string, params: any[] = []) => {
  if (!db) throw new Error('Database not initialized');
  
  try {
    const stmt = db.prepare(sql);
    const result = stmt.get(...params);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('get-app-version', async () => {
  return app.getVersion();
});

ipcMain.handle('get-app-path', async () => {
  return app.getAppPath();
});
