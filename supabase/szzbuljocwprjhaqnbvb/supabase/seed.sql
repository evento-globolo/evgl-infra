-- Preview/local seed for evento-globolo (auth). Runs only on local stacks and Supabase preview branches.
-- Keep it idempotent, synthetic, and inside the evento_globolo schema. Never add real user data or credentials.
create schema if not exists evento_globolo;
