-- Rollback for 0001_activity_events.sql
-- Drops everything created by the forward migration. Safe to run even if
-- some objects are already gone (IF EXISTS on every drop).

begin;

-- Realtime publication
alter publication supabase_realtime drop table if exists public.notifications;
alter publication supabase_realtime drop table if exists public.activity_events;

-- Source-table triggers
drop trigger if exists habit_logs_event_trg        on public.habit_logs;
drop trigger if exists body_stats_event_trg        on public.body_stats;
drop trigger if exists check_ins_event_trg         on public.check_ins;
drop trigger if exists workout_sessions_event_trg  on public.workout_sessions;

-- Fan-out trigger
drop trigger if exists activity_events_fanout_trg on public.activity_events;

-- Functions
drop function if exists public.trg_habit_logged();
drop function if exists public.trg_body_stat_logged();
drop function if exists public.trg_check_in_submitted();
drop function if exists public.trg_workout_session_completed();
drop function if exists public.activity_event_fanout();
drop function if exists public.emit_activity_event(uuid, public.activity_event_type, text, uuid, jsonb, timestamptz, uuid);

-- Tables (order matters: notifications references activity_events)
drop table if exists public.notifications;
drop table if exists public.activity_events;

-- Enum
drop type if exists public.activity_event_type;

commit;
