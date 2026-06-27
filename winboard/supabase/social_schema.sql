-- ============================================================
-- WINBOARD — Social Layer (run AFTER schema.sql)
-- ============================================================

-- ============ PROFILES ============
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null unique,
  visible_on_global boolean not null default true,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles_select_all" on profiles for select using (auth.role() = 'authenticated');
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

-- ============ FRIEND REQUESTS ============
create table if not exists friend_requests (
  id uuid primary key default uuid_generate_v4(),
  from_user uuid not null references auth.users(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (from_user, to_user)
);

alter table friend_requests enable row level security;

create policy "friend_requests_select_own" on friend_requests
  for select using (auth.uid() = from_user or auth.uid() = to_user);
create policy "friend_requests_insert_own" on friend_requests
  for insert with check (auth.uid() = from_user);
create policy "friend_requests_update_recipient" on friend_requests
  for update using (auth.uid() = to_user or auth.uid() = from_user);
create policy "friend_requests_delete_own" on friend_requests
  for delete using (auth.uid() = from_user or auth.uid() = to_user);

-- ============ HELPER: rolling 7-day points ============
create or replace function weekly_points(p_user uuid)
returns bigint
language sql
security definer
set search_path = public
as $$
  select coalesce(sum(points), 0)
  from wins
  where user_id = p_user
    and ts >= now() - interval '7 days';
$$;

-- ============ HELPER: current daily win streak ============
create or replace function current_streak(p_user uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  streak int := 0;
  cursor_date date := current_date;
  has_today boolean;
begin
  has_today := exists (
    select 1 from wins where user_id = p_user and ts::date = current_date
  );
  if not has_today then
    cursor_date := current_date - 1;
  end if;

  loop
    exit when not exists (
      select 1 from wins where user_id = p_user and ts::date = cursor_date
    );
    streak := streak + 1;
    cursor_date := cursor_date - 1;
  end loop;

  return streak;
end;
$$;

-- ============ GLOBAL LEADERBOARD ============
create or replace function get_global_leaderboard(p_limit int default 50)
returns table (display_name text, weekly_points bigint, streak int)
language sql
security definer
set search_path = public
as $$
  select p.display_name, weekly_points(p.id), current_streak(p.id)
  from profiles p
  where p.visible_on_global = true
  order by weekly_points(p.id) desc
  limit p_limit;
$$;

create or replace function get_my_global_rank()
returns int
language sql
security definer
set search_path = public
as $$
  select case
    when (select visible_on_global from profiles where id = auth.uid()) is not true then null
    else (
      select count(*) + 1
      from profiles p
      where p.visible_on_global = true
        and weekly_points(p.id) > weekly_points(auth.uid())
    )
  end;
$$;

-- ============ FRIENDS LEADERBOARD ============
create or replace function get_friends_leaderboard()
returns table (user_id uuid, display_name text, weekly_points bigint, streak int)
language sql
security definer
set search_path = public
as $$
  select p.id, p.display_name, weekly_points(p.id), current_streak(p.id)
  from profiles p
  where p.id in (
    select case when fr.from_user = auth.uid() then fr.to_user else fr.from_user end
    from friend_requests fr
    where fr.status = 'accepted'
      and (fr.from_user = auth.uid() or fr.to_user = auth.uid())
  )
  order by weekly_points(p.id) desc;
$$;

-- ============ FRIEND RECENT ACTIVITY (excludes `note` on purpose) ============
create or replace function get_friend_recent_wins(p_friend_id uuid)
returns table (type text, name text, tier text, points int, ts timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  is_friend boolean;
begin
  select exists (
    select 1 from friend_requests
    where status = 'accepted'
      and ((from_user = auth.uid() and to_user = p_friend_id)
        or (from_user = p_friend_id and to_user = auth.uid()))
  ) into is_friend;

  if not is_friend then
    return;
  end if;

  return query
    select w.type, w.name, w.tier, w.points, w.ts
    from wins w
    where w.user_id = p_friend_id
    order by w.ts desc
    limit 7;
end;
$$;
