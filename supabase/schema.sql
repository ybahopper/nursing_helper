create extension if not exists "uuid-ossp";

create table if not exists jobs (
  id uuid primary key default uuid_generate_v4(),
  job_id text unique not null,
  title text not null,
  hospital text not null,
  link text not null,
  created_at timestamptz not null default now()
);

create index if not exists jobs_created_at_idx on jobs (created_at desc);

alter table jobs enable row level security;

create policy "Public read access" on jobs
  for select using (true);
