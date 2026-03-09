"use client";

import { useState, useEffect, useCallback } from "react";
import PriceChart from "./PriceChart";

interface ProductDetail {
    product: {
        id: number;
        name: string;
        nameEn: string | null;
    };
    current: {
        minPrice: number;
        maxPrice: number;
        midPrice: number;
        change: number;
        changePercent: number;
        palletCount: number;
        lastUpdate: string | null;
    };
    stats: {
        open: number | null;
        dayHigh: number | null;
        dayLow: number | null;
        prevClose: number | null;
        totalPallets: number;
    };
    chartData: Array<{
        time: string;
        min: number;
        max: number;
        mid: number;
        pallets: number;
    }>;
    closingPrices: Array<{
        time: string;
        min: number;
        max: number;
        mid: number;
    }>;
}

const PERIODS = ["1D", "5D", "1M", "6M", "1Y"] as const;
type Period = (typeof PERIODS)[number];

interface ProductModalProps {
    productId: number;
    onClose: () => void;
}

export default function ProductModal({ productId, onClose }: ProductModalProps) {
    const [data, setData] = useState<ProductDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<Period>("1D");

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/products/${productId}?period=${period}`);
            const json = await res.json();
            setData(json);
        } catch (error) {
            console.error("Failed to fetch product detail:", error);
        } finally {
            setLoading(false);
        }
    }, [productId, period]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Close on escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [onClose]);

    const isGain = data && data.current.change > 0;
    const isLoss = data && data.current.change < 0;
    const changeColor = isGain
        ? "var(--gain)"
        : isLoss
            ? "var(--loss)"
            : "var(--neutral)";

    const formatDate = (iso: string | null) => {
        if (!iso) return "—";
        const d = new Date(iso);
        return d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Kuwait",
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                id="product-modal"
            >
                {/* Modal Header */}
                <div
                    style={{
                        padding: "24px 28px 0",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                    }}
                >
                    <div>
                        {loading ? (
                            <>
                                <div
                                    className="loading-skeleton"
                                    style={{ width: 160, height: 20, marginBottom: 8 }}
                                />
                                <div
                                    className="loading-skeleton"
                                    style={{ width: 100, height: 14 }}
                                />
                            </>
                        ) : data ? (
                            <>
                                <h2
                                    style={{
                                        fontSize: 20,
                                        fontWeight: 700,
                                        letterSpacing: "-0.3px",
                                        marginBottom: 2,
                                    }}
                                >
                                    {data.product.nameEn || data.product.name}
                                </h2>
                                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                                    {data.product.name}
                                </p>
                            </>
                        ) : null}
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: "var(--bg-card)",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            width: 32,
                            height: 32,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            color: "var(--text-secondary)",
                            fontSize: 18,
                            transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) =>
                            (e.currentTarget.style.background = "var(--bg-card-hover)")
                        }
                        onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "var(--bg-card)")
                        }
                        aria-label="Close modal"
                    >
                        ×
                    </button>
                </div>

                {/* Price Display */}
                {data && !loading && (
                    <div style={{ padding: "16px 28px 0" }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                            <span
                                style={{
                                    fontSize: 36,
                                    fontWeight: 700,
                                    letterSpacing: "-1px",
                                }}
                            >
                                {data.current.midPrice.toFixed(3)}
                            </span>
                            <span
                                style={{
                                    fontSize: 13,
                                    color: "var(--text-muted)",
                                    fontWeight: 500,
                                }}
                            >
                                KWD
                            </span>
                        </div>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                marginTop: 4,
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 15,
                                    fontWeight: 600,
                                    color: changeColor,
                                }}
                            >
                                {isGain ? "+" : ""}
                                {data.current.change.toFixed(3)}
                            </span>
                            <span
                                style={{
                                    fontSize: 13,
                                    fontWeight: 500,
                                    color: changeColor,
                                    background: isGain
                                        ? "var(--gain-bg)"
                                        : isLoss
                                            ? "var(--loss-bg)"
                                            : "transparent",
                                    padding: "2px 8px",
                                    borderRadius: 6,
                                }}
                            >
                                {isGain ? "▲" : isLoss ? "▼" : ""}
                                {Math.abs(data.current.changePercent).toFixed(2)}%
                            </span>
                            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                                {formatDate(data.current.lastUpdate)}
                            </span>
                        </div>
                    </div>
                )}

                {/* Period Tabs */}
                <div style={{ padding: "16px 28px 0" }}>
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
                <div style={{ padding: "16px 20px" }}>
                    {loading ? (
                        <div
                            className="loading-skeleton"
                            style={{ width: "100%", height: 220, borderRadius: 12 }}
                        />
                    ) : data ? (
                        <PriceChart
                            data={data.chartData}
                            period={period}
                            changeColor={changeColor}
                        />
                    ) : null}
                </div>

                {/* Stats */}
                {data && !loading && (
                    <div style={{ padding: "0 28px 28px" }}>
                        <div className="stats-grid">
                            <div className="stat-item">
                                <div className="stat-label">Open</div>
                                <div className="stat-value">
                                    {data.stats.open?.toFixed(3) || "—"}
                                </div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-label">Day High</div>
                                <div className="stat-value">
                                    {data.stats.dayHigh !== null ? data.stats.dayHigh.toFixed(3) : "—"}
                                </div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-label">Day Low</div>
                                <div className="stat-value">
                                    {data.stats.dayLow !== null ? data.stats.dayLow.toFixed(3) : "—"}
                                </div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-label">Prev Close</div>
                                <div className="stat-value">
                                    {data.stats.prevClose?.toFixed(3) || "—"}
                                </div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-label">Pallets Today</div>
                                <div className="stat-value">{data.stats.totalPallets}</div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-label">Range</div>
                                <div className="stat-value">
                                    {data.stats.dayLow !== null && data.stats.dayHigh !== null
                                        ? `${data.stats.dayLow.toFixed(3)} – ${data.stats.dayHigh.toFixed(3)}`
                                        : "—"}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
