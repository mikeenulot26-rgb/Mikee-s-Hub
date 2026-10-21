-- Existing tasks/calendar/notes/listings remain in marketing_workspaces.
create table if not exists public.hub_assistant_actions (
 user_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null,
 request_hash text not null,
 operation text not null,
 result jsonb not null,
 changes jsonb not null default '[]'::jsonb,
 undo_token uuid,
 undo_of uuid,
 created_at timestamptz not null default now(),
 undone_at timestamptz,
 primary key(user_id,request_id),
 unique(user_id,undo_token),
 unique(user_id,undo_of)
);
alter table public.hub_assistant_actions enable row level security;
revoke all on public.hub_assistant_actions from anon;
grant select,insert on public.hub_assistant_actions to authenticated;
grant update(undone_at) on public.hub_assistant_actions to authenticated;
drop policy if exists assistant_owner on public.hub_assistant_actions;
create policy assistant_owner on public.hub_assistant_actions for all to authenticated
using ((select auth.uid())=user_id and exists(select 1 from public.marketing_workspaces w where w.user_id=(select auth.uid())))
with check ((select auth.uid())=user_id and exists(select 1 from public.marketing_workspaces w where w.user_id=(select auth.uid())));
create or replace function public.commit_hub_assistant_action(
 p_request uuid,p_hash text,p_expected bigint,p_hub jsonb,p_pf jsonb,p_operation text,p_result jsonb,p_changes jsonb,p_undo_token uuid default null,p_undo_of uuid default null
) returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare owner_id uuid:=auth.uid(); w public.marketing_workspaces%rowtype; prior public.hub_assistant_actions%rowtype; answer jsonb;
begin
 if owner_id is null then raise exception 'Sign in to continue.' using errcode='42501';end if;
 select * into w from public.marketing_workspaces where user_id=owner_id for update;
 if not found then raise exception 'Workspace access required.' using errcode='42501';end if;
 select * into prior from public.hub_assistant_actions where user_id=owner_id and request_id=p_request;
 if found then if prior.request_hash<>p_hash then raise exception 'Request ID was already used for a different action.';end if;return prior.result||jsonb_build_object('duplicate',true);end if;
 if w.revision<>p_expected then raise exception 'Workspace changed. Nothing was saved; retry with the latest records.' using errcode='40001';end if;
 if p_operation not in ('create_task','edit_task','reschedule_task','complete_task','cancel_task','create_event','edit_event','reschedule_event','cancel_event','create_note','edit_note','record_renewal','stop_series','briefing','tasks','events','renewals','settings','undo') then raise exception 'Unsupported assistant action.';end if;
 if jsonb_typeof(p_hub) is distinct from 'object' or jsonb_typeof(p_hub->'tasks') is distinct from 'array' or jsonb_typeof(p_hub->'events') is distinct from 'array' or jsonb_typeof(p_hub->'notes') is distinct from 'array' or jsonb_typeof(p_changes) is distinct from 'array' or jsonb_array_length(p_changes)>500 then raise exception 'Invalid assistant action data.';end if;
 if (p_hub-array['tasks','events','notes','taskSeries','assistantSettings']) is distinct from (coalesce(w.data#>'{state,hub}','{}'::jsonb)-array['tasks','events','notes','taskSeries','assistantSettings']) then raise exception 'Assistant cannot change other Hub modules through this action.';end if;
 if p_pf is not null and (p_pf-'listings') is distinct from (coalesce(w.data#>'{state,pf}','{}'::jsonb)-'listings') then raise exception 'Invalid listing change.';end if;
 if p_undo_of is not null then
  select * into prior from public.hub_assistant_actions where user_id=owner_id and request_id=p_undo_of for update;
  if not found or prior.undone_at is not null or prior.undo_token is null or prior.created_at<now()-interval '15 minutes' then raise exception 'Undo is unavailable or has expired.';end if;
  update public.hub_assistant_actions set undone_at=now() where user_id=owner_id and request_id=p_undo_of;
 end if;
 answer=p_result||jsonb_build_object('revision',w.revision+1,'saved',true);
 update public.marketing_workspaces set data=jsonb_set(data,'{state,hub}',p_hub,true),revision=w.revision+1,updated_at=now() where user_id=owner_id;
 if p_pf is not null then update public.marketing_workspaces set data=jsonb_set(data,'{state,pf}',p_pf,true) where user_id=owner_id;end if;
 insert into public.hub_assistant_actions(user_id,request_id,request_hash,operation,result,changes,undo_token,undo_of) values(owner_id,p_request,p_hash,p_operation,answer,p_changes,p_undo_token,p_undo_of);
 return answer;
end $$;
revoke all on function public.commit_hub_assistant_action(uuid,text,bigint,jsonb,jsonb,text,jsonb,jsonb,uuid,uuid) from public,anon;
grant execute on function public.commit_hub_assistant_action(uuid,text,bigint,jsonb,jsonb,text,jsonb,jsonb,uuid,uuid) to authenticated;
