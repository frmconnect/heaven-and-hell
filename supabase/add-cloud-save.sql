-- Paste into Supabase: SQL Editor -> New query -> Run.
-- Adds cloud save with a recovery code (Decisions log #42).
-- The code itself is never stored: only a fingerprint (SHA-256) of it.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.cloud_saves (
  code_hash text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
-- locked: nobody can read or change the table directly, only through the functions below
alter table public.cloud_saves enable row level security;
revoke all on public.cloud_saves from anon, authenticated;

create or replace function public.cloud_code_hash(p_code text)
returns text language sql immutable set search_path = public, extensions as $$
  select encode(extensions.digest(p_code, 'sha256'), 'hex')
$$;
revoke execute on function public.cloud_code_hash(text) from public, anon, authenticated;

create or replace function public.backup_save(p_code text, p_data jsonb)
returns json language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_code is null or p_code !~ '^[A-HJKMNP-Z2-9]{12}$' then return json_build_object('ok', false, 'error', 'code'); end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' or octet_length(p_data::text) > 32768 then
    return json_build_object('ok', false, 'error', 'data');
  end if;
  insert into cloud_saves (code_hash, data, updated_at) values (cloud_code_hash(p_code), p_data, now())
  on conflict (code_hash) do update set data = excluded.data, updated_at = now();
  return json_build_object('ok', true);
end $$;

create or replace function public.restore_save(p_code text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare d jsonb;
begin
  if p_code is null or p_code !~ '^[A-HJKMNP-Z2-9]{12}$' then return json_build_object('ok', false, 'error', 'code'); end if;
  select data into d from cloud_saves where code_hash = cloud_code_hash(p_code);
  if d is null then return json_build_object('ok', false, 'error', 'notfound'); end if;
  return json_build_object('ok', true, 'data', d);
end $$;

create or replace function public.delete_save(p_code text)
returns json language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_code is null or p_code !~ '^[A-HJKMNP-Z2-9]{12}$' then return json_build_object('ok', true); end if;
  delete from cloud_saves where code_hash = cloud_code_hash(p_code);
  return json_build_object('ok', true);
end $$;

grant execute on function public.backup_save(text, jsonb), public.restore_save(text), public.delete_save(text) to anon;
