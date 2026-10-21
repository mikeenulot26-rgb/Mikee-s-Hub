'use strict';
let nextDayItem=null,weekAnchor='',dayFocus=false;
function myDayModel(h,today,now=new Date()){
 const tasks=h.tasks.filter(t=>!t.cancelled&&t.due===today),done=tasks.filter(t=>t.done),open=tasks.filter(t=>!t.done).sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99'));
 const events=h.events.filter(e=>!e.cancelled&&e.when?.startsWith(today)&&new Date(e.when+':00+04:00')>=now);
 const entries=[...open.map(t=>({kind:'task',item:t,time:t.time||'99:99'})),...events.map(e=>({kind:'event',item:e,time:e.when.slice(11,16)}))].sort((a,b)=>a.time.localeCompare(b.time));
 return {tasks,done,percent:tasks.length?Math.round(done.length/tasks.length*100):0,next:entries[0]||null,overdue:h.tasks.filter(t=>!t.done&&t.due&&t.due<today)};
}
function renderMyDay(){
 if(!$('dayProgressRing'))return;const m=myDayModel(hubData(),dubaiDate());nextDayItem=m.next;
 $('dayProgressRing').style.setProperty('--day-progress',m.percent+'%');$('dayProgressRing').setAttribute('aria-valuenow',String(m.percent));$('dayProgressNumber').textContent=m.percent+'%';$('dayProgressLabel').textContent=m.done.length+' of '+m.tasks.length+' tasks finished today';
 $('nextTaskTitle').textContent=m.next?m.next.item.title:m.tasks.length?'Today’s task list is complete':'A little space to plan your day';
 $('nextTaskDetail').textContent=m.next?(m.next.time==='99:99'?'Any time':m.next.time+' · Dubai')+' · '+(m.next.kind==='event'?'Scheduled event':m.next.item.priority==='High'?'High priority':m.next.item.category||'Personal'):m.tasks.length?'You’ve finished today’s tasks. Review your calendar or make room for tomorrow.':'Add a task or check your calendar to choose your next step.';
 $('openNextTask').textContent=m.next?(m.next.kind==='event'?'Open event':'Open task'):'Add task';
 $('reviewOverdue').textContent=m.overdue.length+' overdue';$('reviewOverdue').hidden=!m.overdue.length;
}
$('openNextTask').onclick=()=>{if(!nextDayItem)$('quickTask').click();else nextDayItem.kind==='task'?editTask(nextDayItem.item):editEvent(nextDayItem.item)};
$('reviewOverdue').onclick=()=>{const overdue=myDayModel(hubData(),dubaiDate()).overdue.sort((a,b)=>a.due.localeCompare(b.due));utility('Overdue tasks',[]);for(const t of overdue)$('utilityBody').append(button(t.title+' · '+t.due,()=>{$('utilityDialog').close();editTask(t)}))};
$('focusDay').onclick=()=>{dayFocus=!dayFocus;$('dashboard').classList.toggle('day-focus',dayFocus);$('focusDay').setAttribute('aria-pressed',String(dayFocus));$('focusDay').textContent=dayFocus?'Exit focus mode':'Focus mode'};
function taskOptions(t){if(t.pfListingId){pfListingDetails(t.pfListingId);return}
 utility(t.title,[]);const controls=el('div','task-menu-actions'),close=()=>$('utilityDialog').close();
 controls.append(button('Edit task',()=>{close();editTask(t)}),button('Reschedule this occurrence',()=>{close();moveTaskDialog(t)}));
 const series=hubData().taskSeries?.find(s=>s.id===t.seriesId&&s.active);if(series)controls.append(button('Stop repeating',()=>{close();stopTaskSeries(series)}));
 controls.append(button('Delete this task',async()=>{close();if(!await confirmAction('Delete this task occurrence? Other recurring occurrences stay saved.'))return;const h=hubData(),before=[...h.tasks];h.tasks=h.tasks.filter(x=>x.id!==t.id);try{await hubSave();toast('Task deleted.')}catch(e){h.tasks=before;renderHub();toast(e.message)}}));
 $('utilityBody').append(controls);
}
const movingTaskIds=new Set();
async function rescheduleOccurrence(t,date,onMove=()=>{}){
 if(movingTaskIds.has(t.id))throw Error('This task is still saving.');
 if(t.pfListingId)throw Error('Renewal task dates are calculated from the listing cycle. Edit the listing dates instead.');if(t.done)throw Error('Reopen this task before rescheduling it.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(new Date(date+'T12:00Z').getTime()))throw Error('Choose a valid date.');
 if(t.seriesId&&hubData().tasks.some(x=>x.id!==t.id&&x.seriesId===t.seriesId&&x.due===date))throw Error('This recurring task already has an occurrence on that date.');
 if(t.due===date){onMove();return}
 const old=t.due;movingTaskIds.add(t.id);t.due=date;renderWeekBoard();renderMyDay();Cloud.status('Private cloud · Saving schedule…');onMove();
 try{await hubSave({redraw:false});toast('Task moved to '+date+'.')}catch(e){t.due=old;renderWeekBoard();renderMyDay();await tx('records','readwrite',s=>s.put(state,'workspace'));throw e}finally{movingTaskIds.delete(t.id);renderWeekBoard()}
}
function moveTaskDialog(t){
 utility('Reschedule task',[t.title,'This moves only this occurrence. The repeat schedule stays the same.']);
 const form=el('form','move-task-form'),label=el('label','','New date'),input=el('input');input.type='date';input.required=true;input.value=t.due||dubaiDate();label.append(input);const save=el('button','primary','Move task');save.type='submit';form.append(label,save);form.onsubmit=async e=>{e.preventDefault();save.disabled=true;try{await rescheduleOccurrence(t,input.value,()=>$('utilityDialog').close())}catch(error){toast(error.message)}finally{save.disabled=false}};$('utilityBody').append(form);
}
function calendarDays(anchor,view){
 if(view==='day')return [anchor];
 if(view==='week'){const weekday=new Date(anchor+'T12:00Z').getUTCDay(),start=dateShift(anchor,-((weekday+6)%7));return Array.from({length:7},(_,i)=>dateShift(start,i))}
 const d=new Date(anchor+'T12:00Z'),start=anchor.slice(0,7)+'-01',count=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();return Array.from({length:count},(_,i)=>dateShift(start,i));
}
function renderWeekBoard(){
 if(!$('weekBoard'))return;weekAnchor ||= dubaiDate();const view=$('calendarView').value||'week',days=calendarDays(weekAnchor,view),h=hubData(),board=$('weekBoard');board.replaceChildren();board.dataset.view=view;
 $('weekRange').textContent=days[0]+' – '+days[days.length-1];
 for(const date of days){const column=el('div','week-day'+(date===dubaiDate()?' is-today':'')),heading=el('button','week-date',new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short',timeZone:'Asia/Dubai'}).format(new Date(date+'T12:00Z')));
 heading.onclick=()=>{editingTask='';$('taskForm').reset();$('taskForm').elements.due.value=date;$('taskForm').elements.due.required=false;page('tasks');$('taskForm').elements.title.focus()};
 column.append(heading);column.ondragover=e=>{if(e.dataTransfer.types.includes('application/x-hub-task')){e.preventDefault();e.dataTransfer.dropEffect='move'}};column.ondrop=async e=>{e.preventDefault();const id=e.dataTransfer.getData('application/x-hub-task'),task=h.tasks.find(t=>t.id===id);if(!task||task.done)return;try{await rescheduleOccurrence(task,date)}catch(error){toast(error.message)}};
 const entries=[...h.tasks.filter(t=>!t.cancelled&&t.due===date).map(t=>({kind:'task',item:t,time:t.time||'99:99'})),...h.events.filter(e=>!e.cancelled&&e.when?.startsWith(date)).map(e=>({kind:'event',item:e,time:e.when.slice(11,16)}))].sort((a,b)=>a.time.localeCompare(b.time));
 for(const entry of entries){const card=el('div','week-entry '+entry.kind+(entry.item.done?' done':'')),open=el('button','week-entry-open');open.append(el('small','',entry.time==='99:99'?'Any time':entry.time),el('strong','',entry.item.title));open.onclick=()=>entry.kind==='task'?editTask(entry.item):editEvent(entry.item);card.append(open);
 if(entry.kind==='task'&&!entry.item.done&&!entry.item.pfListingId){card.draggable=!movingTaskIds.has(entry.item.id);if(movingTaskIds.has(entry.item.id)){card.classList.add('saving');card.setAttribute('aria-busy','true');card.append(el('small','','Saving…'))}card.ondragstart=e=>{e.dataTransfer.setData('application/x-hub-task',entry.item.id);e.dataTransfer.effectAllowed='move'};card.append(button('Move',()=>moveTaskDialog(entry.item)))}
 column.append(card)}if(!entries.length)column.append(el('p','week-empty','Nothing scheduled'));board.append(column)}
}
$('calendarView').onchange=renderWeekBoard;
for(const [id,n] of [['weekPrev',-1],['weekNext',1]])$(id).onclick=()=>{const view=$('calendarView').value;if(view==='month'){const d=new Date((weekAnchor||dubaiDate())+'T12:00Z');weekAnchor=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+n,1,12)).toISOString().slice(0,10)}else weekAnchor=dateShift(weekAnchor||dubaiDate(),view==='week'?n*7:n);renderWeekBoard()};
$('weekToday').onclick=()=>{weekAnchor=dubaiDate();renderWeekBoard()};
renderMyDay();renderWeekBoard();
