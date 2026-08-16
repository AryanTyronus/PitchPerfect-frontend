-- PitchPerfect sessions table (Supabase PostgreSQL)
-- Run this in the Supabase SQL editor (or via the Supabase CLI) before persisting sessions.

create table if not exists public.sessions (
    session_id text primary key,
    user_id text not null default 'demo_user',
    created_at timestamptz not null default now(),
    wpm_score double precision,
    filler_count integer,
    eye_contact_score double precision,
    star_feedback jsonb,
    questions jsonb
);

create index if not exists sessions_user_id_created_at_idx
    on public.sessions (user_id, created_at desc);

-- Row Level Security: enable and allow the anon/service key to read/write demo_user rows.
-- Adjust the policy to match your auth model.
alter table public.sessions enable row level security;

create policy "Allow demo_user access"
    on public.sessions
    for all
    using (user_id = 'demo_user')
    with check (user_id = 'demo_user');
