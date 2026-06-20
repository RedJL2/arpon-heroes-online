-- Arpon Heroes saved account decks.
-- Run once in Supabase Dashboard > SQL Editor after the account/public playtest setup.

create table if not exists public.arpon_account_decks (
  account_id uuid primary key references public.arpon_accounts(id) on delete cascade,
  active_deck text[] not null,
  updated_at timestamptz not null default now(),
  check (cardinality(active_deck) = 18)
);

alter table public.arpon_account_decks enable row level security;
revoke all on public.arpon_account_decks from anon, authenticated;

create or replace function public.arpon_validate_active_deck(p_active_deck text[])
returns boolean language plpgsql immutable as $$
declare
  unique_count integer;
  card_id text;
begin
  if p_active_deck is null or cardinality(p_active_deck) <> 18 then
    return false;
  end if;

  select count(distinct value) into unique_count from unnest(p_active_deck) as value;
  if unique_count <> 18 then
    return false;
  end if;

  foreach card_id in array p_active_deck loop
    if card_id is null or card_id !~ '^[a-z0-9_]{3,80}$' then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

create or replace function public.save_arpon_account_deck(p_session_token uuid, p_active_deck text[])
returns boolean language plpgsql security definer set search_path = public as $$
declare
  target_id uuid;
begin
  target_id := public.arpon_session_account(p_session_token);
  if target_id is null then raise exception 'Sign in before saving a deck'; end if;
  if not public.arpon_validate_active_deck(p_active_deck) then
    raise exception 'Deck must contain exactly 18 different valid cards';
  end if;

  insert into public.arpon_account_decks(account_id, active_deck, updated_at)
  values (target_id, p_active_deck, now())
  on conflict (account_id) do update
  set active_deck = excluded.active_deck,
      updated_at = now();

  return true;
end;
$$;

create or replace function public.get_arpon_account_deck(p_session_token uuid)
returns text[] language plpgsql security definer set search_path = public as $$
declare
  target_id uuid;
  saved_deck text[];
begin
  target_id := public.arpon_session_account(p_session_token);
  if target_id is null then raise exception 'Account session expired'; end if;

  select active_deck into saved_deck
  from public.arpon_account_decks
  where account_id = target_id;

  return saved_deck;
end;
$$;

grant execute on function public.save_arpon_account_deck(uuid, text[]) to anon, authenticated;
grant execute on function public.get_arpon_account_deck(uuid) to anon, authenticated;
