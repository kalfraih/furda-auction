"use client";

import { useState, useEffect, useCallback } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";

interface MarketIndexPoint {
    time: string;
    avgPrice: number;
    marketValue: number;
    avgSoldValue: number;
    totalPallets?: number;
}

interface MarketIndexChartProps {
    data: MarketIndexPoint[];
}

const METRICS = [
    { key: "avgPrice", label: "Avg Price", color: "#8b4fc0", yAxisId: "left" },
    { key: "marketValue", label: "Market Value", color: "#f59e0b", yAxisId: "right" },
    { key: "avgSoldValue", label: "Avg Sold Value", color: "#06b6d4", yAxisId: "right" },
    { key: "totalPallets", label: "Pallets Sold", color: "#4ade80", yAxisId: "right" },
] as const;

const PERIODS = ["1D", "5D", "1M", "6M", "1Y"] as const;
type Period = (typeof PERIODS)[number];

/* eslint-disable @typescript-eslint/no-explicit-any */
const CustomTooltip = ({ active, payload, label, period }: any) => {
    if (!active || !payload?.length) return null;

    const d = new Date(label);
    const isIntraday = period === "1D";
    const timeStr = isIntraday
        ? d.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Kuwait",
        })
        : d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            timeZone: "Asia/Kuwait",
        });

    const labelMap: Record<string, string> = {
        avgPrice: "Avg Price",
        marketValue: "Market Value",
        avgSoldValue: "Avg Sold Value",
        totalPallets: "Pallets Sold",
    };

    return (
        <div
            style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "10px 14px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                fontSize: 12,
            }}
        >
            <div style={{ color: "var(--text-muted)", marginBottom: 6 }}>
                {timeStr}
            </div>
            {payload.map((p: any, i: number) => (
                <div
                    key={i}
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 16,
                        color: "var(--text-primary)",
                        marginBottom: 2,
                    }}
                >
                    <span style={{ color: p.color, fontWeight: 500 }}>
                        {labelMap[p.dataKey] || p.dataKey}
                    </span>
                    <span style={{ fontWeight: 600 }}>
                        {p.dataKey === "totalPallets"
                            ? `${typeof p.value === "number" ? p.value : p.value}`
                            : `${typeof p.value === "number" ? p.value.toFixed(3) : p.value} KWD`}
                    </span>
                </div>
            ))}
        </div>
    );
};

const CustomLegend = ({
    visibleLines,
    onToggle,
}: {
    visibleLines: Record<string, boolean>;
    onToggle: (key: string) => void;
}) => (
    <div
        style={{
            display: "flex",
            gap: 16,
            justifyContent: "center",
            paddingTop: 8,
            fontSize: 12,
        }}
    >
        {METRICS.map((m) => (
            <button
                key={m.key}
                onClick={() => onToggle(m.key)}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: visibleLines[m.key]
                        ? "var(--text-primary)"
                        : "var(--text-muted)",
                    fontFamily: "Inter, sans-serif",
                    fontSize: 12,
                    opacity: visibleLines[m.key] ? 1 : 0.5,
                    transition: "all 0.15s",
                }}
            >
                <span
                    style={{
                        width: 10,
                        height: 3,
                        borderRadius: 2,
                        background: visibleLines[m.key]
                            ? m.color
                            : "var(--text-muted)",
                    }}
                />
                {m.label}
            </button>
        ))}
    </div>
);

export default function MarketIndexChart({ data: intradayData }: MarketIndexChartProps) {
    const [period, setPeriod] = useState<Period>("1D");
    const [historicalData, setHistoricalData] = useState<MarketIndexPoint[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>({
        avgPrice: true,
        marketValue: true,
        avgSoldValue: true,
        totalPallets: true,
    });

    const fetchHistory = useCallback(async (p: Period) => {
        if (p === "1D") return;
        setLoadingHistory(true);
        try {
            const res = await fetch(`/api/market-index?period=${p}`);
            const json = await res.json();
            setHistoricalData(json.snapshots || []);
        } catch (err) {
            console.error("Failed to fetch market index history:", err);
            setHistoricalData([]);
        } finally {
            setLoadingHistory(false);
        }
    }, []);

    useEffect(() => {
        if (period !== "1D") {
            fetchHistory(period);
        }
    }, [period, fetchHistory]);

    const toggleLine = (key: string) => {
        setVisibleLines((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const data = period === "1D" ? intradayData : historicalData;
    const isLoading = period !== "1D" && loadingHistory;

    if (!isLoading && (!data || data.length === 0)) {
        return (
            <div
                style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    padding: "20px 24px",
                    marginBottom: 20,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 12,
                        flexWrap: "wrap",
                        gap: 8,
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 16 }}>📊</span>
                        <span
                            style={{
                                fontWeight: 600,
                                fontSize: 14,
                                color: "var(--text-primary)",
                            }}
                        >
                            Market Index
                        </span>
                    </div>
                    <div className="period-tabs">
                        {PERIODS.map((p) => (
                            <button
                                key={p}
                                className={`period-tab ${period === p ? "active" : ""}`}
                                onClick={() => setPeriod(p)}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>
                <div
                    style={{
                        height: 180,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--text-muted)",
                        fontSize: 14,
                    }}
                >
                    {period === "1D"
                        ? "No intraday data available yet"
                        : "No historical data available for this period"}
                </div>
            </div>
        );
    }

    const formatXAxis = (time: string) => {
        const d = new Date(time);
        if (period === "1D") {
            return d.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Asia/Kuwait",
            });
        }
        if (period === "5D") {
            return d.toLocaleDateString("en-US", {
                weekday: "short",
                timeZone: "Asia/Kuwait",
            });
        }
        return d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            timeZone: "Asia/Kuwait",
        });
    };

    // Compute left Y-axis (avgPrice) domain
    const avgPrices = (data || []).map((d) => d.avgPrice);
    const avgMin = Math.min(...avgPrices);
    const avgMax = Math.max(...avgPrices);
    const avgPad = (avgMax - avgMin) * 0.15 || 0.05;

    // Compute right Y-axis (marketValue, avgSoldValue, totalPallets) domain
    const rightValues = (data || []).flatMap((d) => [d.marketValue, d.avgSoldValue, d.totalPallets || 0]);
    const rightMin = Math.min(...rightValues);
    const rightMax = Math.max(...rightValues);
    const rightPad = (rightMax - rightMin) * 0.15 || 1;

    // Summary stats from latest data point
    const latest = data && data.length > 0 ? data[data.length - 1] : null;

    return (
        <div
            style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: "20px 24px 12px",
                marginBottom: 20,
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 16,
                    flexWrap: "wrap",
                    gap: 8,
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>📊</span>
                    <span
                        style={{
                            fontWeight: 600,
                            fontSize: 14,
                            color: "var(--text-primary)",
                        }}
                    >
                        Market Index
                    </span>
                    {/* Summary chips */}
                    {latest && (
                        <div style={{ display: "flex", gap: 12, fontSize: 12, marginLeft: 8 }}>
                            <span style={{ color: "#8b4fc0" }}>
                                Avg: {latest.avgPrice.toFixed(3)}
                            </span>
                            <span style={{ color: "#f59e0b" }}>
                                MktVal: {latest.marketValue.toFixed(0)}
                            </span>
                            <span style={{ color: "#06b6d4" }}>
                                AvgSold: {latest.avgSoldValue.toFixed(0)}
                            </span>
                            <span style={{ color: "#4ade80" }}>
                                Pallets: {latest.totalPallets || 0}
                            </span>
                        </div>
                    )}
                </div>
                <div className="period-tabs">
                    {PERIODS.map((p) => (
                        <button
                            key={p}
                            className={`period-tab ${period === p ? "active" : ""}`}
                            onClick={() => setPeriod(p)}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart */}
            {isLoading ? (
                <div
                    className="loading-skeleton"
                    style={{ height: 200, borderRadius: 10 }}
                />
            ) : (
                <ResponsiveContainer width="100%" height={200}>
                    <LineChart
                        data={data}
                        margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                    >
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="var(--chart-grid)"
                            vertical={false}
                        />
                        <XAxis
                            dataKey="time"
                            tickFormatter={formatXAxis}
                            stroke="var(--text-muted)"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            minTickGap={40}
                        />
                        <YAxis
                            yAxisId="left"
                            stroke="var(--text-muted)"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            domain={[avgMin - avgPad, avgMax + avgPad]}
                            tickFormatter={(v: number) => v.toFixed(2)}
                            width={50}
                        />
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            stroke="var(--text-muted)"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            domain={[rightMin - rightPad, rightMax + rightPad]}
                            tickFormatter={(v: number) =>
                                v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)
                            }
                            width={50}
                        />
                        <Tooltip content={<CustomTooltip period={period} />} />
                        <Legend content={() => null} />

                        {visibleLines.avgPrice && (
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="avgPrice"
                                stroke="#8b4fc0"
                                strokeWidth={2}
                                dot={period !== "1D"}
                                activeDot={{ r: 3, stroke: "#8b4fc0", strokeWidth: 2, fill: "var(--bg-modal)" }}
                            />
                        )}
                        {visibleLines.marketValue && (
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="marketValue"
                                stroke="#f59e0b"
                                strokeWidth={1.5}
                                dot={period !== "1D"}
                                strokeDasharray="4 2"
                                activeDot={{ r: 3, stroke: "#f59e0b", strokeWidth: 2, fill: "var(--bg-modal)" }}
                            />
                        )}
                        {visibleLines.avgSoldValue && (
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="avgSoldValue"
                                stroke="#06b6d4"
                                strokeWidth={1.5}
                                dot={period !== "1D"}
                                strokeDasharray="6 3"
                                activeDot={{ r: 3, stroke: "#06b6d4", strokeWidth: 2, fill: "var(--bg-modal)" }}
                            />
                        )}
                        {visibleLines.totalPallets && (
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="totalPallets"
                                stroke="#4ade80"
                                strokeWidth={1.5}
                                dot={period !== "1D"}
                                strokeDasharray="2 2"
                                activeDot={{ r: 3, stroke: "#4ade80", strokeWidth: 2, fill: "var(--bg-modal)" }}
                            />
                        )}
                    </LineChart>
                </ResponsiveContainer>
            )}

            {/* Legend toggles */}
            <CustomLegend visibleLines={visibleLines} onToggle={toggleLine} />
        </div>
    );
}
