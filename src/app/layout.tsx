import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ALFORDA Market | Live Auction Prices",
  description:
    "Live auction prices from Al-Wafira (ALFORDA) Central Fruits & Vegetables Market, Kuwait. Track real-time pricing for fresh produce.",
  keywords: ["ALFORDA", "Kuwait", "auction", "vegetables", "fruits", "market", "prices"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
      </body>
    </html>
  );
}
