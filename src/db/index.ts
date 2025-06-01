import { createClient } from "@libsql/client";
import "dotenv/config";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const dbFileName = process.env.DB_FILE_NAME;
if (!dbFileName) {
  console.error("FATAL ERROR: DB_FILE_NAME is not defined in environment variables.");
  process.exit(1);
}

const client = createClient({ url: `file:${dbFileName}` });

export const db = drizzle(client, { schema, logger: process.env.NODE_ENV === 'development' });