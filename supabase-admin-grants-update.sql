-- Arpon Heroes MODVIEW reward grants.
-- Run once in Supabase Dashboard > SQL Editor after the public playtest update.

create extension if not exists pgcrypto;

create table if not exists public.arpon_account_grants (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.arpon_accounts(id) on delete cascade,
  created_by uuid references public.arpon_accounts(id) on delete set null,
  grant_type text not null check (grant_type in ('coins', 'card')),
  amount integer not null default 0,
  card_id text,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (grant_type = 'coins' and amount > 0 and card_id is null)
    or
    (grant_type = 'card' and amount = 1 and card_id is not null and length(card_id) between 3 and 80)
  )
);

create index if not exists arpon_account_grants_account_claimed_idx
on public.arpon_account_grants(account_id, claimed_at, created_at);

alter table public.arpon_account_grants enable row level security;
revoke all on public.arpon_account_grants from anon, authenticated;

create or replace function public.admin_grant_arpon_coins(p_session_token uuid, p_username text, p_amount integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  admin_id uuid;
  target_id uuid;
  target_is_admin boolean;
begin
  admin_id := public.arpon_require_admin(p_session_token);
  if p_amount is null or p_amount < 1 or p_amount > 999 then
    raise exception 'Coin grant must be between 1 and 999';
  end if;

  select id, is_admin into target_id, target_is_admin
  from public.arpon_accounts
  where username = p_username;

  if target_id is null then raise exception 'Player account not found'; end if;
  if target_is_admin then raise exception 'MODVIEW already has infinite coins'; end if;

  insert into public.arpon_account_grants(account_id, created_by, grant_type, amount)
  values (target_id, admin_id, 'coins', p_amount);

  return jsonb_build_object('username', p_username, 'grant_type', 'coins', 'amount', p_amount);
end;
$$;

create or replace function public.admin_grant_arpon_card(p_session_token uuid, p_username text, p_card_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  admin_id uuid;
  target_id uuid;
  target_is_admin boolean;
begin
  admin_id := public.arpon_require_admin(p_session_token);
  if p_card_id is null or p_card_id !~ '^[a-z0-9_]{3,80}$' then
    raise exception 'Card ID is not valid';
  end if;

  select id, is_admin into target_id, target_is_admin
  from public.arpon_accounts
  where username = p_username;

  if target_id is null then raise exception 'Player account not found'; end if;
  if target_is_admin then raise exception 'MODVIEW already owns everything for testing'; end if;

  insert into public.arpon_account_grants(account_id, created_by, grant_type, amount, card_id)
  values (target_id, admin_id, 'card', 1, p_card_id);

  return jsonb_build_object('username', p_username, 'grant_type', 'card', 'card_id', p_card_id);
end;
$$;

create or replace function public.claim_arpon_account_grants(p_session_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  target_id uuid;
  result jsonb;
begin
  target_id := public.arpon_session_account(p_session_token);
  if target_id is null then raise exception 'Account session expired'; end if;

  with picked as (
    select id
    from public.arpon_account_grants
    where account_id = target_id and claimed_at is null
    order by created_at
    for update skip locked
  ),
  marked as (
    update public.arpon_account_grants grant_row
    set claimed_at = now()
    from picked
    where grant_row.id = picked.id
    returning grant_row.id, grant_row.grant_type, grant_row.amount, grant_row.card_id, grant_row.created_at
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id,
    'grant_type', grant_type,
    'amount', amount,
    'card_id', card_id,
    'created_at', created_at
  ) order by created_at), '[]'::jsonb)
  into result
  from marked;

  return result;
end;
$$;

create or replace function public.get_arpon_admin_dashboard(p_session_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare ignored uuid; result jsonb;
begin
  ignored := public.arpon_require_admin(p_session_token);
  select jsonb_build_object(
    'online_accounts', (select count(*) from public.arpon_accounts where last_seen > now() - interval '60 seconds'),
    'active_room_players', (select count(*) from public.arpon_online_players where last_seen > now() - interval '60 seconds'),
    'active_games', (select count(*) from public.arpon_online_games where status in ('countdown', 'playing') and updated_at > now() - interval '5 minutes'),
    'accounts', coalesce((select jsonb_agg(jsonb_build_object(
      'username', account_row.username,
      'is_admin', account_row.is_admin,
      'online', account_row.last_seen > now() - interval '60 seconds',
      'ranked_wins', account_row.ranked_wins,
      'ranked_losses', account_row.ranked_losses,
      'solo_wins', account_row.solo_wins,
      'solo_losses', account_row.solo_losses,
      'created_at', account_row.created_at,
      'last_seen', account_row.last_seen,
      'locked_until', account_row.locked_until,
      'pending_grants', (select count(*) from public.arpon_account_grants grant_row where grant_row.account_id = account_row.id and grant_row.claimed_at is null)
    ) order by account_row.created_at desc) from public.arpon_accounts account_row), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

grant execute on function public.admin_grant_arpon_coins(uuid, text, integer) to anon, authenticated;
grant execute on function public.admin_grant_arpon_card(uuid, text, text) to anon, authenticated;
grant execute on function public.claim_arpon_account_grants(uuid) to anon, authenticated;
grant execute on function public.get_arpon_admin_dashboard(uuid) to anon, authenticated;
