'use strict';
let insightView='focus',insightFilter='all',insightVersion=0;
function buildInsightModel(h,properties,today){
 const open=h.tasks.filter(t=>!t.done),end=dateShift(today,6);
 const rank=t=>t.due&&t.due<today?0:t.due===today?1:t.priority==='High'?2:t.due?3:4;
 const focus=[...open].sort((a,b)=>rank(a)-rank(b)||(a.due||'9999').localeCompare(b.due||'9999')||(a.time||'99').localeCompare(b.time||'99'));
 const week=[...open.filter(t=>t.due&&t.due>=today&&t.due<=end).map(t=>({kind:'task',when:t.due+'T'+(t.time||'99:99'),item:t})),...h.events.filter(e=>e.when&&e.when.slice(0,10)>=today&&e.when.slice(0,10)<=end).map(e=>({kind:'event',when:e.when,item:e}))].sort((a,b)=>a.when.localeCompare(b.when));
 return{open,focus,week,overdue:open.filter(t=>t.due&&t.due<today),due:open.filter(t=>t.due===today),events:h.events.filter(e=>e.when?.startsWith(today)),notes:[...h.notes].sort((a,b)=>String(b.created).localeCompare(String(a.created))),properties};
}
function insightTaskReason(t,today){if(t.due&&t.due<today)return 'Overdue · '+t.due;if(t.due===today)return 'Due today'+(t.time?' · '+t.time:'');if(t.priority==='High')return 'High priority'+(t.due?' · '+t.due:' · no date');return t.due?'Due '+t.due+(t.time?' · '+t.time:''):'No due date — schedule when ready'}
async function moveInsightTask(t){
 const before={due:t.due,status:t.status};t.due=dateShift(dubaiDate(),1);
 try{await hubSave();toast('Task moved to tomorrow.')}catch(e){t.due=before.due;t.status=before.status;renderHub();toast(e.message)}
}
function chooseInsightView(view,filter='all'){insightView=view;insightFilter=filter;document.querySelectorAll('[data-insight-view]').forEach(b=>{const active=b.dataset.insightView===view;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});renderInsights().catch(e=>toast(e.message))}
function insightItem(title,detail,actions=[],tag=''){
 const row=el('div','insight-item'),body=el('div','insight-item-body');body.append(el('strong','',title),el('p','muted',detail));if(tag)body.append(el('span','badge statusbadge',tag));const controls=el('div','insight-actions');controls.append(...actions);row.append(body,controls);return row;
}
async function renderInsights(){
 if(!$('insightTabs')||$('insights').hidden)return;
 const version=++insightVersion,h=hubData(),today=dubaiDate(),model=buildInsightModel(h,state.properties,today),query=$('insightSearch').value.trim().toLowerCase(),matches=text=>String(text).toLowerCase().includes(query);
 const summary=$('insightSummary');summary.replaceChildren();
 const cards=[['Overdue tasks',model.overdue.length,'focus','overdue'],['Due today',model.due.length,'focus','today'],['Next 7 days',model.week.length,'week'],['Saved properties',model.properties.length,'marketing']];
 for(const[label,count,view,filter]of cards){const b=el('button','insight-stat');b.append(el('span','',label),el('strong','',count));b.onclick=()=>chooseInsightView(view,filter);summary.append(b)}
 $('insightBrief').textContent=model.overdue.length?model.overdue.length+' overdue task'+(model.overdue.length===1?'':'s')+' first, then '+model.due.length+' due today.':model.due.length?model.due.length+' task'+(model.due.length===1?'':'s')+' due today. '+model.events.length+' event'+(model.events.length===1?'':'s')+' scheduled.':'No open tasks due today. Review your upcoming work or schedule an undated task.';
 const list=$('insightsList');list.replaceChildren();let shown=0;
 if(insightView==='focus'){
  $('insightHeading').textContent=insightFilter==='overdue'?'Overdue tasks':insightFilter==='today'?'Tasks due today':'Your next actions';
  const tasks=insightFilter==='overdue'?model.overdue:insightFilter==='today'?model.due:model.focus;
  for(const t of tasks.filter(t=>matches(t.title+' '+(t.category||'')+' '+(t.assigned||'')))){
   list.append(insightItem(t.title,insightTaskReason(t,today)+' · '+(t.category||'Personal'),[button('Open task',()=>editTask(t)),button('Move to tomorrow',()=>moveInsightTask(t))],t.priority||'Normal'));shown++;
  }
 }else if(insightView==='week'){
  $('insightHeading').textContent='Next seven days';
  for(const entry of model.week.filter(e=>matches(e.item.title))){
   list.append(insightItem(entry.item.title,(entry.kind==='task'?entry.item.due+' · '+(entry.item.time||'Any time'):entry.when.replace('T',' · '))+' · Dubai',[button(entry.kind==='task'?'Open task':'Open event',()=>entry.kind==='task'?editTask(entry.item):editEvent(entry.item))],entry.kind==='task'?'Task':'Event'));shown++;
  }
 }else if(insightView==='marketing'){
  $('insightHeading').textContent='Property marketing checks';
  const all=await request(db.transaction('photos').objectStore('photos').getAll());if(version!==insightVersion||$('insights').hidden)return;
  for(const p of model.properties.filter(p=>matches(p.name+' '+(p.community||'')))){
   const media=all.filter(photo=>photo.property===p.id),missing=[];
   if(!media.length)missing.push('Upload photos');if(!p.name||p.name==='Untitled photo batch')missing.push('Set property name');if(!p.community)missing.push('Add location');if(!p.price)missing.push('Add price');if(!p.beds)missing.push('Add bedrooms');if(!p.area)missing.push('Add area');if(!p.agent)missing.push('Select an agent');
   const low=media.filter(photo=>photo.width<800||photo.height<600).length;
   const details=[media.length+' photos',missing.length?'Suggested next steps: '+missing.join(', '):'Photo and property fields are filled in',low?low+' photo(s) below 800 × 600 — review quality':''].filter(Boolean).join(' · ');
   list.append(insightItem(p.name,details,[button('Open Studio',async()=>{await selectProperty(p.id);page('studio')}),button('Property library',()=>page('properties'))],missing.length?'Review details':'Details complete'));shown++;
  }
 }else{
  $('insightHeading').textContent='Recent saved notes';
  for(const n of model.notes.filter(n=>matches(n.body)).slice(0,12)){
   const date=new Date(n.created),when=Number.isNaN(date.getTime())?'Saved note':new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeZone:'Asia/Dubai'}).format(date);
   list.append(insightItem(n.body.slice(0,150)+(n.body.length>150?'…':''),when,[button('Read note',()=>{page('notes');$('noteSearch').value=n.body.slice(0,60);renderHub()})]));shown++;
  }
 }
 if(!shown)list.append(el('p','emptycompact',query?'No records match your search.':insightView==='marketing'?'No properties yet. Upload photos in Marketing Studio to start.':insightView==='week'?'No dated tasks or events in the next seven days.':insightView==='notes'?'No notes saved yet.':'No open tasks. Your task list is clear.'));
}
async function copyInsightPlan(){
 const h=hubData(),today=dubaiDate(),model=buildInsightModel(h,state.properties,today);
 const lines=['My plan — '+today+' (Dubai)','',...model.overdue.map(t=>'OVERDUE: '+t.title+' ('+t.due+')'),...model.due.map(t=>(t.time||'Any time')+' · '+t.title),...model.events.map(e=>e.when.slice(11,16)+' · '+e.title)];
 if(lines.length===2)lines.push('No dated tasks or events today.');
 try{await navigator.clipboard.writeText(lines.join('\n'));toast('Today’s plan copied.')}catch{utility('Today’s plan',lines);toast('Clipboard unavailable. You can select and copy the plan here.')}
}
document.querySelectorAll('[data-insight-view]').forEach(b=>b.onclick=()=>chooseInsightView(b.dataset.insightView));
let insightSearchTimer;$('insightSearch').oninput=()=>{clearTimeout(insightSearchTimer);insightSearchTimer=setTimeout(()=>renderInsights().catch(e=>toast(e.message)),120)};
$('copyInsightPlan').onclick=copyInsightPlan;
$('insightAddTask').onclick=()=>{$('quickTask').click()};
$('insightAddEvent').onclick=()=>{$('newEvent').click();page('calendar');$('eventForm').elements.title.focus()};
