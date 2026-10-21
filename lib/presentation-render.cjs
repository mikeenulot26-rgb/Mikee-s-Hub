'use strict';
const PDFDocument=require('pdfkit');const encodedFonts=require('./presentation-fonts.json');const fonts={regular:Buffer.from(encodedFonts.regular,'base64'),bold:Buffer.from(encodedFonts.bold,'base64')};function register(doc){doc.registerFont('PSRegular',fonts.regular);doc.registerFont('PSBold',fonts.bold);return doc;}const {payment,yieldScenario,purchaseCosts}=require('../presentation-core.js');
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'AED '+Number(n).toLocaleString('en-GB',{maximumFractionDigits:0});
function layoutDeck(d,assets={}){
 const measure=register(new PDFDocument({font:fonts.regular,autoFirstPage:false})),pages=[];
 const p={bg:'#f8f7f2',ink:'#173d34',accent:'#285f4e',muted:'#74827a',line:'#dce3db',white:'#ffffff'};
 for(const [index,slide]of d.slides.entries()){
  const nodes=[];const rect=(x,y,w,h,fill,r=0)=>nodes.push({type:'rect',x,y,w,h,fill,r});
  const text=(value,x,y,w,size=24,color=p.ink,bold=false,maxY=650)=>{
   value=String(value??'').replace(/\r/g,'');measure.font(bold?'PSBold':'PSRegular').fontSize(size);
   const nodeStart=nodes.length,hasLongToken=value.split(/\s+/).some(word=>measure.widthOfString(word)>w);
   let yy=y;const emit=line=>{nodes.push({type:'text',text:line,x,y:yy,w,size,color,bold});yy+=size*1.35};
   for(const para of value.split('\n')){
    let line='';
    for(const word of para.split(/\s+/)){
     const next=line?line+' '+word:word;
     if(measure.widthOfString(next)<=w){line=next;continue}
     if(line){emit(line);line=''}
     if(measure.widthOfString(word)<=w){line=word;continue}
     // Wrap pasted URLs and other unbroken tokens without deleting characters
     // or inserting hyphens that would change the original information.
     for(const char of word){
      if(line&&measure.widthOfString(line+char)>w){emit(line);line=''}
      line+=char;
     }
    }
    emit(line);
   }
   if(yy>maxY&&hasLongToken&&size>14){nodes.length=nodeStart;return text(value,x,y,w,Math.max(14,size-2),color,bold,maxY)}
   if(yy>maxY)throw Error('Slide '+(index+1)+' has too much text. Split it into more slides in Edit content.');return yy;
  };
  const image=(asset,x,y,w,h,fit='cover')=>{const data=asset?.path?assets[asset.path]:null;if(data)nodes.push({type:'image',data,x,y,w,h,fit})};
  const photo=d.images.find(i=>i.id===slide.imageId),hasPhoto=photo&&assets[photo.path];
  rect(0,0,1280,720,p.bg);
  if(slide.kind==='cover'){
   if(hasPhoto){image(photo,555,0,725,720,slide.imageFit||'cover');rect(0,0,555,720,p.bg)}else{rect(1040,0,240,720,p.accent);rect(1020,55,20,610,'#d9e3d7')}
   if(d.brand.logo?.path)image(d.brand.logo,58,50,260,75,'contain');else{text(d.brand.name||'Croswell',58,55,430,34,p.ink);text('REAL ESTATE',60,102,400,10,p.muted,true)}
   text(d.type==='offplan'?'PROJECT PRESENTATION':'PROPERTY PRESENTATION',60,188,hasPhoto?435:850,11,p.accent,true);
   text(slide.title,58,232,hasPhoto?440:900,hasPhoto?38:52,p.ink,true,510);
   if(slide.text)text(slide.text,60,512,hasPhoto?430:850,18,p.muted,false,600);
   rect(60,612,50,3,p.accent);text(d.agent?.name||'',60,633,hasPhoto?430:850,16,p.ink,true,671);
  }else{
   if(slide.kind!=='contact'){if(d.brand.logo?.path)image(d.brand.logo,1045,30,170,52,'contain');else text(d.brand.name||'Croswell',1040,36,185,23,p.ink);
   text('CROSWELL  /  '+(slide.kind==='sources'?'REFERENCES':slide.kind==='contact'?'YOUR AGENT':'PROPERTY COLLECTION'),56,43,900,10,p.accent,true);
   text(slide.title,54,111,1150,35,p.ink,true,225);rect(56,187,52,3,p.accent);}
   if(slide.kind==='facts'){
    if(hasPhoto)image(photo,690,225,535,405,slide.imageFit||'cover');
    const fs=(slide.factIds||[]).map(fid=>d.facts.find(f=>f.id===fid&&f.include)).filter(Boolean);
    if(!hasPhoto&&d.length!=='short'){
     for(const[i,f]of fs.entries()){const x=i%2?656:56,y=225+Math.floor(i/2)*194;rect(x,y,568,174,p.white,12);text(f.label.toUpperCase(),x+24,y+23,520,11,p.accent,true,y+55);text(f.value,x+24,y+52,520,25,p.ink,true,y+128);const src=d.sources.find(s=>s.id===f.sourceId);text(f.status==='confirmed'?'Source: '+(src?.title||'Reviewed source').slice(0,62):'Provided / independently unverified',x+24,y+139,520,10,p.muted,false,y+169)}
    }else{let y=225;for(const f of fs){const w=hasPhoto?574:1165;y=text(f.label.toUpperCase(),56,y,w,11,p.accent,true);y=text(f.value,56,y+7,w,d.length==='short'?20:25,p.ink,true);const src=d.sources.find(s=>s.id===f.sourceId);y=text(f.status==='confirmed'?'Source: '+(src?.title||'Reviewed source').slice(0,65):'Provided / independently unverified',56,y+5,w,10,p.muted)+22}}
   }else if(slide.kind==='chart'){
    const c=d.charts.find(c=>c.id===slide.chartId&&c.include);if(!c)throw Error('A chart changed. Rebuild the outline.');rect(56,225,1168,350,p.white,12);const max=Math.max(...c.rows.map(r=>Number(r.value)),1),gap=Math.min(42,290/c.rows.length);let y=250;
    for(const r of c.rows){text(r.label,80,y,240,14);rect(340,y+2,700*Number(r.value)/max,17,p.accent,3);text(String(r.value),1070,y,130,14,p.ink,true);y+=gap}
    const src=d.sources.find(s=>s.id===c.sourceId);text(c.basis.toUpperCase()+' · '+c.unit+' · '+c.period+' · '+c.scope,56,591,1160,12,p.muted);text('Source: '+src.title+' | Sample: '+(c.sample||'not supplied')+' | Checked '+src.checkedAt.slice(0,10),56,612,1160,10,p.muted);text(c.limitations,56,631,1160,10,p.muted,false,661);
   }else if(slide.kind==='calculator'){
    const kind=slide.calculator,v=d.calculators[kind];let lines=[];if(kind==='payment'){const rows=payment(v.price,v.rows);lines=[...rows.map(r=>r.label+'   '+r.percent+'%   '+money(r.amount)+(r.date?'   '+r.date:'')),'Total: 100% | '+money(v.price),'Milestones remain undated unless dates are explicitly supplied.','Plan source: '+(d.sources.find(s=>s.id===v.sourceId)?.title||'')]}
    if(kind==='yield'){const r=yieldScenario(v);lines=['Gross yield  '+r.gross.toFixed(2)+'%     Net yield  '+r.net.toFixed(2)+'%','Purchase price '+money(v.price)+' | Acquisition fees '+money(v.acquisition),'Annual rent '+money(v.rent)+' | Vacancy '+v.vacancy+'%','Service charges '+money(v.service)+' | Management '+v.management+'% of collected rent','Other annual costs '+money(v.other)+' | Net investment denominator '+money(r.denominator),'Gross = annual rent / price. Net = net operating income / total investment cost.','Rent basis: '+v.rentBasis,'Calculated scenario. Rent and returns are not guaranteed.']}
    if(kind==='costs'){const r=purchaseCosts(v);lines=['Purchase price  '+money(r.price),...r.fees.map(f=>f.label+'  '+money(f.amount)+' — '+f.basis),'Total acquisition cost  '+money(r.total),'Deposits/down payments are included in the price, not additional fees.']}
    rect(56,225,1168,410,p.white,12);text([...lines,slide.text].filter(Boolean).join('\n'),82,255,1110,21,p.ink,false,620);
   }else if(slide.kind==='sources'){
    let y=225;for(const sid of slide.sourceIds||[]){const s=d.sources.find(s=>s.id===sid);if(!s)continue;text(s.title?.slice(0,115)||'Source',56,y,1150,16,p.ink,true,y+52);let url=s.url||s.filename||'User-provided details';if(s.url){try{const clean=new URL(s.url);for(const key of [...clean.searchParams.keys()])if(/^(utm_|gclid$|gbraid$|wbraid$|fbclid$|gad_)/i.test(key))clean.searchParams.delete(key);url=clean.href}catch{}}const display=url.length>120?url.slice(0,117)+'…':url;text(display,56,y+34,1150,11,p.accent,false,y+63);if(/^https:\/\//.test(s.url||''))nodes.push({type:'link',url:s.url,x:56,y:y+34,w:1150,h:18});text('Published/reporting: '+(s.publishedAt||'not stated')+' | Checked: '+(s.checkedAt?.slice(0,10)||'not checked')+' | '+(s.kind||'supplied'),56,y+58,1150,10,p.muted,false,y+83);rect(56,y+89,1168,1,p.line);y+=104}if(!(slide.sourceIds||[]).length)text('Prepared from provided information. Independent verification is outstanding.',56,245,1100,23);
   }else if(slide.kind==='contact'){
    rect(0,0,1280,720,p.ink);rect(760,0,520,720,'#285649');
    const portrait=d.agent.photo?.path&&assets[d.agent.photo.path]?d.agent.photo:hasPhoto?photo:null;
    if(portrait)image(portrait,780,0,500,720,d.agent.photo===portrait?'contain':'cover');else{rect(850,65,330,590,'#376b58',18);rect(888,110,255,500,'#447963',120);text('C',900,250,220,150,'#b9cdb9',true,530)}
    text(d.brand.name||'Croswell',60,52,640,32,'#f4f2e8');text('REAL ESTATE',62,99,500,10,'#b9cdb9',true);
    text('THE NEXT STEP IS YOURS',62,188,630,11,'#b9cdb9',true);text(slide.title,58,229,640,46,'#f4f2e8',true,407);
    rect(60,411,64,3,'#b7c8a9');text(d.agent.name,60,438,650,30,'#f4f2e8',true,527);
    const contact=[d.agent.title,d.agent.phone,d.agent.email].filter(Boolean);
    if(contact.length)text(contact.join('\n'),62,535,640,19,'#d3dfd2',false,649);else text('Request availability · Arrange a viewing\nDiscuss your property requirements',62,544,630,19,'#d3dfd2',false,649);
    text('CROSWELL  /  PROPERTY COLLECTION',62,678,630,10,'#b9cdb9',true,710);
   }else{if(hasPhoto)image(photo,690,225,535,405,slide.imageFit||'cover');const short=String(slide.text||'').length<220;
    if(short&&!hasPhoto){rect(56,225,1168,405,p.white,16);text(String(index).padStart(2,'0'),84,265,200,96,'#c7d8c8',true,480);text(slide.text||'',330,280,835,32,p.ink,false,605)}else text(slide.text||'',56,short?280:240,hasPhoto?575:1150,short?28:slide.sourceId?22:24,p.ink,false,slide.sourceId?605:640);if(slide.sourceId){const source=d.sources.find(s=>s.id===slide.sourceId);text(slide.verification==='confirmed'?'Source: '+(source?.title||'Reviewed source').slice(0,110):'Provided / independently unverified. Source: '+(source?.title||'Supplied details').slice(0,85),56,637,1160,10,p.muted,false,662)}}
   if(slide.kind!=='contact'){rect(56,677,1168,1,p.line);text((d.title||'').slice(0,90),56,691,1070,10,p.muted,false,719);text(String(index+1).padStart(2,'0')+' / '+String(d.slides.length).padStart(2,'0'),1150,691,75,10,p.muted,false,719);}
  }
  pages.push(nodes);
 }
 measure.end();return pages;
}

function html(d,pages){const body=pages.map((nodes,i)=>'<section class="slide'+(i?'':' active')+'" aria-label="Slide '+(i+1)+'">'+nodes.map(n=>{const pos=`left:${n.x/12.8}%;top:${n.y/7.2}%;width:${n.w/12.8}%;`;if(n.type==='rect')return `<div style="${pos}height:${n.h/7.2}%;background:${n.fill};border-radius:${(n.r||0)/12.8}cqw"></div>`;if(n.type==='image')return `<img alt="Approved presentation image" src="${n.data}" style="${pos}height:${n.h/7.2}%;object-fit:${n.fit==='contain'?'contain':'cover'}">`;if(n.type==='link')return `<a aria-label="Open source" href="${escape(n.url)}" target="_blank" rel="noopener noreferrer" style="${pos}height:${n.h/7.2}%"></a>`;return `<div style="${pos}font-size:${n.size/12.8}cqw;color:${n.color};font-weight:${n.bold?700:400};line-height:1.35;white-space:pre">${escape(n.text)}</div>`}).join('')+'</section>').join('');return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; base-uri 'none'; form-action 'none'"><title>${escape(d.title)}</title><style>@font-face{font-family:PSInter;src:url(data:font/woff;base64,${fonts.regular.toString('base64')}) format('woff');font-weight:400}@font-face{font-family:PSInter;src:url(data:font/woff;base64,${fonts.bold.toString('base64')}) format('woff');font-weight:700}*{box-sizing:border-box}html,body{width:100%;height:100%;overflow:hidden}body{display:grid;grid-template-rows:minmax(0,1fr) auto;padding:0 8px;margin:0;background:#17251f;font-family:PSInter,Arial,sans-serif}.deck{width:min(100%,calc((100dvh - 86px) * 1.7777778));max-width:100%;align-self:center;margin:8px auto;container-type:inline-size}.slide{display:none;position:relative;width:100%;aspect-ratio:16/9;overflow:hidden;background:#f8f7f2}.slide.active{display:block}.slide>*{position:absolute}.controls{display:flex;gap:clamp(5px,2vw,16px);justify-content:center;align-items:center;color:white;min-height:62px;padding:8px 0 12px;font-size:clamp(10px,2vw,15px)}button{border:1px solid #668075;border-radius:8px;background:#254b3c;color:#fff;padding:10px clamp(7px,2vw,17px);font:inherit}button:focus-visible{outline:3px solid white}.controls span{min-width:70px;text-align:center}@media print{@page{size:landscape;margin:0}html,body{height:auto;overflow:visible}body{display:block;padding:0;background:white}.deck{width:100%;margin:0}.slide{display:block;break-after:page}.controls{display:none}}</style></head><body><main class="deck">${body}</main><nav class="controls" aria-label="Presentation controls"><button id="prev">Previous</button><span id="count" aria-live="polite"></span><button id="next">Next</button><button id="full">Fullscreen</button></nav><script>(()=>{let i=0;const slides=[...document.querySelectorAll('.slide')];function show(n){i=Math.max(0,Math.min(slides.length-1,n));slides.forEach((s,k)=>s.classList.toggle('active',k===i));document.getElementById('count').textContent=(i+1)+' / '+slides.length;document.getElementById('prev').disabled=i===0;document.getElementById('next').disabled=i===slides.length-1}document.getElementById('prev').onclick=()=>show(i-1);document.getElementById('next').onclick=()=>show(i+1);document.getElementById('full').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen?.();document.addEventListener('keydown',e=>{if(['ArrowRight','PageDown',' '].includes(e.key)){e.preventDefault();show(i+1)}if(['ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();show(i-1)}if(e.key==='Home')show(0);if(e.key==='End')show(slides.length-1)});show(0)})();</script></body></html>`}
function pdf(d,pages){return new Promise((resolve,reject)=>{const doc=register(new PDFDocument({font:fonts.regular,size:[1280,720],autoFirstPage:false,margin:0,info:{Title:d.title,Author:'Croswell Real Estate'}})),chunks=[];doc.on('data',c=>chunks.push(c));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);try{for(const nodes of pages){doc.addPage();for(const n of nodes){if(n.type==='rect')(n.r?doc.roundedRect(n.x,n.y,n.w,n.h,n.r):doc.rect(n.x,n.y,n.w,n.h)).fill(n.fill);else if(n.type==='image'){const b=Buffer.from(n.data.split(',')[1],'base64');doc.save().rect(n.x,n.y,n.w,n.h).clip();doc.image(b,n.x,n.y,{[n.fit==='contain'?'fit':'cover']:[n.w,n.h],align:'center',valign:'center'});doc.restore()}else if(n.type==='link')doc.link(n.x,n.y,n.w,n.h,n.url);else doc.font(n.bold?'PSBold':'PSRegular').fontSize(n.size).fillColor(n.color).text(n.text,n.x,n.y,{lineBreak:false,width:n.w})}}doc.end()}catch(e){reject(e)}})}
async function selfCheck(){const d={title:'Renderer check',brand:{name:'Croswell'},agent:{name:''},images:[],sources:[],slides:[{kind:'text',title:'Renderer check',text:'Embedded font rendering. https://example.com/property?reference='+ 'a'.repeat(240)}],createdAt:'2026-01-01'};const bytes=await pdf(d,layoutDeck(d));if(bytes.subarray(0,4).toString()!=='%PDF')throw Error('PDF renderer is unavailable.');return true;}
module.exports={layoutDeck,html,pdf,selfCheck};
