"use client";

import Sparkline from "./Sparkline";

interface SparklinePoint {
    time: string;
    mid: number;
}

interface ProductData {
    id: number;
    name: string;
    nameEn: string | null;
    currentMin: number;
    currentMax: number;
    midPrice: number;
    change: number;
    changePercent: number;
    palletCount: number;
    lastUpdate: string;
    sparkline: SparklinePoint[];
}

interface ProductCardProps {
    product: ProductData;
    onClick: () => void;
    isFirst: boolean;
    isLast: boolean;
}

export default function ProductCard({
    product,
    onClick,
    isFirst,
    isLast,
}: ProductCardProps) {
    const isGain = product.change > 0;
    const isLoss = product.change < 0;
    const changeColor = isGain
        ? "var(--gain)"
        : isLoss
            ? "var(--loss)"
            : "var(--neutral)";

    return (
        <div
            onClick={onClick}
            id={`product-${product.id}`}
            style={{
                display: "grid",
                gridTemplateColumns: "1fr auto auto auto",
                alignItems: "center",
                gap: 16,
                padding: "14px 20px",
                background: "var(--bg-card)",
                borderBottom: isLast ? "none" : "1px solid var(--border)",
                cursor: "pointer",
                transition: "background 0.15s",
                borderRadius: isFirst
                    ? "12px 12px 0 0"
                    : isLast
                        ? "0 0 12px 12px"
                        : 0,
            }}
            onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--bg-card-hover)")
            }
            onMouseLeave={(e) =>
                (e.currentTarget.style.background = "var(--bg-card)")
            }
        >
            {/* Product Info */}
            <div style={{ minWidth: 0 }}>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                    }}
                >
                    <div
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            background: isGain
                                ? "var(--gain-bg)"
                                : isLoss
                                    ? "var(--loss-bg)"
                                    : "rgba(148, 148, 168, 0.08)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 16,
                            flexShrink: 0,
                        }}
                    >
                        🥬
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <div
                            style={{
                                fontSize: 14,
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}
                        >
                            {product.nameEn || product.name}
                        </div>
                        <div
                            style={{
                                fontSize: 12,
                                color: "var(--text-muted)",
                                marginTop: 1,
                            }}
                        >
                            {product.name} · {product.palletCount} pallets
                        </div>
                    </div>
                </div>
            </div>

            {/* Sparkline */}
            <div className="sparkline-container">
                <Sparkline
                    data={product.sparkline}
                    color={changeColor}
                    width={80}
                    height={32}
                />
            </div>

            {/* Price */}
            <div style={{ textAlign: "right", minWidth: 70 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>
                    {product.midPrice.toFixed(3)}
                </div>
                <div
                    style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        marginTop: 1,
                    }}
                >
                    KWD
                </div>
            </div>

            {/* Change */}
            <div style={{ textAlign: "right", minWidth: 80 }}>
                <div
                    style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: changeColor,
                    }}
                >
                    {isGain ? "+" : ""}
                    {product.change.toFixed(3)}
                </div>
                <div
                    style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: changeColor,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 2,
                        padding: "1px 6px",
                        borderRadius: 4,
                        background: isGain
                            ? "var(--gain-bg)"
                            : isLoss
                                ? "var(--loss-bg)"
                                : "transparent",
                        marginTop: 2,
                    }}
                >
                    {isGain ? "▲" : isLoss ? "▼" : ""}
                    {Math.abs(product.changePercent).toFixed(2)}%
                </div>
            </div>
        </div>
    );
}
