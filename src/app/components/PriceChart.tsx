"use client";

import {
    ComposedChart,
    Area,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { getIntradayBounds } from "@/lib/chartUtils";

interface ChartDataPoint {
    time: string;
    min: number;
    max: number;
    mid: number;
    pallets?: number;
}

interface PriceChartProps {
    data: ChartDataPoint[];
    period: string;
    changeColor: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    const d = new Date(label);
    const timeStr = d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Kuwait",
    });

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
                    <span style={{ color: "var(--text-secondary)" }}>
                        {p.dataKey === "mid"
                            ? "Mid"
                            : p.dataKey === "min"
                                ? "Min"
                                : p.dataKey === "max"
                                    ? "Max"
                                    : p.dataKey === "pallets"
                                        ? "Pallets"
                                        : p.dataKey}
                    </span>
                    <span style={{ fontWeight: 600 }}>
                        {p.dataKey === "pallets"
                            ? (typeof p.value === "number" ? p.value : p.value)
                            : (typeof p.value === "number" ? p.value.toFixed(3) + " KWD" : p.value)}
                    </span>
                </div>
            ))}
        </div>
    );
};

export default function PriceChart({ data, period, changeColor }: PriceChartProps) {
    if (!data || data.length === 0) {
        return (
            <div
                style={{
                    height: 220,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-muted)",
                    fontSize: 14,
                }}
            >
                No data available for this period
            </div>
        );
    }

    const formatXAxis = (time: string | number) => {
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

    // Compute Y-axis domain with padding
    const allValues = data.flatMap((d) => [d.min, d.max, d.mid]);
    const yMin = Math.min(...allValues);
    const yMax = Math.max(...allValues);
    const yPad = (yMax - yMin) * 0.15 || 0.05;

    // Use a gradient matching change color
    const gradientColor = changeColor.includes("gain")
        ? "#00c853"
        : changeColor.includes("loss")
            ? "#ff1744"
            : "#8b4fc0";

    // Pallets Y-axis domain
    const palletValues = data.map((d) => d.pallets || 0);
    const palletMax = Math.max(...palletValues, 1);

    // Map `time` to numeric `timeMs` for correct time scaling on the X-axis for 1D
    const parsedData = data.map((d) => ({
        ...d,
        timeMs: new Date(d.time).getTime(),
    }));

    let xDomain: [number, number] | ["dataMin", "dataMax"] | undefined = undefined;
    if (period === "1D") {
        const bounds = getIntradayBounds(data);
        if (bounds) {
            xDomain = bounds;
        } else {
            xDomain = ["dataMin", "dataMax"];
        }
    }

    return (
        <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={parsedData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={gradientColor} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={gradientColor} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="rangeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b4fc0" stopOpacity={0.1} />
                        <stop offset="100%" stopColor="#8b4fc0" stopOpacity={0.02} />
                    </linearGradient>
                </defs>
                <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--chart-grid)"
                    vertical={false}
                />
                <XAxis
                    dataKey={period === "1D" ? "timeMs" : "time"}
                    type={period === "1D" ? "number" : "category"}
                    domain={xDomain}
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
                    domain={[yMin - yPad, yMax + yPad]}
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
                    domain={[0, palletMax * 1.2]}
                    tickFormatter={(v: number) => v.toFixed(0)}
                    width={40}
                />
                <Tooltip content={<CustomTooltip />} />
                {/* Min-Max range as background band */}
                <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="max"
                    stroke="none"
                    fill="url(#rangeGradient)"
                    fillOpacity={1}
                />
                <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="min"
                    stroke="none"
                    fill="var(--bg-modal)"
                    fillOpacity={1}
                />
                {/* Mid price line */}
                <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="mid"
                    stroke={gradientColor}
                    strokeWidth={2}
                    fill="url(#areaGradient)"
                    fillOpacity={1}
                    dot={false}
                    activeDot={{
                        r: 4,
                        stroke: gradientColor,
                        strokeWidth: 2,
                        fill: "var(--bg-modal)",
                    }}
                />
                {/* Pallets sold line */}
                <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="pallets"
                    stroke="#4ade80"
                    strokeWidth={1.5}
                    strokeDasharray="3 2"
                    dot={false}
                    activeDot={{ r: 3, stroke: "#4ade80", strokeWidth: 2, fill: "var(--bg-modal)" }}
                />
            </ComposedChart>
        </ResponsiveContainer>
    );
}
