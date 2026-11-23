-- Paste into Supabase: SQL Editor -> New query -> Run. Adds the "Delete my data" function.
create or replace function public.delete_my_scores(p_player uuid)
returns json language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from scores where player_id = p_player;
  get diagnostics n = row_count;
  return json_build_object('ok', true, 'deleted', n);
end $$;
grant execute on function public.delete_my_scores(uuid) to anon;
