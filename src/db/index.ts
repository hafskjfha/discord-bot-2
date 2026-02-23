import Database from "better-sqlite3";
import path from "path";
import fs from 'fs';

const dbDir = path.join(process.cwd(), 'db-data');
const dbPath = path.join(dbDir, 'discord-bot.db');

// 2. [핵심] 폴더가 없으면 생성하는 로직 추가
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

export default db;