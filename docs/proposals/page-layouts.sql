-- STATUS UPDATE: approved variant applied to TEST cxwfjrntfqlyaqppxggh on 21 Oct 2026.
-- See docs/launch-audit/approved-test-storage-bundle.sql and test-storage-application.md.
-- Do not rerun this original proposal; layout endpoint activation remains pending.
-- PROPOSAL ONLY. Do not apply before test-project identity, admin grants and
-- permissions have been reviewed and approved. This is intentionally outside
-- supabase/migrations so it cannot be picked up by normal migration commands.
begin;
create table public.page_layout_drafts (
 page_key text primary key check (page_key ~ '^[a-z0-9][a-z0-9/_-]{0,99}$'),
 document jsonb not null check (coalesce(document->>'schema' = '1' and jsonb_typeof(document->'sections') = 'array', false)),
 revision bigint not null check (revision > 0), updated_by uuid not null,
 updated_at timestamptz not null default now()
);
create table public.page_layout_published (
 page_key text primary key references public.page_layout_drafts(page_key),
 document jsonb not null, revision bigint not null, published_at timestamptz not null default now()
);
create table public.page_layout_revisions (
 id bigint generated always as identity primary key,
 page_key text not null, document jsonb not null, revision bigint not null,
 action text not null check (action in ('save','publish')), actor uuid not null,
 created_at timestamptz not null default now()
);
alter table public.page_layout_drafts enable row level security;
alter table public.page_layout_published enable row level security;
alter table public.page_layout_revisions enable row level security;
-- No browser role can access any of these tables directly. Public reads use the
-- hardcoded published projection in the server endpoint. No draft read policy.
revoke all on public.page_layout_drafts, public.page_layout_published, public.page_layout_revisions from public, anon, authenticated;
grant all on public.page_layout_drafts, public.page_layout_published, public.page_layout_revisions to service_role;
grant usage, select on sequence public.page_layout_revisions_id_seq to service_role;
create function public.rtg_write_page_layout(p_page_key text,p_expected_revision bigint,p_document jsonb,p_actor uuid,p_publish boolean)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare current_row public.page_layout_drafts; next_revision bigint;
begin
 if p_page_key is null or p_page_key !~ '^[a-z0-9][a-z0-9/_-]{0,99}$' or p_expected_revision is null or p_expected_revision < 0 or p_actor is null or p_publish is null then raise exception 'invalid_input'; end if;
 -- Serialize saves/publishes per page, including the first insert.
 perform pg_advisory_xact_lock(hashtextextended(p_page_key, 7331));
 select * into current_row from public.page_layout_drafts where page_key = p_page_key for update;
 if coalesce(current_row.revision,0) <> p_expected_revision then raise exception 'revision_conflict'; end if;
 if p_publish then
   if current_row.page_key is null then raise exception 'revision_conflict'; end if;
   insert into public.page_layout_published(page_key,document,revision,published_at) values(p_page_key,current_row.document,current_row.revision,now()) on conflict(page_key) do update set document=excluded.document,revision=excluded.revision,published_at=excluded.published_at;
   insert into public.page_layout_revisions(page_key,document,revision,action,actor) values(p_page_key,current_row.document,current_row.revision,'publish',p_actor);
   return jsonb_build_object('page_key',p_page_key,'document',current_row.document,'revision',current_row.revision,'published_at',now());
 end if;
 if p_document is null or p_document->>'schema' is distinct from '1' or jsonb_typeof(p_document->'sections') is distinct from 'array' then raise exception 'invalid_document'; end if;
 if jsonb_array_length(p_document->'sections') < 1 or jsonb_array_length(p_document->'sections') > 20 then raise exception 'invalid_document'; end if;
 next_revision := p_expected_revision + 1;
 insert into public.page_layout_drafts(page_key,document,revision,updated_by,updated_at) values(p_page_key,p_document,next_revision,p_actor,now()) on conflict(page_key) do update set document=excluded.document,revision=excluded.revision,updated_by=excluded.updated_by,updated_at=excluded.updated_at;
 insert into public.page_layout_revisions(page_key,document,revision,action,actor) values(p_page_key,p_document,next_revision,'save',p_actor);
 return jsonb_build_object('page_key',p_page_key,'document',p_document,'revision',next_revision,'updated_at',now());
end $$;
revoke all on function public.rtg_write_page_layout(text,bigint,jsonb,uuid,boolean) from public, anon, authenticated;
grant execute on function public.rtg_write_page_layout(text,bigint,jsonb,uuid,boolean) to service_role;
commit;
