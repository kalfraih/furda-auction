import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { desc, eq, sql, and, gte } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        // Get all products with their latest snapshot and opening snapshot for today
        const products = db.select().from(schema.products).all();

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString();

        const result = products.map((product) => {
            // Latest snapshot
            const latest = db
                .select()
                .from(schema.priceSnapshots)
                .where(eq(schema.priceSnapshots.productId, product.id))
                .orderBy(desc(schema.priceSnapshots.timestamp))
                .limit(1)
                .get();

            // First snapshot of today (opening)
            const opening = db
                .select()
                .from(schema.priceSnapshots)
                .where(
                    and(
                        eq(schema.priceSnapshots.productId, product.id),
                        gte(schema.priceSnapshots.timestamp, todayStr)
                    )
                )
                .orderBy(schema.priceSnapshots.timestamp)
                .limit(1)
                .get();

            // Previous closing price
            const prevClose = db
                .select()
                .from(schema.priceSnapshots)
                .where(
                    and(
                        eq(schema.priceSnapshots.productId, product.id),
                        eq(schema.priceSnapshots.isClosingPrice, true)
                    )
                )
                .orderBy(desc(schema.priceSnapshots.timestamp))
                .limit(1)
                .get();

            // Intraday snapshots for sparkline (today only)
            const intradaySnapshots = db
                .select()
                .from(schema.priceSnapshots)
                .where(
                    and(
                        eq(schema.priceSnapshots.productId, product.id),
                        gte(schema.priceSnapshots.timestamp, todayStr)
                    )
                )
                .orderBy(schema.priceSnapshots.timestamp)
                .all();

            if (!latest) return null;

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
        });

        return NextResponse.json({
            products: result.filter(Boolean),
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
