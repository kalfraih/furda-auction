"use client";

interface MarketHeaderProps {
    lastUpdate: string;
    productCount: number;
    gainers: number;
    losers: number;
}

export default function MarketHeader({
    lastUpdate,
    productCount,
    gainers,
    losers,
}: MarketHeaderProps) {
    const formatTime = (iso: string) => {
        if (!iso) return "—";
        const d = new Date(iso);
        return d.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Kuwait",
        });
    };

    return (
        <header
            style={{
                padding: "32px 0 24px",
                borderBottom: "1px solid var(--border)",
                marginBottom: 20,
            }}
        >
            {/* Logo & Title */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    marginBottom: 16,
                }}
            >
                <div
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: "linear-gradient(135deg, #6b2fa0, #9b59b6)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 20,
                        fontWeight: 700,
                        color: "white",
                        boxShadow: "0 4px 12px rgba(107, 47, 160, 0.3)",
                    }}
                >
                    خ
                </div>
                <div>
                    <h1
                        style={{
                            fontSize: 22,
                            fontWeight: 700,
                            letterSpacing: "-0.5px",
                            lineHeight: 1.2,
                        }}
                    >
                        ALFORDA Market
                    </h1>
                    <p
                        style={{
                            fontSize: 13,
                            color: "var(--text-muted)",
                            marginTop: 2,
                        }}
                    >
                        Al-Wafira Central Fruits & Vegetables Market
                    </p>
                </div>
            </div>

            {/* Stats Row */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 20,
                    flexWrap: "wrap",
                    fontSize: 13,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                    }}
                >
                    <div
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: "var(--gain)",
                            boxShadow: "0 0 8px var(--gain)",
                            animation: "pulse 2s infinite",
                        }}
                    />
                    <span style={{ color: "var(--text-secondary)" }}>
                        {productCount} Products
                    </span>
                </div>

                <span style={{ color: "var(--gain)", fontWeight: 500 }}>
                    ▲ {gainers} Gainers
                </span>
                <span style={{ color: "var(--loss)", fontWeight: 500 }}>
                    ▼ {losers} Losers
                </span>

                <span
                    style={{
                        color: "var(--text-muted)",
                        marginLeft: "auto",
                        fontSize: 12,
                    }}
                >
                    Updated {formatTime(lastUpdate)} KWT
                </span>
            </div>

            <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
        </header>
    );
}
