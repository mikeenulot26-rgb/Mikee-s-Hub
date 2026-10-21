'use strict';
const Cloud=(()=>{const config=window.SUPABASE_CONFIG;let session=null,revision=null,baseline=null;const sessionKey='second-brain-session';let refreshing=null;function status(t){document.getElementById('cloudStatus').textContent=t}function storeSession(s){session={...s,expires_at:Date.now()+s.expires_in*1000};localStorage.setItem(sessionKey,JSON.stringify(session))}
async function call(path,options={},auth=true){if(auth){if(!session)throw Error('Sign in to continue.');if(session.expires_at<Date.now()+60000){if(!refreshing)refreshing=call('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:session.refresh_token})},false).then(response=>response.json()).then(storeSession).finally(()=>refreshing=null);await refreshing}}const headers={apikey:config.key,...options.headers};if(auth)headers.Authorization=`Bearer ${session.access_token}`;if(options.body&&typeof options.body==='string')headers['Content-Type']='application/json';const response=await fetch(config.url+path,{...options,headers});if(!response.ok){let msg;try{const err=await response.json();msg=err.message||err.msg||err.error_description||err.error}catch{}throw Error(msg||`Cloud request failed (${response.status})`)}return response}
async function json(path,opts,auth=true){const response=await call(path,opts,auth);return response.status===204?null:response.json()}
async function load(knownUser){const[user,rows]=await Promise.all([knownUser?Promise.resolve(knownUser):json('/auth/v1/user'),json('/rest/v1/marketing_workspaces?select=data,revision')]);session.user=user;if(rows.length){revision=rows[0].revision;baseline=structuredClone(rows[0].data);return rows[0].data}await json('/rest/v1/marketing_workspaces',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({user_id:user.id,data:{},revision:0})});revision=0;baseline={};return null}
async function save(data){const next=revision+1;const rows=await json(`/rest/v1/marketing_workspaces?user_id=eq.${session.user.id}&revision=eq.${revision}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({data,revision:next,updated_at:new Date().toISOString()})});if(!rows?.length)throw Error('Workspace changed in another tab/device. Reload before saving. Your local changes are retained.');revision=next;baseline=structuredClone(data);status('Private cloud · Saved')}
async function upload(p){if(p.cloudPath)return;status('Private cloud · Uploading photo');const path=`${session.user.id}/${p.property}/${p.id}`;await call('/storage/v1/object/marketing-private/'+path,{method:'POST',headers:{'Content-Type':p.blob.type,'x-upsert':'true'},body:p.blob});p.cloudPath=path}
async function download(p){const response=await call('/storage/v1/object/authenticated/marketing-private/'+p.cloudPath);return response.blob()}
async function uploadVariant(path,blob){await call('/storage/v1/object/marketing-private/'+path,{method:'POST',headers:{'Content-Type':blob.type,'x-upsert':'false'},body:blob})}
async function remove(p){if(p.cloudPath)await json('/storage/v1/object/marketing-private',{method:'DELETE',body:JSON.stringify({prefixes:[p.cloudPath,p.cleanedPath,p.approvedPath].filter(Boolean)})})}
async function init(start){
 const form=document.getElementById('loginForm'),submit=form.querySelector('button[type="submit"]'),register=document.getElementById('register'),message=document.getElementById('authMessage');let signingIn=false,restoring=false;
 const complete=()=>{document.getElementById('authGate').hidden=true;document.getElementById('signOut').hidden=false;status('Private cloud · Connected')};
 const loading=(active,label)=>{submit.disabled=active;register.disabled=active;submit.textContent=active?label:'Sign in';form.setAttribute('aria-busy',String(active))};
 form.onsubmit=async event=>{
  event.preventDefault();if(signingIn||restoring)return;if(!form.reportValidity())return;
  signingIn=true;loading(true,'Signing in…');message.textContent='Verifying your account…';
  try{const values=new FormData(form);const s=await json('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email:values.get('email'),password:values.get('password')})},false);storeSession(s);message.textContent='Opening your dashboard…';const data=await load(s.user);await start(session.user.id,data);complete();form.reset()}
  catch(e){message.textContent=e.message;status('Sign in required');session=null;localStorage.removeItem(sessionKey)}
  finally{signingIn=false;loading(false)}
 };
 register.onclick=async()=>{if(signingIn||restoring||!form.reportValidity())return;const f=new FormData(form);register.disabled=true;try{await json('/auth/v1/signup?redirect_to='+encodeURIComponent(location.origin),{method:'POST',body:JSON.stringify({email:f.get('email'),password:f.get('password')})},false);message.textContent='Check your email to confirm your account. Workspace access also requires owner approval.'}catch(e){message.textContent=e.message}finally{register.disabled=false}};
 try{const raw=localStorage.getItem(sessionKey);if(raw)session=JSON.parse(raw);if(session){restoring=true;loading(true,'Restoring session…');message.textContent='Opening your saved workspace…';const data=await load();await start(session.user.id,data);complete();return}}
 catch(e){status('Cloud connection needs attention');message.textContent=e.message;session=null;localStorage.removeItem(sessionKey)}
 finally{restoring=false;loading(false)}
 document.getElementById('authGate').hidden=false;
}
document.getElementById('signOut').onclick=async()=>{try{await call('/auth/v1/logout',{method:'POST'})}catch{}localStorage.removeItem(sessionKey);location.reload()};const presentations={
 userId:()=>session?.user?.id,
 list:()=>json('/rest/v1/hub_presentations?select=id,title,revision,created_at,updated_at&order=updated_at.desc'),
 get:id=>json('/rest/v1/hub_presentations?id=eq.'+encodeURIComponent(id)+'&select=*').then(r=>r[0]),
 create:data=>json('/rest/v1/hub_presentations',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({id:data.id,user_id:session.user.id,title:data.title,data})}).then(r=>r[0]),
 save:(data,revision)=>json('/rest/v1/hub_presentations?id=eq.'+encodeURIComponent(data.id)+'&revision=eq.'+revision,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({title:data.title,data,revision:revision+1,updated_at:new Date().toISOString()})}).then(r=>{if(!r?.length)throw Error('Presentation changed in another tab. Your local draft is retained; reload history before saving.');return r[0]}),
 versions:id=>json('/rest/v1/hub_presentation_versions?presentation_id=eq.'+encodeURIComponent(id)+'&order=number.desc'),
 remove:id=>json('/rest/v1/hub_presentations?id=eq.'+encodeURIComponent(id),{method:'DELETE'}),
 upload:async(path,blob)=>{await call('/storage/v1/object/presentation-private/'+path,{method:'POST',headers:{'Content-Type':blob.type,'x-upsert':'false'},body:blob})},
 download:path=>call('/storage/v1/object/authenticated/presentation-private/'+path).then(r=>r.blob()),
 cleanup:paths=>json('/storage/v1/object/presentation-private',{method:'DELETE',body:JSON.stringify({prefixes:paths})}),
 api:async body=>{if(!session)throw Error('Sign in to continue.');if(session.expires_at<Date.now()+60000)await call('/auth/v1/user');const r=await fetch('/api/presentation',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify(body)});const result=await r.json();if(!r.ok)throw Error(result.error||'Presentation service unavailable.');return result}
};
const assistant={
 userId:()=>session?.user?.id||'',
 revision:()=>revision,
 baseline:()=>baseline?structuredClone(baseline):null,
 adoptSnapshot:row=>{revision=row.revision;baseline=structuredClone(row.data);status('Private cloud · Saved')},
 adoptRevision:value=>{revision=value;status('Private cloud · Saved')},
 snapshot:async()=>{const rows=await json('/rest/v1/marketing_workspaces?user_id=eq.'+session.user.id+'&select=data,revision');if(!rows?.length)throw Error('Saved workspace was not found.');return rows[0]},
 request:async(body,{signal}={})=>{if(!session)throw Error('Sign in to continue.');if(session.expires_at<Date.now()+60000)await call('/auth/v1/user');const r=await fetch('/api/assistant',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify(body),signal});let data;try{data=await r.json()}catch{throw Error('Assistant connection failed. Your input is retained.')}if(!r.ok)throw Object.assign(Error(data.error||'Assistant request failed. Your input is retained.'),{status:r.status});return data}
};
return{assistant,presentations,changePassword:password=>json('/auth/v1/user',{method:'PUT',body:JSON.stringify({password})}),pfPhoto:body=>call('/functions/v1/pf-public-review',{method:'POST',body:JSON.stringify({...body,action:'photo'})}).then(r=>r.blob()),pfPublic:body=>json('/functions/v1/pf-public-review',{method:'POST',body:JSON.stringify(body)}),init,save,upload,uploadVariant,download,remove,status,reminders:(body)=>json('/functions/v1/hub-reminders',{method:'POST',body:JSON.stringify(body)})};})();

