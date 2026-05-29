import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('DATABASE_URL is not set. Database operations will fail.');
}

// Check for Supabase IPv6 connection bypass
let queryClient;

if (connectionString && connectionString.includes('db.nudguruciuocipqdgyeq.supabase.co')) {
  queryClient = postgres({
    host: ['2406:da1c:61c:d601:5aea:4a05:a559:f294'],
    port: [5432],
    database: 'postgres',
    username: 'postgres',
    password: 'Sharma_@224165',
    ssl: { rejectUnauthorized: false },
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  } as any);
  console.log('Database connected via direct IPv6 configuration (Supabase bypass)');
} else {
  queryClient = postgres(connectionString || '', {
    ssl: { rejectUnauthorized: false }, // More compatible with various cloud providers
    max: 1, 
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

export const db = drizzle(queryClient, { schema });


