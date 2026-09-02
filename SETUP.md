# ERP Desktop Application - Setup Guide

## Database Solution: SQLite

**Why SQLite is perfect for your needs:**
- ✅ **100% FREE forever** - No payments, no tiers, no limits
- ✅ **Zero configuration** - No server setup required
- ✅ **Self-contained** - Single .db file that travels with your app
- ✅ **Works offline** - No internet connection needed
- ✅ **Perfect for desktop apps** - Embedded directly in the application
- ✅ **Automatic setup** - Database created on first run

## Prerequisites

- Node.js (v18 or higher)
- pnpm package manager

## Installation

1. Install dependencies:
```bash
pnpm install
```

## Development

Run the application in development mode:
```bash
pnpm electron:dev
```

This will:
- Start the Vite development server
- Launch the Electron window
- Create the SQLite database automatically in your user data directory

## Building the Executable

Build the Windows .exe file:
```bash
pnpm electron:build:win
```

The executable will be created in the `release` directory.

## Database Location

The SQLite database file (`erp_database.db`) is automatically created in:
- **Windows**: `%APPDATA%/erp-desktop/erp_database.db`
- **Mac**: `~/Library/Application Support/erp-desktop/erp_database.db`
- **Linux**: `~/.config/erp-desktop/erp_database.db`

## Database Schema

The default schema includes these tables (customize in `electron/main.ts`):

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Products Table
```sql
CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  stock INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Orders Table
```sql
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  total REAL NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Using the Database in Your React Components

```typescript
import { getDatabaseService } from './lib/database';

const db = getDatabaseService();

// Get all users
const users = await db.getUsers();

// Create a new user
await db.createUser('John Doe', 'john@example.com');

// Update a user
await db.updateUser(1, 'John Smith', 'john.smith@example.com');

// Delete a user
await db.deleteUser(1);

// Custom SQL query
const results = await db.query('SELECT * FROM products WHERE price > ?', [100]);
```

## Customizing the Database

To add or modify tables, edit the `createTables()` function in `electron/main.ts`:

```typescript
function createTables() {
  if (!db) return;
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS your_table (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      -- Add your columns here
    );
  `);
}
```

Then add corresponding methods in `src/lib/database.ts`:

```typescript
async getYourData() {
  return this.query('SELECT * FROM your_table');
}

async createYourData(name: string) {
  return this.run('INSERT INTO your_table (name) VALUES (?)', [name]);
}
```

## Distribution

The built executable includes:
- Your React application
- Electron runtime
- SQLite database engine
- All dependencies

Users simply:
1. Download the .exe file
2. Double-click to run
3. Database is created automatically on first run
4. No installation or setup required

## Important Notes

- The database file persists on the user's computer
- Each installation has its own separate database
- No internet connection required for database operations
- Data is stored locally and privately
- SQLite has no size limits for typical desktop applications
- Backup the database file by copying `erp_database.db`

## Troubleshooting

### Database not found
- Check that the app has write permissions to the user data directory
- Ensure the app is running (not in browser)

### Build errors
- Make sure you've run `pnpm install` after adding dependencies
- Check that Node.js version is 18 or higher

### Electron window doesn't open
- Ensure port 5173 is available
- Check that Vite dev server starts successfully

## Next Steps

1. Customize the database schema for your specific ERP needs
2. Add your business logic in React components
3. Test the application thoroughly
4. Build and distribute the executable
