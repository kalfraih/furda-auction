import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  nameEn: text("name_en"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const priceSnapshots = sqliteTable(
  "price_snapshots",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    timestamp: text("timestamp").notNull(),
    minPrice: real("min_price").notNull(),
    maxPrice: real("max_price").notNull(),
    palletCount: integer("pallet_count").notNull(),
    isClosingPrice: integer("is_closing_price", { mode: "boolean" })
      .notNull()
      .default(false),
  },
  (table) => [
    index("idx_snapshots_product_time").on(table.productId, table.timestamp),
    index("idx_snapshots_closing").on(table.productId, table.isClosingPrice),
  ]
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type PriceSnapshot = typeof priceSnapshots.$inferSelect;
export type NewPriceSnapshot = typeof priceSnapshots.$inferInsert;
