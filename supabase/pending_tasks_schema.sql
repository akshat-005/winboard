-- Run this whole file in Supabase: Project > SQL Editor > New query > paste > Run

create table if not exists pending_tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('habit', 'outcome', 'clutch')) default 'outcome',
  habit_id uuid references habits(id) on delete set null,
  name text not null,
  tier text not null check (tier in ('bronze', 'silver', 'gold')),
  note text,
  created_at timestamptz not null default now()
);

alter table pending_tasks enable row level security;

create policy "pending_tasks_select_own" on pending_tasks for select using (auth.uid() = user_id);
create policy "pending_tasks_insert_own" on pending_tasks for insert with check (auth.uid() = user_id);
create policy "pending_tasks_update_own" on pending_tasks for update using (auth.uid() = user_id);
create policy "pending_tasks_delete_own" on pending_tasks for delete using (auth.uid() = user_id);

create index if not exists pending_tasks_user_idx on pending_tasks (user_id);
