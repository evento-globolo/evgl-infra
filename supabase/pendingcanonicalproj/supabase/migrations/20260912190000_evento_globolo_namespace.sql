-- evento-globolo: private application namespace inside the shared oresoftware Supabase project.
begin;

create schema if not exists evento_globolo;
comment on schema evento_globolo is 'evento-globolo application namespace; Shared Auth remains authoritative for identity.';

revoke all on schema evento_globolo from public, anon, authenticated;
alter default privileges in schema evento_globolo revoke all on tables from public, anon, authenticated;
alter default privileges in schema evento_globolo revoke all on sequences from public, anon, authenticated;
alter default privileges in schema evento_globolo revoke all on functions from public, anon, authenticated;

commit;
