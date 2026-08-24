-- ============================================================================
-- Ride Tea GupShup — "Tapri" AI Assistant schema
-- ============================================================================
-- Kept separate from supabase/schema.sql on purpose — this feature can be
-- added, reset, or torn down independently of the rest of the database.
-- Run this once in Supabase → SQL Editor → New Query → Run. Safe to re-run
-- (every statement is idempotent, same convention as schema.sql).
--
-- Everything the assistant says/hears is logged here so an admin can review
-- conversations from the AI Assistant admin page. Rows are written only by
-- the server (api/ai/chat.js, using the service-role key) — never directly
-- from the browser — so there is no public insert policy below.
-- ============================================================================

create table if not exists ai_conversations (
  id uuid primary key default gen_random_uuid(),
  session_id text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table if not exists ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_messages_conversation_idx on ai_messages (conversation_id, created_at);
create index if not exists ai_conversations_last_message_idx on ai_conversations (last_message_at desc);

alter table ai_conversations enable row level security;
alter table ai_messages enable row level security;

-- Admins can read every conversation (oversight / quality control). A
-- logged-in member can read only their own — guests' conversations (no
-- user_id) are admin-only, since there's no session to authenticate a guest
-- back to their own thread.
drop policy if exists "ai_conversations admin or owner read" on ai_conversations;
create policy "ai_conversations admin or owner read" on ai_conversations
  for select using (is_admin() or user_id = auth.uid());

drop policy if exists "ai_messages admin or owner read" on ai_messages;
create policy "ai_messages admin or owner read" on ai_messages
  for select using (
    is_admin()
    or exists (
      select 1 from ai_conversations c
      where c.id = ai_messages.conversation_id and c.user_id = auth.uid()
    )
  );

-- Assistant configuration (name, greeting, enabled flag, system prompt) is
-- deliberately NOT a table here — it reuses the existing site_settings
-- key/value table (same one Site Content already writes to), under the
-- "ai.*" key prefix, so the AI Assistant admin page's Save button is the
-- exact same mechanism as every other admin-editable field on the site.
