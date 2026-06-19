-- Run once in Supabase Dashboard > SQL Editor.
-- This avoids the overloaded create_arpon_private_room functions that make PostgREST ambiguous.

drop function if exists public.create_arpon_private_room_v2(text, text, integer, integer, boolean);

create or replace function public.create_arpon_private_room_v2(
  p_player_token text,
  p_display_name text,
  p_turn_limit integer default 24,
  p_wall_limit integer default 24,
  p_ranked boolean default false,
  p_timer_enabled boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_game_id uuid;
  new_code text;
begin
  loop
    new_code := chr(65 + floor(random() * 26)::integer)
      || chr(65 + floor(random() * 26)::integer)
      || chr(65 + floor(random() * 26)::integer);
    exit when not exists (select 1 from public.arpon_online_games where code = new_code);
  end loop;

  insert into public.arpon_online_games(code, mode, host_token, turn_limit, wall_limit, ranked)
  values (
    new_code,
    'private',
    p_player_token,
    greatest(8, least(80, p_turn_limit)),
    greatest(0, least(36, p_wall_limit)),
    p_ranked
  )
  returning id into new_game_id;

  insert into public.arpon_online_players(game_id, player_token, display_name, seat)
  values (new_game_id, p_player_token, left(coalesce(nullif(trim(p_display_name), ''), 'Player'), 22), 1);

  return public.arpon_room_payload(new_game_id, p_player_token);
end;
$$;

grant execute on function public.create_arpon_private_room_v2(text, text, integer, integer, boolean, boolean) to anon, authenticated;
