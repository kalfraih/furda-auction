import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = process.env.DATABASE_URL || path.join(process.cwd(), "data", "auction.db");

// Ensure data directory exists
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Create tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    name_en TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS price_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    timestamp TEXT NOT NULL,
    min_price REAL NOT NULL,
    max_price REAL NOT NULL,
    pallet_count INTEGER NOT NULL,
    is_closing_price INTEGER NOT NULL DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_snapshots_product_time ON price_snapshots(product_id, timestamp);
  CREATE INDEX IF NOT EXISTS idx_snapshots_closing ON price_snapshots(product_id, is_closing_price);
`);

// Product translations
const TRANSLATIONS: Record<string, string> = {
    "ابوركبه": "Squash (Aburkba)",
    "بدريه": "Badriya Tomato",
    "بغل": "Baghal Cucumber",
    "بربير": "Purslane",
    "بروكلي": "Broccoli",
    "ملفوف": "Cabbage",
    "فلفل بارد": "Bell Pepper",
    "جزر": "Carrot",
    "زهرة": "Cauliflower",
    "كرفس": "Celery",
    "طماطم شيري": "Cherry Tomato",
    "فلفل حار": "Hot Pepper",
    "كوسا": "Zucchini",
    "كزبرة": "Coriander",
    "ذرة": "Corn",
    "خيار": "Cucumber",
    "باذنجان": "Eggplant",
    "غلومان": "Ghlouman",
    "فاصوليا": "Green Beans",
    "بازلا": "Peas",
    "حلبه": "Fenugreek",
    "هندباء": "Endive",
    "جرجير": "Arugula",
    "طماطم": "Tomato",
    "بطاطا": "Potato",
    "بصل": "Onion",
    "ثوم": "Garlic",
    "ليمون": "Lemon",
    "نعنع": "Mint",
    "بقدنوس": "Parsley",
    "شبت": "Dill",
    "خس": "Lettuce",
    "روكا": "Rocket",
    "سبانخ": "Spinach",
    "فجل": "Radish",
    "شمندر": "Beetroot",
    "لفت": "Turnip",
    "كراث": "Leek",
};

// Seed products
const seedProducts = [
    "خيار", "طماطم شيري", "بروكلي", "كوسا", "باذنجان",
    "فلفل بارد", "فلفل حار", "جزر", "ملفوف", "زهرة",
    "فاصوليا", "بربير", "جرجير", "بازلا", "كزبرة",
    "ذرة", "ابوركبه", "بدريه", "بغل", "كرفس",
    "غلومان", "حلبه", "هندباء",
];

// Insert products
const insertProduct = sqlite.prepare(
    `INSERT OR IGNORE INTO products (name, name_en) VALUES (?, ?)`
);

for (const name of seedProducts) {
    insertProduct.run(name, TRANSLATIONS[name] || null);
}

// Get all product IDs
const productRows = sqlite.prepare(`SELECT id, name FROM products`).all() as Array<{ id: number; name: string }>;
const productMap = new Map(productRows.map((r) => [r.name, r.id]));

// Generate seed price snapshots for the past 7 days
const insertSnapshot = sqlite.prepare(`
  INSERT INTO price_snapshots (product_id, timestamp, min_price, max_price, pallet_count, is_closing_price)
  VALUES (?, ?, ?, ?, ?, ?)
`);

// Clear existing snapshots for clean seed
sqlite.exec(`DELETE FROM price_snapshots`);

const now = new Date();
const DAYS_BACK = 7;
const HOURS_PER_DAY = [10, 11, 12, 13, 14, 15, 16]; // Normal market hours

// Base prices per product (realistic KWD prices)
const basePrices: Record<string, { min: number; max: number; pallets: number }> = {
    "خيار": { min: 0.275, max: 2.9, pallets: 200 },
    "طماطم شيري": { min: 0.075, max: 2.9, pallets: 17 },
    "بروكلي": { min: 0.3, max: 0.8, pallets: 14 },
    "كوسا": { min: 0.2, max: 0.8, pallets: 79 },
    "باذنجان": { min: 0.05, max: 1.75, pallets: 166 },
    "فلفل بارد": { min: 0.3, max: 1.25, pallets: 7 },
    "فلفل حار": { min: 0.075, max: 1.4, pallets: 83 },
    "جزر": { min: 0.4, max: 0.4, pallets: 1 },
    "ملفوف": { min: 0.05, max: 0.9, pallets: 244 },
    "زهرة": { min: 0.2, max: 0.875, pallets: 55 },
    "فاصوليا": { min: 0.2, max: 2.925, pallets: 57 },
    "بربير": { min: 0.1, max: 0.75, pallets: 10 },
    "جرجير": { min: 0.25, max: 1.65, pallets: 35 },
    "بازلا": { min: 0.075, max: 0.55, pallets: 4 },
    "كزبرة": { min: 0.05, max: 0.4, pallets: 46 },
    "ذرة": { min: 1.35, max: 1.7, pallets: 3 },
    "ابوركبه": { min: 0.05, max: 0.05, pallets: 1 },
    "بدريه": { min: 0.2, max: 0.75, pallets: 9 },
    "بغل": { min: 0.05, max: 0.25, pallets: 7 },
    "كرفس": { min: 0.05, max: 0.075, pallets: 4 },
    "غلومان": { min: 0.4, max: 0.4, pallets: 1 },
    "حلبه": { min: 0.075, max: 0.2, pallets: 4 },
    "هندباء": { min: 0.075, max: 0.075, pallets: 1 },
};

function randomVariation(base: number, variance: number): number {
    return Math.max(0.01, Number((base + (Math.random() - 0.5) * 2 * variance).toFixed(3)));
}

const insertMany = sqlite.transaction(() => {
    for (let dayOffset = DAYS_BACK; dayOffset >= 0; dayOffset--) {
        const date = new Date(now);
        date.setDate(date.getDate() - dayOffset);

        // Skip if it's a Friday (Kuwait weekend)
        if (date.getDay() === 5) continue;

        for (const [productName, productId] of productMap) {
            const base = basePrices[productName];
            if (!base) continue;

            // Add daily drift
            const dayDrift = (Math.random() - 0.5) * 0.15;

            for (let i = 0; i < HOURS_PER_DAY.length; i++) {
                const hour = HOURS_PER_DAY[i];
                const timestamp = new Date(date);
                timestamp.setHours(hour, Math.floor(Math.random() * 60), 0, 0);

                // Progressive price movement through the day
                const hourFactor = i / HOURS_PER_DAY.length;
                const minPrice = randomVariation(base.min * (1 + dayDrift + hourFactor * 0.1), base.min * 0.15);
                const maxPrice = Math.max(
                    minPrice + 0.025,
                    randomVariation(base.max * (1 + dayDrift + hourFactor * 0.08), base.max * 0.12)
                );
                const palletCount = Math.max(
                    1,
                    Math.floor(base.pallets * (0.3 + hourFactor * 0.7) * (0.8 + Math.random() * 0.4))
                );

                const isClosing = i === HOURS_PER_DAY.length - 1;

                insertSnapshot.run(
                    productId,
                    timestamp.toISOString(),
                    minPrice,
                    maxPrice,
                    palletCount,
                    isClosing ? 1 : 0
                );
            }
        }
    }
});

insertMany();

const snapshotCount = (sqlite.prepare(`SELECT COUNT(*) as count FROM price_snapshots`).get() as { count: number }).count;
const productCount = (sqlite.prepare(`SELECT COUNT(*) as count FROM products`).get() as { count: number }).count;

console.log(`✅ Seeded ${productCount} products with ${snapshotCount} price snapshots over ${DAYS_BACK} days`);

sqlite.close();
