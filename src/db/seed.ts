import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "./schema";
import dotenv from "dotenv";
import { eq } from "drizzle-orm";
import * as cheerio from "cheerio";

// We re-implement the fetch here to avoid Next.js specific imports in a node script
dotenv.config();

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const AUCTION_URL = "https://alwafirawebapp-hhg9d6buh3hnefav.uaenorth-01.azurewebsites.net/LiveAuction/GetLiveAuctionGrid?dept=";

const PRODUCT_TRANSLATIONS: Record<string, string> = {
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

async function main() {
    console.log("Fetching live data from ALFORDA...");

    const response = await fetch(AUCTION_URL, {
        headers: { "User-Agent": "FurdaAuction/1.0" },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch auction data: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const products: { product: string; minPrice: number; maxPrice: number; palletCount: number }[] = [];

    $("tbody tr").each((_, row) => {
        const cells = $(row).find("td");
        if (cells.length >= 4) {
            const palletCount = parseInt($(cells[0]).text().trim(), 10) || 0;
            const maxPrice = parseFloat($(cells[1]).text().trim()) || 0;
            const minPrice = parseFloat($(cells[2]).text().trim()) || 0;
            const product = $(cells[3]).text().trim();

            if (product) {
                products.push({ product, minPrice, maxPrice, palletCount });
            }
        }
    });

    if (products.length === 0) {
        console.log("No products found in the live table. Market might be completely empty or format changed.");
        return;
    }

    console.log(`Found ${products.length} live products. Removing old dummy data...`);
    await db.delete(schema.priceSnapshots);
    await db.delete(schema.products);

    console.log("Inserting real products and setting them as yesterday's close...");

    // Set timestamp to yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(16, 0, 0, 0); // Set to 4 PM yesterday
    const timestamp = yesterday.toISOString();

    for (const item of products) {
        const inserted = await db.insert(schema.products).values({
            name: item.product,
            nameEn: PRODUCT_TRANSLATIONS[item.product] || null,
        }).returning();

        await db.insert(schema.priceSnapshots).values({
            productId: inserted[0].id,
            timestamp,
            minPrice: item.minPrice,
            maxPrice: item.maxPrice,
            palletCount: item.palletCount,
            isClosingPrice: true, // Set as previous close!
        });
    }

    console.log("✅ Live data seeding complete!");
}

main().catch(console.error);
