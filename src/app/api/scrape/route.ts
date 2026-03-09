import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { scrapeAuction, isWithinPollingWindow, PRODUCT_TRANSLATIONS } from "@/lib/scraper";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
    // Check for cron secret in production
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if we're within polling window
    if (!isWithinPollingWindow()) {
        return NextResponse.json({
            status: "skipped",
            reason: "Outside polling window",
            timestamp: new Date().toISOString(),
        });
    }

    try {
        const result = await scrapeAuction();

        if (!result.isMarketOpen) {
            // Market is closed - check if we need to mark closing prices
            // Find today's snapshots that aren't yet marked as closing
            const today = new Date().toISOString().split("T")[0];
            const todaySnapshots = db
                .select()
                .from(schema.priceSnapshots)
                .where(eq(schema.priceSnapshots.isClosingPrice, false))
                .all()
                .filter((s) => s.timestamp.startsWith(today));

            if (todaySnapshots.length > 0) {
                // Get the latest snapshot per product and mark as closing
                const latestByProduct = new Map<number, typeof todaySnapshots[0]>();
                for (const snap of todaySnapshots) {
                    const existing = latestByProduct.get(snap.productId);
                    if (!existing || snap.timestamp > existing.timestamp) {
                        latestByProduct.set(snap.productId, snap);
                    }
                }

                for (const [, snap] of latestByProduct) {
                    db.update(schema.priceSnapshots)
                        .set({ isClosingPrice: true })
                        .where(eq(schema.priceSnapshots.id, snap.id))
                        .run();
                }

                return NextResponse.json({
                    status: "closed",
                    message: `Marked ${latestByProduct.size} closing prices`,
                    timestamp: result.scrapedAt,
                });
            }

            return NextResponse.json({
                status: "closed",
                message: "Market closed, no new data",
                timestamp: result.scrapedAt,
            });
        }

        // Market is open - insert data
        let insertedCount = 0;
        for (const item of result.products) {
            // Upsert product
            const existing = db
                .select()
                .from(schema.products)
                .where(eq(schema.products.name, item.product))
                .get();

            let productId: number;
            if (existing) {
                productId = existing.id;
            } else {
                const inserted = db
                    .insert(schema.products)
                    .values({
                        name: item.product,
                        nameEn: PRODUCT_TRANSLATIONS[item.product] || null,
                    })
                    .returning()
                    .get();
                productId = inserted.id;
            }

            // Insert snapshot
            db.insert(schema.priceSnapshots)
                .values({
                    productId,
                    timestamp: result.scrapedAt,
                    minPrice: item.minPrice,
                    maxPrice: item.maxPrice,
                    palletCount: item.palletCount,
                    isClosingPrice: false,
                })
                .run();

            insertedCount++;
        }

        return NextResponse.json({
            status: "success",
            productsScraped: insertedCount,
            timestamp: result.scrapedAt,
        });
    } catch (error) {
        console.error("Scrape error:", error);
        return NextResponse.json(
            { error: "Scrape failed", details: String(error) },
            { status: 500 }
        );
    }
}
