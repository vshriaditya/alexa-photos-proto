create extension if not exists vector;

create table if not exists photos (
  id text primary key,
  batch_id text,
  source text not null default 'uploaded',
  status text not null default 'ready',
  title text not null,
  image_url text not null,
  caption text not null,
  story text not null,
  labels text[] not null default '{}',
  people text[] not null default '{}',
  year int not null,
  month int not null,
  location text not null,
  emotion text not null,
  color text not null,
  searchable_text text,
  raw_analysis text,
  primary_subject text,
  secondary_subjects text[] not null default '{}',
  objects text[] not null default '{}',
  scene text,
  activities text[] not null default '{}',
  normalized_tags text[] not null default '{}'
);

create table if not exists upload_batches (
  id text primary key,
  total_count int not null,
  processed_count int not null default 0,
  ready_count int not null default 0,
  failed_count int not null default 0,
  status text not null default 'uploading',
  created_at timestamptz not null default now()
);

create table if not exists events (
  id bigint generated always as identity primary key,
  session_id text not null,
  event_type text not null,
  query_text text,
  photo_ids text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists events_session_id_idx on events (session_id);
create index if not exists photos_batch_id_idx on photos (batch_id);
