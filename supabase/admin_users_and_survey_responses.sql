-- Admin users (roles) + demo URLs + survey responses linked to events
-- Run in Supabase SQL editor after `public.events` exists.
-- Requires: `public.events` (uuid id) — see `supabase/events_config.sql` or your own `events` DDL.

create extension if not exists pgcrypto;

-- Shared trigger helper (safe if already created in `events_config.sql`)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------------
do $$
begin
  create type public.admin_role as enum ('superadmin', 'admin', 'editor', 'demo');
exception
  when duplicate_object then null;
end$$;

-- ---------------------------------------------------------------------------
-- Admin users (one row per Supabase Auth user)
-- ---------------------------------------------------------------------------
create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  display_name text,
  role public.admin_role not null default 'demo',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_users_role_idx on public.admin_users (role);
create index if not exists admin_users_active_idx on public.admin_users (is_active);

drop trigger if exists set_admin_users_updated_at on public.admin_users;
create trigger set_admin_users_updated_at
before update on public.admin_users
for each row
execute function public.set_updated_at();

-- Demo (and optionally others): multiple allowed URLs per admin user
create table if not exists public.admin_user_demo_urls (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.admin_users (id) on delete cascade,
  url text not null,
  label text,
  created_at timestamptz not null default now(),
  constraint admin_user_demo_urls_unique unique (admin_user_id, url)
);

create index if not exists admin_user_demo_urls_admin_user_id_idx
  on public.admin_user_demo_urls (admin_user_id);

-- ---------------------------------------------------------------------------
-- Survey responses (Postgres version of your MySQL schema)
-- Replaces varchar event_id with FK to public.events(id)
-- ---------------------------------------------------------------------------
create table if not exists public.survey_responses (
  id bigserial primary key,
  full_name varchar(150) not null,
  email varchar(255) not null,
  company_name varchar(150) not null,
  q1_overall_satisfaction smallint not null,
  q2_content_quality smallint not null,
  q3_event_experience smallint not null,
  q4_recommend_likelihood smallint not null,
  q5_expectations_met smallint not null,
  events_id uuid references public.events (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint survey_responses_q1_check check (q1_overall_satisfaction between 1 and 5),
  constraint survey_responses_q2_check check (q2_content_quality between 1 and 5),
  constraint survey_responses_q3_check check (q3_event_experience between 1 and 5),
  constraint survey_responses_q4_check check (q4_recommend_likelihood between 1 and 5),
  constraint survey_responses_q5_check check (q5_expectations_met between 1 and 5)
);

create index if not exists survey_responses_events_id_idx on public.survey_responses (events_id);
create index if not exists survey_responses_email_idx on public.survey_responses (email);
create index if not exists survey_responses_created_at_idx on public.survey_responses (created_at desc);

drop trigger if exists set_survey_responses_updated_at on public.survey_responses;
create trigger set_survey_responses_updated_at
before update on public.survey_responses
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS (tight defaults; extend when you wire the app)
-- ---------------------------------------------------------------------------
alter table public.admin_users enable row level security;
alter table public.admin_user_demo_urls enable row level security;

drop policy if exists "admin_users_select_self" on public.admin_users;
create policy "admin_users_select_self"
on public.admin_users
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "admin_user_demo_urls_select_self" on public.admin_user_demo_urls;
create policy "admin_user_demo_urls_select_self"
on public.admin_user_demo_urls
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users u
    where u.id = admin_user_demo_urls.admin_user_id
      and u.user_id = auth.uid()
  )
);

-- survey_responses: enable RLS only when you add insert/select policies.
-- Service role (server) bypasses RLS; anon/authenticated need policies if used from client.
-- alter table public.survey_responses enable row level security;

-- ---------------------------------------------------------------------------
-- Helper: create admin row when a new Auth user signs up (optional)
-- Uncomment if you want every new user to start as `demo`.
-- ---------------------------------------------------------------------------
-- create or replace function public.handle_new_user_admin()
-- returns trigger
-- language plpgsql
-- security definer
-- set search_path = public
-- as $$
-- begin
--   insert into public.admin_users (user_id, display_name, role)
--   values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'demo')
--   on conflict (user_id) do nothing;
--   return new;
-- end;
-- $$;
--
-- drop trigger if exists on_auth_user_created_admin on auth.users;
-- create trigger on_auth_user_created_admin
-- after insert on auth.users
-- for each row execute function public.handle_new_user_admin();
