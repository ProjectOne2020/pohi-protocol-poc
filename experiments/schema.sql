-- PoHI keystroke dynamics study — collection database schema.
--
-- Committed so the privacy guarantees stated in README.md section 3 can be audited without
-- access to the researcher's account, and so the study can be re-provisioned from scratch on
-- any PostgreSQL instance offering Row Level Security (Supabase, or plain Postgres with the
-- `anon` role defined).
--
-- PRIVACY MODEL
--   * No column can hold personal data: there is no name, email, IP or user agent.
--   * events_carry_no_text() is enforced by CHECK constraint, so typed text cannot be stored
--     even if the collection page is modified by a participant or an attacker.
--   * RLS grants INSERT to the anonymous role and nothing else. A holder of the publishable
--     key may contribute a session but cannot read, alter or delete any submission, including
--     their own. Reading requires the service role key, held only by the researcher.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------------------
-- Validation helpers
--
-- Both are IMMUTABLE so they may be referenced from CHECK constraints, and both pin
-- search_path: without that, a role-level search_path could shadow a referenced object and
-- subvert the very constraints that enforce the privacy invariant.
-- ---------------------------------------------------------------------------------------

create or replace function public.events_carry_no_text(ev jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    bool_and(
      not (element ? 'key' or element ? 'char' or element ? 'text'
           or element ? 'code' or element ? 'keyCode' or element ? 'value')
    ),
    true
  )
  from jsonb_array_elements(ev) as element
$$;

create or replace function public.events_are_well_formed(ev jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    bool_and(
      jsonb_typeof(element -> 'isBackspace') = 'boolean'
      and jsonb_typeof(element -> 'pressTime') = 'number'
      and jsonb_typeof(element -> 'releaseTime') = 'number'
      and (element ->> 'releaseTime')::double precision
          >= (element ->> 'pressTime')::double precision
    ),
    false
  )
  from jsonb_array_elements(ev) as element
$$;

-- ---------------------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------------------

create table if not exists public.keystroke_sessions (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),

  schema_version integer not null,

  -- Free-text label so separate collection rounds can be analysed independently.
  study_batch text not null default 'default',

  -- Client-generated identifiers. participant_token links the several sessions contributed by
  -- one person so they are not treated as statistically independent, without identifying them.
  session_id text not null,
  participant_token text not null,

  device text not null,
  context_length integer not null,
  render_time double precision not null,

  events jsonb not null,
  event_count integer not null,

  client_collected_at timestamptz,

  constraint schema_version_supported
    check (schema_version = 1),
  constraint device_is_known
    check (device in ('desktop-mechanical', 'laptop-scissor',
                      'ios-capacitive', 'android-capacitive', 'unknown')),
  constraint context_length_sane
    check (context_length >= 0 and context_length <= 100000),
  constraint render_time_finite
    check (render_time >= 0),
  constraint events_is_array
    check (jsonb_typeof(events) = 'array'),
  constraint event_count_sane
    check (event_count >= 1 and event_count <= 5000),
  constraint event_count_matches_payload
    check (event_count = jsonb_array_length(events)),
  constraint identifiers_bounded
    check (length(session_id) between 1 and 128
           and length(participant_token) between 1 and 128
           and length(study_batch) between 1 and 64),
  constraint events_contain_no_text
    check (public.events_carry_no_text(events)),
  constraint events_well_formed
    check (public.events_are_well_formed(events))
);

comment on table public.keystroke_sessions is
  'Anonymous keystroke timing sessions for the PoHI empirical evaluation. Contains no personal data and no typed text; see the events_contain_no_text constraint.';
comment on column public.keystroke_sessions.participant_token is
  'Random client-side token linking sessions from one contributor. Not an identity.';
comment on column public.keystroke_sessions.events is
  'Array of {isBackspace, pressTime, releaseTime}. Character identities are rejected by constraint.';

create index if not exists keystroke_sessions_batch_received_idx
  on public.keystroke_sessions (study_batch, received_at desc);
create index if not exists keystroke_sessions_participant_idx
  on public.keystroke_sessions (participant_token);

-- ---------------------------------------------------------------------------------------
-- Row Level Security: contribute-only
-- ---------------------------------------------------------------------------------------

alter table public.keystroke_sessions enable row level security;

drop policy if exists "anon may contribute one well formed session"
  on public.keystroke_sessions;

create policy "anon may contribute one well formed session"
  on public.keystroke_sessions
  for insert
  to anon
  with check (
    schema_version = 1
    and event_count between 1 and 5000
    and event_count = jsonb_array_length(events)
    and length(session_id) between 1 and 128
    and length(participant_token) between 1 and 128
    and length(study_batch) between 1 and 64
    and device in ('desktop-mechanical', 'laptop-scissor',
                   'ios-capacitive', 'android-capacitive', 'unknown')
    and public.events_carry_no_text(events)
    and public.events_are_well_formed(events)
  );

-- Deliberately no SELECT, UPDATE or DELETE policy. Their absence is the access control.
