-- Arpon Heroes deck, shop, coins, timer choice, and Set B account update.
-- Safe to run after supabase-setup.sql and supabase-public-playtest-update.sql.

alter table public.arpon_online_games add column if not exists timer_enabled boolean not null default true;
alter table public.arpon_online_players add column if not exists active_deck jsonb;
alter table public.arpon_online_players add column if not exists cosmetics jsonb;
alter table public.arpon_accounts add column if not exists coins integer not null default 0;

create table if not exists public.arpon_card_catalog (
  card_id text primary key,
  kind text not null check (kind in ('hero','armor','weapon')),
  card_name text not null,
  sets text not null
);
insert into public.arpon_card_catalog(card_id, kind, card_name, sets) values
  ('neol_w','weapon','Glow Sword','A'),
  ('zenneth_a','armor','Zennethian Armor','B'),
  ('rob_a','armor','Battery','B'),
  ('scorpio_a','armor','Venarmor','A'),
  ('honsen_a','armor','Holmer','A'),
  ('flamar_h','hero','Flamar','A'),
  ('honsen_w','weapon','Honsling','B'),
  ('vondor_a','armor','Aryarmor','B'),
  ('gali_w','weapon','Metal Wrath','B'),
  ('lancer_a','armor','Plated Armor','B'),
  ('lancer_h','hero','Lancer','A'),
  ('vondor_h','hero','Vondor','B'),
  ('marceler_h','hero','Marceler','B'),
  ('nixel_a','armor','Nixor','B'),
  ('aquazi_a','armor','Aquarmor','A'),
  ('staron_w','weapon','Astroball','B'),
  ('lancer_w','weapon','Lance','A'),
  ('staron_h','hero','Staron','A'),
  ('sparko_a','armor','Electro Boots','A'),
  ('axel_h','hero','Axel','B'),
  ('asher_h','hero','Asher','B'),
  ('zenneth_h','hero','Zenneth','B'),
  ('zanion_h','hero','Zanion','A'),
  ('aquazi_w','weapon','Aquablade','A'),
  ('blaze_h','hero','Blaze','B'),
  ('yakomi_a','armor','Solin Shoulders','B'),
  ('iceoth_w','weapon','Icel','A'),
  ('jay_a','armor','Orange Armor','A'),
  ('rowan_h','hero','Rowan','B'),
  ('neol_a','armor','Nearmor','A'),
  ('flamar_a','armor','Blazen Armor','A'),
  ('rob_w','weapon','Robo Hand','B'),
  ('sparko_w','weapon','Electro Bow','A'),
  ('nixel_w','weapon','Greenbow','B'),
  ('marceler_w','weapon','Megarikin','A'),
  ('vondor_w','weapon','Aryexcalibur','B'),
  ('honsen_h','hero','Honsen','B'),
  ('jay_w','weapon','Oniea','B'),
  ('scorpio_h','hero','Scorpio Slash','A'),
  ('asher_a','armor','Ninjarmor','B'),
  ('sparko_h','hero','Sparko','A'),
  ('jay_h','hero','Jay','A'),
  ('aquazi_h','hero','Aquazi','A'),
  ('zanion_a','armor','Magigloves','B'),
  ('zero_w','weapon','Knife','A'),
  ('neol_h','hero','Neol','A'),
  ('flamar_w','weapon','Flamar''s Sword','A'),
  ('okar_w','weapon','Lime Sword','A'),
  ('nixel_h','hero','Nixel','B'),
  ('zenneth_w','weapon','Zennethian Sword','B'),
  ('iceoth_a','armor','Iceplate','A'),
  ('okar_h','hero','Okar','B'),
  ('gali_a','armor','Metarmor','B'),
  ('zero_a','armor','Leather Tunic','B'),
  ('asher_w','weapon','Red Dagger','A'),
  ('axel_w','weapon','Boxing Gloves','B'),
  ('scorpio_w','weapon','Veno-stars','A'),
  ('iceoth_h','hero','Iceoth','A'),
  ('rowan_w','weapon','Rosword','B'),
  ('marceler_a','armor','Megarmor','A'),
  ('rob_h','hero','Rob','B'),
  ('zanion_w','weapon','Wandelt','A'),
  ('rowan_a','armor','Roarmor','B'),
  ('axel_a','armor','Super Sneakers','B'),
  ('staron_a','armor','Astro Shield','A'),
  ('yakomi_h','hero','Yakomi','A'),
  ('zero_h','hero','Zero','B'),
  ('yakomi_w','weapon','Yakibow','B'),
  ('okar_a','armor','Lime Armor','A'),
  ('blaze_w','weapon','Botena','B'),
  ('gali_h','hero','Gali','A'),
  ('blaze_a','armor','Bakour Armor','A')
on conflict (card_id) do update set kind=excluded.kind, card_name=excluded.card_name, sets=excluded.sets;

create table if not exists public.arpon_card_collection (
  account_id uuid not null references public.arpon_accounts(id) on delete cascade,
  card_id text not null references public.arpon_card_catalog(card_id),
  duplicate_progress integer not null default 0,
  cosmetic_level integer not null default 0 check (cosmetic_level between 0 and 5),
  primary key(account_id, card_id)
);
create table if not exists public.arpon_active_deck (
  account_id uuid not null references public.arpon_accounts(id) on delete cascade,
  card_id text not null references public.arpon_card_catalog(card_id),
  kind text not null check (kind in ('hero','armor','weapon')),
  slot integer not null check (slot between 1 and 8),
  primary key(account_id, kind, slot), unique(account_id, card_id)
);
alter table public.arpon_card_catalog enable row level security;
alter table public.arpon_card_collection enable row level security;
alter table public.arpon_active_deck enable row level security;
revoke all on public.arpon_card_catalog, public.arpon_card_collection, public.arpon_active_deck from anon, authenticated;

create or replace function public.initialize_arpon_collection(p_account_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  insert into public.arpon_card_collection(account_id,card_id)
  select p_account_id, card_id from public.arpon_card_catalog where sets like '%A%'
  on conflict do nothing;
  insert into public.arpon_active_deck(account_id,card_id,kind,slot)
  select p_account_id, card_id, kind, rn from (
    select card_id, kind, row_number() over(partition by kind order by card_id)::integer rn
    from public.arpon_card_catalog where sets like '%A%'
  ) starter where rn <= 8
  on conflict do nothing;
end; $$;

create or replace function public.arpon_account_profile(p_account_id uuid)
returns jsonb language sql security definer set search_path=public as $$
  select jsonb_build_object('username',username,'is_admin',is_admin,'coins',case when is_admin then 999999999 else coins end,
    'ranked_wins',ranked_wins,'ranked_losses',ranked_losses,'ranked_games',ranked_wins+ranked_losses,
    'solo_wins',solo_wins,'solo_losses',solo_losses,'solo_games',solo_wins+solo_losses)
  from public.arpon_accounts where id=p_account_id;
$$;

create or replace function public.get_arpon_collection(p_session_token uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare me uuid; result jsonb;
begin
  me := public.arpon_session_account(p_session_token); if me is null then raise exception 'Account session expired'; end if;
  perform public.initialize_arpon_collection(me);
  select jsonb_build_object(
    'coins',case when a.is_admin then 999999999 else a.coins end,
    'active_deck',coalesce((select jsonb_agg(d.card_id order by d.kind,d.slot) from public.arpon_active_deck d where d.account_id=me),'[]'::jsonb),
    'owned',coalesce((select jsonb_object_agg(c.card_id,jsonb_build_object('duplicates',c.duplicate_progress,'level',c.cosmetic_level)) from public.arpon_card_collection c where c.account_id=me),'{}'::jsonb)
  ) into result from public.arpon_accounts a where a.id=me;
  return result;
end; $$;

create or replace function public.swap_arpon_deck_card(p_session_token uuid,p_out_card_id text,p_in_card_id text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare me uuid; target_kind text; target_slot integer; incoming_kind text;
begin
  me:=public.arpon_session_account(p_session_token); if me is null then raise exception 'Account session expired'; end if;
  perform public.initialize_arpon_collection(me);
  select kind,slot into target_kind,target_slot from public.arpon_active_deck where account_id=me and card_id=p_out_card_id;
  select kind into incoming_kind from public.arpon_card_catalog where card_id=p_in_card_id;
  if target_kind is null or incoming_kind is distinct from target_kind then raise exception 'Cards must be the same type'; end if;
  if not exists(select 1 from public.arpon_card_collection where account_id=me and card_id=p_in_card_id) then raise exception 'You do not own that card'; end if;
  if exists(select 1 from public.arpon_active_deck where account_id=me and card_id=p_in_card_id) then raise exception 'That card is already active'; end if;
  update public.arpon_active_deck set card_id=p_in_card_id where account_id=me and kind=target_kind and slot=target_slot;
  return public.get_arpon_collection(p_session_token);
end; $$;

create or replace function public.grant_arpon_card(p_account_id uuid,p_card_id text)
returns boolean language plpgsql security definer set search_path=public as $$
declare was_duplicate boolean;
begin
  was_duplicate:=exists(select 1 from public.arpon_card_collection where account_id=p_account_id and card_id=p_card_id);
  insert into public.arpon_card_collection(account_id,card_id,duplicate_progress) values(p_account_id,p_card_id,0)
  on conflict(account_id,card_id) do update set duplicate_progress=public.arpon_card_collection.duplicate_progress+1;
  return was_duplicate;
end; $$;

create or replace function public.buy_arpon_pack(p_session_token uuid,p_pack_type text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare me uuid; admin boolean; cost integer; pick record; picked_id text; picked jsonb:='[]'::jsonb; need integer; duplicates_target integer;
begin
  me:=public.arpon_session_account(p_session_token); if me is null then raise exception 'Account session expired'; end if;
  perform public.initialize_arpon_collection(me);
  select is_admin into admin from public.arpon_accounts where id=me;
  if p_pack_type='standard' then cost:=4; need:=5; duplicates_target:=2+floor(random()*2)::integer;
  elsif p_pack_type='novelty' then cost:=5; need:=3; duplicates_target:=0;
  else raise exception 'Unknown pack type'; end if;
  if not admin then
    update public.arpon_accounts set coins=coins-cost where id=me and coins>=cost;
    if not found then raise exception 'Not enough coins'; end if;
  end if;
  if p_pack_type='standard' then
    for pick in select cc.card_id from public.arpon_card_catalog cc join public.arpon_card_collection c on c.card_id=cc.card_id and c.account_id=me order by random() limit duplicates_target loop
      picked:=picked||jsonb_build_array(jsonb_build_object('id',pick.card_id,'duplicate',public.grant_arpon_card(me,pick.card_id)));
    end loop;
    for pick in select cc.card_id from public.arpon_card_catalog cc where not exists(select 1 from public.arpon_card_collection c where c.account_id=me and c.card_id=cc.card_id) order by random() limit need-jsonb_array_length(picked) loop
      picked:=picked||jsonb_build_array(jsonb_build_object('id',pick.card_id,'duplicate',public.grant_arpon_card(me,pick.card_id)));
    end loop;
    while jsonb_array_length(picked)<need loop
      select card_id into picked_id from public.arpon_card_catalog order by random() limit 1;
      picked:=picked||jsonb_build_array(jsonb_build_object('id',picked_id,'duplicate',public.grant_arpon_card(me,picked_id)));
    end loop;
  else
    for pick in select cc.card_id from public.arpon_card_catalog cc where not exists(select 1 from public.arpon_card_collection c where c.account_id=me and c.card_id=cc.card_id) order by random() limit need loop
      picked:=picked||jsonb_build_array(jsonb_build_object('id',pick.card_id,'duplicate',public.grant_arpon_card(me,pick.card_id)));
    end loop;
    if jsonb_array_length(picked)=0 then raise exception 'You already own every Set A and Set B card'; end if;
  end if;
  return jsonb_build_object('cards',picked,'collection',public.get_arpon_collection(p_session_token));
end; $$;

create or replace function public.upgrade_arpon_card(p_session_token uuid,p_card_id text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare me uuid; current_level integer; needed integer;
begin
  me:=public.arpon_session_account(p_session_token); if me is null then raise exception 'Account session expired'; end if;
  select cosmetic_level into current_level from public.arpon_card_collection where account_id=me and card_id=p_card_id for update;
  if current_level is null then raise exception 'Card not owned'; end if;
  if current_level>=5 then raise exception 'Card is already at the highest cosmetic level'; end if;
  needed:=current_level+1;
  update public.arpon_card_collection set duplicate_progress=duplicate_progress-needed,cosmetic_level=cosmetic_level+1
  where account_id=me and card_id=p_card_id and duplicate_progress>=needed;
  if not found then raise exception 'Not enough duplicate progress'; end if;
  return public.get_arpon_collection(p_session_token);
end; $$;

create or replace function public.link_arpon_player_account(p_game_id uuid,p_player_token text,p_session_token uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare me uuid; deck jsonb; card_cosmetics jsonb;
begin
  me:=public.arpon_session_account(p_session_token); if me is null then return false; end if; perform public.initialize_arpon_collection(me);
  select jsonb_agg(card_id order by kind,slot) into deck from public.arpon_active_deck where account_id=me;
  select jsonb_object_agg(card_id,cosmetic_level) into card_cosmetics from public.arpon_card_collection where account_id=me;
  update public.arpon_online_players set account_id=me,active_deck=deck,cosmetics=card_cosmetics where game_id=p_game_id and player_token=p_player_token;
  return true;
end; $$;

create or replace function public.arpon_room_payload(p_game_id uuid,p_player_token text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb; you_id uuid;
begin
  select id into you_id from public.arpon_online_players where game_id=p_game_id and player_token=p_player_token;
  if you_id is null then raise exception 'You are not a member of this room'; end if;
  select jsonb_build_object('game',jsonb_build_object('id',g.id,'code',g.code,'mode',g.mode,'status',g.status,'turn_limit',g.turn_limit,'wall_limit',g.wall_limit,'ranked',g.ranked,'timer_enabled',g.timer_enabled,'countdown_started_at',g.countdown_started_at,'starts_at',g.starts_at,'game_state',g.game_state,'revision',g.revision,'created_at',g.created_at,'updated_at',g.updated_at,'is_host',g.host_token=p_player_token),
  'you_id',you_id,'players',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'display_name',p.display_name,'seat',p.seat,'joined_at',p.joined_at,'active_deck',p.active_deck,'cosmetics',p.cosmetics) order by p.seat) from public.arpon_online_players p where p.game_id=g.id),'[]'::jsonb)) into result from public.arpon_online_games g where g.id=p_game_id;
  return result;
end; $$;

create or replace function public.create_arpon_private_room(p_player_token text,p_display_name text,p_turn_limit integer default 40,p_wall_limit integer default 24,p_ranked boolean default false,p_timer_enabled boolean default true)
returns jsonb language plpgsql security definer set search_path=public as $$
declare new_game_id uuid; new_code text;
begin
  loop new_code:=chr(65+floor(random()*26)::integer)||chr(65+floor(random()*26)::integer)||chr(65+floor(random()*26)::integer); exit when not exists(select 1 from public.arpon_online_games where code=new_code); end loop;
  insert into public.arpon_online_games(code,mode,host_token,turn_limit,wall_limit,ranked,timer_enabled) values(new_code,'private',p_player_token,greatest(8,least(80,p_turn_limit)),greatest(0,least(36,p_wall_limit)),p_ranked,p_timer_enabled) returning id into new_game_id;
  insert into public.arpon_online_players(game_id,player_token,display_name,seat) values(new_game_id,p_player_token,left(coalesce(nullif(trim(p_display_name),''),'Player'),22),1);
  return public.arpon_room_payload(new_game_id,p_player_token);
end; $$;

create or replace function public.record_arpon_online_result(p_game_id uuid,p_player_token text,p_session_token uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare me uuid; target_seat integer; player_count integer; target_team text; won boolean; inserted integer; g public.arpon_online_games%rowtype; admin boolean;
begin
  me:=public.arpon_session_account(p_session_token); if me is null then raise exception 'Account session expired'; end if;
  select is_admin into admin from public.arpon_accounts where id=me; if admin then return public.arpon_account_profile(me); end if;
  select * into g from public.arpon_online_games where id=p_game_id; if g.id is null or not g.ranked then raise exception 'This game is not ranked'; end if; if g.game_state->>'phase'<>'complete' then raise exception 'Battle is not complete'; end if;
  select seat into target_seat from public.arpon_online_players where game_id=p_game_id and player_token=p_player_token; select count(*) into player_count from public.arpon_online_players where game_id=p_game_id;
  target_team:=case when player_count=2 and target_seat=1 then 'red' when player_count=2 then 'yellow' when player_count=3 and target_seat=1 then 'red' when player_count=3 and target_seat=2 then 'green' when player_count=3 then 'yellow' when target_seat=1 then 'red' when target_seat=2 then 'green' when target_seat=3 then 'yellow' else 'blue' end;
  won:=coalesce((g.game_state->'victory'->'winners') ? target_team,false);
  insert into public.arpon_recorded_results(account_id,result_key,mode,won) values(me,p_game_id::text,'ranked',won) on conflict do nothing; get diagnostics inserted=row_count;
  if inserted>0 then update public.arpon_accounts set ranked_wins=ranked_wins+case when won then 1 else 0 end,ranked_losses=ranked_losses+case when won then 0 else 1 end,coins=coins+case when won then 2 else 0 end where id=me; end if;
  return public.arpon_account_profile(me);
end; $$;

create or replace function public.record_arpon_solo_result(p_session_token uuid,p_result_key text,p_won boolean)
returns jsonb language plpgsql security definer set search_path=public as $$
declare me uuid; inserted integer; admin boolean;
begin
  me:=public.arpon_session_account(p_session_token); if me is null then raise exception 'Account session expired'; end if;
  select is_admin into admin from public.arpon_accounts where id=me; if admin then return public.arpon_account_profile(me); end if;
  insert into public.arpon_recorded_results(account_id,result_key,mode,won) values(me,p_result_key,'solo',p_won) on conflict do nothing;
  get diagnostics inserted=row_count;
  if inserted>0 then update public.arpon_accounts set solo_wins=solo_wins+case when p_won then 1 else 0 end,solo_losses=solo_losses+case when p_won then 0 else 1 end where id=me; end if;
  return public.arpon_account_profile(me);
end; $$;

create or replace function public.record_arpon_forfeit(p_game_id uuid,p_host_token text,p_team text)
returns boolean language plpgsql security definer set search_path=public as $$
declare g public.arpon_online_games%rowtype; target_seat integer; target_account uuid; player_count integer; inserted integer; admin boolean;
begin
  select * into g from public.arpon_online_games where id=p_game_id and host_token=p_host_token;
  if g.id is null then raise exception 'Only the host can record a timeout loss'; end if;
  if not g.ranked then return true; end if;
  select count(*) into player_count from public.arpon_online_players where game_id=p_game_id;
  target_seat:=case when player_count=2 and p_team='red' then 1 when player_count=2 then 2 when player_count=3 and p_team='red' then 1 when player_count=3 and p_team='green' then 2 when player_count=3 then 3 when p_team='red' then 1 when p_team='green' then 2 when p_team='yellow' then 3 else 4 end;
  select account_id into target_account from public.arpon_online_players where game_id=p_game_id and seat=target_seat;
  if target_account is null then return true; end if;
  select is_admin into admin from public.arpon_accounts where id=target_account; if admin then return true; end if;
  insert into public.arpon_recorded_results(account_id,result_key,mode,won) values(target_account,p_game_id::text,'ranked',false) on conflict do nothing;
  get diagnostics inserted=row_count; if inserted>0 then update public.arpon_accounts set ranked_losses=ranked_losses+1 where id=target_account; end if;
  return true;
end; $$;

do $$ declare a uuid; begin for a in select id from public.arpon_accounts loop perform public.initialize_arpon_collection(a); end loop; end $$;

grant execute on function public.get_arpon_collection(uuid) to anon,authenticated;
grant execute on function public.swap_arpon_deck_card(uuid,text,text) to anon,authenticated;
grant execute on function public.buy_arpon_pack(uuid,text) to anon,authenticated;
grant execute on function public.upgrade_arpon_card(uuid,text) to anon,authenticated;
grant execute on function public.create_arpon_private_room(text,text,integer,integer,boolean,boolean) to anon,authenticated;
