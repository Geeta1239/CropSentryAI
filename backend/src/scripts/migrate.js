import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../config/db.js";
const directory = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "migrations");
try { for (const file of (await fs.readdir(directory)).filter((name) => name.endsWith(".sql")).sort()) { console.log(`Applying ${file}`); await pool.query(await fs.readFile(path.join(directory, file), "utf8")); } } finally { await pool.end(); }
