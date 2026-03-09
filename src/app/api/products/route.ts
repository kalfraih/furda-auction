import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { desc, eq, and, gte } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        // Get all products with their latest snapshot and opening snapshot for today
        const products = await db.select().from(schema.products);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString();

        const result = await Promise.all(
            products.map(async (product) => {
                // Latest snapshot
                const latestArr = await db
                    .select()
                    .from(schema.priceSnapshots)
                    .where(eq(schema.priceSnapshots.productId, product.id))
                    .orderBy(desc(schema.priceSnapshots.timestamp))
                    .limit(1);
                const latest = latestArr[0];

                if (!latest) return null;

                // First snapshot of today (opening)
                const openingArr = await db
                    .select()
                    .from(schema.priceSnapshots)
                    .where(
                        and(
                            eq(schema.priceSnapshots.productId, product.id),
                            gte(schema.priceSnapshots.timestamp, todayStr)
                        )
                    )
                    .orderBy(schema.priceSnapshots.timestamp)
                    .limit(1);
                const opening = openingArr[0];

                // Previous closing price
                const prevCloseArr = await db
                    .select()
                    .from(schema.priceSnapshots)
                    .where(
                        and(
                            eq(schema.priceSnapshots.productId, product.id),
                            eq(schema.priceSnapshots.isClosingPrice, true)
                        )
                    )
                    .orderBy(desc(schema.priceSnapshots.timestamp))
                    .limit(1);
                const prevClose = prevCloseArr[0];

                // Intraday snapshots for sparkline (today only)
                const intradaySnapshots = await db
                    .select()
                    .from(schema.priceSnapshots)
                    .where(
                        and(
                            eq(schema.priceSnapshots.productId, product.id),
                            gte(schema.priceSnapshots.timestamp, todayStr)
                        )
                    )
                    .orderBy(schema.priceSnapshots.timestamp);

                const currentMidPrice = (latest.minPrice + latest.maxPrice) / 2;
                const prevMidPrice = prevClose
                    ? (prevClose.minPrice + prevClose.maxPrice) / 2
                    : opening
                        ? (opening.minPrice + opening.maxPrice) / 2
                        : currentMidPrice;

                const change = currentMidPrice - prevMidPrice;
                const changePercent = prevMidPrice !== 0 ? (change / prevMidPrice) * 100 : 0;

                return {
                    id: product.id,
                    name: product.name,
                    nameEn: product.nameEn,
                    currentMin: latest.minPrice,
                    currentMax: latest.maxPrice,
                    midPrice: Number(currentMidPrice.toFixed(3)),
                    change: Number(change.toFixed(3)),
                    changePercent: Number(changePercent.toFixed(2)),
                    palletCount: latest.palletCount,
                    lastUpdate: latest.timestamp,
                    sparkline: intradaySnapshots.map((s) => ({
                        time: s.timestamp,
                        mid: Number(((s.minPrice + s.maxPrice) / 2).toFixed(3)),
                    })),
                };
            })
        );

        const validProducts = result.filter(Boolean) as NonNullable<typeof result[0]>[];

        // Aggregate market index from all intraday sparklines
        const timeMap = new Map<string, { prices: number[]; pallets: number[] }>();

        for (const p of validProducts) {
            for (const sp of p.sparkline) {
                if (!timeMap.has(sp.time)) {
                    timeMap.set(sp.time, { prices: [], pallets: [] });
                }
                const entry = timeMap.get(sp.time)!;
                entry.prices.push(sp.mid);
            }
        }

        // For pallets, we need snapshot-level data — pull from the DB for each time
        // Instead, use the latest pallet counts per product (from the API data)
        // and pair with sparkline mid prices
        const palletByProduct = new Map<number, number>();
        for (const p of validProducts) {
            palletByProduct.set(p.id, p.palletCount);
        }

        // Build per-timestamp index using sparkline mid prices + latest pallet counts
        const indexByTime = new Map<string, { totalMid: number; count: number; totalMarketVal: number; totalPallets: number }>();

        for (const p of validProducts) {
            for (const sp of p.sparkline) {
                if (!indexByTime.has(sp.time)) {
                    indexByTime.set(sp.time, { totalMid: 0, count: 0, totalMarketVal: 0, totalPallets: 0 });
                }
                const entry = indexByTime.get(sp.time)!;
                const pallets = palletByProduct.get(p.id) || 0;
                entry.totalMid += sp.mid;
                entry.count += 1;
                entry.totalMarketVal += pallets * sp.mid;
                entry.totalPallets += pallets;
            }
        }

        const marketIndex = Array.from(indexByTime.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([time, data]) => {
                const avgPrice = data.count > 0 ? data.totalMid / data.count : 0;
                return {
                    time,
                    avgPrice: Number(avgPrice.toFixed(3)),
                    marketValue: Number(data.totalMarketVal.toFixed(2)),
                    avgSoldValue: Number((data.totalPallets * avgPrice).toFixed(2)),
                };
            });

        return NextResponse.json({
            products: validProducts,
            marketIndex,
            lastUpdate: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Products API error:", error);
        return NextResponse.json(
            { error: "Failed to fetch products" },
            { status: 500 }
        );
    }
}
