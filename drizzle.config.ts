require('dotenv').config();
import { defineConfig } from 'drizzle-kit';

const dbFileName = process.env.DB_FILE_NAME;

if (!dbFileName) {
  console.error('DB_FILE_NAME is not set in environment variables. Checked .env and process.env.');
  throw new Error('DB_FILE_NAME environment variable is not set. Ensure .env file is in the project root and DB_FILE_NAME is defined.');
}

export default defineConfig({
  out: './src/db/migrations',
  schema: './src/db/schema.ts',
  dialect: 'sqlite',
  dbCredentials: {
    url: `file:${dbFileName}`,
  },
  verbose: true,
  strict: true,
});
