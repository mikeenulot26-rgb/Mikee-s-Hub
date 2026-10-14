(function(root){
const shift=(day,n)=>{const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const validDate=d=>/^\d{4}-\d{2}-\d{2}$/.test(d||'')&&!Number.isNaN(new Date(d+'T12:00Z').getTime())&&new Date(d+'T12:00Z').toISOString().slice(0,10)===d;
function renewalDates(start){if(!validDate(start))return null;const actual=shift(start,27),weekday=new Date(actual+'T12:00Z').getUTCDay();return {actual,scheduled:shift(actual,weekday===6?-1:weekday===0?-2:0)}}
function reconcile(pf,h){
h.tasks ||= [];let changed=false;
for(const l of pf.listings||[]){const dates=l.status==='Active'?renewalDates(l.cycleStart||l.published):null,id=dates?'pf-renew:'+l.id+':'+(l.cycleStart||l.published):'';
for(const t of h.tasks.filter(t=>t.pfListingId===l.id&&!t.done))if(!dates||t.id!==id){Object.assign(t,{done:true,cancelled:true,status:'Cancelled'});changed=true}
if(!dates)continue;
const values={title:'Renew listing — '+l.name+' — '+l.reference,due:dates.scheduled,time:'',category:'Listing renewal',assigned:l.agentName||'Mikee',priority:'High',pfListingId:l.id,actualRenewal:dates.actual,suppressReminders:true};
const existing=h.tasks.find(t=>t.id===id);
if(!existing){h.tasks.push({...values,id,done:false,status:'To Do',created:new Date().toISOString()});changed=true}else if(!existing.done){for(const [key,value]of Object.entries(values))if(existing[key]!==value){existing[key]=value;changed=true}}
}return changed;
}
function listingErrors(l,listings,ownId){
const errors={};if(!l.name?.trim())errors.name='Enter a property name or location.';if(!l.reference?.trim())errors.reference='Enter a listing reference.';
if(listings.some(x=>(!ownId||x.id!==ownId)&&x.reference.trim().toLowerCase()===l.reference?.trim().toLowerCase()))errors.reference='This reference already exists. Edit the existing record.';
if(l.published&&!validDate(l.published))errors.published='Use a valid publication date.';
if(!['Active','Rented','Sold','Unpublished'].includes(l.status))errors.status='Choose a listing status.';
if(l.link){try{const url=new URL(l.link);if(url.protocol!=='https:'||!['propertyfinder.ae','www.propertyfinder.ae'].includes(url.hostname)||url.username||url.password||url.port)errors.link='Use a public https://www.propertyfinder.ae listing link.'}catch{errors.link='Enter a valid public listing URL.'}}
return errors;
}
function audit(input){
const findings=[],add=(severity,type,issue,evidence,why,action,confirm=false)=>findings.push({severity,type,issue,evidence,why,action,confirm});
const text=input.description||'',title=input.title||'',lines=text.split(/\n+/).map(s=>s.trim()).filter(Boolean),seen=new Set();
for(const line of lines){const key=line.toLowerCase();if(seen.has(key)&&line.length>25)add('Must fix','Confirmed error','Repeated text',line,'Repeated paragraphs reduce clarity.','Remove the repeated paragraph.');seen.add(key)}
if(lines.some(line=>/^[-•–]\\s*$/.test(line)))add('Must fix','Formatting check','Empty bullet',lines.find(line=>/^[-•–]\\s*$/.test(line)),'This bullet has no content.','Remove it or add a verified feature.');
const placeholder=text.match(/\b(lorem ipsum|TBC|TBD|insert here|placeholder|xxx)\b/i);if(placeholder)add('Must fix','Confirmed error','Unfinished placeholder',placeholder[0],'This is unfinished listing content.','Replace it with confirmed information.');
if(!text.trim())add('Must fix','Missing information','Description is missing','Empty description','A review needs the listing description.','Paste the current description.');
if(text.trim()&&!/[.!?]$/.test(text.trim()))add('Recommended','Potential inconsistency','Check the ending',text.slice(-120),'The ending may be a bullet or an unfinished sentence.','Check the last line; complete it if needed.');
if(!title.trim())add('Recommended','Missing information','Title is missing','Empty title','A clear title helps readers identify the property.','Add a specific title using verified benefits.');
if(title.length>50)add('Recommended','Formatting check','Title exceeds your 50-character limit',title.length+' characters','Your preferred title limit is 50 characters.','Shorten the title.');
if(/luxur|amazing|best deal|dream home|stunning/i.test(title)&&!input.features.trim())add('Optional','Presentation recommendation','Generic title benefits',title,'Specific verified features are more informative than generic adjectives.','Ask the agent for the strongest verified features.',true);
const vague=text.match(/.{0,45}\b(upgraded|renovated|premium finishes)\b.{0,65}/i);if(vague&&!/flooring|kitchen|bathroom|cabinet|lighting|year|202\d/i.test(text))add('Recommended','Missing information','Upgrade claim needs detail',vague[0],'Readers need to know what changed and when.','Ask: Which upgrades were completed, and when?',true);
if(/\b(BUA|PSF|DLD|NOC)\b/.test(text))add('Optional','Presentation recommendation','Explain abbreviations',text.match(/\b(BUA|PSF|DLD|NOC)\b/g).join(', '),'Some readers may not know these abbreviations.','Write out the term on first use.');
if(/\d[,.\d]*\s*(sq\.?\s*ft|sqft)/i.test(text)&&!/(built.?up|BUA|plot|internal|floor area)/i.test(text))add('Recommended','Missing information','Area type is unclear',text.match(/\d[,.\d]*\s*(sq\.?\s*ft|sqft)/i)[0],'Built-up and plot areas measure different things.','Ask: Is this built-up area or plot size?',true);
const bedMatches=[...text.matchAll(/\b(\d+)\s*(?:bedroom|bed|BR)\b/gi)].map(m=>m[1]);if(input.beds&&bedMatches.some(x=>x!==input.beds))add('Must fix','Potential inconsistency','Bedroom figures differ',input.beds+' in the confirmed field; '+bedMatches.join(', ')+' in the description','Conflicting bedroom figures need clarification.','Ask the agent to confirm the correct bedroom count.',true);
const bathMatches=[...text.matchAll(/\b(\d+)\s*(?:bathroom|bath)\b/gi)].map(m=>m[1]);if(input.baths&&bathMatches.some(x=>x!==input.baths))add('Must fix','Potential inconsistency','Bathroom figures differ',input.baths+' confirmed; '+bathMatches.join(', ')+' in description','Conflicting bathroom counts affect accuracy.','Confirm the correct bathroom count.',true);
if(/\bunfurnished\b/i.test(text)&&/\bfully furnished\b/i.test(text))add('Must fix','Potential inconsistency','Furnishing statements differ','“unfurnished” and “fully furnished”','These claims conflict.','Ask: What furnishing is included?',true);
if(/\bvacant\b/i.test(text)&&/\btenanted\b/i.test(text))add('Must fix','Potential inconsistency','Availability needs clarification','“vacant” and “tenanted”','The text may describe different dates or contradict itself.','Ask: What is the current occupancy and available date?',true);
for(const word of ['pool','gym','metro','beach','appliances','sea view'])if(new RegExp('\\b'+word+'\\b','i').test(title)&&!new RegExp('\\b'+word+'\\b','i').test(text))add('Recommended','Missing information','Headline claim is not explained',word+' appears in title','The description does not support this headline claim.','Confirm and explain '+word+' in the description.',true);
if(/minutes|walking distance|direct access|freehold|private pool/i.test(text))add('Recommended','Agent confirmation','Confirm access, facilities or terms',text.match(/.{0,40}(minutes|walking distance|direct access|freehold|private pool).{0,60}/i)[0],'Automated text checks cannot verify these claims.','Ask the agent to verify access, operational facilities and ownership claims.',true);
if(input.amenities&&input.features){const amenities=input.amenities.toLowerCase();for(const feature of input.features.split('\n').filter(Boolean))if(/pool|gym|parking|balcony|appliance/i.test(feature)&&!amenities.includes(feature.toLowerCase()))add('Optional','Potential inconsistency','Compare features with amenities',feature,'The structured amenity wording may differ from this feature.','Check whether the amenity field accurately represents this feature.',true)}
if(!input.features.trim())add('Recommended','Missing information','Verified features are missing','No verified feature list supplied','Improvements must not invent property facts.','Ask: Which property features and benefits can you confirm?',true);
if(!input.community.trim())add('Recommended','Missing information','Confirmed community details are missing','No confirmed community features','Facilities and access cannot be assumed from the location.','Ask: Which community facilities are operational and available to this property?',true);
add('Optional','Manual review','Check grammar, bullets and photo claims','Entire listing','Rule-based checks do not establish all grammar errors or visual feature accuracy.','Read the final text and compare every claim with the selected photos.');
return findings.sort((a,b)=>['Must fix','Recommended','Optional'].indexOf(a.severity)-['Must fix','Recommended','Optional'].indexOf(b.severity));
}
function titles(input){
const features=input.features.split('\n').map(s=>s.trim()).filter(Boolean),short=s=>s.replace(/\|/g,' ').replace(/\b(ROI|investment)\b/gi,'').trim().slice(0,18),a=short(features[0]||'Property Details'),b=short(features[1]||input.location||'View Listing'),c=short(features[2]||'Arrange a Viewing');
const options=[[a,b,c],[b,a,'Enquire Today'],[a,c,'View Details'],[b,c,'Property Details'],[c,a,'Enquire Today']].map(parts=>{let x=parts.map(s=>s||'View Details');while(x.join(' | ').length>50){const i=x.indexOf([...x].sort((a,b)=>b.length-a.length)[0]);x[i]=x[i].slice(0,-1).trimEnd()}return x.join(' | ')});
return options;
}
function description(input){const features=input.features.split('\n').map(s=>s.trim()).filter(Boolean),community=input.community.split('\n').map(s=>s.trim()).filter(Boolean);return [input.opening||'Property details'+(input.location?' in '+input.location: '')+'.','','Property features',...features.map(s=>'• '+s),'','Community features',...community.map(s=>'• '+s),'',input.location?'Located in '+input.location+'. Contact us to arrange a viewing.':'Contact us to arrange a viewing.'].join('\n')}
root.PFCore={shift,validDate,renewalDates,reconcile,listingErrors,audit,titles,description};
})(typeof window==='undefined'?globalThis:window);
