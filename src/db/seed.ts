import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "./schema";
import dotenv from "dotenv";

async function main() {
    console.log("Starting static seed script...");
    dotenv.config();

    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is not set");
    }

    const sql = neon(process.env.DATABASE_URL);
    const db = drizzle(sql, { schema });

    const PRODUCT_TRANSLATIONS: Record<string, string> = {
        "ابوركبه": "Kohlrabi",
        "بدريه": "Broad Bean",
        "بغل": "Chard",
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
        "غلومان": "Taro Root",
        "فاصوليا": "Green Beans",
        "بازلا": "Peas",
        "حلبه": "Fenugreek",
        "هندباء": "Chicory",
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

    const seedProducts = [
        "خيار", "طماطم شيري", "بروكلي", "كوسا", "باذنجان",
        "فلفل بارد", "فلفل حار", "جزر", "ملفوف", "زهرة",
        "فاصوليا", "بربير", "جرجير", "بازلا", "كزبرة",
        "ذرة", "ابوركبه", "بدريه", "بغل", "كرفس",
        "غلومان", "حلبه", "هندباء",
    ];

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

    console.log("Removing old dummy data from Neon database...");
    await db.delete(schema.priceSnapshots);
    await db.delete(schema.products);

    console.log("Inserting static realistic baseline prices for tomorrow's open...");

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(16, 0, 0, 0);
    const timestamp = yesterday.toISOString();

    for (const name of seedProducts) {
        const base = basePrices[name];
        if (!base) continue;

        const inserted = await db.insert(schema.products).values({
            name,
            nameEn: PRODUCT_TRANSLATIONS[name] || null,
        }).returning();

        await db.insert(schema.priceSnapshots).values({
            productId: inserted[0].id,
            timestamp,
            minPrice: base.min,
            maxPrice: base.max,
            palletCount: base.pallets,
            isClosingPrice: true,
        });
    }

    console.log("✅ Static data seeding complete!");
}

main().catch((err) => {
    console.error("FATAL ERROR IN SEED SCRIPT:", err);
    process.exit(1);
});
