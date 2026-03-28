const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const stripe = require('stripe')('sk_test_mockKeyForLocalDev123');
const nodemailer = require('nodemailer');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = 'super_secret_pos_key_for_jwt';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
app.use('/uploads', express.static('uploads'));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Multi-tier JWT Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access Denied' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid Token' });
        req.user = user;
        next();
    });
};

const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin restriction applied.' });
    next();
};

// --- AUTH API ---
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err || !user) return res.status(400).json({ error: 'User not found' });
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(400).json({ error: 'Invalid password' });
        const token = jwt.sign({ id: user.id, username, role: user.role }, SECRET_KEY, { expiresIn: '8h' });
        res.json({ token, username, role: user.role });
    });
});

// --- EMPLOYEE MGMT API (Admin Only) ---
app.get('/api/users', authenticateToken, requireAdmin, (req, res) => {
    db.all('SELECT id, username, role FROM users', [], (err, rows) => {
        if(err) return res.status(400).json({error: err.message});
        res.json(rows);
    });
});

app.post('/api/users', authenticateToken, requireAdmin, async (req, res) => {
    const { username, password, role, pin_code, branch_id } = req.body;
    if(!username || !password) return res.status(400).json({error: "Username and password required"});
    
    try {
        const hash = await bcrypt.hash(password, 10);
        db.run('INSERT INTO users (username, password, role, pin_code, branch_id) VALUES (?, ?, ?, ?, ?)', [username, hash, role || 'cashier', pin_code || null, branch_id || null], function(err) {
            if (err) {
                if(err.message.includes('UNIQUE')) return res.status(400).json({ error: "Username already exists! Please choose another one." });
                return res.status(400).json({ error: err.message });
            }
            res.status(201).json({ id: this.lastID, username, role: role || 'cashier' });
        });
    } catch(err) {
        res.status(500).json({error: "Hashing error"});
    }
});

app.delete('/api/users/:id', authenticateToken, requireAdmin, (req, res) => {
    if(req.user.id == req.params.id) return res.status(400).json({error: "Cannot delete yourself!"});
    db.run('DELETE FROM users WHERE id = ?', req.params.id, function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: 'User deleted successfully' });
    });
});

// --- ANALYTICS API ---
app.get('/api/analytics', authenticateToken, (req, res) => {
    db.serialize(() => {
        db.get('SELECT COUNT(*) as totalEvents, SUM(total) as totalRevenue FROM orders', [], (err, stats) => {
            if (err) return res.status(400).json({ error: err.message });
            
            db.all('SELECT product_name, SUM(qty) as total_sold FROM order_items GROUP BY product_name ORDER BY total_sold DESC LIMIT 5', [], (err, topProducts) => {
                if (err) return res.status(400).json({ error: err.message });
                
                db.all('SELECT substr(created_at, 1, 10) as date, SUM(total) as revenue FROM orders GROUP BY date ORDER BY date ASC LIMIT 14', [], (err, chartData) => {
                    if (err) return res.status(400).json({ error: err.message });
                     
                    db.all(`SELECT COALESCE(customer_name, 'Walk-in') as name, SUM(total) as value FROM orders GROUP BY name ORDER BY value DESC LIMIT 5`, [], (err, customerSplit) => {
                         if (err) return res.status(400).json({ error: err.message });

                         db.all('SELECT id, total, customer_name, created_at FROM orders ORDER BY created_at DESC LIMIT 5', [], (err, recentOrders) => {
                             if (err) return res.status(400).json({ error: err.message });

                             res.json({ 
                                 stats: stats || {totalEvents:0, totalRevenue:0}, 
                                 topProducts, 
                                 chartData,
                                 customerSplit,
                                 recentOrders
                             });
                         });
                    });
                });
            });
        });
    });
});

// --- PRODUCTS API ---
app.get('/api/products', authenticateToken, (req, res) => {
  const { search, category, branch_id } = req.query;
  const activeBranchId = branch_id || 1; // Default to Main HQ

  let sql = `
    SELECT p.*, COALESCE(bi.stock, 0) as stock 
    FROM products p 
    LEFT JOIN branch_inventory bi ON p.id = bi.product_id AND bi.branch_id = ? 
    WHERE 1=1
  `;
  const params = [activeBranchId];
  if (search) { sql += ' AND p.name LIKE ?'; params.push(`%${search}%`); }
  if (category && category !== 'All') { sql += ' AND p.category = ?'; params.push(category); }

  db.all(sql, params, (err, products) => {
    if (err) return res.status(400).json({ error: err.message });
    
    const varSql = `
      SELECT v.*, COALESCE(bi.stock, 0) as stock 
      FROM product_variants v 
      LEFT JOIN branch_inventory bi ON v.id = bi.variant_id AND bi.branch_id = ?
    `;
    db.all(varSql, [activeBranchId], (err, variants) => {
      if (err) return res.status(400).json({ error: err.message });
      const rows = products.map(p => ({
        ...p,
        variants: variants.filter(v => v.product_id === p.id)
      }));
      res.json(rows);
    });
  });
});

app.post('/api/products', authenticateToken, upload.single('file'), (req, res) => {
  const { name, price, description, category, stock } = req.body;
  let imagePath = req.body.image || ''; 
  if (req.file) imagePath = `http://localhost:${PORT}/uploads/${req.file.filename}`;
  if (!name || !price) return res.status(400).json({ error: 'Name and price are required' });

  const sql = 'INSERT INTO products (name, price, description, image, category) VALUES (?, ?, ?, ?, ?)';
  db.run(sql, [name, price, description, imagePath, category || 'General'], function (err) {
    if (err) return res.status(400).json({ error: err.message });
    const productId = this.lastID;
    db.run('INSERT INTO branch_inventory (branch_id, product_id, stock) VALUES (1, ?, ?)', [productId, stock || 0], (err) => {
        res.status(201).json({ id: productId, name, price, description, image: imagePath, stock, category });
    });
  });
});

app.put('/api/products/:id', authenticateToken, upload.single('file'), (req, res) => {
  const { name, price, description, category, stock, branch_id } = req.body;
  let imagePath = req.body.image; 
  if (req.file) imagePath = `http://localhost:${PORT}/uploads/${req.file.filename}`;
  const activeBranchId = branch_id || 1;

  const sql = 'UPDATE products SET name = COALESCE(?, name), price = COALESCE(?, price), description = COALESCE(?, description), image = COALESCE(?, image), category = COALESCE(?, category) WHERE id = ?';
  db.run(sql, [name, price, description, imagePath, category, req.params.id], function (err) {
    if (err) return res.status(400).json({ error: err.message });
    if (stock !== undefined) {
        db.run('UPDATE branch_inventory SET stock = ? WHERE product_id = ? AND branch_id = ?', [stock, req.params.id, activeBranchId], function(err) {
            if (this.changes === 0) {
               db.run('INSERT INTO branch_inventory (branch_id, product_id, stock) VALUES (?, ?, ?)', [activeBranchId, req.params.id, stock]);
            }
            res.json({ message: 'Product updated successfully' });
        });
    } else {
        res.json({ message: 'Product updated successfully' });
    }
  });
});

app.delete('/api/products/:id', authenticateToken, (req, res) => {
  db.run('DELETE FROM products WHERE id = ?', req.params.id, function (err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ message: 'Product deleted' });
  });
});

// --- PRODUCT VARIANTS API ---
app.post('/api/products/:id/variants', authenticateToken, (req, res) => {
  const { name, sku, price, stock, branch_id } = req.body;
  const activeBranchId = branch_id || 1;
  const sql = 'INSERT INTO product_variants (product_id, name, sku, price) VALUES (?, ?, ?, ?)';
  db.run(sql, [req.params.id, name, sku, price], function(err) {
    if (err) return res.status(400).json({ error: err.message });
    const variantId = this.lastID;
    db.run('INSERT INTO branch_inventory (branch_id, variant_id, stock) VALUES (?, ?, ?)', [activeBranchId, variantId, stock || 0], () => {
        res.status(201).json({ id: variantId, product_id: req.params.id, name, sku, price, stock });
    });
  });
});

app.put('/api/product_variants/:id', authenticateToken, (req, res) => {
  const { name, sku, price, stock, branch_id } = req.body;
  const activeBranchId = branch_id || 1;
  const sql = 'UPDATE product_variants SET name = COALESCE(?, name), sku = COALESCE(?, sku), price = COALESCE(?, price) WHERE id = ?';
  db.run(sql, [name, sku, price, req.params.id], function(err) {
    if (err) return res.status(400).json({ error: err.message });
    if (stock !== undefined) {
        db.run('UPDATE branch_inventory SET stock = ? WHERE variant_id = ? AND branch_id = ?', [stock, req.params.id, activeBranchId], function(err) {
             if (this.changes === 0) {
                 db.run('INSERT INTO branch_inventory (branch_id, variant_id, stock) VALUES (?, ?, ?)', [activeBranchId, req.params.id, stock]);
             }
             res.json({ message: 'Variant updated successfully' });
        });
    } else {
        res.json({ message: 'Variant updated successfully' });
    }
  });
});

app.delete('/api/product_variants/:id', authenticateToken, (req, res) => {
  db.run('DELETE FROM product_variants WHERE id = ?', req.params.id, function(err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ message: 'Variant deleted' });
  });
});


// --- PAYMENT CONTROLLER (STRIPE Mock) ---
app.post('/api/checkout/stripe', authenticateToken, (req, res) => {
    const { token, total } = req.body;
    // In production: stripe.charges.create(...)
    // Here we simulate successful payment locally
    res.json({ success: true, chargeId: `ch_mock_${Date.now()}` });
});


// --- ORDERS API & CRM ---
app.post('/api/orders', authenticateToken, (req, res) => {
  const { cart, total, customer_name, customer_phone, discount_amount, branch_id } = req.body;
  const activeBranchId = branch_id || 1;
  if (!cart || cart.length === 0) return res.status(400).json({ error: 'Cart is empty' });

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    const sqlOrder = 'INSERT INTO orders (total, customer_name, customer_phone, discount_amount, branch_id) VALUES (?, ?, ?, ?, ?)';
    db.run(sqlOrder, [total, customer_name || 'Walk-in', customer_phone || '', discount_amount || 0, activeBranchId], function (err) {
      if (err) {
        db.run('ROLLBACK');
        return res.status(400).json({ error: err.message });
      }

      const orderId = this.lastID;
      const sqlItem = 'INSERT INTO order_items (order_id, product_name, price, qty) VALUES (?, ?, ?, ?)';
      
      const sqlStockProd = 'UPDATE branch_inventory SET stock = stock - ? WHERE product_id = (SELECT id FROM products WHERE name = ?) AND branch_id = ?';
      const sqlStockVar = 'UPDATE branch_inventory SET stock = stock - ? WHERE variant_id = ? AND branch_id = ?';
      
      const stmtItem = db.prepare(sqlItem);
      const stmtStockProd = db.prepare(sqlStockProd);
      const stmtStockVar = db.prepare(sqlStockVar);

      // Nodemailer Config (Mock Credentials for Dev)
      const transporter = require('nodemailer').createTransport({
          host: 'smtp.gmail.com', port: 587, secure: false,
          auth: { user: 'posadminmock@gmail.com', pass: 'mockpassword123' }
      });

      cart.forEach((item) => {
        stmtItem.run([orderId, item.variant ? `${item.name} (${item.variant})` : item.name, item.price, item.qty]);
        
        if (item.variant_id) {
             stmtStockVar.run([item.qty, item.variant_id, activeBranchId]);
             db.get('SELECT stock FROM branch_inventory WHERE variant_id = ? AND branch_id = ?', [item.variant_id, activeBranchId], (err, row) => {
                  if (row && row.stock < 5) {
                      transporter.sendMail({
                          from: 'posadminmock@gmail.com', to: 'storeowner@pos.com',
                          subject: `🚨 LOW STOCK ALERT: ${item.name} (${item.variant})`,
                          text: `Warning! "${item.name} (${item.variant})" has dangerously fallen to ${row.stock} units at Branch ${activeBranchId}! Restock immediately.`
                      }).catch(console.error);
                  }
             });
        } else {
             stmtStockProd.run([item.qty, item.name, activeBranchId]);
             db.get('SELECT stock FROM branch_inventory WHERE product_id = (SELECT id FROM products WHERE name = ?) AND branch_id = ?', [item.name, activeBranchId], (err, row) => {
                  if (row && row.stock < 5) {
                      transporter.sendMail({
                          from: 'posadminmock@gmail.com', to: 'storeowner@pos.com',
                          subject: `🚨 LOW STOCK ALERT: ${item.name}`,
                          text: `Warning! "${item.name}" has dangerously fallen to ${row.stock} units at Branch ${activeBranchId}! Restock from Procurement immediately.`
                      }).catch(console.error);
                  }
             });
        }
      });
      
      stmtItem.finalize();
      stmtStockProd.finalize();
      stmtStockVar.finalize();

      // Handle Customer CRM Logic
      if (customer_phone) {
          const pointsEarned = Math.floor(total / 100); // 1 point per Rs.100
          db.get('SELECT id FROM customers WHERE phone = ?', [customer_phone], (err, row) => {
              if (row) {
                  db.run('UPDATE customers SET total_spent = total_spent + ?, loyalty_points = loyalty_points + ? WHERE phone = ?', [total, pointsEarned, customer_phone]);
              } else {
                  db.run('INSERT INTO customers (name, phone, total_spent, loyalty_points) VALUES (?, ?, ?, ?)', [customer_name || 'Unknown', customer_phone, total, pointsEarned]);
              }
              db.run('COMMIT');
              res.status(201).json({ message: 'Order created successfully', orderId });
          });
      } else {
          db.run('COMMIT');
          res.status(201).json({ message: 'Order created successfully', orderId });
      }
    });
  });
});

app.get('/api/orders', authenticateToken, (req, res) => {
    db.all('SELECT * FROM orders ORDER BY created_at DESC', [], (err, rows) => {
      if (err) return res.status(400).json({ error: err.message });
      res.json(rows);
    });
});

app.post('/api/orders/:id/refund', authenticateToken, requireAdmin, (req, res) => {
    const orderId = req.params.id;

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        db.get('SELECT refund_status FROM orders WHERE id = ?', [orderId], (err, order) => {
            if (err) { db.run('ROLLBACK'); return res.status(400).json({ error: err.message }); }
            if (!order) { db.run('ROLLBACK'); return res.status(404).json({ error: 'Order not found' }); }
            if (order.refund_status === 'refunded') { db.run('ROLLBACK'); return res.status(400).json({ error: 'Already refunded' }); }

            db.run('UPDATE orders SET refund_status = ? WHERE id = ?', ['refunded', orderId], (err) => {
                if (err) { db.run('ROLLBACK'); return res.status(400).json({ error: err.message }); }

                db.all('SELECT product_name, qty FROM order_items WHERE order_id = ?', [orderId], (err, items) => {
                    if (err) { db.run('ROLLBACK'); return res.status(400).json({ error: err.message }); }
                    
                    items.forEach(item => {
                        const match = item.product_name.match(/(.+) \((.+)\)/);
                        if (match) {
                            const baseName = match[1];
                            const variantName = match[2];
                            db.run(`UPDATE product_variants SET stock = stock + ? WHERE name = ? AND product_id = (SELECT id FROM products WHERE name = ?)`, [item.qty, variantName, baseName]);
                        } else {
                            db.run(`UPDATE products SET stock = stock + ? WHERE name = ?`, [item.qty, item.product_name]);
                        }
                    });

                    db.run('COMMIT', (err) => {
                        if (err) return res.status(400).json({ error: err.message });
                        res.json({ message: "Order Refunded Successfully" });
                    });
                });
            });
        });
    });
});

// --- SAVED CARTS API ---
app.post('/api/carts', authenticateToken, (req, res) => {
    const { name, cart_data } = req.body;
    db.run('INSERT INTO saved_carts (name, cart_data) VALUES (?, ?)', [name, JSON.stringify(cart_data)], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.status(201).json({ id: this.lastID, name });
    });
});

app.get('/api/carts', authenticateToken, (req, res) => {
    db.all('SELECT * FROM saved_carts ORDER BY created_at DESC', [], (err, rows) => {
        if (err) return res.status(400).json({ error: err.message });
        res.json(rows.map(r => ({ ...r, cart_data: JSON.parse(r.cart_data) })));
    });
});

app.delete('/api/carts/:id', authenticateToken, (req, res) => {
    db.run('DELETE FROM saved_carts WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: 'Deleted' });
    });
});

// --- PROMOCODES API ---
app.get('/api/promocodes/:code', authenticateToken, (req, res) => {
    const code = String(req.params.code).toUpperCase();
    db.get('SELECT * FROM promocodes WHERE code = ? AND active = 1', [code], (err, row) => {
        if (err) return res.status(400).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Promo code invalid or inactive' });
        res.json(row);
    });
});

// --- CUSTOMERS API ---
app.get('/api/customers', authenticateToken, (req, res) => {
    db.all('SELECT * FROM customers ORDER BY total_spent DESC', [], (err, rows) => {
        if (err) return res.status(400).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/customers', authenticateToken, (req, res) => {
    const { name, phone, email } = req.body;
    db.run('INSERT INTO customers (name, phone, email) VALUES (?, ?, ?)', [name, phone, email], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.status(201).json({ id: this.lastID, name, phone, email, total_spent: 0, loyalty_points: 0 });
    });
});

app.delete('/api/customers/:id', authenticateToken, requireAdmin, (req, res) => {
    db.run('DELETE FROM customers WHERE id = ?', req.params.id, function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: 'Customer deleted' });
    });
});

// --- PROMOCODES API ---
app.get('/api/promocodes/validate', authenticateToken, (req, res) => {
    db.get('SELECT * FROM promocodes WHERE code = ? AND active = 1', [req.query.code], (err, row) => {
        if (err || !row) return res.status(400).json({ error: 'Invalid or expired discount code.' });
        res.json(row);
    });
});

app.post('/api/promocodes', authenticateToken, requireAdmin, (req, res) => {
    const { code, percent } = req.body;
    db.run('INSERT INTO promocodes (code, discount_percent) VALUES (?, ?)', [code, percent], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.status(201).json({ id: this.lastID, code, percent });
    });
});

// --- BRANCHES API ---
app.get('/api/branches', authenticateToken, (req, res) => {
    db.all('SELECT * FROM branches', [], (err, rows) => {
        if (err) return res.status(400).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/branches', authenticateToken, requireAdmin, (req, res) => {
    const { name, location } = req.body;
    db.run('INSERT INTO branches (name, location) VALUES (?, ?)', [name, location], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.status(201).json({ id: this.lastID, name, location });
    });
});

app.delete('/api/branches/:id', authenticateToken, requireAdmin, (req, res) => {
    db.run('DELETE FROM branches WHERE id = ?', req.params.id, function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: 'Branch deleted' });
    });
});

// --- SUPPLIERS API ---
app.get('/api/suppliers', authenticateToken, (req, res) => {
    db.all('SELECT * FROM suppliers', [], (err, rows) => {
        if (err) return res.status(400).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/suppliers', authenticateToken, requireAdmin, (req, res) => {
    const { name, contact, email } = req.body;
    db.run('INSERT INTO suppliers (name, contact, email) VALUES (?, ?, ?)', [name, contact, email], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.status(201).json({ id: this.lastID, name, contact, email });
    });
});

app.delete('/api/suppliers/:id', authenticateToken, requireAdmin, (req, res) => {
    db.run('DELETE FROM suppliers WHERE id = ?', req.params.id, function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: 'Supplier deleted' });
    });
});

// --- HR PAYROLL & SHIFTS API ---
app.post('/api/timeclocks/in', authenticateToken, (req, res) => {
    db.run('INSERT INTO time_clocks (user_id) VALUES (?)', [req.user.id], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.status(201).json({ message: 'Clocked In Successfully', id: this.lastID });
    });
});

app.post('/api/timeclocks/out', authenticateToken, (req, res) => {
    db.run('UPDATE time_clocks SET clock_out = CURRENT_TIMESTAMP WHERE user_id = ? AND clock_out IS NULL', [req.user.id], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: 'Clocked Out Successfully' });
    });
});

app.post('/api/shifts/open', authenticateToken, (req, res) => {
    const { starting_cash } = req.body;
    db.run('INSERT INTO shifts (user_id, starting_cash) VALUES (?, ?)', [req.user.id, starting_cash], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.status(201).json({ message: 'Shift Register Opened', id: this.lastID });
    });
});

app.post('/api/shifts/close', authenticateToken, (req, res) => {
    const { ending_cash } = req.body;
    db.run('UPDATE shifts SET end_time = CURRENT_TIMESTAMP, ending_cash = ?, status = ? WHERE user_id = ? AND status = ?', [ending_cash, 'closed', req.user.id, 'open'], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: 'Shift Register Closed' });
    });
});

app.get('/api/shifts', authenticateToken, requireAdmin, (req, res) => {
    db.all(`SELECT s.*, u.username FROM shifts s JOIN users u ON s.user_id = u.id ORDER BY s.start_time DESC`, [], (err, rows) => {
        if (err) return res.status(400).json({ error: err.message });
        res.json(rows);
    });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
