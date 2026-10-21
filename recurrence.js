'use strict';
const recurrenceLabels={none:'Does not repeat',daily:'Daily',weekly:'Weekly',weekdays:'Weekdays (Mon–Fri)',weekends:'Weekends (Sat–Sun)'};
function recurrenceShift(day,n){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
function recurrenceMatches(day,s){const weekday=new Date(day+'T12:00Z').getUTCDay();return s.repeat==='daily'||s.repeat==='weekly'&&weekday===new Date(s.start+'T12:00Z').getUTCDay()||s.repeat==='weekdays'&&weekday>=1&&weekday<=5||s.repeat==='weekends'&&(weekday===0||weekday===6)}
function ensureRecurringTasks(h,today){
 h.tasks ||= [];const end=recurrenceShift(today,7);let added=0;
 for(const s of h.taskSeries||[]){if(!s.active||!recurrenceLabels[s.repeat]||s.repeat==='none'||!/^\d{4}-\d{2}-\d{2}$/.test(s.start))continue;
 let day=s.nextDate||s.start;const until=!s.nextDate&&day>end?recurrenceShift(day,7):end;
 for(let i=0;day<=until&&i<4000;i++,day=recurrenceShift(day,1)){if(recurrenceMatches(day,s)){const id='repeat:'+s.id+':'+day;if(!h.tasks.some(t=>t.id===id)){h.tasks.push({id,seriesId:s.id,title:s.title,due:day,time:s.time||'',category:s.category||'Personal',assigned:s.assigned||'Mikee',priority:s.priority||'Normal',status:'To Do',done:false,created:new Date().toISOString()});added++}}}
 s.nextDate=day;
 }
 return added;
}
if(typeof module!=='undefined'&&module.exports)module.exports={ensureRecurringTasks,recurrenceMatches,recurrenceShift,recurrenceLabels};
