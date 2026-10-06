import path from "node:path";
import crypto from "node:crypto";
import bcrypt from "bcrypt";
import { env } from "./env.js";

let pgPool = null;
let sqliteDb = null;
let isPostgres = false;

// Attempt PostgreSQL if explicitly requested and connection succeeds
if (env.databaseUrl && (env.databaseUrl.startsWith("postgres://") || env.databaseUrl.startsWith("postgresql://"))) {
    try {
        const pg = await import("pg");
        pgPool = new pg.default.Pool({ connectionString: env.databaseUrl, connectionTimeoutMillis: 1500 });
        await pgPool.query("SELECT 1");
        isPostgres = true;
        console.log(" Connected to PostgreSQL database.");
    } catch (err) {
        console.warn(` PostgreSQL unavailable (${err.message}). Using seamless embedded SQLite.`);
        pgPool = null;
        isPostgres = false;
    }
}

if (!isPostgres) {
    const { DatabaseSync } = await import("node:sqlite");
    const dbPath = path.resolve(process.cwd(), "cropsentry.db");
    sqliteDb = new DatabaseSync(dbPath);
    console.log(` Connected to embedded SQLite database (${dbPath}).`);
    initSqliteSchema(sqliteDb);
}

function initSqliteSchema(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'farmer',
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS diseases (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            slug TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            pathogen TEXT,
            severity TEXT NOT NULL,
            symptoms TEXT NOT NULL,
            organic_recommendations TEXT NOT NULL DEFAULT '[]',
            chemical_recommendations TEXT NOT NULL DEFAULT '[]',
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS predictions (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            user_id TEXT NOT NULL,
            disease_id TEXT NOT NULL,
            image_path TEXT NOT NULL,
            image_mime_type TEXT NOT NULL,
            confidence REAL NOT NULL,
            severity TEXT NOT NULL,
            symptoms TEXT NOT NULL,
            organic_recommendations TEXT NOT NULL,
            chemical_recommendations TEXT NOT NULL,
            provider TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS treatment_recommendations (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            disease_id TEXT NOT NULL,
            kind TEXT NOT NULL,
            recommendation TEXT NOT NULL
        );
    `);

    // Seed diseases
    const diseaseCount = db.prepare("SELECT count(*) as cnt FROM diseases").get().cnt;
    if (diseaseCount === 0) {
        const insertDisease = db.prepare(`
            INSERT INTO diseases (id, slug, name, pathogen, severity, symptoms, organic_recommendations, chemical_recommendations)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const diseases = [
            {
                id: crypto.randomUUID(),
                slug: "blight",
                name: "Bacterial Blight",
                pathogen: "Xanthomonas citri pv. malvacearum",
                severity: "high",
                symptoms: "Water-soaked angular lesions, vein blighting, and boll rot.",
                organic: JSON.stringify(["Neem cake soil application", "Pseudomonas fluorescens foliar spray"]),
                chemical: JSON.stringify(["Copper Oxychloride 50 WP @ 2.5g/L", "Streptocycline @ 0.1g/L"])
            },
            {
                id: crypto.randomUUID(),
                slug: "fusarium",
                name: "Fusarium Wilt",
                pathogen: "Fusarium oxysporum f. sp. vasinfectum",
                severity: "medium",
                symptoms: "Lower leaf yellowing, marginal necrosis, vascular browning, and wilting.",
                organic: JSON.stringify(["Rotate with non-host crops", "Trichoderma-enriched farmyard manure"]),
                chemical: JSON.stringify(["Carbendazim 50 WP root drench @ 1g/L"])
            },
            {
                id: crypto.randomUUID(),
                slug: "alternaria",
                name: "Alternaria Leaf Spot",
                pathogen: "Alternaria macrospora",
                severity: "medium",
                symptoms: "Brown circular spots with concentric rings and a shot-hole effect.",
                organic: JSON.stringify(["Neem leaf extract spray", "Bio-control using Bacillus subtilis"]),
                chemical: JSON.stringify(["Mancozeb 75 WP @ 2g/L", "Propiconazole 25 EC @ 1ml/L"])
            },
            {
                id: crypto.randomUUID(),
                slug: "curl",
                name: "Cotton Leaf Curl Virus",
                pathogen: "Begomovirus / whitefly vector",
                severity: "high",
                symptoms: "Curled leaf margins, thickened veins, enations, and stunted growth.",
                organic: JSON.stringify(["Yellow sticky traps", "Verticillium lecanii spray"]),
                chemical: JSON.stringify(["Diafenthiuron 50 WP @ 1g/L", "Thiamethoxam 25 WG @ 0.3g/L"])
            }
        ];
        for (const d of diseases) {
            insertDisease.run(d.id, d.slug, d.name, d.pathogen, d.severity, d.symptoms, d.organic, d.chemical);
        }
    }

    // Seed demo farmer
    const farmerExists = db.prepare("SELECT id FROM users WHERE email = ?").get("farmer@example.com");
    if (!farmerExists) {
        const farmerHash = bcrypt.hashSync("farmer123", 10);
        db.prepare("INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)").run(
            crypto.randomUUID(),
            "Ramesh Patel",
            "farmer@example.com",
            farmerHash,
            "farmer"
        );
    }

    // Seed demo admin
    const adminExists = db.prepare("SELECT id FROM users WHERE email = ?").get("admin@example.com");
    if (!adminExists) {
        const adminHash = bcrypt.hashSync("agri_admin2026", 10);
        db.prepare("INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)").run(
            crypto.randomUUID(),
            "Geeta Kolte",
            "admin@example.com",
            adminHash,
            "admin"
        );
    }
}

export const pool = pgPool || { query: (text, params) => query(text, params), end: async () => {} };

export async function query(text, params = []) {
    if (isPostgres && pgPool) {
        return pgPool.query(text, params);
    }

    // SQLite adapter
    let sql = text
        .replace(/::int/gi, "")
        .replace(/::text/gi, "")
        .replace(/NOW\(\)/gi, "datetime('now')");

    // Replace $1, $2... with ?
    sql = sql.replace(/\$\d+/g, "?");

    const formattedParams = (params || []).map(p => {
        if (p !== null && typeof p === "object") {
            return JSON.stringify(p);
        }
        return p;
    });

    const isSelect = /^\s*(SELECT|PRAGMA)/i.test(sql);
    const hasReturning = /RETURNING/i.test(sql);

    const stmt = sqliteDb.prepare(sql);
    let rows = [];

    if (isSelect || hasReturning) {
        rows = stmt.all(...formattedParams);
        rows = rows.map(row => {
            const copy = { ...row };
            for (const key of Object.keys(copy)) {
                if (typeof copy[key] === "string" && (copy[key].startsWith("[") || copy[key].startsWith("{"))) {
                    try { copy[key] = JSON.parse(copy[key]); } catch {}
                }
            }
            return copy;
        });
    } else {
        stmt.run(...formattedParams);
        rows = [];
    }

    return { rows };
}
