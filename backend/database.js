const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'pos.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    // Create Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'admin'
    )`);

    // Create Products Table
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        description TEXT,
        image TEXT,
        stock INTEGER DEFAULT 10,
        category TEXT DEFAULT 'General'
    )`);

    // Create Orders Table
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        total REAL NOT NULL,
        customer_name TEXT,
        customer_phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create Order Items Table
    db.run(`CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        price REAL NOT NULL,
        qty INTEGER NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id)
    )`);
    // Create Branches Table
    db.run(`CREATE TABLE IF NOT EXISTS branches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        location TEXT NOT NULL
    )`);

    // Create Suppliers Table
    db.run(`CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        contact TEXT,
        email TEXT
    )`);

    // Create Customers Table (CRM Loyalty)
    db.run(`CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT UNIQUE,
        email TEXT,
        total_spent REAL DEFAULT 0,
        loyalty_points INTEGER DEFAULT 0
    )`);

    // Create Promocodes Table
    db.run(`CREATE TABLE IF NOT EXISTS promocodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        discount_percent REAL NOT NULL,
        active INTEGER DEFAULT 1
    )`);

    // Create Product Variants Table
    db.run(`CREATE TABLE IF NOT EXISTS product_variants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER,
        name TEXT NOT NULL,
        sku TEXT,
        price REAL NOT NULL,
        stock INTEGER DEFAULT 0,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )`);

    // Create Saved Carts Table (Hold Cart)
    db.run(`CREATE TABLE IF NOT EXISTS saved_carts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        cart_data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create Shifts Table
    db.run(`CREATE TABLE IF NOT EXISTS shifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        end_time DATETIME,
        starting_cash REAL NOT NULL,
        ending_cash REAL,
        status TEXT DEFAULT 'open',
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Create Time Clocks Table
    db.run(`CREATE TABLE IF NOT EXISTS time_clocks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        clock_in DATETIME DEFAULT CURRENT_TIMESTAMP,
        clock_out DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Create Branch Inventory Table
    db.run(`CREATE TABLE IF NOT EXISTS branch_inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        branch_id INTEGER NOT NULL,
        product_id INTEGER,
        variant_id INTEGER,
        stock INTEGER DEFAULT 0,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
    )`);

    // Alter existing tables gracefully
    db.run(`ALTER TABLE users ADD COLUMN branch_id INTEGER REFERENCES branches(id)`, () => {});
    db.run(`ALTER TABLE users ADD COLUMN pin_code TEXT`, () => {});
    db.run(`ALTER TABLE products ADD COLUMN supplier_id INTEGER REFERENCES suppliers(id)`, () => {});
    db.run(`ALTER TABLE orders ADD COLUMN tax_amount REAL DEFAULT 0`, () => {});
    db.run(`ALTER TABLE orders ADD COLUMN discount_amount REAL DEFAULT 0`, () => {});
    db.run(`ALTER TABLE orders ADD COLUMN refund_status TEXT DEFAULT 'none'`, () => {});
    db.run(`ALTER TABLE orders ADD COLUMN branch_id INTEGER REFERENCES branches(id)`, () => {});
  }
});

module.exports = db;
