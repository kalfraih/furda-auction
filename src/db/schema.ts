import { pgTable, serial, varchar, real, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  nameEn: varchar("name_en", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const priceSnapshots = pgTable(
  "price_snapshots",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    timestamp: timestamp("timestamp", { mode: "string" }).notNull(),
    minPrice: real("min_price").notNull(),
    maxPrice: real("max_price").notNull(),
    palletCount: integer("pallet_count").notNull(),
    isClosingPrice: boolean("is_closing_price")
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
