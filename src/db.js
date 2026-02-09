const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', 'data', 'app.db');
const schemaPath = path.join(__dirname, '..', 'data', 'schema.sql');

// Ensure data directory exists
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new sqlite3.Database(dbPath);

function runMigrations() {
  const sql = fs.readFileSync(schemaPath, 'utf8');
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) {
        console.error('Failed to run migrations:', err);
        return reject(err);
      }
      console.log('Database ready at', dbPath);
      resolve();
    });
  });
}

module.exports = {
  db,
  runMigrations,
};
