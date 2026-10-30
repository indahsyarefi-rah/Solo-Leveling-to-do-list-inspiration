-- Apply once through Supabase SQL Editor or `supabase db push`.
-- A single snapshot belongs to one authenticated account. No service key is
-- needed by the application. All writes use compare-and-swap through the RPC.

create table public.app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  revision integer not null default 1 check (revision >= 1),
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

create policy "Users can read only their own Iris state"
  on public.app_state for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Do not permit ordinary REST writes that bypass revision checks. A public
-- project key alone grants no access, and another user's row is never visible.
revoke all on table public.app_state from public, anon, authenticated;
grant select on table public.app_state to authenticated;

create or replace function public.save_iris_state(
  p_data jsonb,
  p_expected_revision integer default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_revision integer;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception using errcode = '22023', message = 'Iris state must be a JSON object';
  end if;
  if p_expected_revision is not null and p_expected_revision < 1 then
    raise exception using errcode = '22023', message = 'Invalid expected revision';
  end if;

  if p_expected_revision is null then
    -- Concurrent first saves: exactly one creates a row, all others conflict.
    insert into public.app_state (user_id, data, revision, updated_at)
      values (v_user_id, p_data, 1, now())
      on conflict (user_id) do nothing
      returning revision into v_revision;
    if not found then
      raise exception using errcode = 'P0001', message = 'IRIS_STATE_CONFLICT';
    end if;
  else
    -- The equality check and update are one atomic database operation. A stale
    -- device cannot silently replace a newer snapshot, even during a race.
    update public.app_state
      set data = p_data,
          revision = revision + 1,
          updated_at = now()
      where user_id = v_user_id
        and revision = p_expected_revision
      returning revision into v_revision;
    if not found then
      raise exception using errcode = 'P0001', message = 'IRIS_STATE_CONFLICT';
    end if;
  end if;

  return v_revision;
end;
$$;

revoke all on function public.save_iris_state(jsonb, integer) from public, anon, authenticated;
grant execute on function public.save_iris_state(jsonb, integer) to authenticated;
