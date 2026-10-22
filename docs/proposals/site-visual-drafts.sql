-- LOCAL REVIEW ONLY. Do not apply automatically. No table, RLS, owner allowlist,
-- published snapshot or existing Ridge RPC is changed by this proposal.
-- Preconditions: approved page_layout_* tables and service_role already exist.
begin;
create function public.rtg_write_site_draft(p_page_key text,p_expected_revision bigint,p_document jsonb,p_actor uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare current_row public.page_layout_drafts; next_revision bigint; document_page text;
begin
 if p_page_key is null or p_page_key !~ '^site/(home|community|lab|about|volunteer|community/[0-9a-f-]{36})$' or p_expected_revision is null or p_expected_revision<0 or p_actor is null then raise exception 'invalid_input'; end if;
 if p_document is null or p_document->>'schema' is distinct from '1' or p_document->>'name' is distinct from 'Site visual draft' or jsonb_typeof(p_document->'sections') is distinct from 'array' then raise exception 'invalid_document'; end if;
 if jsonb_array_length(p_document->'sections')<>1 or p_document#>>'{sections,0,type}' is distinct from 'native-page' or p_document#>>'{sections,0,content,schema}' is distinct from 'home-visual-v1' then raise exception 'invalid_document'; end if;
 document_page:=p_document#>>'{sections,0,content,page}';
 if document_page is null or p_page_key <> ('site/' || (case when document_page='/' then 'home' else substr(document_page,2) end)) then raise exception 'page_mismatch'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_page_key,7331));
 select * into current_row from public.page_layout_drafts where page_key=p_page_key for update;
 -- Identical retry after a lost reply returns the existing write, not a new
 -- revision. A different actor/payload or any intervening revision conflicts.
 if current_row.revision=p_expected_revision+1 and current_row.document=p_document and current_row.updated_by=p_actor then
  return jsonb_build_object('page_key',p_page_key,'document',current_row.document,'revision',current_row.revision,'updated_at',current_row.updated_at);
 end if;
 if coalesce(current_row.revision,0)<>p_expected_revision then raise exception 'revision_conflict'; end if;
 next_revision:=p_expected_revision+1;
 insert into public.page_layout_drafts(page_key,document,revision,updated_by,updated_at) values(p_page_key,p_document,next_revision,p_actor,now()) on conflict(page_key) do update set document=excluded.document,revision=excluded.revision,updated_by=excluded.updated_by,updated_at=excluded.updated_at;
 insert into public.page_layout_revisions(page_key,document,revision,action,actor) values(p_page_key,p_document,next_revision,'save',p_actor);
 return jsonb_build_object('page_key',p_page_key,'document',p_document,'revision',next_revision,'updated_at',now());
end $$;
revoke all on function public.rtg_write_site_draft(text,bigint,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.rtg_write_site_draft(text,bigint,jsonb,uuid) to service_role;
commit;
