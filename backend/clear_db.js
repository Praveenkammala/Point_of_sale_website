const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'pos.db');
const db = new sqlite3.Database(dbPath);

console.log('Initiating database catalog purge...');

db.serialize(() => {
    try {
        db.run('BEGIN TRANSACTION');

        // Delete all catalog entries
        db.run('DELETE FROM products');
        db.run('DELETE FROM product_variants');
        db.run('DELETE FROM branch_inventory');
        
        // Reset sqlite sequences so new products start at ID 1
        db.run("UPDATE sqlite_sequence SET seq = 0 WHERE name = 'products'");
        db.run("UPDATE sqlite_sequence SET seq = 0 WHERE name = 'product_variants'");
        db.run("UPDATE sqlite_sequence SET seq = 0 WHERE name = 'branch_inventory'");

        db.run('COMMIT', () => {
            console.log('✅ Catalog successfully wiped. Database is ready for mega brand seeding.');
        });
    } catch (e) {
        db.run('ROLLBACK');
        console.error('Failed to wipe database:', e);
    }
});
