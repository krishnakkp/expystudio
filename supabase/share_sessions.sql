-- Share sessions for desktop -> mobile QR handoff
-- Run this in Supabase SQL editor (project: xuakboktaxirqauinthr)

create table if not exists public.share_sessions (
  id uuid primary key default gen_random_uuid(),
  caption text not null,
  selected_image_url text not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'posted', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes')
);

create index if not exists share_sessions_expires_at_idx on public.share_sessions (expires_at);
create index if not exists share_sessions_status_idx on public.share_sessions (status);

alter table public.share_sessions enable row level security;

-- Public read-by-id for non-expired sessions. The id is unguessable (uuid).
-- This allows the QR "preview" page to load without requiring login.
drop policy if exists "share_sessions_read_non_expired" on public.share_sessions;
create policy "share_sessions_read_non_expired"
on public.share_sessions
for select
to anon, authenticated
using (expires_at > now());

-- No public insert/update/delete policies. Server uses service role key (bypasses RLS).

