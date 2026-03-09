import * as cheerio from "cheerio";

const AUCTION_URL =
    "https://alwafirawebapp-hhg9d6buh3hnefav.uaenorth-01.azurewebsites.net/LiveAuction/GetLiveAuctionGrid?dept=";

const FULL_PAGE_URL =
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
};

/**
 * Check if current time is within market polling window (with 1hr buffer).
 * Ramadan (until ~March 19): 9PM-5AM -> polling 8PM-6AM
 * Normal: 10AM-4PM -> polling 9AM-5PM
 */
export function isWithinPollingWindow(): boolean {
    const now = new Date();
    const kuwaitTime = new Date(
        now.toLocaleString("en-US", { timeZone: "Asia/Kuwait" })
    );
    const hour = kuwaitTime.getHours();

    // Determine if we're in Ramadan period
    const isRamadan = isRamadanPeriod(kuwaitTime);

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
 * First checks the full page for market status banner,
 * then fetches data from the API endpoint.
 */
export async function scrapeAuction(): Promise<ScrapeResult> {
    const scrapedAt = new Date().toISOString();

    // Fetch the full page to check for market status banner
    const pageResponse = await fetch(FULL_PAGE_URL, {
        headers: {
            "User-Agent": "FurdaAuction/1.0",
        },
    });

    if (!pageResponse.ok) {
        throw new Error(`Failed to fetch auction page: ${pageResponse.status}`);
    }

    const pageHtml = await pageResponse.text();

    // Check for "AUCTION WILL START SOON" banner = market closed
    const isMarketOpen = !pageHtml.includes("AUCTION WILL START SOON");

    // Fetch the data endpoint for the table
    const response = await fetch(AUCTION_URL, {
        headers: {
            "User-Agent": "FurdaAuction/1.0",
        },
    });

    const products: AuctionProduct[] = [];

    if (!response.ok) {
        if (response.status === 404) {
            // Market table is likely offline, return closed market state
            return { isMarketOpen: false, products, scrapedAt };
        }
        throw new Error(`Failed to fetch auction data: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

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
