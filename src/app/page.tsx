"use client";

import { useState, useEffect, useCallback } from "react";
import MarketHeader from "@/app/components/MarketHeader";
import ProductCard from "@/app/components/ProductCard";
import ProductModal from "@/app/components/ProductModal";

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

type SortField = "name" | "price" | "change" | "pallets";
type SortDir = "asc" | "desc";

export default function Dashboard() {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("pallets");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      setProducts(data.products || []);
      setLastUpdate(data.lastUpdate || "");
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    // Refresh every 5 minutes
    const interval = setInterval(fetchProducts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchProducts]);

  const filtered = products
    .filter((p) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.name.includes(searchQuery) ||
        (p.nameEn && p.nameEn.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortField) {
        case "name":
          return dir * (a.nameEn || a.name).localeCompare(b.nameEn || b.name);
        case "price":
          return dir * (a.midPrice - b.midPrice);
        case "change":
          return dir * (a.changePercent - b.changePercent);
        case "pallets":
          return dir * (a.palletCount - b.palletCount);
        default:
          return 0;
      }
    });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const gainers = products.filter((p) => p.changePercent > 0).length;
  const losers = products.filter((p) => p.changePercent < 0).length;

  return (
    <main
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "0 20px 60px",
        minHeight: "100vh",
      }}
    >
      <MarketHeader
        lastUpdate={lastUpdate}
        productCount={products.length}
        gainers={gainers}
        losers={losers}
      />

      {/* Search + Sort Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 8,
          flexWrap: "wrap",
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-muted)"
            strokeWidth="2"
            style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            className="search-input"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            id="search-products"
          />
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {(["pallets", "change", "price", "name"] as SortField[]).map(
            (field) => (
              <button
                key={field}
                onClick={() => handleSort(field)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background:
                    sortField === field ? "var(--brand)" : "var(--bg-card)",
                  color:
                    sortField === field ? "white" : "var(--text-secondary)",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "Inter, sans-serif",
                  transition: "all 0.15s",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {field === "pallets"
                  ? "Pallets"
                  : field === "change"
                    ? "Change"
                    : field === "price"
                      ? "Price"
                      : "Name"}
                {sortField === field && (
                  <span style={{ fontSize: 10 }}>
                    {sortDir === "desc" ? "↓" : "↑"}
                  </span>
                )}
              </button>
            )
          )}
        </div>
      </div>

      {/* Product List */}
      <div>
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="loading-skeleton"
              style={{
                height: 72,
                marginBottom: 2,
                borderRadius: i === 0 ? "12px 12px 0 0" : i === 7 ? "0 0 12px 12px" : 0,
              }}
            />
          ))
        ) : filtered.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: 60,
              color: "var(--text-muted)",
            }}
          >
            <p style={{ fontSize: 18, marginBottom: 8 }}>No products found</p>
            <p style={{ fontSize: 13 }}>Try a different search term</p>
          </div>
        ) : (
          filtered.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              onClick={() => setSelectedProductId(product.id)}
              isFirst={index === 0}
              isLast={index === filtered.length - 1}
            />
          ))
        )}
      </div>

      {/* Product Modal */}
      {selectedProductId !== null && (
        <ProductModal
          productId={selectedProductId}
          onClose={() => setSelectedProductId(null)}
        />
      )}
    </main>
  );
}
