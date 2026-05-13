-- Event-driven configuration for the Post Generator flow
-- Run this in Supabase SQL editor (schema: public)

-- Optional helper extension (usually already enabled on Supabase)
create extension if not exists pgcrypto;

-- Use a stable unique key for fetching configs.
-- Keep `event_name` human-readable and `event_slug` stable/unique.
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null unique,
  event_name text not null,

  -- Where QR links & public URLs should point (ex: https://lenovo.expystudio.ai)
  public_app_url text,

  -- Theme / UI tokens (hex strings like #F1E1ED, #7a126b)
  background_color text,
  foreground_color text,
  secondary_color text,
  button_bg_color text,
  button_text_color text,

  -- Assets
  logo_url text,
  -- Generic images displayed under preview / posted with the featured image
  generic_image_urls text[] not null default '{}',

  -- AI prompt variants (store 4 strings or more; code can slice to 4)
  prompt_variants text[] not null default '{}',

  -- Caption options (store 4 strings or more)
  caption_options text[] not null default '{}',

  -- Hashtags/tags used in captions or UI
  tags text[] not null default '{}',

  -- Optional extra metadata you may want later (speaker, venue, etc.)
  meta jsonb not null default '{}'::jsonb,

  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists events_is_active_idx on public.events (is_active);

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at
before update on public.events
for each row
execute function public.set_updated_at();

-- RLS: by default, allow public read of active events (so the app can render without auth).
alter table public.events enable row level security;

drop policy if exists "events_public_read_active" on public.events;
create policy "events_public_read_active"
on public.events
for select
to anon, authenticated
using (is_active = true);

-- No public insert/update/delete policies here.
-- Manage writes via Supabase dashboard, service role key, or an admin-only API.

