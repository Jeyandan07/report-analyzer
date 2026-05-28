-- Copy and paste this into the SQL Editor in your Supabase Dashboard

-- 1. Create Reports Table
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid(),
  name text not null,
  content jsonb default '[]'::jsonb,
  columns jsonb default '[]'::jsonb,
  analysis_summary jsonb default '{}'::jsonb,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null,
  last_accessed_at timestamptz default timezone('utc'::text, now())
);

-- 2. Create Chats Table
create table if not exists chats (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references reports(id) on delete cascade,
  user_id uuid default auth.uid(),
  messages jsonb default '[]'::jsonb,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- 3. Create User Progress Table
create table if not exists user_progress (
  user_id uuid primary key default gen_random_uuid(), -- Changed to not rely on auth.users for anon usage
  progress_data jsonb default '[]'::jsonb,
  budget_data jsonb default '[]'::jsonb,
  deadlines jsonb default '[]'::jsonb,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- 4. Enable RLS (Row Level Security)
alter table reports enable row level security;
alter table chats enable row level security;
alter table user_progress enable row level security;

-- 5. Create OPEN Policies (For Development/Demo without Auth)
-- WARNING: These allow anyone with the anon key to read/write all data.
-- Since this is a demo/dev context, this is acceptable for now.

-- Reports Policies
create policy "Allow Anonymous Access to Reports"
on reports for all
to anon, service_role
using (true)
with check (true);

-- Chats Policies
create policy "Allow Anonymous Access to Chats"
on chats for all
to anon, service_role
using (true)
with check (true);

-- Progress Policies
create policy "Allow Anonymous Access to Progress"
on user_progress for all
to anon, service_role
using (true)
with check (true);
