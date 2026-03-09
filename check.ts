import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "./src/db/schema";
import dotenv from "dotenv";

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function check() {
    const snaps = await db.select().from(schema.priceSnapshots).limit(5);
    console.log("First 5 snapshots:");
    console.log(snaps);

    const count = await sql`SELECT COUNT(*) FROM price_snapshots`;
    console.log("Total snapshots:", count[0].count);
}
check();
