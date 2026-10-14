'use strict';
const $=id=>document.getElementById(id),C=StudioCore;let db,state={properties:[],agents:[],brand:{name:'Croswell',color:'#00585b',footer:'croswell.ae'}},photos=[],current='',editing=null,working=false;const urls=new Map();
function toast(msg){$('toast').textContent=msg;$('toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').style.display='none',6000)}
function request(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function tx(store,mode,fn){const t=db.transaction(store,mode),result=fn(t.objectStore(store));await new Promise((r,j)=>{t.oncomplete=r;t.onerror=()=>j(t.error);t.onabort=()=>j(t.error)});return result}
let savedPhotoManifest=null,saveQueue=Promise.resolve();async function persist({syncMedia=true}={}){await tx('records','readwrite',s=>s.put(state,'workspace'));const snapshot=structuredClone(state);const all=!syncMedia&&savedPhotoManifest?structuredClone(savedPhotoManifest):await request(db.transaction('photos').objectStore('photos').getAll());for(const p of all){if(!syncMedia&&p.cloudPath&&(!p.cleanedBlob||p.cleanedPath))continue;await Cloud.upload(p);if(p.cleanedBlob&&!p.cleanedPath){p.cleanedPath=`${p.cloudPath}_clean_${crypto.randomUUID()}`;await Cloud.uploadVariant(p.cleanedPath,p.cleanedBlob)}await tx('photos','readwrite',store=>store.put(p));const live=photos.find(x=>x.id===p.id);if(live)live.cloudPath=p.cloudPath;}const manifest=all.map(({blob,cleanedBlob,...p})=>p);savedPhotoManifest=structuredClone(manifest);const operation=saveQueue.catch(()=>{}).then(()=>Cloud.save({state:snapshot,photos:manifest}));saveQueue=operation;try{await operation}catch(e){Cloud.status('Cloud save failed · Local copy retained');throw e}}
async function savePhoto(p){savedPhotoManifest=null;await Cloud.upload(p);await tx('photos','readwrite',s=>s.put(p))}
const prop=()=>state.properties.find(p=>p.id===current);const defaults=()=>({preset:$('preset').value,intensity:+$('intensity').value,fit:$('fit').value,x:.5,y:.5});
function photoURL(p){if(!urls.has(p.id))urls.set(p.id,URL.createObjectURL(p.blob));return urls.get(p.id)}
function cleanURL(p){const key=p.id+':clean';if(!urls.has(key))urls.set(key,URL.createObjectURL(p.cleanedBlob));return urls.get(key)}

let studioReady=false;
const mediaLoads=new Map();
async function hydratePhoto(p){
 if(p.blob&&(!p.cleanedPath||p.cleanedBlob))return p;
 if(mediaLoads.has(p.id))return mediaLoads.get(p.id);
 const operation=(async()=>{
  const blob=p.blob||await Cloud.download(p);
  const cleanedBlob=p.cleanedBlob||(p.cleanedPath?await Cloud.download({cloudPath:p.cleanedPath}):undefined);
  const latest=await request(db.transaction('photos').objectStore('photos').get(p.id));
  if(!latest)throw Error('This photo was removed. Reload the property.');
  Object.assign(p,{blob,cleanedBlob});await tx('photos','readwrite',s=>s.put({...latest,blob,cleanedBlob}));
  return p;
 })();mediaLoads.set(p.id,operation);try{return await operation}finally{mediaLoads.delete(p.id)}
}

async function imageFor(p,cleaned=false){await hydratePhoto(p);const i=new Image();i.src=cleaned&&p.cleanedBlob?cleanURL(p):photoURL(p);await i.decode();return i}
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
async function rendered(p,w=800,h=600){const img=await imageFor(p,true),s=p.settings||defaults(),c=canvas(w,h),ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);const r=C.rect(img.naturalWidth,img.naturalHeight,w,h,s.fit,s.x,s.y);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(img,...r);if(s.preset!=='original'&&s.intensity){const d=ctx.getImageData(0,0,w,h);C.enhance(d.data,s.preset,s.intensity,{width:w,x0:Math.max(0,Math.ceil(r[0])),y0:Math.max(0,Math.ceil(r[1])),x1:Math.min(w,Math.floor(r[0]+r[2])),y1:Math.min(h,Math.floor(r[1]+r[3]))});ctx.putImageData(d,0,0);const original=new Uint8ClampedArray(d.data),out=d.data;const k=.18*s.intensity/100;const x0=Math.max(1,Math.ceil(r[0])+1),x1=Math.min(w-1,Math.floor(r[0]+r[2])-1),y0=Math.max(1,Math.ceil(r[1])+1),y1=Math.min(h-1,Math.floor(r[1]+r[3])-1);for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)for(let j=0;j<3;j++){const i=(y*w+x)*4+j;out[i]=Math.max(0,Math.min(255,original[i]*(1+4*k)-k*(original[i-4]+original[i+4]+original[i-w*4]+original[i+w*4])))}ctx.putImageData(d,0,0)}return c}
function blobOf(c,type='image/jpeg',quality=.95){return new Promise((r,j)=>c.toBlob(b=>b?r(b):j(new Error('Image encoding failed')),type,quality))}
function download(b,name){const a=document.createElement('a'),u=URL.createObjectURL(b);a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),60000)}
function page(id){document.querySelectorAll('.modulemenu[open]').forEach(menu=>menu.removeAttribute('open'));$('marketingTitle').hidden=id!=='studio';$('pageName').textContent=({dashboard:'Dashboard',tasks:'My tasks',calendar:'Calendar',notes:'Notes & memory',studio:'Marketing',properties:'Properties',agents:'Agent library',brand:'Brand kit',projects:'Projects',insights:'Productivity review',watermarks:'Watermark cleanup'})[id]||id;if(typeof renderHub==='function')renderHub();document.querySelectorAll('.page').forEach(x=>x.hidden=x.id!==id);document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x.dataset.page===id));if(id==='properties')listProperties().catch(e=>toast(e.message));if(id==='agents')listAgents();if(id==='insights'&&typeof renderInsights==='function')renderInsights().catch(e=>toast(e.message));if(id==='studio'&&!studioReady){studioReady=true;selectProperty(current).catch(e=>{studioReady=false;toast(e.message)})}if(id==='watermarks')renderWatermarks().catch(e=>toast(e.message))}
function selectOptions(){const s=$('propertySelect');s.replaceChildren(new Option('Choose property',''));for(const p of state.properties)s.add(new Option(p.name,p.id));s.value=current;const agents=$('agentSelect');agents.replaceChildren(new Option('No agent selected',''));for(const a of state.agents.filter(a=>!a.archived))agents.add(new Option(a.name,a.id));if(prop())agents.value=prop().agent||''}
async function selectProperty(id){current=id;photos=(await request(db.transaction('photos').objectStore('photos').getAll())).filter(p=>p.property===id).sort((a,b)=>a.order-b.order);selectOptions();const form=$('propertyForm');form.reset();const p=prop();if(p)for(const [k,v]of Object.entries(p))if(form.elements.namedItem(k))form.elements.namedItem(k).value=v;else{};$('headline').value=p?.headline||'';$('cta').value=p?.cta||'Contact us to find out more';$('activeName').textContent=p?.name||'Start your first property';syncSocialControls();await gallery();await drawStory();studioReady=true}
function button(text,fn){const b=document.createElement('button');b.textContent=text;b.className='secondary';b.onclick=()=>Promise.resolve(fn()).catch(e=>toast(e.message));return b}
async function gallery(){const g=$('gallery');g.replaceChildren();$('photoCount').textContent=photos.length;$('empty').hidden=photos.length>0;for(const p of photos){const box=document.createElement('div');box.className='photo'+(prop()?.hero===p.id?' hero':'');const img=document.createElement('img');img.alt=p.name;const thumb=await rendered(p);img.src=thumb.toDataURL('image/jpeg',.9);box.append(img);const info=document.createElement('div');info.className='info';const title=document.createElement('div');title.textContent=p.name;info.append(title);const small=document.createElement('small');small.textContent=(p.warning?`${p.warning} · `:'')+`${p.settings?.preset||'Natural'} · ${p.settings?.intensity??0}% · processed preview`;info.append(small);info.append(button('Review',()=>edit(p)),button(prop()?.hero===p.id?'★ Hero':'Set hero',async()=>{prop().hero=p.id;prop().socialPhoto=p.id;await persist();await gallery();await drawStory()}),button('←',async()=>{const i=photos.indexOf(p);if(i>0){[photos[i],photos[i-1]]=[photos[i-1],photos[i]];for(let j=0;j<photos.length;j++){photos[j].order=j;await savePhoto(photos[j])}await persist();await gallery()}}),button('Remove',async()=>{if(!await confirmAction('This photo will be removed from the property and private storage. This action cannot be undone.',{title:'Delete photo?',confirmLabel:'Delete photo'}))return;await Cloud.remove(p);await tx('photos','readwrite',s=>s.delete(p.id));photos=photos.filter(x=>x.id!==p.id);if(prop().hero===p.id||prop().socialPhoto===p.id){if(prop().hero===p.id)prop().hero=photos[0]?.id||'';if(prop().socialPhoto===p.id)prop().socialPhoto=photos[0]?.id||'';await persist()}await persist();URL.revokeObjectURL(urls.get(p.id));urls.delete(p.id);await gallery();await drawStory()}));box.append(info);g.append(box)}renderSocialPhotos();const selected=$('socialPhoto').value;const select=$('socialPhoto');select.replaceChildren(new Option('Choose an uploaded photo',''));for(const photo of photos)select.add(new Option(photo.name,photo.id));select.value=prop()?.socialPhoto||prop()?.hero||selected||photos[0]?.id||''}

function nextPropertyCode(){let n=state.properties.length+1;while(state.properties.some(p=>p.code===`CW-${String(n).padStart(3,'0')}`))n++;return `CW-${String(n).padStart(3,'0')}`}
async function createPhotoDraft(){
 const values=Object.fromEntries(new FormData($('propertyForm')));
 values.name=String(values.name||'').trim()||'Untitled photo batch';
 values.code=String(values.code||'').trim();
 if(!values.code||state.properties.some(p=>p.code===values.code))values.code=nextPropertyCode();
 const draft={...values,id:crypto.randomUUID(),hero:'',created:new Date().toISOString()};
 state.properties.push(draft);current=draft.id;
 try{await persist()}catch(e){state.properties=state.properties.filter(p=>p.id!==draft.id);current='';throw e}
 photos=[];selectOptions();const form=$('propertyForm');for(const[k,v]of Object.entries(draft)){const input=form.elements.namedItem(k);if(input)input.value=v}
 $('activeName').textContent=draft.name;$('saveState').textContent='Draft saved · add listing details anytime';
}

async function upload(files){if(!files.length)return;if(files.length>50){toast('Please upload up to 50 images in each batch.');return}await busy(async()=>{if(!prop()){const valid=files.some(file=>['image/jpeg','image/png','image/webp'].includes(file.type)&&file.size<=25*1024*1024);if(!valid)throw Error('Choose JPG, PNG or WebP photos under 25 MB each.');await createPhotoDraft()}let added=0;for(const file of files){if(!['image/jpeg','image/png','image/webp'].includes(file.type)){toast(`${file.name}: unsupported format. Convert HEIC to JPG first.`);continue}if(file.size>25*1024*1024){toast(`${file.name}: exceeds the 25 MB per-photo limit.`);continue}const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))).map(b=>b.toString(16).padStart(2,'0')).join('');if(photos.some(p=>p.hash===hash)){toast(`Skipped duplicate: ${file.name}`);continue}const p={id:crypto.randomUUID(),property:current,name:file.name,blob:file,hash,order:photos.length,settings:defaults()};try{const i=await imageFor(p);p.width=i.naturalWidth;p.height=i.naturalHeight;const scaled=Math.min(p.width/800,p.height/600);p.warning=scaled<1?'Low resolution: export needs upscaling.':p.width/p.height<.85?'Portrait: review cropping / padding.':'';await savePhoto(p);photos.push(p);added++;$('progress').textContent=`Imported ${added} / ${files.length}`;if(!prop().hero)prop().hero=p.id}catch(e){URL.revokeObjectURL(urls.get(p.id));urls.delete(p.id);toast(`Could not import ${file.name}: ${e.message}`)}}await gallery();await drawStory();$('progress').textContent=`${added} photos imported`;await persist();toast(added?'Photos synced privately. Originals preserved.':'No new photos imported. Check duplicates, format or upload errors.')})}
async function busy(fn){if(working)return;working=true;document.querySelectorAll('button').forEach(b=>b.disabled=true);try{await fn()}catch(e){toast(e.message||'Operation failed')}finally{working=false;document.querySelectorAll('button').forEach(b=>b.disabled=false)}}
async function edit(p){editing={...p,settings:{...p.settings}};$('originalPreview').src=photoURL(p);$('editPreset').value=editing.settings.preset;$('editIntensity').value=editing.settings.intensity;$('editFit').value=editing.settings.fit;$('cropX').value=editing.settings.x*100;$('cropY').value=editing.settings.y*100;$('editDialog').showModal();await updatePreview()}
let previewVersion=0;async function updatePreview(){if(!editing)return;const v=++previewVersion;editing.settings={preset:$('editPreset').value,intensity:+$('editIntensity').value,fit:$('editFit').value,x:+$('cropX').value/100,y:+$('cropY').value/100};const c=await rendered(editing);if(v===previewVersion)$('processedPreview').getContext('2d').drawImage(c,0,0)}
function fitText(ctx,text,max,size,min=22){ctx.font=`${size}px Arial`;while(ctx.measureText(text).width>max&&size>min)ctx.font=`${--size}px Arial`;if(ctx.measureText(text).width>max){while(ctx.measureText(text+'…').width>max&&text.length)text=text.slice(0,-1);text+='…'}return text}
function text(ctx,str,x,y,max,size,color='#fff',weight='normal'){ctx.fillStyle=color;const s=fitText(ctx,String(str||''),max,size);ctx.font=`${weight} ${ctx.font}`;ctx.fillText(s,x,y)}
async function optionalImage(data){if(!data)return null;const i=new Image();i.src=data;await i.decode();return i}

function socialFormat(){return $('socialFormat')?.value==='post'?'post':'story'}
function socialSize(format){return format==='post'?{w:1080,h:1350}:{w:1080,h:1920}}
function syncSocialControls(){
 const p=prop();$('socialFormat').value=p?.socialFormat||'story';
 const select=$('socialPhoto');select.replaceChildren(new Option('Choose an uploaded photo',''));
 for(const photo of photos)select.add(new Option(photo.name,photo.id));
 select.value=p?.socialPhoto||p?.hero||photos[0]?.id||'';
 $('socialCropX').value=Math.round((p?.socialCrop?.x??.5)*100);$('socialCropY').value=Math.round((p?.socialCrop?.y??.5)*100);
 updateSocialLabel();
}
function updateSocialLabel(){const format=socialFormat(),size=socialSize(format);$('socialFormatInfo').textContent=format==='post'?'Instagram portrait post · 1080 × 1350':'Instagram Story / WhatsApp Status · 1080 × 1920';$('downloadStory').textContent=format==='post'?'Download Instagram Post PNG':'Download Story / Status PNG';if($('socialOutputDimensions'))$('socialOutputDimensions').textContent=size.w+' × '+size.h+' px';const preview=$('story');preview.style.aspectRatio=size.w+'/'+size.h}
function renderSocialPhotos(){
 const picker=$('socialPhotoPicker');picker.replaceChildren();const selected=prop()?.socialPhoto||prop()?.hero||photos[0]?.id;
 for(const photo of photos){
  const button=document.createElement('button');button.type='button';button.className='social-photo-choice';button.title=photo.name;button.setAttribute('aria-label','Use '+photo.name+' in this design');button.setAttribute('aria-pressed',String(photo.id===selected));
  const image=document.createElement('img');image.alt=photo.name;image.loading='lazy';if(photo.blob)image.src=photoURL(photo);button.append(image);
  button.onclick=async()=>{if(working)return;const p=prop();if(!p)return;p.socialPhoto=photo.id;$('socialPhoto').value=photo.id;renderSocialPhotos();try{await drawStory();await persist()}catch(e){toast(e.message)}};picker.append(button);
 }
}
function designText(ctx,value,x,y,max,size,color,weight='400'){
 let text=String(value||'');ctx.font=weight+' '+size+'px Arial';
 while(ctx.measureText(text).width>max&&size>22){size--;ctx.font=weight+' '+size+'px Arial'}
 if(ctx.measureText(text).width>max){while(text&&ctx.measureText(text+'…').width>max)text=text.slice(0,-1);text+='…'}
 ctx.fillStyle=color;ctx.fillText(text,x,y);
}
let storyVersion=0;
async function drawStory(target=$('story'),square=false,source=null){
 const preview=target===$('story'),version=preview?++storyVersion:0,format=square?'square':socialFormat();
 const w=1080,h=square?1080:socialSize(format).h,c=canvas(w,h),ctx=c.getContext('2d'),p=prop(),brand=state.brand;
 const color=brand.color||'#00585b',ink='#153332',paper='#f7f5f0',muted='#657673';
 ctx.fillStyle=paper;ctx.fillRect(0,0,w,h);
 const story=format==='story',header=story?205:78,top=story?270:140,bottom=story?1280:square?660:840;
 if(brand.logo){const logo=await optionalImage(brand.logo);ctx.drawImage(logo,...C.rect(logo.naturalWidth,logo.naturalHeight,240,62,'contain').map((v,i)=>i===0?v+64:i===1?v+header-44:v))}
 else{designText(ctx,brand.name||'Croswell',64,header,530,50,color,'700');designText(ctx,'REAL ESTATE',66,header+31,520,19,muted,'500')}
 const category=p?.headline||p?.category||'PROPERTY';
 ctx.strokeStyle=color;ctx.lineWidth=2;ctx.strokeRect(710,header-43,306,61);designText(ctx,category.toUpperCase(),734,header-4,256,27,color,'600');
 if(!p||!photos.length){designText(ctx,'Select a property photo',64,top+140,950,48,ink);designText(ctx,'Your branded design will appear here.',64,top+200,950,30,muted)}
 else{
  const photo=source||photos.find(x=>x.id===p.socialPhoto)||photos.find(x=>x.id===p.hero)||photos[0],image=await imageFor(photo,true),ph=bottom-top;
  const framing=p.socialCrop||{x:photo.settings?.x??.5,y:photo.settings?.y??.5};
  ctx.save();ctx.beginPath();ctx.rect(0,top,w,ph);ctx.clip();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(image,...C.rect(image.naturalWidth,image.naturalHeight,w,ph,'cover',framing.x,framing.y).map((v,i)=>i===1?v+top:v));ctx.restore();
  const settings=photo.settings||defaults();if(settings.preset!=='original'&&settings.intensity){const pixels=ctx.getImageData(0,top,w,ph);C.enhance(pixels.data,settings.preset,settings.intensity);ctx.putImageData(pixels,0,top)}
  const nameY=bottom+(square?65:78);designText(ctx,p.name,64,nameY,952,square?50:58,ink,'600');
  if(p.community)designText(ctx,p.community,64,nameY+47,952,31,muted);
  const priceY=nameY+116;
  if(p.price)designText(ctx,'AED '+Number(p.price).toLocaleString(),64,priceY,952,43,color,'600');
  const specifications=[p.beds?(p.beds.toLowerCase()==='studio'?'Studio':p.beds+' bedrooms'):'',p.area?Number(p.area).toLocaleString()+' sq ft':''].filter(Boolean).join('   ·   ');
  if(specifications)designText(ctx,specifications,64,priceY+46,952,29,muted);
  const lineY=story?1540:square?920:1100;ctx.strokeStyle='#cbd5cd';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(64,lineY);ctx.lineTo(1016,lineY);ctx.stroke();
  const agent=state.agents.find(a=>a.id===p.agent),portrait=agent?.portrait?await optionalImage(agent.portrait):null,agentY=lineY+61;
  let contactX=64;
  if(portrait){ctx.save();ctx.beginPath();ctx.arc(109,agentY+10,45,0,Math.PI*2);ctx.clip();ctx.drawImage(portrait,...C.rect(portrait.naturalWidth,portrait.naturalHeight,90,90,'cover').map((v,i)=>i===0?v+64:i===1?v+agentY-35:v));ctx.restore();contactX=175}
  if(agent){designText(ctx,agent.name,contactX,agentY,650-contactX,32,ink,'600');designText(ctx,agent.phone,contactX,agentY+40,650-contactX,28,muted);if(agent.brn&&!square)designText(ctx,'BRN '+agent.brn,contactX,agentY+73,650-contactX,22,muted)}
  else designText(ctx,p.cta||'Contact us to arrange a viewing',64,agentY,700,30,ink,'500');
  if(brand.footer)designText(ctx,brand.footer,730,agentY+40,286,23,color,'500');
  if(agent&&p.cta)designText(ctx,p.cta,64,story?1735:square?1050:1290,952,24,muted);
 }
 if(!preview||version===storyVersion){target.width=w;target.height=h;target.getContext('2d').drawImage(c,0,0)}
 return c;
}

async function listingFiles(){if(!prop()||!photos.length)throw Error('Add property photos first.');const files=[];for(let i=0;i<photos.length;i++){$('progress').textContent=`Exporting photo ${i+1} / ${photos.length}`;files.push({name:`${C.safe(prop().code)}_${String(i+1).padStart(2,'0')}.jpg`,blob:await blobOf(await rendered(photos[i]))});await new Promise(r=>setTimeout(r,0))}return files}
async function exportZip(kind){await busy(async()=>{let files=[];if(kind==='photos'||kind==='kit')files=await listingFiles();if(kind==='story'||kind==='kit'){if(!prop()||!photos.length)throw Error('Add property photos first.');const b=await blobOf(await drawStory(),'image/png');if(kind==='story'){download(b,`${C.safe(prop().code)}_${socialFormat()}.png`);return}files.push({name:`social/${C.safe(prop().code)}_${socialFormat()}.png`,blob:b})}if(kind==='carousel'){if(!prop()||!photos.length)throw Error('Add property photos first.');for(let i=0;i<photos.length;i++)files.push({name:`${C.safe(prop().code)}_slide_${String(i+1).padStart(2,'0')}.png`,blob:await blobOf(await drawStory(canvas(1080,1080),true,photos[i]),'image/png')})}download(await C.zip(files),`${C.safe(prop().code)}_${kind}.zip`);$('progress').textContent='Export complete';toast('Marketing export ready.')})}

async function deleteProperty(id){
 const target=state.properties.find(p=>p.id===id);if(!target||working)return;
 if(!await confirmAction('Are you sure you want to delete "'+target.name+'"?\n\nThis will permanently remove the property and its saved photos. This action cannot be undone.',{title:'Delete property?',confirmLabel:'Delete property'}))return;
 await busy(async()=>{
  await saveQueue;
  const all=await request(db.transaction('photos').objectStore('photos').getAll());
  const removed=all.filter(p=>p.property===id),remaining=all.filter(p=>p.property!==id);
  const next=structuredClone(state);next.properties=next.properties.filter(p=>p.id!==id);
  const manifest=remaining.map(({blob,cleanedBlob,...p})=>p);
  const operation=saveQueue.then(()=>Cloud.save({state:next,photos:manifest}));saveQueue=operation.catch(()=>{});
  await operation;
  state=next;
  const t=db.transaction(['records','photos'],'readwrite');
  t.objectStore('records').put(state,'workspace');for(const p of removed)t.objectStore('photos').delete(p.id);
  await new Promise((resolve,reject)=>{t.oncomplete=resolve;t.onerror=()=>reject(Error('Property deleted in the cloud. Reload to refresh this device.'));t.onabort=t.onerror});
  for(const p of removed)for(const key of [p.id,p.id+':clean']){if(urls.has(key)){URL.revokeObjectURL(urls.get(key));urls.delete(key)}}
  if(current===id)await selectProperty(state.properties[0]?.id||'');else selectOptions();
  await listProperties();if(typeof renderHub==='function')renderHub();
  let cleanupFailed=0;for(const p of removed){try{await Cloud.remove(p)}catch{cleanupFailed++}}
  toast(cleanupFailed?'Property deleted. Some stored photo files could not be cleaned up.':'Property and photos deleted.');
 });
}

async function listProperties(){
 const list=$('propertyList');list.replaceChildren();if(!state.properties.length){list.textContent='No properties yet. Upload photos in Marketing Studio to get started.';return}
 const all=await request(db.transaction('photos').objectStore('photos').getAll());if($('properties').hidden)return;
 for(const p of state.properties){
  const r=document.createElement('div');r.className='property-media';
  const media=all.filter(photo=>photo.property===p.id),hero=media.find(photo=>photo.id===p.hero)||media[0];
  if(hero){const thumb=document.createElement('img');thumb.className='property-thumbnail';thumb.alt=p.name;thumb.loading='lazy';r.append(thumb);hydratePhoto(hero).then(()=>{if(thumb.isConnected)thumb.src=photoURL(hero)}).catch(()=>{thumb.alt='Photo unavailable';thumb.title='Open Studio to retry loading this photo.'})}
  const d=document.createElement('div'),title=document.createElement('strong'),meta=document.createElement('p'),detail=document.createElement('p');meta.className=detail.className='property-meta';title.textContent=p.name;
  const agent=state.agents.find(agent=>agent.id===p.agent);
  meta.textContent=[p.community,p.category,p.beds&&(p.beds+' bedrooms'),p.area&&(Number(p.area).toLocaleString()+' sq ft'),p.price&&('AED '+Number(p.price).toLocaleString())].filter(Boolean).join(' · ');
  detail.textContent=[media.length+' photos',agent?.name,p.code].filter(Boolean).join(' · ');
  d.append(title,meta,detail);
  const date=p.updatedAt||p.created;if(date&&!Number.isNaN(new Date(date).getTime())){const stamp=document.createElement('p');stamp.className='property-meta';stamp.textContent=(p.updatedAt?'Updated ':'Added ')+new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeZone:'Asia/Dubai'}).format(new Date(date));d.append(stamp)}
  const actions=document.createElement('div');actions.className='property-actions';
  const open=button('Open Studio',async()=>{await selectProperty(p.id);page('studio')}),edit=button('Edit details',async()=>{await selectProperty(p.id);page('studio');$('propertyForm').elements.name.focus()}),remove=button('Delete',()=>deleteProperty(p.id));remove.classList.add('danger-link');
  actions.append(open,edit,remove);r.append(d,actions);list.append(r);
 }
}
function listAgents(){const list=$('agentList');list.replaceChildren();for(const a of state.agents){const r=document.createElement('div');r.className='record';const d=document.createElement('div'),s=document.createElement('strong'),m=document.createElement('small');s.textContent=a.name+(a.archived?' (archived)':'');m.textContent=`${a.title} · ${a.phone}`;d.append(s,m);if(a.portrait){const i=document.createElement('img');i.src=a.portrait;i.alt=a.name;r.append(i)}r.append(d,button(a.archived?'Restore':'Archive',async()=>{a.archived=!a.archived;await persist();selectOptions();listAgents()}));list.append(r)}if(!state.agents.length)list.textContent='Your saved agents will appear here.'}
async function dataURL(file,limit=10){if(!file||!file.size)return '';if(file.size>limit*1024*1024)throw Error(`File must be below ${limit} MB.`);return new Promise((r,j)=>{const f=new FileReader();f.onload=()=>r(f.result);f.onerror=()=>j(f.error);f.readAsDataURL(file)})}
async function boot(userId,remote){
 db=await new Promise((r,j)=>{const o=indexedDB.open('second-brain-'+userId,1);o.onupgradeneeded=()=>{o.result.createObjectStore('records');o.result.createObjectStore('photos',{keyPath:'id'})};o.onsuccess=()=>r(o.result);o.onerror=()=>j(o.error)});
 if(remote?.state){
  state=remote.state;savedPhotoManifest=(remote.photos||[]).map(({blob,cleanedBlob,...p})=>p);
  const cached=await request(db.transaction('photos').objectStore('photos').getAll()),byId=new Map(cached.map(p=>[p.id,p]));
  const incoming=(remote.photos||[]).map(p=>{const old=byId.get(p.id);return{...p,blob:old&&old.cloudPath===p.cloudPath?old.blob:undefined,cleanedBlob:old?.cleanedPath===p.cleanedPath?old?.cleanedBlob:undefined}});
  await tx('photos','readwrite',store=>{store.clear();for(const p of incoming)store.put(p)});
  await tx('records','readwrite',store=>store.put(state,'workspace'));
 }else{const saved=await request(db.transaction('records').objectStore('records').get('workspace'));if(saved)state=saved}
 $('date').textContent=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Dubai',weekday:'short',day:'numeric',month:'short'}).format(new Date())+' · Dubai';
 for(const[k,v]of Object.entries(state.brand))if($('brandForm').elements.namedItem(k)&&k!=='logo')$('brandForm').elements.namedItem(k).value=v;
 if(ensureRecurringTasks(hubData(),dubaiDate()))await persist();current=state.properties[0]?.id||'';photos=[];studioReady=false;selectOptions();renderHub();page('dashboard');
}
document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>page(b.dataset.page));$('newProperty').onclick=async()=>{try{await selectProperty('');page('studio');$('propertyForm').elements.code.value=nextPropertyCode();$('propertyForm').elements.name.focus()}catch(e){toast(e.message)}};$('propertySelect').onchange=e=>selectProperty(e.target.value).catch(e=>toast(e.message));$('propertyForm').onsubmit=async e=>{e.preventDefault();try{const values=Object.fromEntries(new FormData(e.target));if(!values.name.trim()||!values.code.trim())throw Error('Property name and code are required.');if(state.properties.some(p=>p.code===values.code&&p.id!==current))throw Error('Use a unique property code.');const old=prop();values.updatedAt=new Date().toISOString();if(old)Object.assign(old,values);else{current=crypto.randomUUID();state.properties.push({...values,id:current,hero:'',created:new Date().toISOString()})}await persist();await selectProperty(current);$('saveState').textContent='Saved';toast('Property saved. Existing exported files stay unchanged.')}catch(e){toast(e.message)}};$('upload').onchange=e=>upload(Array.from(e.target.files)).then(()=>e.target.value='');const zone=$('dropzone');zone.ondragover=e=>{e.preventDefault();zone.classList.add('drag')};zone.ondragleave=()=>zone.classList.remove('drag');zone.ondrop=e=>{e.preventDefault();zone.classList.remove('drag');upload(Array.from(e.dataTransfer.files))};async function applyPhotoSettings(){if(!photos.length)return;await busy(async()=>{const settings=defaults();for(const p of photos){p.settings={...settings,x:p.settings?.x??.5,y:p.settings?.y??.5};await savePhoto(p)}await gallery();await drawStory();await persist();toast('Enhancement applied to previews, listing exports and Stories.')})}
$('apply').onclick=applyPhotoSettings;for(const id of ['preset','intensity','fit'])$(id).onchange=()=>applyPhotoSettings();$('downloadPhotos').onclick=()=>exportZip('photos');$('downloadStory').onclick=()=>exportZip('story');$('downloadKit').onclick=()=>exportZip('kit');$('carousel').onclick=()=>exportZip('carousel');$('closeDialog').onclick=()=>$('editDialog').close();for(const id of ['editPreset','editIntensity','editFit','cropX','cropY'])$(id).oninput=()=>updatePreview().catch(e=>toast(e.message));$('savePhoto').onclick=async()=>{try{const p=photos.find(p=>p.id===editing.id);p.settings={...editing.settings};await savePhoto(p);await persist();$('editDialog').close();await gallery();await drawStory();toast('Photo adjustments saved.')}catch(e){toast(e.message)}};$('resetPhoto').onclick=()=>{$('editPreset').value='original';$('editIntensity').value=0;$('editFit').value='contain';$('cropX').value=50;$('cropY').value=50;updatePreview().catch(e=>toast(e.message))};for(const id of ['headline','cta'])$(id).onchange=async()=>{if(!prop())return;prop()[id]=$(id).value;try{await persist();await drawStory()}catch(e){toast(e.message)}};$('agentForm').onsubmit=async e=>{e.preventDefault();try{const f=new FormData(e.target),a={id:crypto.randomUUID(),name:f.get('name'),title:f.get('title'),phone:f.get('phone'),email:f.get('email'),brn:f.get('brn'),portrait:await dataURL(f.get('portrait')),archived:false};state.agents.push(a);await persist();e.target.reset();selectOptions();listAgents();toast('Agent saved.')}catch(e){toast(e.message)}};$('brandForm').onsubmit=async e=>{e.preventDefault();try{const f=new FormData(e.target);state.brand={name:f.get('name'),color:f.get('color'),footer:f.get('footer'),logo:await dataURL(f.get('logo'))||state.brand.logo};await persist();await drawStory();toast('Brand kit saved.')}catch(e){toast(e.message)}};$('backup').onclick=()=>busy(async()=>{const all=await request(db.transaction('photos').objectStore('photos').getAll()),records=[];for(const p of all){await hydratePhoto(p);records.push({...p,blob:await dataURL(p.blob,25),cleanedBlob:p.cleanedBlob?await dataURL(p.cleanedBlob,25):undefined})}download(new Blob([JSON.stringify({version:1,state,photos:records})],{type:'application/json'}),'second-brain-backup.json');toast('Backup contains private records and photos. Keep it securely.')} );$('restore').onchange=async e=>{await busy(async()=>{const file=e.target.files[0];if(!file)return;if(file.size>250*1024*1024)throw Error('Backup exceeds 250 MB.');const b=JSON.parse(await file.text());if(b.version!==1||!Array.isArray(b.state?.properties)||!Array.isArray(b.state?.agents)||!b.state?.brand||!Array.isArray(b.photos))throw Error('Invalid backup file.');if(!await confirmAction('This will replace the current workspace with the selected backup. Export your current backup first.',{title:'Restore backup?',confirmLabel:'Replace workspace'}))return;const imported=[];for(const p of b.photos){if(typeof p.id!=='string'||typeof p.blob!=='string'||!/^data:image\/(jpeg|png|webp);base64,/.test(p.blob))throw Error('Invalid photo in backup.');const response=await fetch(p.blob);imported.push({...p,cloudPath:null,cleanedPath:null,blob:await response.blob(),cleanedBlob:p.cleanedBlob?await (await fetch(p.cleanedBlob)).blob():undefined})}const t=db.transaction(['records','photos'],'readwrite');t.objectStore('photos').clear();for(const p of imported)t.objectStore('photos').put(p);t.objectStore('records').put(b.state,'workspace');await new Promise((r,j)=>{t.oncomplete=r;t.onerror=()=>j(t.error)});state=b.state;await persist();for(const u of urls.values())URL.revokeObjectURL(u);urls.clear();await selectProperty(state.properties[0]?.id||'');listProperties();toast('Backup restored.');});e.target.value=''};
Cloud.init(boot).catch(e=>toast(`Workspace unavailable: ${e.message}. Enable browser storage and reload.`));


$('socialFormat').onchange=async()=>{updateSocialLabel();if(prop())prop().socialFormat=socialFormat();try{await drawStory();if(prop())await persist()}catch(e){toast(e.message)}};
$('socialPhoto').onchange=async event=>{if(!prop()||working)return;prop().socialPhoto=event.target.value;renderSocialPhotos();try{await drawStory();await persist()}catch(e){toast(e.message)}};
for(const id of ['socialCropX','socialCropY']){let timer;$(id).oninput=()=>{if(!prop())return;prop().socialCrop={x:Number($('socialCropX').value)/100,y:Number($('socialCropY').value)/100};clearTimeout(timer);timer=setTimeout(()=>drawStory().catch(e=>toast(e.message)),70)};$(id).onchange=()=>{if(prop())persist().catch(e=>toast(e.message))}}
