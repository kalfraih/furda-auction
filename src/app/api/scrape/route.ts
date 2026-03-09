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
            const todaySnapshots = await db
                .select()
                .from(schema.priceSnapshots)
                .where(eq(schema.priceSnapshots.isClosingPrice, false));

            const filtered = todaySnapshots.filter((s) => s.timestamp.startsWith(today));

            if (filtered.length > 0) {
                // Get the latest snapshot per product and mark as closing
                const latestByProduct = new Map<number, typeof todaySnapshots[0]>();
                for (const snap of filtered) {
                    const existing = latestByProduct.get(snap.productId);
                    if (!existing || snap.timestamp > existing.timestamp) {
                        latestByProduct.set(snap.productId, snap);
                    }
                }

                for (const [, snap] of latestByProduct) {
                    await db.update(schema.priceSnapshots)
                        .set({ isClosingPrice: true })
                        .where(eq(schema.priceSnapshots.id, snap.id));
                }

                // Record EOD market index snapshot
                const closingSnaps = Array.from(latestByProduct.values());
                let totalMid = 0;
                let totalMarketVal = 0;
                let totalPallets = 0;

                for (const snap of closingSnaps) {
                    const mid = (snap.minPrice + snap.maxPrice) / 2;
                    totalMid += mid;
                    totalMarketVal += snap.palletCount * mid;
                    totalPallets += snap.palletCount;
                }

                const productCount = closingSnaps.length;
                const avgPrice = productCount > 0 ? totalMid / productCount : 0;
                const avgSoldValue = totalPallets * avgPrice;

                await db.insert(schema.marketIndexSnapshots)
                    .values({
                        date: today,
                        avgPrice: Number(avgPrice.toFixed(3)),
                        marketValue: Number(totalMarketVal.toFixed(2)),
                        avgSoldValue: Number(avgSoldValue.toFixed(2)),
                        productCount,
                        totalPallets,
                    })
                    .onConflictDoUpdate({
                        target: schema.marketIndexSnapshots.date,
                        set: {
                            avgPrice: Number(avgPrice.toFixed(3)),
                            marketValue: Number(totalMarketVal.toFixed(2)),
                            avgSoldValue: Number(avgSoldValue.toFixed(2)),
                            productCount,
                            totalPallets,
                        },
                    });

                return NextResponse.json({
                    status: "closed",
                    message: `Marked ${latestByProduct.size} closing prices, recorded market index`,
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
            const existing = await db
                .select()
                .from(schema.products)
                .where(eq(schema.products.name, item.product))
                .limit(1);

            let productId: number;
            if (existing.length > 0) {
                productId = existing[0].id;
            } else {
                const inserted = await db
                    .insert(schema.products)
                    .values({
                        name: item.product,
                        nameEn: PRODUCT_TRANSLATIONS[item.product] || null,
                    })
                    .returning();
                productId = inserted[0].id;
            }

            // Insert snapshot
            await db.insert(schema.priceSnapshots)
                .values({
                    productId,
                    timestamp: result.scrapedAt,
                    minPrice: item.minPrice,
                    maxPrice: item.maxPrice,
                    palletCount: item.palletCount,
                    isClosingPrice: false,
                });

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
