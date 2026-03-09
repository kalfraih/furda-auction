import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "./schema";
import dotenv from "dotenv";
import { eq } from "drizzle-orm";

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

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

async function main() {
    console.log("Emptying existing price snapshots...");
    await db.delete(schema.priceSnapshots);

    console.log("Upserting products...");
    for (const name of seedProducts) {
        const existing = await db.select().from(schema.products).where(eq(schema.products.name, name)).limit(1);
        if (existing.length === 0) {
            await db.insert(schema.products).values({
                name,
                nameEn: TRANSLATIONS[name] || null,
            });
        }
    }

    const allProducts = await db.select().from(schema.products);
    const productMap = new Map(allProducts.map((p) => [p.name, p.id]));

    const now = new Date();
    const DAYS_BACK = 7;
    const HOURS_PER_DAY = [10, 11, 12, 13, 14, 15, 16]; // Normal market hours

    console.log("Generating price snapshots...");
    const snapshotsToInsert: (typeof schema.priceSnapshots.$inferInsert)[] = [];

    for (let dayOffset = DAYS_BACK; dayOffset >= 0; dayOffset--) {
        const date = new Date(now);
        date.setDate(date.getDate() - dayOffset);

        // Skip if it's a Friday (Kuwait weekend)
        if (date.getDay() === 5) continue;

        for (const [productName, productId] of Array.from(productMap.entries())) {
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

                snapshotsToInsert.push({
                    productId,
                    timestamp: timestamp.toISOString(),
                    minPrice,
                    maxPrice,
                    palletCount,
                    isClosingPrice: isClosing,
                });
            }
        }
    }

    console.log(`Inserting ${snapshotsToInsert.length} snapshots in batches...`);
    // Insert in batches of 500
    const BATCH_SIZE = 500;
    for (let i = 0; i < snapshotsToInsert.length; i += BATCH_SIZE) {
        const batch = snapshotsToInsert.slice(i, i + BATCH_SIZE);
        await db.insert(schema.priceSnapshots).values(batch);
    }

    console.log("✅ Database seeding complete.");
}

main().catch(console.error);
