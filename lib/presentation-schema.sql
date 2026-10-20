create table public.hub_presentations (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 title text not null default 'Untitled presentation', data jsonb not null default '{}'::jsonb,
 revision integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint presentation_size check (octet_length(data::text) < 8000000)
);
create index hub_presentations_owner on public.hub_presentations(user_id,updated_at desc);
alter table public.hub_presentations enable row level security;
create policy private_presentations on public.hub_presentations for all to authenticated
 using (user_id=(select auth.uid()) and exists(select 1 from public.marketing_workspaces w where w.user_id=(select auth.uid())))
 with check (user_id=(select auth.uid()) and exists(select 1 from public.marketing_workspaces w where w.user_id=(select auth.uid())));
create table public.hub_presentation_versions (
 id uuid primary key, presentation_id uuid not null references public.hub_presentations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, number integer not null,
 snapshot jsonb not null, html_path text not null, pdf_path text not null, created_at timestamptz not null default now(),
 unique(presentation_id,number)
);
create index hub_presentation_versions_owner on public.hub_presentation_versions(user_id,presentation_id);
alter table public.hub_presentation_versions enable row level security;
create policy read_private_versions on public.hub_presentation_versions for select to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.hub_presentations p where p.id=presentation_id and p.user_id=(select auth.uid())));
create policy insert_private_versions on public.hub_presentation_versions for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.hub_presentations p where p.id=presentation_id and p.user_id=(select auth.uid())));
grant select,insert,update,delete on public.hub_presentations to authenticated;
grant select,insert on public.hub_presentation_versions to authenticated;
revoke all on public.hub_presentations,public.hub_presentation_versions from anon;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('presentation-private','presentation-private',false,26214400,array['image/jpeg','image/png','application/pdf','text/plain','text/html','application/json']);
create policy private_presentation_assets on storage.objects for all to authenticated
 using(bucket_id='presentation-private' and (storage.foldername(name))[1]=(select auth.uid())::text and exists(select 1 from public.marketing_workspaces w where w.user_id=(select auth.uid())))
 with check(bucket_id='presentation-private' and (storage.foldername(name))[1]=(select auth.uid())::text and exists(select 1 from public.marketing_workspaces w where w.user_id=(select auth.uid())));
create function public.approve_hub_presentation(p_id uuid,p_expected integer,p_snapshot jsonb,p_html text,p_pdf text,p_version uuid)
returns integer language plpgsql security invoker set search_path='' as $$
declare next_version integer;
begin
 if (select auth.uid()) is null then raise exception 'Sign in required';end if;
 if p_html not like (select auth.uid())::text || '/%' or p_pdf not like (select auth.uid())::text || '/%' then raise exception 'Invalid export ownership';end if;
 update public.hub_presentations set data=p_snapshot,title=left(p_snapshot->>'title',200),revision=revision+1,updated_at=now() where id=p_id and user_id=(select auth.uid()) and revision=p_expected;
 if not found then raise exception 'Draft changed in another tab. Reload before approving.';end if;
 select coalesce(max(number),0)+1 into next_version from public.hub_presentation_versions where presentation_id=p_id;
 insert into public.hub_presentation_versions(id,presentation_id,user_id,number,snapshot,html_path,pdf_path) values(p_version,p_id,(select auth.uid()),next_version,p_snapshot,p_html,p_pdf);
 return next_version;
end;$$;
revoke all on function public.approve_hub_presentation(uuid,integer,jsonb,text,text,uuid) from public,anon;
grant execute on function public.approve_hub_presentation(uuid,integer,jsonb,text,text,uuid) to authenticated;
