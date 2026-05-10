# AI Instruction Guidelines

## Database Persistence

1. **Supabase (PostgreSQL) Persistence**: 
   - This project uses **Supabase (PostgreSQL)** for production-grade data persistence.
   - All data is stored in the cloud instance defined by `DATABASE_URL` in the `.env` file.

2. **Startup Instructions**:
   - The Drizzle schema is synchronized with the Supabase instance on application start using `drizzle-kit push`.
   - The `predev` and `prestart` scripts in `package.json` ensure the database schema matches the `schema.ts` file and that seed data is maintained.
   - Whenever you add a new table or modify existing ones, update `schema.ts` and ensure `seed.ts` populates that new table.
