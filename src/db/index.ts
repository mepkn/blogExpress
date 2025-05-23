import { createClient } from "@libsql/client";
import "dotenv/config";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const client = createClient({ url: process.env.DB_FILE_NAME! });
export const db = drizzle({ client, schema });
