const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Construct the absolute path to the database file
const dbPath = path.resolve(__dirname, 'database', 'notes_app.db');
const dbDir = path.dirname(dbPath);

// Ensure the database directory exists (it should, but check just in case)
const fs = require('fs');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}


const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
    return;
  }
  console.log('Connected to the SQLite database.');
});

const createNotesTable = `
CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  content TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  audio_file_path TEXT
);`;

const createUsersTable = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'user'
);`;

db.serialize(() => {
  db.run(createNotesTable, (err) => {
    if (err) {
      console.error('Error creating notes table', err.message);
    } else {
      console.log('Notes table created or already exists.');
    }
  });

  db.run(createUsersTable, (err) => {
    if (err) {
      console.error('Error creating users table', err.message);
    } else {
      console.log('Users table created or already exists.');
    }
  });
});

db.close((err) => {
  if (err) {
    console.error('Error closing database', err.message);
  } else {
    console.log('Database connection closed.');
  }
});