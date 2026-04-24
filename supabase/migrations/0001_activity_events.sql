-- =========================================================================
-- Sprint 1: Activity Events + Notifications
-- =========================================================================
-- Append-only event log for coach-visible client activity + per-coach
-- notification queue. Backbone for the dashboard activity feed, the
-- in-app notification bell, future automated-messaging rules, and
-- auto-progression.
--
-- Source-of-truth tables (workout_sessions, check_ins, body_stats,
-- habit_logs) remain authoritative. Events are derived via AFTER INSERT
-- triggers so no application code changes are required for writes to
-- start producing events.
--
-- To apply: paste this file into the Supabase dashboard SQL editor and
-- run. Wrapped in a single transaction — either everything applies or
-- nothing does. Safe to run on a database with existing data; backfill
-- is bounded to the last 90 days.
-- =========================================================================

begin;

-- -------------------------------------------------------------------------
-- 1. Event type enum (extend later: walk_completed, pr_hit, missed_workout)
-- -------------------------------------------------------------------------
create type public.activity_event_type as enum (
  'workout_completed',
  'check_in_submitted',
  'body_stat_logged',
  'habit_logged'
);

-- -------------------------------------------------------------------------
-- 2. activity_events
-- -------------------------------------------------------------------------
create table public.activity_events (
  id             uuid primary key default gen_random_uuid(),
  coach_id       uuid not null references public.profiles(id) on delete cascade,
  client_id      uuid not null references public.profiles(id) on delete cascade,
  event_type     public.activity_event_type not null,
  subject_table  text not null,
  subject_id     uuid not null,
  payload        jsonb not null default '{}'::jsonb,
  occurred_at    timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

-- Idempotency: same source row never produces duplicate events for a coach
create unique index activity_events_subject_unique
  on public.activity_events (subject_table, subject_id, coach_id, event_type);

-- Hot path: coach homepage merged feed
create index activity_events_coach_recent_idx
  on public.activity_events (coach_id, occurred_at desc)
  where deleted_at is null;

-- Per-client timeline on /clients/[clientId]
create index activity_events_client_recent_idx
  on public.activity_events (client_id, occurred_at desc)
  where deleted_at is null;

-- Rules engine / progression engine: scan by type
create index activity_events_type_idx
  on public.activity_events (event_type, occurred_at desc)
  where deleted_at is null;

-- -------------------------------------------------------------------------
-- 3. notifications
-- -------------------------------------------------------------------------
create table public.notifications (
  id            uuid primary key default gen_random_uuid(),
  recipient_id  uuid not null references public.profiles(id) on delete cascade,
  event_id      uuid not null references public.activity_events(id) on delete cascade,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);

create unique index notifications_recipient_event_unique
  on public.notifications (recipient_id, event_id);

create index notifications_recipient_unread_idx
  on public.notifications (recipient_id, created_at desc)
  where read_at is null;

create index notifications_recipient_all_idx
  on public.notifications (recipient_id, created_at desc);

-- -------------------------------------------------------------------------
-- 4. RLS
-- -------------------------------------------------------------------------
alter table public.activity_events enable row level security;
alter table public.notifications  enable row level security;

-- Events visible to the coach they belong to, and to the client themselves
-- (lets the mobile app show a personal activity timeline later).
create policy activity_events_select
  on public.activity_events for select
  using (coach_id = auth.uid() or client_id = auth.uid());

-- No insert/update/delete policies: writes go through SECURITY DEFINER
-- trigger functions only. Clients and coaches cannot forge events.

create policy notifications_select
  on public.notifications for select
  using (recipient_id = auth.uid());

create policy notifications_update
  on public.notifications for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- -------------------------------------------------------------------------
-- 5. Emit helper — fan out one source row to every active coach of the
--    client, or to a single explicit coach when the source row already
--    carries coach_id (check_ins, habit_assignments).
-- -------------------------------------------------------------------------
create or replace function public.emit_activity_event(
  p_client_id     uuid,
  p_event_type    public.activity_event_type,
  p_subject_table text,
  p_subject_id    uuid,
  p_payload       jsonb default '{}'::jsonb,
  p_occurred_at   timestamptz default now(),
  p_coach_id      uuid default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_coach_id is not null then
    insert into public.activity_events
      (coach_id, client_id, event_type, subject_table, subject_id, payload, occurred_at)
    values
      (p_coach_id, p_client_id, p_event_type, p_subject_table, p_subject_id,
       coalesce(p_payload, '{}'::jsonb), p_occurred_at)
    on conflict (subject_table, subject_id, coach_id, event_type) do nothing;
    return;
  end if;

  insert into public.activity_events
    (coach_id, client_id, event_type, subject_table, subject_id, payload, occurred_at)
  select cc.coach_id,
         p_client_id,
         p_event_type,
         p_subject_table,
         p_subject_id,
         coalesce(p_payload, '{}'::jsonb),
         p_occurred_at
    from public.coach_clients cc
   where cc.client_id = p_client_id
     and cc.status = 'active'
  on conflict (subject_table, subject_id, coach_id, event_type) do nothing;
end;
$$;

-- -------------------------------------------------------------------------
-- 6. Fan-out: every activity_events row => notification for its coach
-- -------------------------------------------------------------------------
create or replace function public.activity_event_fanout()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (recipient_id, event_id)
  values (new.coach_id, new.id)
  on conflict (recipient_id, event_id) do nothing;
  return new;
end;
$$;

create trigger activity_events_fanout_trg
  after insert on public.activity_events
  for each row
  execute function public.activity_event_fanout();

-- -------------------------------------------------------------------------
-- 7. Source-table triggers
-- -------------------------------------------------------------------------

-- 7a. workout_sessions — fires when a session is completed (ended_at set)
create or replace function public.trg_workout_session_completed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.ended_at is not null
     and (tg_op = 'INSERT' or old.ended_at is null) then
    perform public.emit_activity_event(
      new.user_id,
      'workout_completed'::public.activity_event_type,
      'workout_sessions',
      new.id,
      jsonb_build_object(
        'title', new.title,
        'started_at', new.started_at,
        'ended_at', new.ended_at
      ),
      new.ended_at
    );
  end if;
  return new;
end;
$$;

create trigger workout_sessions_event_trg
  after insert or update of ended_at on public.workout_sessions
  for each row
  execute function public.trg_workout_session_completed();

-- 7b. check_ins — fires when status transitions to 'submitted'
create or replace function public.trg_check_in_submitted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'submitted'
     and (tg_op = 'INSERT' or old.status is distinct from 'submitted') then
    perform public.emit_activity_event(
      new.client_id,
      'check_in_submitted'::public.activity_event_type,
      'check_ins',
      new.id,
      jsonb_build_object('submitted_at', new.submitted_at),
      coalesce(new.submitted_at, now()),
      new.coach_id
    );
  end if;
  return new;
end;
$$;

create trigger check_ins_event_trg
  after insert or update of status on public.check_ins
  for each row
  execute function public.trg_check_in_submitted();

-- 7c. body_stats
create or replace function public.trg_body_stat_logged()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.emit_activity_event(
    new.client_id,
    'body_stat_logged'::public.activity_event_type,
    'body_stats',
    new.id,
    jsonb_build_object(
      'weight_kg', new.weight_kg,
      'body_fat_pct', new.body_fat_pct,
      'date', new.date
    ),
    coalesce(new.created_at, now())
  );
  return new;
end;
$$;

create trigger body_stats_event_trg
  after insert on public.body_stats
  for each row
  execute function public.trg_body_stat_logged();

-- 7d. habit_logs — resolve client + coach via habit_assignments
create or replace function public.trg_habit_logged()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid;
  v_coach_id  uuid;
  v_name      text;
begin
  select ha.client_id, ha.coach_id, ha.name
    into v_client_id, v_coach_id, v_name
    from public.habit_assignments ha
   where ha.id = new.habit_id;

  if v_client_id is null then
    return new;
  end if;

  perform public.emit_activity_event(
    v_client_id,
    'habit_logged'::public.activity_event_type,
    'habit_logs',
    new.id,
    jsonb_build_object(
      'habit_name', v_name,
      'date', new.date,
      'count_completed', new.count_completed
    ),
    now(),
    v_coach_id
  );
  return new;
end;
$$;

create trigger habit_logs_event_trg
  after insert on public.habit_logs
  for each row
  execute function public.trg_habit_logged();

-- -------------------------------------------------------------------------
-- 8. Realtime: publish so the coach dashboard can subscribe
-- -------------------------------------------------------------------------
alter publication supabase_realtime add table public.activity_events;
alter publication supabase_realtime add table public.notifications;

-- -------------------------------------------------------------------------
-- 9. Backfill — last 90 days
--    Fan-out trigger fires per row, so notifications get created too.
-- -------------------------------------------------------------------------
do $$
declare
  cutoff timestamptz := now() - interval '90 days';
begin
  -- Completed workouts
  insert into public.activity_events
    (coach_id, client_id, event_type, subject_table, subject_id, payload, occurred_at)
  select cc.coach_id,
         ws.user_id,
         'workout_completed'::public.activity_event_type,
         'workout_sessions',
         ws.id,
         jsonb_build_object('title', ws.title,
                            'started_at', ws.started_at,
                            'ended_at', ws.ended_at),
         ws.ended_at
    from public.workout_sessions ws
    join public.coach_clients cc
      on cc.client_id = ws.user_id
     and cc.status = 'active'
   where ws.ended_at is not null
     and ws.ended_at >= cutoff
  on conflict (subject_table, subject_id, coach_id, event_type) do nothing;

  -- Submitted check-ins (coach_id on row)
  insert into public.activity_events
    (coach_id, client_id, event_type, subject_table, subject_id, payload, occurred_at)
  select ci.coach_id,
         ci.client_id,
         'check_in_submitted'::public.activity_event_type,
         'check_ins',
         ci.id,
         jsonb_build_object('submitted_at', ci.submitted_at),
         coalesce(ci.submitted_at, ci.created_at)
    from public.check_ins ci
   where ci.status = 'submitted'
     and coalesce(ci.submitted_at, ci.created_at) >= cutoff
  on conflict (subject_table, subject_id, coach_id, event_type) do nothing;

  -- Body stats
  insert into public.activity_events
    (coach_id, client_id, event_type, subject_table, subject_id, payload, occurred_at)
  select cc.coach_id,
         bs.client_id,
         'body_stat_logged'::public.activity_event_type,
         'body_stats',
         bs.id,
         jsonb_build_object('weight_kg', bs.weight_kg,
                            'body_fat_pct', bs.body_fat_pct,
                            'date', bs.date),
         bs.created_at
    from public.body_stats bs
    join public.coach_clients cc
      on cc.client_id = bs.client_id
     and cc.status = 'active'
   where bs.created_at >= cutoff
  on conflict (subject_table, subject_id, coach_id, event_type) do nothing;

  -- Habit logs (coach_id on habit_assignments)
  insert into public.activity_events
    (coach_id, client_id, event_type, subject_table, subject_id, payload, occurred_at)
  select ha.coach_id,
         ha.client_id,
         'habit_logged'::public.activity_event_type,
         'habit_logs',
         hl.id,
         jsonb_build_object('habit_name', ha.name,
                            'date', hl.date,
                            'count_completed', hl.count_completed),
         hl.date::timestamptz
    from public.habit_logs hl
    join public.habit_assignments ha on ha.id = hl.habit_id
   where hl.date::timestamptz >= cutoff
  on conflict (subject_table, subject_id, coach_id, event_type) do nothing;
end $$;

-- Pre-mark backfilled notifications as read so the coach isn't flooded
-- with 90 days of unread items when they first open the bell.
update public.notifications n
   set read_at = now()
  from public.activity_events ae
 where n.event_id = ae.id
   and ae.occurred_at < now() - interval '24 hours'
   and n.read_at is null;

commit;
