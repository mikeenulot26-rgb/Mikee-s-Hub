'use strict';
const D=require('./assistant-dates.cjs');
const ACTIONS=['briefing','tasks','events','renewals','listings','notes','agents','marketing','presentations','open','create_task','edit_task','reschedule_task','complete_task','cancel_task','create_event','edit_event','reschedule_event','cancel_event','create_note','edit_note','record_renewal','stop_series','unsupported'];
const tagalog=t=>/\b(ano|anong|bukas|ngayon|makalawa|ko|mga|hindi|tapos|dagdag|ilagay|ilipat|palitan|hanapin|pakita|iskedyul|paalala|gawin|tandaan|bura|kanselahin|ng|sa|akin)\b/i.test(t);
function language(text,preferred){return preferred==='en'||preferred==='tl'?preferred:tagalog(text)?'tl':'en'}
function cleanTarget(s){return String(s||'').replace(/^(?:the|my|ang|yung|iyong|aking)\s+/i,'').replace(/\b(?:task|event|note|appointment)\s*$/i,'').replace(/^['"“]|['"”]$/g,'').replace(/\s+(?:on|at|sa|to)\s*$/i,'').trim()}
function parse(command,now=new Date()){
 const raw=String(command||'').trim(),s=raw.toLowerCase(),zone=D.zoneOf(raw),date=D.date(raw,now,zone||D.ZONE),time=D.time(raw),period=D.range(raw,now,zone||D.ZONE);let action='unsupported',query='',title='',body='',repeat='none';
 if(!/^(?:remind me to|add (?:a )?(?:task|note)|create (?:a )?(?:task|note)|paalala|magdagdag ng (?:task|note))/i.test(raw)&&/\b(email|e-mail|send|invite|invitation|publish|share|pay|purchase|buy|delete|permanent|bulk|sendan|imbitahan|ibahagi|bayad|burahin)\b/.test(s))return {action:'unsupported',reason:'external_or_destructive',language:language(raw),zone};
 const module=/\b(presentation|deck|presentasyon)\b/.test(s)?'presentations':/\b(marketing|brochure|material|carousel|post)\b/.test(s)?'marketing':/\b(agent|ahente)\b/.test(s)?'agents':/\b(note|notes|memory|tala)\b/.test(s)?'notes':/\b(listing|listings|property|properties|ari-arian)\b/.test(s)?'listings':/\b(task|tasks|gawain)\b/.test(s)?'tasks':/\b(calendar|kalendaryo)\b/.test(s)?'calendar':/\b(productivity|dashboard|photo studio|settings|brand kit|games|watermark)\b/.exec(s)?.[0];
 const add=/^(?:please\s+|paki\s*)?(?:add|create|schedule|set up|remind me to|dagdag(?:an)?|magdagdag(?: ng)?|ilagay|paalala(?:hanan)?(?: mo)?(?: ako)?|tandaan(?: mo)?|gawa(?:n)?(?: ng)?|i-remind)(?:\s+|:)/i;
 const move=/^(?:please\s+|paki\s*)?(?:move|reschedule|ilipat|i-move|i-reschedule)\s+/i;
 const complete=/^(?:please\s+|paki\s*)?(?:mark|complete|finish|tapusin|tapos na|i-complete|done)\s+/i;
 const cancel=/^(?:please\s+|paki\s*)?(?:cancel|kanselahin|i-cancel)\s+/i;
 const edit=/^(?:please\s+|paki\s*)?(?:edit|update|rename|change|palitan|i-edit|baguhin)\s+/i;
 if(/stop.*(?:recurr|repeat)|itigil.*(?:ulit|paulit)/.test(s)){action='stop_series';query=raw.replace(/^.*?(?:recurring task|repeating task|repeat|pag-ulit)\s*/i,'')}
 else if(/^schedule\s+(?:today|tomorrow|bukas|ngayon|this week|next week)\s*[?.!]?$/i.test(raw)){action='briefing'}
 else if(add.test(raw)){
  const rest=raw.replace(add,'');if(/^(?:a\s+)?note\b|^tandaan/i.test(rest)||/^tandaan/i.test(raw)){action='create_note';body=rest.replace(/^(?:a\s+)?note\s*:?\s*/i,'')}
  else{const task=/remind|task|paalala|follow up|follow-up|gawain/i.test(raw);action=task?'create_task':'create_event';title=rest.replace(/^(?:a|an|new|ng)\s+/i,'').replace(/^(?:task|event|appointment)\s*:?\s*/i,'');title=title.replace(/\b(?:on|sa)\s+\d{1,2}\/\d{1,2}(?:\/\d{4})?.*$/i,'').replace(/\b(?:tomorrow|today|bukas|ngayon|makalawa|mamaya|on |sa )?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|lunes|martes|miyerkules|huwebes|biyernes|sabado|linggo)\b.*$/i,'').replace(/\b(?:tomorrow|today|bukas|ngayon|makalawa|mamaya)\b.*$/i,'').replace(/\b\d{4}-\d{2}-\d{2}\b.*$/,'').replace(/\b(?:at|alas)\s+(?:\d|one|two|three|four|five|six|seven|eight|nine|ten).*/i,'').replace(/\b(?:every|daily|weekly|weekdays|weekends|araw-araw|lingguhan|tuwing)\b.*$/i,'').trim()}
 }
 else if(move.test(raw)){const rest=raw.replace(move,'');action=/\btask\b|gawain/.test(s)?'reschedule_task':'reschedule_event';query=rest.split(/\s+(?:to|on|sa)\s+|\s+(?:tomorrow|today|bukas|makalawa)\b/i)[0]}
 else if(/^(?:record|mark).*renew(?:ed|al)/i.test(raw)){action='record_renewal';const m=raw.match(/^(?:record|mark)\s+(?:the\s+)?(?:listing\s+)?(.+?)\s+(?:as\s+)?renewed(?:\s+on|\s+noong|$)/i);query=m?m[1]:raw.replace(/^.*?(?:renewed|renewal)\s*/i,'').replace(/\s+(?:on|noong)\s+.*$/i,'')}
 else if(complete.test(raw)){action='complete_task';query=raw.replace(complete,'').replace(/\s+(?:as\s+)?(?:complete|completed|done|tapos)$/i,'')}
 else if(cancel.test(raw)){action=/\btask\b|gawain/.test(s)?'cancel_task':'cancel_event';query=raw.replace(cancel,'')}
 else if(edit.test(raw)){action=/\bnotes?\b|tala/i.test(raw)?'edit_note':/\btasks?\b|gawain/i.test(raw)?'edit_task':'edit_event';const rest=raw.replace(edit,'');const parts=rest.split(/\s+(?:to|with|ng)\s+/i);query=parts[0];if(action==='edit_note')body=parts.slice(1).join(' ');else title=parts.slice(1).join(' ')}
 else if(/renew.*(?:on|date|noong|noong)|(?:mark|record).*renewed/.test(s)){action='record_renewal';query=raw.replace(/^.*?(?:renewed|renewal)\s*/i,'').replace(/\s+(?:on|noong)\s+.*$/i,'')}
 else if(/renew|renewal|i-renew/.test(s))action='renewals';
 else if(/hindi.*tapos|unfinished|incomplete|not (?:yet )?done|open tasks|remaining tasks|\bpending(?:s)?\b|\bto[ -]?dos?\b|still.*(?:need|have).*do|what.*(?:need|have) to do|left.*(?:do|finish)|natitira|kailangan.*(?:gawin|tapusin)/.test(s)){action='tasks'}
 else if(/schedule|iskedyul|agenda|briefing for today|what.*today|what.*(?:have|planned|coming up).*(?:week|tomorrow|bukas|month)|plans.*(?:week|tomorrow|month)/.test(s)){action='briefing'}
 else if(/^(?:open|go to|buksan|punta)\b/i.test(raw)){action='open';query=module||raw.replace(/^(open|go to|buksan|punta)\s+/i,'')}
 else if(module&&/find|search|show|list|hanap|pakita|which|what|ano|sino|my|mga/i.test(raw)){action=['calendar'].includes(module)?'events':module;query=raw.replace(/^(find|search(?: for)?|show(?: me)?|list|hanapin|pakita(?: mo)?|ano|sino)\s+/i,'').replace(/\b(my|the|mga|aking|existing|saved|notes?|listings?|properties|agents?|marketing materials?|presentations?|decks?|tasks?|events?)\b/gi,'').replace(/\b(about|for|regarding|tungkol sa|tungkol|sa|this project)\b/gi,' ').trim()}
 if(/weekdays|weekday|lunes hanggang biyernes/.test(s))repeat='weekdays';else if(/weekends|weekend|sabado at linggo/.test(s))repeat='weekends';else if(/daily|every day|araw-araw|araw araw|bawat araw/.test(s))repeat='daily';else if(/weekly|every week|lingguhan|linggo-linggo/.test(s))repeat='weekly';
 return {action:ACTIONS.includes(action)?action:'unsupported',query:cleanTarget(query),title:cleanTarget(title),body,repeat,date:date.value,dateAmbiguous:date.ambiguous,time:time.value,timeAmbiguous:time.ambiguous,timeHour:time.hour,timeMinute:time.minute,range:period,zone,language:language(raw),explicitScope:/whole series|entire series|all occurrences|buong serye|lahat ng pag-ulit/.test(s)?'series':/this occurrence|this one|ito lang|isang beses/.test(s)?'occurrence':''};
}
module.exports={ACTIONS,parse,language,cleanTarget};
