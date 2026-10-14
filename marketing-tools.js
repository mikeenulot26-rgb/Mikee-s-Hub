'use strict';
const MT_TOOLS=[
 {id:'listed',name:'Just Listed',detail:'Create a branded post for a new property.',icon:'home'},
 {id:'sold',name:'Just Sold',detail:'Create a post for a completed sale.',icon:'check'},
 {id:'rented',name:'Just Rented',detail:'Create a post for a leased property.',icon:'key'},
 {id:'review',name:'Google Review',detail:'Turn an approved review into a shareable post with rating, quote and agent.',icon:'star'},
 {id:'achievement',name:'Sales Achievement',detail:'Celebrate an agent’s confirmed sales value and transactions.',icon:'image'}
];
let mtDraft=null,mtPhotos=[],mtRenderVersion=0,mtHeadshotRegion=null,mtDrag=null;
const mtImages=new Map();
function mtData(){state.marketingTools ||= {posts:[]};return state.marketingTools}
function mtIcon(kind){const paths={home:'M3 10l9-7 9 7v11H3z M9 21v-8h6v8',check:'M8 12l3 3 5-6 M12 3l3 2 4 1 1 4 1 3-3 3-1 4-5 1-5-2-3-3 1-5-1-4 4-2z',key:'M14 3a6 6 0 1 1-4 10L3 20v-5l5-5a6 6 0 0 1 6-7z',star:'M12 3l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z',image:'M3 3h18v18H3z M3 17l6-7 5 5 3-3 4 5 M16 7h1'};const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('viewBox','0 0 24 24');s.setAttribute('width','30');s.setAttribute('height','30');s.setAttribute('fill','none');s.setAttribute('stroke','currentColor');s.setAttribute('stroke-width','1.8');const p=document.createElementNS(s.namespaceURI,'path');p.setAttribute('d',paths[kind]);s.append(p);return s}
function mtReadForm(){const f=$('mtForm');for(const [key,value]of new FormData(f))if(key!=='confirmed')mtDraft[key]=value;mtDraft.confirmed=f.elements.confirmed.checked}
function mtShow(mode){$('mtToolsGrid').hidden=mode!=='tools';$('mtHistory').hidden=mode!=='history';$('mtEditor').hidden=mode!=='editor';$('mtBack').hidden=mode!=='editor';$('mtToolsTab').classList.toggle('active',mode==='tools');$('mtHistoryTab').classList.toggle('active',mode==='history')}
function renderMarketingTools(){
 const grid=$('mtToolsGrid');grid.replaceChildren();for(const tool of MT_TOOLS){const card=el('button','mt-tool-card'),icon=el('span','mt-tool-icon');card.type='button';icon.append(mtIcon(tool.icon));card.append(icon,el('h2','',tool.name),el('p','',tool.detail));card.onclick=()=>mtOpen(tool.id).catch(e=>toast(e.message));grid.append(card)}
 mtRenderHistory();if(!mtDraft)mtShow('tools');
}
async function mtAsset(file,purpose){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw Error('Choose a JPG, PNG or WebP image under 10 MB.');
 const id=crypto.randomUUID(),p={id,property:'marketing-tools',name:file.name||purpose+'.png',blob:file,settings:{preset:'original',intensity:0,fit:'cover',x:.5,y:.5},order:0,assetPurpose:purpose};
 const img=await imageFor(p);p.width=img.naturalWidth;p.height=img.naturalHeight;await savePhoto(p);return id;
}
async function mtImage(id){
 if(!id)return null;if(mtImages.has(id))return mtImages.get(id);
 const photo=await request(db.transaction('photos').objectStore('photos').get(id));if(!photo)throw Error('A saved photo is no longer available. Choose a replacement.');
 let image=await imageFor(photo,true);const settings=photo.settings;if(settings&&settings.preset!=='original'&&settings.intensity){const ratio=Math.min(1,2200/Math.max(image.naturalWidth,image.naturalHeight)),enhanced=canvas(Math.round(image.naturalWidth*ratio),Math.round(image.naturalHeight*ratio)),ctx=enhanced.getContext('2d');ctx.drawImage(image,0,0,enhanced.width,enhanced.height);const pixels=ctx.getImageData(0,0,enhanced.width,enhanced.height);C.enhance(pixels.data,settings.preset,settings.intensity,{width:enhanced.width});ctx.putImageData(pixels,0,0);enhanced.naturalWidth=enhanced.width;enhanced.naturalHeight=enhanced.height;image=enhanced}const pair={photo,image};mtImages.set(id,pair);return pair;
}
async function mtOpen(toolId,saved=null){
 const tool=MT_TOOLS.find(t=>t.id===toolId);mtDraft=saved?structuredClone(saved):{tool:toolId,design:'classic',format:'post',propertyId:'',photoId:'',headshotId:'',qrId:'',photoZoom:100,headshotZoom:100,photoX:.5,photoY:.5,headX:.5,headY:.5,agentName:state.profileName||'Mikee',agentTitle:'',agentPhone:'',achievement:'Sales Achievement',rating:'5'};
 $('mtForm').reset();for(const [key,value]of Object.entries(mtDraft)){const input=$('mtForm').elements[key];if(input&&input.type!=='checkbox')input.value=value}
 $('mtForm').elements.confirmed.checked=false;mtDraft.confirmed=false;
 const properties=$('mtProperty');properties.replaceChildren(new Option('Choose a saved property or enter details',''));for(const p of state.properties)properties.add(new Option((p.code?p.code+' — ':'')+p.name,p.id));properties.value=mtDraft.propertyId||'';
 const agents=$('mtAgent');agents.replaceChildren(new Option('Choose an agent or enter details',''));for(const a of state.agents.filter(a=>!a.archived))agents.add(new Option(a.name,a.id));agents.value=mtDraft.agentId||'';
 const propertyTool=['listed','sold','rented'].includes(toolId);$('mtPropertyFields').hidden=!propertyTool;$('mtPermitFields').hidden=!propertyTool;$('mtReviewFields').hidden=toolId!=='review';$('mtAchievementFields').hidden=toolId!=='achievement';
 $('mtTitle').textContent=tool.name;$('mtSubtitle').textContent=tool.detail;mtShow('editor');await mtLoadPhotos();await mtRender();
}
async function mtLoadPhotos(){
 const list=$('mtPhotoChoices');list.replaceChildren();mtPhotos=[];if(!mtDraft.propertyId)return;
 mtPhotos=(await request(db.transaction('photos').objectStore('photos').getAll())).filter(p=>p.property===mtDraft.propertyId).sort((a,b)=>(a.order||0)-(b.order||0));
 for(const p of mtPhotos){const b=el('button',p.id===mtDraft.photoId?'selected':''),img=el('img');b.type='button';img.alt=p.name;b.setAttribute('aria-label','Use '+p.name);b.append(img);b.onclick=async()=>{mtDraft.photoId=p.id;mtDraft.photoX=.5;mtDraft.photoY=.5;Array.from(list.children).forEach(x=>x.classList.toggle('selected',x===b));await mtRender()};list.append(b);imageFor(p,true).then(image=>{if(b.isConnected)img.src=image.src}).catch(()=>{})}
}
async function mtPickAgent(id){
 const agent=state.agents.find(a=>a.id===id);if(!agent)return;mtDraft.agentId=id;for(const [key,value]of Object.entries({agentName:agent.name,agentTitle:agent.title,agentPhone:agent.phone})){$('mtForm').elements[key].value=value||'';mtDraft[key]=value||''}
 mtDraft.headshotId='';if(agent.portrait){const blob=await (await fetch(agent.portrait)).blob();mtDraft.headshotId=await mtAsset(new File([blob],'agent-headshot.png',{type:blob.type||'image/png'}),'headshot')}
 await mtRender();
}
function mtRounded(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath()}
function mtDrawCover(ctx,image,x,y,w,h,zoom,px,py){const ratio=Math.max(w/image.naturalWidth,h/image.naturalHeight)*zoom/100,dw=image.naturalWidth*ratio,dh=image.naturalHeight*ratio;ctx.drawImage(image,x+(w-dw)*px,y+(h-dh)*py,dw,dh)}
function mtWrap(ctx,text,x,y,width,height,maxSize,color){
 let size=maxSize,lines=[];for(;size>=22;size-=2){ctx.font='500 '+size+'px Arial, sans-serif';lines=[];let line='';for(const word of String(text||'').split(/\s+/)){const candidate=line?line+' '+word:word;if(ctx.measureText(candidate).width>width&&line){lines.push(line);line=word}else line=candidate}if(line)lines.push(line);if(lines.length*size*1.4<=height)break}
 ctx.fillStyle=color;lines.forEach((line,i)=>ctx.fillText(line,x,y+i*size*1.4));return lines.length*size*1.4;
}
async function mtDraw(d,target){
 const w=1080,h=d.format==='story'?1920:1350,c=target||canvas(w,h),ctx=c.getContext('2d');c.width=w;c.height=h;const brand=state.brand,color=brand.color||'#00585b',cream='#f7f5f0',ink='#183134',white='#ffffff',classic=d.design==='classic',propertyTool=['listed','sold','rented'].includes(d.tool),photo=d.photoId?await mtImage(d.photoId):null;
 ctx.fillStyle=classic?color:cream;ctx.fillRect(0,0,w,h);
 if(propertyTool&&photo){ctx.save();ctx.beginPath();ctx.rect(0,0,w,h);ctx.clip();mtDrawCover(ctx,photo.image,0,0,w,h,Number(d.photoZoom)||100,Number(d.photoX)??.5,Number(d.photoY)??.5);ctx.restore();

 const shade=ctx.createLinearGradient(0,0,0,h);shade.addColorStop(0,'rgba(8,28,34,.72)');shade.addColorStop(.3,'rgba(8,28,34,.05)');shade.addColorStop(1,'rgba(8,28,34,.48)');ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);}
 const headingColor=classic||propertyTool&&photo?white:ink;
 if(brand.logo){const image=await optionalImage(brand.logo);ctx.drawImage(image,...C.rect(image.naturalWidth,image.naturalHeight,320,88,'contain').map((v,i)=>i===0?v+380:i===1?v+62:v))}
 else{ctx.textAlign='center';designText(ctx,brand.name||'Croswell',540,110,900,38,headingColor,'600');ctx.textAlign='left'}
 const title=d.tool==='achievement'?(d.achievement||'Sales Achievement'):MT_TOOLS.find(t=>t.id===d.tool)?.name;
 ctx.textAlign='center';designText(ctx,title,540,240,960,classic?92:74,headingColor,'500');ctx.textAlign='left';
 if(propertyTool&&!photo){ctx.textAlign='center';designText(ctx,'Choose a property photo',540,h*.48,800,35,classic?'#b5ccd0':'#819395','400');ctx.textAlign='left'}
 if(d.tool==='review'){
  const rating=Math.max(1,Math.min(5,Number(d.rating)||5));ctx.fillStyle=classic?'#e8cf91':color;for(let i=0;i<rating;i++){const cx=540-(rating-1)*37+i*74,cy=350;ctx.beginPath();for(let point=0;point<10;point++){const angle=-Math.PI/2+point*Math.PI/5,r=point%2?13:28,x=cx+Math.cos(angle)*r,y=cy+Math.sin(angle)*r;if(!point)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.closePath();ctx.fill()}
  mtWrap(ctx,'“'+(d.quote||'Your approved client review appears here.')+'”',100,490,880,h-930,58,headingColor);
  designText(ctx,d.reviewer||'Reviewer name',100,h-505,840,38,headingColor,'600');
 }
 if(d.tool==='achievement'){
  ctx.textAlign='center';designText(ctx,d.salesValue?'AED '+Number(d.salesValue).toLocaleString():'Total sales value',540,h*.43,960,82,headingColor,'600');designText(ctx,d.transactions?d.transactions+' transactions':'Confirmed transactions',540,h*.43+100,900,45,headingColor,'500');designText(ctx,d.period||'',540,h*.43+180,900,32,headingColor,'400');designText(ctx,d.salesCategory||'',540,h*.43+235,900,30,headingColor,'400');ctx.textAlign='left';
 }
 const cardX=70,cardY=h-460,cardW=940,cardH=380;
 mtRounded(ctx,cardX,cardY,cardW,cardH,24);ctx.fillStyle=classic?'rgba(12,39,47,.88)':cream;ctx.fill();ctx.strokeStyle=classic?'rgba(255,255,255,.3)':'#d1d8d2';ctx.lineWidth=2;ctx.stroke();
 const cardInk=classic?white:ink,muted=classic?'#d4e1df':'#647774';
 if(propertyTool){
  const specifications=[d.beds?(String(d.beds).toLowerCase()==='studio'?'Studio':d.beds+' bed'):'',d.baths?d.baths+' bath':'',d.area?Number(String(d.area).replace(/,/g,'')).toLocaleString()+' sq ft':''].filter(Boolean).join('   ·   ');designText(ctx,specifications,100,cardY+56,650,26,muted,'500');
  designText(ctx,d.propertyName||d.location||'Property details',100,cardY+111,620,34,cardInk,'500');if(d.location&&d.propertyName)designText(ctx,d.location,100,cardY+154,620,27,muted,'400');
  if(d.price)designText(ctx,'AED '+Number(d.price).toLocaleString(),100,cardY+210,620,53,cardInk,'600');
 }
 const agentY=propertyTool?cardY+290:cardY+140;
 designText(ctx,d.agentName||'Agent name',100,agentY,610,39,cardInk,'500');designText(ctx,d.agentTitle||'',100,agentY+44,610,25,muted,'500');if(d.agentPhone)designText(ctx,d.agentPhone,100,agentY+81,590,25,muted,'400');
 const head= d.headshotId?await mtImage(d.headshotId):null,cx=846,cy=cardY+158,r=118;mtHeadshotRegion={cx,cy,r};
 ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.clip();if(head)mtDrawCover(ctx,head.image,cx-r,cy-r,2*r,2*r,Number(d.headshotZoom)||100,Number(d.headX)??.5,Number(d.headY)??.5);else{ctx.fillStyle=classic?'#48666a':'#d7e1de';ctx.fillRect(cx-r,cy-r,2*r,2*r)}ctx.restore();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.strokeStyle=classic?'#c4d5d3':'#b2c1bb';ctx.lineWidth=2;ctx.stroke();
 if(propertyTool&&d.qrId){const qr=await mtImage(d.qrId);ctx.fillStyle='#fff';ctx.fillRect(862,h-174,148,148);ctx.drawImage(qr.image,...C.rect(qr.image.naturalWidth,qr.image.naturalHeight,132,132,'contain').map((v,i)=>i===0?v+870:i===1?v+h-166:v))}
 return c;
}
async function mtRender(){if(!mtDraft)return;mtReadForm();const version=++mtRenderVersion;$('mtQRStatus').textContent=mtDraft.qrId?'Permit QR selected.':'Upload a permit QR before property-post export.';try{const c=await mtDraw(structuredClone(mtDraft));if(version!==mtRenderVersion)return;const output=$('mtCanvas');output.width=c.width;output.height=c.height;output.getContext('2d').drawImage(c,0,0);$('mtStatus').textContent='Preview updated.'}catch(e){if(version===mtRenderVersion)$('mtStatus').textContent=e.message}}
function mtRenderHistory(){
 const list=$('mtHistory');list.replaceChildren();for(const post of [...mtData().posts].reverse()){const row=el('div','mt-history-row'),body=el('div');body.append(el('strong','',(MT_TOOLS.find(t=>t.id===post.tool)?.name||'Post')+' · '+(post.propertyName||post.agentName||post.reviewer||'')),el('p','',post.createdAt.slice(0,10)+' · '+post.design+' · '+post.format));row.append(body,button('Open & edit',()=>mtOpen(post.tool,post).catch(e=>toast(e.message))),button('Download again',async()=>{try{download(await blobOf(await mtDraw(post),'image/png'),C.safe(post.tool)+'_'+post.id+'.png')}catch(e){toast(e.message)}}));list.append(row)}hubEmpty(list,'Your generated posts will appear here.');}
function mtCanvasPoint(e){const bounds=$('mtCanvas').getBoundingClientRect();return{x:(e.clientX-bounds.left)*$('mtCanvas').width/bounds.width,y:(e.clientY-bounds.top)*$('mtCanvas').height/bounds.height}}
function mtInit(){
 $('mtToolsTab').onclick=$('mtBack').onclick=()=>{mtDraft=null;$('mtTitle').textContent='Marketing tools';$('mtSubtitle').textContent='Create branded property posts, reviews and agent milestones.';mtShow('tools')};
 $('mtHistoryTab').onclick=()=>{mtRenderHistory();mtShow('history')};
 $('mtPhotoStudio').onclick=()=>page('studio');$('mtCarousel').onclick=()=>openPropertyCarousel().catch(e=>toast(e.message));
 $('mtForm').oninput=()=>mtRender();
 $('mtProperty').onchange=async e=>{const p=state.properties.find(p=>p.id===e.target.value);mtDraft.propertyId=p?.id||'';mtDraft.photoId=p?.socialPhoto||p?.hero||'';if(p){for(const [key,value]of Object.entries({propertyName:p.name,location:p.community,beds:p.beds,baths:p.baths||'',area:p.area,price:p.price})){$('mtForm').elements[key].value=value||'';mtDraft[key]=value||''}if(p.agent){$('mtAgent').value=p.agent;await mtPickAgent(p.agent)}}await mtLoadPhotos();if(!mtDraft.photoId&&mtPhotos[0])mtDraft.photoId=mtPhotos[0].id;await mtRender()};
 $('mtAgent').onchange=e=>mtPickAgent(e.target.value).catch(error=>toast(error.message));
 for(const [id,key,purpose]of [['mtPhotoUpload','photoId','property-photo'],['mtHeadshotUpload','headshotId','headshot'],['mtQRUpload','qrId','permit-qr']])$(id).onchange=async e=>{const file=e.target.files[0];if(!file)return;try{mtDraft[key]=await mtAsset(file,purpose);await mtRender()}catch(error){toast(error.message)}finally{e.target.value=''}};
 $('mtResetPosition').onclick=()=>{Object.assign(mtDraft,{photoX:.5,photoY:.5,headX:.5,headY:.5,photoZoom:100,headshotZoom:100});$('mtForm').elements.photoZoom.value=100;$('mtForm').elements.headshotZoom.value=100;mtRender()};
 $('mtForm').onsubmit=async e=>{e.preventDefault();mtReadForm();const b=$('mtGenerate');b.disabled=true;try{const propertyTool=['listed','sold','rented'].includes(mtDraft.tool);if(!mtDraft.confirmed)throw Error('Confirm the details are accurate before exporting.');if(propertyTool&&!mtDraft.photoId)throw Error('Choose a property photo.');if(propertyTool&&!mtDraft.qrId)throw Error('Upload the permit QR for this property post.');if(mtDraft.tool==='review'&&(!mtDraft.quote?.trim()||!mtDraft.reviewer?.trim()))throw Error('Enter the approved review and reviewer display name.');if(mtDraft.tool==='achievement'&&(!mtDraft.salesValue||!mtDraft.transactions))throw Error('Enter the confirmed sales value and transaction count.');
 const snapshot={...structuredClone(mtDraft),id:crypto.randomUUID(),createdAt:new Date().toISOString()},png=await blobOf(await mtDraw(snapshot),'image/png');mtData().posts.push(snapshot);try{await persist({syncMedia:false})}catch(error){mtData().posts=mtData().posts.filter(p=>p.id!==snapshot.id);throw error}download(png,C.safe(snapshot.tool)+'_'+snapshot.format+'.png');mtRenderHistory();$('mtStatus').textContent='PNG downloaded. Post saved in History.';}catch(error){$('mtStatus').textContent=error.message}finally{b.disabled=false}};
 const preview=$('mtCanvas');preview.onpointerdown=e=>{if(!mtDraft)return;const point=mtCanvasPoint(e),head=mtHeadshotRegion,inside=head&&Math.hypot(point.x-head.cx,point.y-head.cy)<=head.r;mtDrag={x:e.clientX,y:e.clientY,head:inside,px:inside?mtDraft.headX:mtDraft.photoX,py:inside?mtDraft.headY:mtDraft.photoY};preview.setPointerCapture(e.pointerId)};
 preview.onpointermove=e=>{if(!mtDrag)return;const bounds=preview.getBoundingClientRect(),clamp=x=>Math.max(0,Math.min(1,x));if(mtDrag.head){mtDraft.headX=clamp(mtDrag.px-(e.clientX-mtDrag.x)/bounds.width);mtDraft.headY=clamp(mtDrag.py-(e.clientY-mtDrag.y)/bounds.height)}else{mtDraft.photoX=clamp(mtDrag.px-(e.clientX-mtDrag.x)/bounds.width);mtDraft.photoY=clamp(mtDrag.py-(e.clientY-mtDrag.y)/bounds.height)}mtRender()};
 preview.onpointerup=preview.onpointercancel=()=>mtDrag=null;
}
mtInit();
