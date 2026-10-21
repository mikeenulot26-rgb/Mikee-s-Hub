import webpush from "npm:web-push@3.6.7";
const recurrenceLabels={none:'Does not repeat',daily:'Daily',weekly:'Weekly',weekdays:'Weekdays (Mon–Fri)',weekends:'Weekends (Sat–Sun)'};
function recurrenceShift(day:string,n:number){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
function recurrenceMatches(day:string,s:any){const weekday=new Date(day+'T12:00Z').getUTCDay();return s.repeat==='daily'||s.repeat==='weekly'&&weekday===new Date(s.start+'T12:00Z').getUTCDay()||s.repeat==='weekdays'&&weekday>=1&&weekday<=5||s.repeat==='weekends'&&(weekday===0||weekday===6)}
function ensureRecurringTasks(h:any,today:string){
 h.tasks ||= [];const end=recurrenceShift(today,7);let added=0;
 for(const s of h.taskSeries||[]){if(!s.active||!recurrenceLabels[s.repeat]||s.repeat==='none'||!/^\d{4}-\d{2}-\d{2}$/.test(s.start))continue;
 let day=s.nextDate||s.start;const until=!s.nextDate&&day>end?recurrenceShift(day,7):end;
 for(let i=0;day<=until&&i<4000;i++,day=recurrenceShift(day,1)){if(recurrenceMatches(day,s)){const id='repeat:'+s.id+':'+day;if(!h.tasks.some((t:any)=>t.id===id)){h.tasks.push({id,seriesId:s.id,title:s.title,due:day,time:s.time||'',category:s.category||'Personal',assigned:s.assigned||'Mikee',priority:s.priority||'Normal',status:'To Do',done:false,created:new Date().toISOString()});added++}}}
 s.nextDate=day;
 }
 return added;
}

const base=Deno.env.get("SUPABASE_URL")!;
const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const origins=new Set(["https://mikees-hub-mikeenulot26-6691s-projects.vercel.app","https://croswell-marketing-studio.vercel.app"]);
async function db(path:string,method="GET",body?:unknown,prefer?:string){const r=await fetch(base+"/rest/v1/"+path,{method,headers:{apikey:service,Authorization:"Bearer "+service,"Content-Type":"application/json",...(prefer?{Prefer:prefer}:{})},body:body===undefined?undefined:JSON.stringify(body)});if(!r.ok)throw Error("Database operation failed "+r.status);const text=await r.text();return text?JSON.parse(text):null}
function safeEndpoint(endpoint:string){try{const u=new URL(endpoint);return u.protocol==="https:"&&!u.username&&!u.password&&(!u.port||u.port==="443")&&(u.hostname==="web.push.apple.com"||u.hostname.endsWith(".push.apple.com")||u.hostname==="fcm.googleapis.com"||u.hostname==="updates.push.services.mozilla.com"||u.hostname.endsWith(".notify.windows.com"));}catch{return false}}
async function send(subscription:any,payload:any,config:any){if(!safeEndpoint(subscription.endpoint))throw Error("Unsupported push endpoint");const req=webpush.generateRequestDetails(subscription,JSON.stringify(payload),{TTL:3600,urgency:"high",vapidDetails:{subject:"https://mikees-hub-mikeenulot26-6691s-projects.vercel.app",publicKey:config.publicKey,privateKey:config.privateKey}});const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8000);try{const r=await fetch(req.endpoint,{method:req.method,headers:req.headers,body:new Uint8Array(req.body),signal:controller.signal});return r.status}finally{clearTimeout(timer)}}
Deno.serve(async(req)=>{
const origin=req.headers.get("origin")||"";
const headers={"Content-Type":"application/json",...(origins.has(origin)?{"Access-Control-Allow-Origin":origin,"Vary":"Origin","Access-Control-Allow-Headers":"authorization,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS"}:{})};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
if(req.method==="OPTIONS")return origins.has(origin)?new Response(null,{status:204,headers}):reply({error:"Origin rejected"},403);
if(req.method!=="POST")return reply({error:"POST required"},405);
try{
 const config=await db("rpc/hub_push_server_config","POST",{});
 const isCron=req.headers.get("x-hub-cron")===config.cronSecret;
 let userId="";
 if(!isCron){
  if(!origins.has(origin))return reply({error:"Origin rejected"},403);
  const authorization=req.headers.get("authorization")||"";
  const ur=await fetch(base+"/auth/v1/user",{headers:{apikey:service,Authorization:authorization}});
  if(!ur.ok)return reply({error:"Sign in required"},401);
  userId=(await ur.json()).id;
  const wr=await fetch(base+"/rest/v1/marketing_workspaces?select=user_id&user_id=eq."+userId,{headers:{apikey:service,Authorization:authorization}});
  if(!wr.ok||(await wr.json()).length!==1)return reply({error:"Owner access required"},403);
 }
 const body=await req.json();
 if(isCron&&body.action==="health"){const probe=webpush.generateRequestDetails({endpoint:"https://web.push.apple.com/test",keys:{p256dh:config.publicKey,auth:"AAAAAAAAAAAAAAAAAAAAAA"}},JSON.stringify({title:"Health check"}),{vapidDetails:{subject:"https://mikees-hub-mikeenulot26-6691s-projects.vercel.app",publicKey:config.publicKey,privateKey:config.privateKey}});return reply({healthy:!!probe.body,cryptoReady:true})}
 if(!isCron&&body.action==="config")return reply({publicKey:config.publicKey});
 if(!isCron&&body.action==="subscribe"){
  const s=body.subscription;
  if(!s||!safeEndpoint(s.endpoint)||s.endpoint.length>4096||typeof s.keys?.p256dh!=="string"||typeof s.keys?.auth!=="string"||s.keys.p256dh.length>200||s.keys.auth.length>100)return reply({error:"Invalid subscription"},400);
  const old=await db("hub_push_subscriptions?endpoint=eq."+encodeURIComponent(s.endpoint)+"&select=id,user_id");
  if(old.length&&old[0].user_id!==userId)return reply({error:"Subscription belongs to another account"},403);
  const existing=await db("hub_push_subscriptions?user_id=eq."+userId+"&select=id");if(!old.length&&existing.length>=10)return reply({error:"Maximum 10 registered devices"},400);
  await db("hub_push_subscriptions?on_conflict=endpoint","POST",{user_id:userId,endpoint:s.endpoint,keys:s.keys},"resolution=merge-duplicates,return=minimal");
  return reply({enabled:true});
 }
 if(!isCron&&body.action==="unsubscribe"){await db("hub_push_subscriptions?user_id=eq."+userId+"&endpoint=eq."+encodeURIComponent(body.endpoint),"DELETE");return reply({enabled:false})}
 if(!isCron&&body.action==="test"){
  const list=await db("hub_push_subscriptions?user_id=eq."+userId+"&endpoint=eq."+encodeURIComponent(body.endpoint));
  if(!list.length)return reply({error:"Enable notifications first"},400);
  const code=await send(list[0],{title:"Mikee’s Hub",body:"Background reminders are connected. This is your test notification.",tag:"hub-push-test"},config);
  return reply(code>=200&&code<300?{sent:true}:{error:"Push service rejected the test ("+code+")"},code>=200&&code<300?200:502);
 }
 if(!isCron)return reply({error:"Unknown action"},400);
 const subscriptions=await db("hub_push_subscriptions?select=id,user_id,endpoint,keys");
 if(!subscriptions.length)return reply({checked:0,sent:0});
 const workspaces=await db("marketing_workspaces?select=user_id,data");
 let sent=0,failed=0,checked=0;
 const now=Date.now();
 for(const w of workspaces){
  const h=w.data?.state?.hub||{};
  ensureRecurringTasks(h,new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Dubai",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(now)));
  const events=[...(h.events||[]).filter((e:any)=>!e.cancelled).map((e:any)=>({...e,kind:"event"})),...(h.tasks||[]).filter((t:any)=>!t.done&&!t.cancelled&&t.due&&!t.suppressReminders).map((t:any)=>({...t,kind:"task",when:t.due+"T"+(t.time||"09:00")}))];
  for(const item of events){
   const due=new Date(item.when+":00+04:00").getTime();
   if(!Number.isFinite(due))continue;
   for(const phase of [{id:"before15",offset:15*60000,label:"In 15 minutes: "},{id:"atTime",offset:0,label:"Now: "}]){
   const trigger=due-phase.offset;
   if(now<trigger||now-trigger>5*60000)continue;
   const key=item.kind+":"+item.id+":"+item.when+":"+phase.id;
   for(const s of subscriptions.filter((s:any)=>s.user_id===w.user_id)){
    if(++checked>60)break;
    const query="subscription_id=eq."+s.id+"&reminder_key=eq."+encodeURIComponent(key);
    const inserted=await db("hub_push_deliveries?on_conflict=subscription_id,reminder_key","POST",{subscription_id:s.id,reminder_key:key,status:"pending",attempts:1},"resolution=ignore-duplicates,return=representation");
    if(!inserted.length){
     const logs=await db("hub_push_deliveries?"+query);
     const log=logs[0];
     if(!log||log.status==="sent"||log.attempts>=3||now-new Date(log.updated_at).getTime()<90000)continue;
     const claimed=await db("hub_push_deliveries?"+query+"&updated_at=eq."+encodeURIComponent(log.updated_at),"PATCH",{status:"pending",attempts:log.attempts+1,updated_at:new Date().toISOString()},"return=representation");if(!claimed.length)continue;
    }
    try{const status=await send(s,{title:"Mikee’s Hub reminder",body:phase.label+String(item.title||"Scheduled activity").slice(0,180),tag:key},config);
     if(status===404||status===410){await db("hub_push_subscriptions?id=eq."+s.id,"DELETE");continue}
     if(status<200||status>=300)throw Error("Push rejected");
     await db("hub_push_deliveries?"+query,"PATCH",{status:"sent",updated_at:new Date().toISOString()},"return=minimal");sent++;
    }catch{await db("hub_push_deliveries?"+query,"PATCH",{status:"failed",updated_at:new Date().toISOString()},"return=minimal");failed++}
   }
  }
 }
 }
 return reply({checked,sent,failed});
}catch(e){console.error("Reminder worker error:",e instanceof Error?e.message:"unknown");return reply({error:"Reminder service could not complete the request."},500)}
});

