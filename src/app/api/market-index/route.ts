import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { gte, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const period = url.searchParams.get("period") || "1M";

        const now = new Date();
        let sinceDate: Date;

        switch (period) {
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
                sinceDate.setMonth(sinceDate.getMonth() - 1);
        }

        const sinceDateStr = sinceDate.toISOString().split("T")[0];

        const snapshots = await db
            .select()
            .from(schema.marketIndexSnapshots)
            .where(gte(schema.marketIndexSnapshots.date, sinceDateStr))
            .orderBy(schema.marketIndexSnapshots.date);

        // Also get the latest snapshot for summary
        const latestArr = await db
            .select()
            .from(schema.marketIndexSnapshots)
            .orderBy(desc(schema.marketIndexSnapshots.date))
            .limit(1);

        const latest = latestArr[0] || null;

        return NextResponse.json({
            snapshots: snapshots.map((s) => ({
                time: s.date,
                avgPrice: s.avgPrice,
                marketValue: s.marketValue,
                avgSoldValue: s.avgSoldValue,
                productCount: s.productCount,
                totalPallets: s.totalPallets,
            })),
            latest,
        });
    } catch (error) {
        console.error("Market index API error:", error);
        return NextResponse.json(
            { error: "Failed to fetch market index" },
            { status: 500 }
        );
    }
}
