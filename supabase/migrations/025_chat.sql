-- ============================================================================
-- Migration 025 — Live chat: community room, private messages, who's online
-- ============================================================================
-- Run AFTER 024, in the Supabase SQL Editor. Safe to re-run. Deletes nothing.
--
-- Powers /chat and the floating chat button (src/lib/ChatContext.jsx,
-- src/pages/Chat.jsx). Messages arrive instantly through Supabase Realtime
-- — no server functions involved, so the Vercel 12-function limit is
-- untouched. "Who's online" uses Realtime Presence and stores nothing.
--
--   chat_messages      the community room — every logged-in member reads it
--   direct_messages    one-to-one messages — only the two people involved
--                      can ever read them (admins included: no peeking)
--   chat_bans          members an admin has muted; they can read but not post
--
-- Abuse limits enforced here, not in the browser: 5 messages per 10 seconds
-- per person, 1,000 characters per message, timestamps set by the server.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists chat_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references auth.users (id) on delete set null,
  constraint chat_messages_body_check check (deleted_at is not null or char_length(btrim(body)) between 1 and 1000)
);

create index if not exists chat_messages_created_idx on chat_messages (created_at desc);
create index if not exists chat_messages_user_recent_idx on chat_messages (user_id, created_at desc);

create table if not exists direct_messages (
  id bigint generated always as identity primary key,
  sender_id uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint direct_messages_body_check check (char_length(btrim(body)) between 1 and 1000),
  constraint direct_messages_not_self check (sender_id <> recipient_id)
);

create index if not exists direct_messages_pair_idx
  on direct_messages (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at desc);
create index if not exists direct_messages_unread_idx on direct_messages (recipient_id) where read_at is null;
create index if not exists direct_messages_sender_recent_idx on direct_messages (sender_id, created_at desc);

create table if not exists chat_bans (
  user_id uuid primary key references auth.users (id) on delete cascade,
  banned_by uuid references auth.users (id) on delete set null default auth.uid(),
  reason text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function chat_is_banned(p_user uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (select 1 from public.chat_bans b where b.user_id = p_user);
$$;

-- Spam guard + honest timestamps for both message tables.
create or replace function chat_before_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_recent int;
begin
  if tg_table_name = 'chat_messages' then
    select count(*) into v_recent from public.chat_messages
    where user_id = new.user_id and created_at > now() - interval '10 seconds';
  else
    select count(*) into v_recent from public.direct_messages
    where sender_id = new.sender_id and created_at > now() - interval '10 seconds';
  end if;

  if v_recent >= 5 then
    raise exception 'chat_rate_limited' using hint = 'Max 5 messages per 10 seconds.';
  end if;

  new.body := btrim(new.body);
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists chat_messages_before_insert on chat_messages;
create trigger chat_messages_before_insert
  before insert on chat_messages
  for each row execute function chat_before_insert();

drop trigger if exists direct_messages_before_insert on direct_messages;
create trigger direct_messages_before_insert
  before insert on direct_messages
  for each row execute function chat_before_insert();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table chat_messages enable row level security;
alter table direct_messages enable row level security;
alter table chat_bans enable row level security;

-- Community room: any logged-in member reads; you post only as yourself,
-- and not while muted. No update/delete policies — removing a message goes
-- through chat_delete_message() below, which blanks it.
drop policy if exists "chat_messages member read" on chat_messages;
create policy "chat_messages member read" on chat_messages
  for select using (auth.uid() is not null);

drop policy if exists "chat_messages own insert" on chat_messages;
create policy "chat_messages own insert" on chat_messages
  for insert with check (
    user_id = auth.uid()
    and deleted_at is null
    and not chat_is_banned(auth.uid())
  );

-- Private messages: only the sender and the recipient, ever.
drop policy if exists "direct_messages participants read" on direct_messages;
create policy "direct_messages participants read" on direct_messages
  for select using (auth.uid() = sender_id or auth.uid() = recipient_id);

drop policy if exists "direct_messages own insert" on direct_messages;
create policy "direct_messages own insert" on direct_messages
  for insert with check (
    sender_id = auth.uid()
    and read_at is null
    and not chat_is_banned(auth.uid())
  );

-- Mutes: you can see whether you are muted; admins see and manage all.
drop policy if exists "chat_bans read" on chat_bans;
create policy "chat_bans read" on chat_bans
  for select using (user_id = auth.uid() or is_admin());

drop policy if exists "chat_bans admin insert" on chat_bans;
create policy "chat_bans admin insert" on chat_bans
  for insert with check (is_admin());

drop policy if exists "chat_bans admin delete" on chat_bans;
create policy "chat_bans admin delete" on chat_bans
  for delete using (is_admin());

-- ---------------------------------------------------------------------------
-- Functions the chat page calls
-- ---------------------------------------------------------------------------

-- Public chat identity for a set of members: name, photo, city, admin badge.
-- profiles itself stays private; this exposes only what the chat shows, and
-- only to logged-in members. The admin badge comes from here (never from
-- the browser), so nobody can fake one.
create or replace function chat_people(p_ids uuid[])
returns table (id uuid, full_name text, avatar_url text, city text, is_admin boolean)
language sql
stable
security definer set search_path = public
as $$
  select p.id,
         coalesce(nullif(btrim(p.full_name), ''), 'RTG Member'),
         p.avatar_url,
         p.city,
         exists (select 1 from public.admin_profiles ap where ap.id = p.id)
  from public.profiles p
  where auth.uid() is not null
    and p.id = any (p_ids[1:200]);
$$;

-- Removes a room message: its author or an admin. The row stays (so the
-- conversation doesn't jump) but its text is wiped.
create or replace function chat_delete_message(p_id bigint)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;
  update public.chat_messages
  set deleted_at = now(), deleted_by = auth.uid(), body = ''
  where id = p_id
    and deleted_at is null
    and (user_id = auth.uid() or is_admin());
  if not found then
    raise exception 'not_allowed';
  end if;
end;
$$;

-- Marks everything one person sent you as read.
create or replace function chat_mark_read(p_other uuid)
returns void
language sql
security definer set search_path = public
as $$
  update public.direct_messages
  set read_at = now()
  where recipient_id = auth.uid() and sender_id = p_other and read_at is null;
$$;

-- Your conversations: the other person, the last message, unread count.
create or replace function chat_conversations()
returns table (other_id uuid, last_body text, last_at timestamptz, last_from_me boolean, unread int)
language sql
stable
security definer set search_path = public
as $$
  with mine as (
    select
      case when dm.sender_id = auth.uid() then dm.recipient_id else dm.sender_id end as other_id,
      dm.body,
      dm.created_at,
      dm.sender_id = auth.uid() as from_me,
      (dm.recipient_id = auth.uid() and dm.read_at is null) as is_unread
    from public.direct_messages dm
    where auth.uid() is not null
      and (dm.sender_id = auth.uid() or dm.recipient_id = auth.uid())
  ),
  latest as (
    select distinct on (other_id) other_id, body, created_at, from_me
    from mine
    order by other_id, created_at desc
  )
  select l.other_id, l.body, l.created_at, l.from_me,
         (select count(*)::int from mine m where m.other_id = l.other_id and m.is_unread)
  from latest l
  order by l.created_at desc;
$$;

revoke all on function chat_people(uuid[]) from public;
revoke all on function chat_delete_message(bigint) from public;
revoke all on function chat_mark_read(uuid) from public;
revoke all on function chat_conversations() from public;
grant execute on function chat_people(uuid[]) to authenticated;
grant execute on function chat_delete_message(bigint) to authenticated;
grant execute on function chat_mark_read(uuid) to authenticated;
grant execute on function chat_conversations() to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: stream new and removed messages to the browser. Each listener
-- only receives rows its own RLS lets it read, so private messages reach
-- only their two participants.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'chat_messages') then
      alter publication supabase_realtime add table chat_messages;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'direct_messages') then
      alter publication supabase_realtime add table direct_messages;
    end if;
  end if;
end $$;
