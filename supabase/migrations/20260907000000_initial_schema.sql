create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'reviewer')) default 'reviewer',
  created_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  priority text not null check (priority in ('high', 'medium', 'low')) default 'medium',
  target_share numeric(5,4) not null default 0 check (target_share >= 0 and target_share <= 1),
  enabled boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.target_audiences (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null,
  priority text not null check (priority in ('high', 'medium', 'low')) default 'medium',
  relevant_campaigns text[] not null default '{}',
  preferred_platforms text[] not null default '{}',
  content_angles text[] not null default '{}',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.benchmark_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_type text not null check (source_type in ('Official', 'Community', 'Secondary')),
  organization_account text,
  platforms text[] not null default '{}',
  url text,
  search_queries text[] not null default '{}',
  enabled boolean not null default true,
  verification_status text not null default 'Not yet verified',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.benchmark_runs (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  trigger text not null check (trigger in ('scheduled', 'on_demand')),
  status text not null check (status in ('queued', 'running', 'completed', 'failed', 'blocked')) default 'queued',
  request_json jsonb,
  error_message text,
  requested_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.benchmark_observations (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.benchmark_runs(id) on delete cascade,
  source_id uuid references public.benchmark_sources(id) on delete set null,
  source_url text not null,
  published_at date not null,
  platform text not null,
  content_type text not null,
  theme text not null,
  summary text not null,
  signals jsonb not null default '{}',
  relevance_to_tscp text not null check (relevance_to_tscp in ('high', 'medium', 'low', 'unknown')),
  adaptation_notes text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.content_calendars (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  status text not null check (status in ('draft', 'reviewed', 'approved', 'archived')) default 'draft',
  strategy_summary text,
  validation jsonb not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_posts (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.content_calendars(id) on delete cascade,
  suggested_date date not null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  audience_id uuid references public.target_audiences(id) on delete set null,
  platform text not null,
  theme text not null,
  format text not null check (format in ('individual_post', 'reel_vertical_video', 'carousel')),
  idea text not null,
  cta text not null,
  format_skeleton text[] not null default '{}',
  benchmark_references uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists benchmark_runs_period_idx on public.benchmark_runs(period_start, period_end);
create index if not exists benchmark_observations_run_idx on public.benchmark_observations(run_id);
create index if not exists content_posts_calendar_idx on public.content_posts(calendar_id);

alter table public.admin_users enable row level security;
alter table public.campaigns enable row level security;
alter table public.target_audiences enable row level security;
alter table public.benchmark_sources enable row level security;
alter table public.benchmark_runs enable row level security;
alter table public.benchmark_observations enable row level security;
alter table public.content_calendars enable row level security;
alter table public.content_posts enable row level security;

create policy "admins can read admin users" on public.admin_users for select to authenticated using (user_id = (select auth.uid()));
create policy "admins can manage campaigns" on public.campaigns for all to authenticated using (exists (select 1 from public.admin_users where user_id = (select auth.uid()) and role = 'admin')) with check (exists (select 1 from public.admin_users where user_id = (select auth.uid()) and role = 'admin'));
create policy "admins can read campaigns" on public.campaigns for select to authenticated using (exists (select 1 from public.admin_users where user_id = (select auth.uid())));
create policy "admins can manage audiences" on public.target_audiences for all to authenticated using (exists (select 1 from public.admin_users where user_id = (select auth.uid()) and role = 'admin')) with check (exists (select 1 from public.admin_users where user_id = (select auth.uid()) and role = 'admin'));
create policy "admins can read audiences" on public.target_audiences for select to authenticated using (exists (select 1 from public.admin_users where user_id = (select auth.uid())));
create policy "admins can manage sources" on public.benchmark_sources for all to authenticated using (exists (select 1 from public.admin_users where user_id = (select auth.uid()) and role = 'admin')) with check (exists (select 1 from public.admin_users where user_id = (select auth.uid()) and role = 'admin'));
create policy "admins can read sources" on public.benchmark_sources for select to authenticated using (exists (select 1 from public.admin_users where user_id = (select auth.uid())));
create policy "members can read runs" on public.benchmark_runs for select to authenticated using (exists (select 1 from public.admin_users));
create policy "members can create runs" on public.benchmark_runs for insert to authenticated with check (exists (select 1 from public.admin_users));
create policy "admins can update runs" on public.benchmark_runs for update to authenticated using (exists (select 1 from public.admin_users where user_id = (select auth.uid()) and role = 'admin')) with check (exists (select 1 from public.admin_users where user_id = (select auth.uid()) and role = 'admin'));
create policy "admins can delete runs" on public.benchmark_runs for delete to authenticated using (exists (select 1 from public.admin_users where user_id = (select auth.uid()) and role = 'admin'));
create policy "members can read observations" on public.benchmark_observations for select to authenticated using (exists (select 1 from public.admin_users));
create policy "admins can manage observations" on public.benchmark_observations for all to authenticated using (exists (select 1 from public.admin_users where user_id = (select auth.uid()) and role = 'admin')) with check (exists (select 1 from public.admin_users where user_id = (select auth.uid()) and role = 'admin'));
create policy "members can read calendars" on public.content_calendars for select to authenticated using (exists (select 1 from public.admin_users));
create policy "admins can manage calendars" on public.content_calendars for all to authenticated using (exists (select 1 from public.admin_users where user_id = (select auth.uid()) and role = 'admin')) with check (exists (select 1 from public.admin_users where user_id = (select auth.uid()) and role = 'admin'));
create policy "members can read posts" on public.content_posts for select to authenticated using (exists (select 1 from public.admin_users));
create policy "admins can manage posts" on public.content_posts for all to authenticated using (exists (select 1 from public.admin_users where user_id = (select auth.uid()) and role = 'admin')) with check (exists (select 1 from public.admin_users where user_id = (select auth.uid()) and role = 'admin'));

insert into public.campaigns (slug, name, description, priority, target_share) values
  ('volunteering', 'Volunteering', 'Show how people can contribute skills, time, and expertise to TSCP''s mission.', 'high', 0.6),
  ('marketplace', 'TSCP Marketplace', 'Promote the marketplace and the connection of products or services with NGO and supply-chain needs.', 'medium', 0.4)
on conflict (slug) do nothing;

insert into public.target_audiences (name, description, priority, relevant_campaigns, preferred_platforms, content_angles) values
  ('NGOs', 'Organizations seeking practical, mission-aligned supply-chain support.', 'high', array['Volunteering', 'TSCP Marketplace'], array['LinkedIn'], array['mission-aligned support', 'practical supply-chain solutions', 'evidenced impact']),
  ('Volunteers', 'People who can contribute skills, time, and expertise.', 'high', array['Volunteering'], array['LinkedIn'], array['volunteer stories', 'skills in action', 'accessible ways to contribute']),
  ('Companies', 'Companies and teams interested in purposeful partnerships and responsible supply chains.', 'high', array['TSCP Marketplace', 'Volunteering'], array['LinkedIn'], array['purposeful partnerships', 'in-kind contribution', 'employee expertise'])
on conflict (name) do nothing;

insert into public.benchmark_sources (name, source_type, platforms, search_queries) values
  ('NGO and nonprofit impact communicators', 'Official', array['LinkedIn', 'Instagram'], array['NGO impact story', 'nonprofit volunteer impact', 'humanitarian supply chain']),
  ('Volunteer-led organizations', 'Community', array['LinkedIn', 'Instagram'], array['volunteer recruitment nonprofit', 'volunteer story organization']),
  ('Supply-chain and logistics organizations', 'Official', array['LinkedIn'], array['humanitarian logistics', 'supply chain social impact', 'NGO procurement']),
  ('Social-impact brand communicators', 'Secondary', array['LinkedIn', 'Instagram'], array['social impact storytelling nonprofit', 'purpose driven organization content']);
