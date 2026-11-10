-- Run once in the Supabase SQL editor.
-- The app only talks to these tables from server routes with the service role key,
-- so RLS stays on with no public policies.

create table if not exists public.desks (
  workspace_id text not null,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, id)
);

create table if not exists public.clips (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  url text not null,
  title text not null default '',
  text text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists clips_workspace_idx on public.clips (workspace_id, created_at);

alter table public.desks enable row level security;
alter table public.clips enable row level security;
