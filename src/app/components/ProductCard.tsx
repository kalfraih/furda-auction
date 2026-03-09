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
    intraChange: number;
    intraChangePercent: number;
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

    const isIntraGain = product.intraChange > 0;
    const isIntraLoss = product.intraChange < 0;
    const intraColor = isIntraGain
        ? "var(--gain)"
        : isIntraLoss
            ? "var(--loss)"
            : "var(--neutral)";

    const getProductIcon = (nameEn: string | null, nameAr: string) => {
        const name = (nameEn || nameAr).toLowerCase();
        if (name.includes("tomato")) return "🍅";
        if (name.includes("cucumber")) return "🥒";
        if (name.includes("eggplant")) return "🍆";
        if (name.includes("pepper")) return "🫑";
        if (name.includes("carrot")) return "🥕";
        if (name.includes("cabbage")) return "🥬";
        if (name.includes("broccoli")) return "🥦";
        if (name.includes("cauliflower")) return "🥦"; // closest
        if (name.includes("corn")) return "🌽";
        if (name.includes("potato")) return "🥔";
        if (name.includes("onion")) return "🧅";
        if (name.includes("garlic")) return "🧄";
        if (name.includes("lemon")) return "🍋";
        if (name.includes("squash") || name.includes("zucchini")) return "🥒";
        if (name.includes("beans") || name.includes("peas")) return "🫛";
        if (name.includes("lettuce") || name.includes("leaf") || name.includes("mint") || name.includes("parsley") || name.includes("coriander") || name.includes("arugula")) return "🌿";
        return "🥬"; // fallback
    };

    return (
        <div
            onClick={onClick}
            id={`product-${product.id}`}
            style={{
                display: "grid",
                gridTemplateColumns: "1fr auto auto auto auto",
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
                        {getProductIcon(product.nameEn, product.name)}
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
                            {product.nameEn && (
                                <span
                                    dir="rtl"
                                    style={{
                                        fontWeight: 400,
                                        fontSize: 12,
                                        color: "var(--text-muted)",
                                        marginLeft: 6,
                                        unicodeBidi: "isolate",
                                    }}
                                >
                                    {product.name}
                                </span>
                            )}
                        </div>
                        <div
                            style={{
                                fontSize: 12,
                                color: "var(--text-muted)",
                                marginTop: 1,
                            }}
                        >
                            {product.palletCount} pallets
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

            {/* Intra Change (between scrapes) */}
            <div className="intra-change-col" style={{ textAlign: "right", minWidth: 70 }}>
                <div
                    style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: intraColor,
                    }}
                >
                    {isIntraGain ? "+" : ""}
                    {product.intraChange.toFixed(3)}
                </div>
                <div
                    style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: intraColor,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 2,
                        padding: "1px 5px",
                        borderRadius: 4,
                        background: isIntraGain
                            ? "var(--gain-bg)"
                            : isIntraLoss
                                ? "var(--loss-bg)"
                                : "transparent",
                        marginTop: 2,
                    }}
                >
                    {isIntraGain ? "▲" : isIntraLoss ? "▼" : ""}
                    {Math.abs(product.intraChangePercent).toFixed(2)}%
                </div>
                <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 1 }}>Intra</div>
            </div>

            {/* Daily Change (vs yesterday close) */}
            <div style={{ textAlign: "right", minWidth: 70 }}>
                <div
                    style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: changeColor,
                    }}
                >
                    {isGain ? "+" : ""}
                    {product.change.toFixed(3)}
                </div>
                <div
                    style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: changeColor,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 2,
                        padding: "1px 5px",
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
                <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 1 }}>Daily</div>
            </div>
        </div>
    );
}
