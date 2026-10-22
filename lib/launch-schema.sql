create table public.hub_launches (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 release_key text not null,data jsonb not null default '{}',notes text not null default '',watchlisted boolean not null default false,archived boolean not null default false,
 updated_at timestamptz not null default now(),personal_version bigint not null default 0,
 unique(user_id,release_key),check(length(notes)<=16000)
);
create table public.hub_launch_sources(id text not null,user_id uuid not null references auth.users(id) on delete cascade,data jsonb not null default '{}',last_checked timestamptz, primary key(user_id,id));
create table public.hub_launch_digests(user_id uuid not null references auth.users(id) on delete cascade,day date not null,data jsonb not null,created_at timestamptz not null default now(),primary key(user_id,day));
create table public.hub_launch_preferences(user_id uuid primary key references auth.users(id) on delete cascade,push boolean not null default false);
alter table public.hub_launches enable row level security;
alter table public.hub_launch_sources enable row level security;
alter table public.hub_launch_digests enable row level security;
alter table public.hub_launch_preferences enable row level security;
create policy launches_owner on public.hub_launches for select to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.marketing_workspaces w where w.user_id=(select auth.uid())));
create policy launches_personal on public.hub_launches for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy launch_sources_owner on public.hub_launch_sources for select to authenticated using(user_id=(select auth.uid()));
create policy launch_digests_owner on public.hub_launch_digests for select to authenticated using(user_id=(select auth.uid()));
create policy launch_preferences_owner on public.hub_launch_preferences for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and exists(select 1 from public.marketing_workspaces w where w.user_id=(select auth.uid())));
revoke all on public.hub_launches,public.hub_launch_sources,public.hub_launch_digests,public.hub_launch_preferences from anon,authenticated;
grant select on public.hub_launches,public.hub_launch_sources,public.hub_launch_digests to authenticated;
grant update(notes,watchlisted,archived,personal_version) on public.hub_launches to authenticated;
grant select,insert,update,delete on public.hub_launch_preferences to authenticated;
grant all on public.hub_launches,public.hub_launch_sources,public.hub_launch_digests,public.hub_launch_preferences to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('launch-images','launch-images',false,8388608,array['image/jpeg','image/png','image/webp']);
create policy launch_images_owner_read on storage.objects for select to authenticated using(bucket_id='launch-images' and (storage.foldername(name))[1]=(select auth.uid())::text);
create index hub_launches_owner_updated on public.hub_launches(user_id,updated_at desc);
-- Server-only launch monitoring uses the existing private reminder cron credential.
select cron.schedule('hub-property-launches-morning','0 5 * * *',$job$
 select net.http_post(url:='https://bkywymcxnnfoieumrctg.supabase.co/functions/v1/property-launches',headers:=jsonb_build_object('Content-Type','application/json','x-hub-cron',public.hub_push_server_config()->>'cronSecret'),body:='{}'::jsonb,timeout_milliseconds:=120000);
$job$);
