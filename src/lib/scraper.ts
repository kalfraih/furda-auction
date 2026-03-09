import * as cheerio from "cheerio";

const AUCTION_PAGE_URL =
    "https://alwafirawebapp-hhg9d6buh3hnefav.uaenorth-01.azurewebsites.net/liveauction/index";

export interface AuctionProduct {
    product: string;
    minPrice: number;
    maxPrice: number;
    palletCount: number;
}

export interface ScrapeResult {
    isMarketOpen: boolean;
    products: AuctionProduct[];
    scrapedAt: string;
}

// Arabic product name -> English translation map
export const PRODUCT_TRANSLATIONS: Record<string, string> = {
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
    "اوراق القرع": "Pumpkin Leaves",
    "ريحان": "Basil",
    "رشاد": "Garden Cress",
    "سيم": "Runner Beans",
    "سلك": "Swiss Chard",
    "رويد": "Ruwaid",
    "فراوله": "Strawberry",
    "فول": "Fava Beans",
    "زعتر": "Thyme",
    "بطاطا حلوة": "Sweet Potato",
    "يقطين": "Pumpkin",
    "ملوخيه": "Molokhia",
    "كنار": "Jujube",
    "نعناع": "Mint",
    "برتقال شموطي": "Shamouti Orange",
    "بقدونس": "Parsley",
};

/**
 * Check if current time is within market polling window (with 1hr buffer).
 * Ramadan (until ~March 19): 9PM-5AM -> polling 8PM-6AM
 * Normal: 10AM-4PM -> polling 9AM-5PM
 */
export function isWithinPollingWindow(): boolean {
    const now = new Date();
    // Format the current time explicitly in Asia/Kuwait timezone to parse the hour
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kuwait",
        hour: "numeric",
        hour12: false,
    });
    const hourStr = formatter.format(now);
    const hour = parseInt(hourStr, 10);

    // Determine if we're in Ramadan period
    const isRamadan = isRamadanPeriod(now);

    if (isRamadan) {
        // Ramadan: polling 8PM (20) to 6AM (6) — overnight session
        return hour >= 20 || hour < 6;
    } else {
        // Normal: polling 9AM (9) to 5PM (17)
        return hour >= 9 && hour < 17;
    }
}

function isRamadanPeriod(date: Date): boolean {
    // Ramadan 2026 ends approximately March 19
    // This should be updated yearly or made configurable
    const ramadanEnd = new Date(2026, 2, 19); // March 19, 2026
    return date < ramadanEnd;
}

/**
 * Scrape auction data from the Al-Wafira website.
 * Fetches the full page, checks market status, and parses the embedded data table.
 */
export async function scrapeAuction(): Promise<ScrapeResult> {
    const scrapedAt = new Date().toISOString();

    // Single fetch — the data table is embedded in the main page
    const response = await fetch(AUCTION_PAGE_URL, {
        headers: {
            "User-Agent": "FurdaAuction/1.0",
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch auction page: ${response.status}`);
    }

    const html = await response.text();

    // Check for "AUCTION" and "IN - PROCESS" to confirm market is open
    const isMarketOpen = html.includes("AUCTION") && html.includes("IN - PROCESS");

    const $ = cheerio.load(html);
    const products: AuctionProduct[] = [];

    // Parse table rows - RTL DOM order: Pallets, Max, Min, Product
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

    return { isMarketOpen, products, scrapedAt };
}
