import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('DATABASE_URL is not set. Database operations will fail.');
}

// For serverless environments like Vercel, we want to limit the number of connections
// and ensure SSL is enabled if using Supabase/Neon.
const queryClient = postgres(connectionString || '', {
  ssl: { rejectUnauthorized: false }, // More compatible with various cloud providers
  max: 1, 
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(queryClient, { schema });

