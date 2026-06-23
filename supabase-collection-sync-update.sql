create table if not exists public.arpon_account_collections (
  account_id uuid primary key references public.arpon_accounts(id) on delete cascade,
  collection jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint arpon_account_collections_object check (jsonb_typeof(collection) = 'object'),
  constraint arpon_account_collections_reasonable_size check (length(collection::text) < 250000)
);

create or replace function public.get_arpon_account_collection(p_session_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
  v_collection jsonb;
begin
  select s.account_id into v_account_id
  from public.arpon_account_sessions s
  where s.session_token = p_session_token
    and s.expires_at > now();

  if v_account_id is null then
    raise exception 'Invalid or expired session.';
  end if;

  select c.collection into v_collection
  from public.arpon_account_collections c
  where c.account_id = v_account_id;

  return coalesce(v_collection, '{}'::jsonb);
end;
$$;

create or replace function public.save_arpon_account_collection(p_session_token uuid, p_collection jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
begin
  if p_collection is null or jsonb_typeof(p_collection) <> 'object' then
    raise exception 'Collection must be a JSON object.';
  end if;

  if length(p_collection::text) >= 250000 then
    raise exception 'Collection is too large.';
  end if;

  select s.account_id into v_account_id
  from public.arpon_account_sessions s
  where s.session_token = p_session_token
    and s.expires_at > now();

  if v_account_id is null then
    raise exception 'Invalid or expired session.';
  end if;

  insert into public.arpon_account_collections (account_id, collection, updated_at)
  values (v_account_id, p_collection, now())
  on conflict (account_id)
  do update set
    collection = excluded.collection,
    updated_at = now();

  return true;
end;
$$;

grant execute on function public.get_arpon_account_collection(uuid) to anon, authenticated;
grant execute on function public.save_arpon_account_collection(uuid, jsonb) to anon, authenticated;
