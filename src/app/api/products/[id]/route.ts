import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { desc, eq, and, gte } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const productId = parseInt(id, 10);

        if (isNaN(productId)) {
            return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
        }

        const product = db
            .select()
            .from(schema.products)
            .where(eq(schema.products.id, productId))
            .get();

        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        // Parse period from query params
        const url = new URL(request.url);
        const period = url.searchParams.get("period") || "1D";

        const now = new Date();
        let sinceDate: Date;

        switch (period) {
            case "1D":
                sinceDate = new Date(now);
                sinceDate.setHours(0, 0, 0, 0);
                break;
            case "5D":
                sinceDate = new Date(now);
                sinceDate.setDate(sinceDate.getDate() - 5);
                break;
            case "1M":
                sinceDate = new Date(now);
                sinceDate.setMonth(sinceDate.getMonth() - 1);
                break;
            case "6M":
                sinceDate = new Date(now);
                sinceDate.setMonth(sinceDate.getMonth() - 6);
                break;
            case "1Y":
                sinceDate = new Date(now);
                sinceDate.setFullYear(sinceDate.getFullYear() - 1);
                break;
            default:
                sinceDate = new Date(now);
                sinceDate.setHours(0, 0, 0, 0);
        }

        // Get snapshots for the period
        const snapshots = db
            .select()
            .from(schema.priceSnapshots)
            .where(
                and(
                    eq(schema.priceSnapshots.productId, productId),
                    gte(schema.priceSnapshots.timestamp, sinceDate.toISOString())
                )
            )
            .orderBy(schema.priceSnapshots.timestamp)
            .all();

        // Get latest snapshot
        const latest = db
            .select()
            .from(schema.priceSnapshots)
            .where(eq(schema.priceSnapshots.productId, productId))
            .orderBy(desc(schema.priceSnapshots.timestamp))
            .limit(1)
            .get();

        // Get previous closing price
        const prevClose = db
            .select()
            .from(schema.priceSnapshots)
            .where(
                and(
                    eq(schema.priceSnapshots.productId, productId),
                    eq(schema.priceSnapshots.isClosingPrice, true)
                )
            )
            .orderBy(desc(schema.priceSnapshots.timestamp))
            .limit(1)
            .get();

        // Today's first snapshot (opening)
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const opening = db
            .select()
            .from(schema.priceSnapshots)
            .where(
                and(
                    eq(schema.priceSnapshots.productId, productId),
                    gte(schema.priceSnapshots.timestamp, todayStart.toISOString())
                )
            )
            .orderBy(schema.priceSnapshots.timestamp)
            .limit(1)
            .get();

        // Closing prices for historical chart
        const closingPrices = db
            .select()
            .from(schema.priceSnapshots)
            .where(
                and(
                    eq(schema.priceSnapshots.productId, productId),
                    eq(schema.priceSnapshots.isClosingPrice, true),
                    gte(schema.priceSnapshots.timestamp, sinceDate.toISOString())
                )
            )
            .orderBy(schema.priceSnapshots.timestamp)
            .all();

        const currentMid = latest ? (latest.minPrice + latest.maxPrice) / 2 : 0;
        const prevMid = prevClose ? (prevClose.minPrice + prevClose.maxPrice) / 2 : currentMid;
        const change = currentMid - prevMid;
        const changePercent = prevMid !== 0 ? (change / prevMid) * 100 : 0;

        // Day stats from today's snapshots
        const todaySnapshots = snapshots.filter(
            (s) => s.timestamp >= todayStart.toISOString()
        );
        const dayHigh = todaySnapshots.length > 0
            ? Math.max(...todaySnapshots.map((s) => s.maxPrice))
            : latest?.maxPrice || 0;
        const dayLow = todaySnapshots.length > 0
            ? Math.min(...todaySnapshots.map((s) => s.minPrice))
            : latest?.minPrice || 0;
        const totalPallets = todaySnapshots.reduce((sum, s) => sum + s.palletCount, 0);

        return NextResponse.json({
            product: {
                id: product.id,
                name: product.name,
                nameEn: product.nameEn,
            },
            current: {
                minPrice: latest?.minPrice || 0,
                maxPrice: latest?.maxPrice || 0,
                midPrice: Number(currentMid.toFixed(3)),
                change: Number(change.toFixed(3)),
                changePercent: Number(changePercent.toFixed(2)),
                palletCount: latest?.palletCount || 0,
                lastUpdate: latest?.timestamp || null,
            },
            stats: {
                open: opening ? Number(((opening.minPrice + opening.maxPrice) / 2).toFixed(3)) : null,
                dayHigh: Number(dayHigh.toFixed(3)),
                dayLow: Number(dayLow.toFixed(3)),
                prevClose: prevClose ? Number(prevMid.toFixed(3)) : null,
                totalPallets,
            },
            chartData: snapshots.map((s) => ({
                time: s.timestamp,
                min: s.minPrice,
                max: s.maxPrice,
                mid: Number(((s.minPrice + s.maxPrice) / 2).toFixed(3)),
                pallets: s.palletCount,
            })),
            closingPrices: closingPrices.map((s) => ({
                time: s.timestamp,
                min: s.minPrice,
                max: s.maxPrice,
                mid: Number(((s.minPrice + s.maxPrice) / 2).toFixed(3)),
            })),
        });
    } catch (error) {
        console.error("Product detail API error:", error);
        return NextResponse.json(
            { error: "Failed to fetch product details" },
            { status: 500 }
        );
    }
}
