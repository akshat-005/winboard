-- Run this whole file in Supabase: Project > SQL Editor > New query > paste > Run

create extension if not exists "uuid-ossp";

create table if not exists habits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  tier text not null check (tier in ('bronze', 'silver', 'gold')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists wins (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('habit', 'outcome', 'clutch')),
  habit_id uuid references habits(id) on delete set null,
  name text not null,
  tier text not null check (tier in ('bronze', 'silver', 'gold')),
  points int not null,
  note text,
  ts timestamptz not null default now()
);

alter table habits enable row level security;
alter table wins enable row level security;

-- Each user can only ever see and modify their own rows.
create policy "habits_select_own" on habits for select using (auth.uid() = user_id);
create policy "habits_insert_own" on habits for insert with check (auth.uid() = user_id);
create policy "habits_update_own" on habits for update using (auth.uid() = user_id);
create policy "habits_delete_own" on habits for delete using (auth.uid() = user_id);

create policy "wins_select_own" on wins for select using (auth.uid() = user_id);
create policy "wins_insert_own" on wins for insert with check (auth.uid() = user_id);
create policy "wins_update_own" on wins for update using (auth.uid() = user_id);
create policy "wins_delete_own" on wins for delete using (auth.uid() = user_id);

create index if not exists wins_user_ts_idx on wins (user_id, ts);
create index if not exists habits_user_idx on habits (user_id);
