import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { config } from 'dotenv';

if (!process.env.DATABASE_URL) {
  config({ path: '.env.local' });
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('Missing DATABASE_URL. Set it in your environment or .env.local.');
}

const sql = neon(databaseUrl);
export const db = drizzle({ client: sql });
