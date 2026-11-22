-- Heaven & Hell — online leaderboard setup (Decisions log #29-32)
-- Paste ALL of this into Supabase: SQL Editor -> New query -> Run. Safe to run more than once.

create table if not exists public.scores (
  id bigint generated always as identity primary key,
  player_id uuid not null,
  name text not null,
  score integer not null check (score >= 0),
  distance integer not null check (distance >= 0),
  coins integer not null check (coins >= 0),
  duration real not null check (duration >= 0),
  created_at timestamptz not null default now()
);
create index if not exists scores_created_idx on public.scores (created_at desc);
create index if not exists scores_player_idx on public.scores (player_id, created_at desc);

-- Nobody can read or write the table directly; only through the functions below.
alter table public.scores enable row level security;
revoke all on public.scores from anon, authenticated;

-- Start of a leaderboard period, in UTC
create or replace function public.period_start(p_period text) returns timestamptz
language sql stable as $$
  select case p_period
    when 'daily' then date_trunc('day', now() at time zone 'utc') at time zone 'utc'
    when 'weekly' then date_trunc('week', now() at time zone 'utc') at time zone 'utc'
    else '-infinity'::timestamptz end
$$;

-- Submit an Ascended score. Impossible scores are refused (keep these rules in step with src/systems/Leaderboard.ts).
create or replace function public.submit_score(p_player uuid, p_name text, p_score int, p_distance int, p_coins int, p_duration real)
returns json language plpgsql security definer set search_path = public as $$
declare last_at timestamptz;
begin
  if p_name !~ '^[A-Z][a-z]+ [A-Z][a-z]+ [0-9]{1,3}$' then
    return json_build_object('ok', false, 'error', 'name');
  end if;
  if p_duration < 5 or p_distance > p_duration * 34 then
    return json_build_object('ok', false, 'error', 'speed');
  end if;
  if p_coins > p_distance or p_score > p_distance * 5 + p_coins * 50 + 100 then
    return json_build_object('ok', false, 'error', 'score');
  end if;
  select max(created_at) into last_at from scores where player_id = p_player;
  if last_at is not null and last_at > now() - interval '15 seconds' then
    return json_build_object('ok', false, 'error', 'slow');
  end if;
  insert into scores (player_id, name, score, distance, coins, duration)
  values (p_player, p_name, p_score, p_distance, p_coins, p_duration);
  return json_build_object('ok', true);
end $$;

-- Top scores for a period: each player once (their best), with is_me for the asking player.
create or replace function public.get_leaderboard(p_period text, p_player uuid, p_limit int default 50)
returns table (rank bigint, name text, score int, is_me boolean)
language sql stable security definer set search_path = public as $$
  with best as (
    select distinct on (player_id) player_id, name, score
    from scores where created_at >= period_start(p_period)
    order by player_id, score desc, created_at asc
  )
  select rank() over (order by score desc), name, score, player_id = p_player
  from best order by score desc limit least(greatest(p_limit, 1), 100)
$$;

-- Your own best and rank for a period (null if you have no score in it).
create or replace function public.get_my_rank(p_period text, p_player uuid)
returns table (rank bigint, score int, players bigint)
language sql stable security definer set search_path = public as $$
  with best as (
    select distinct on (player_id) player_id, score
    from scores where created_at >= period_start(p_period)
    order by player_id, score desc
  ), ranked as (
    select player_id, score, rank() over (order by score desc) as rank from best
  )
  select r.rank, r.score, (select count(*) from best) from ranked r where r.player_id = p_player
$$;

grant execute on function public.submit_score(uuid, text, int, int, int, real) to anon;
grant execute on function public.get_leaderboard(text, uuid, int) to anon;
grant execute on function public.get_my_rank(text, uuid) to anon;
