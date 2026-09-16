import Database from "better-sqlite3";
import path from "node:path";

const dbPath = path.join(process.cwd(), "data", "oilchange.db");

export const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS oil_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    current_odometer INTEGER NOT NULL,
    previous_odometer INTEGER NOT NULL,
    previous_date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);