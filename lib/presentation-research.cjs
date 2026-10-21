'use strict';
const crypto=require('node:crypto');
const tidy=s=>String(s||'').replace(/[ \t]+/g,' ').replace(/\n\s*\n/g,'\n').trim();
const photo=root=>[...(root?.querySelectorAll('img[src]')||[])].find(i=>/\.(jpe?g|png)(?:[?#]|$)/i.test(i.getAttribute('src')||'')&&!/icon|logo|avatar|badge|download/i.test(i.getAttribute('src')||''))?.getAttribute('src')||'';
function documentLinks(document){return [...document.querySelectorAll('a[href]')].map(a=>({href:a.getAttribute('href'),title:tidy(a.textContent)})).filter(a=>a.href&&!/^(#|tel:|mailto:|javascript:)/i.test(a.href)&&!/privacy|cookie|terms|login|register|contact|whatsapp|facebook|instagram|linkedin/i.test(a.href+' '+a.title)).slice(0,80)}
function enrichSections(document,sections){
 if(!sections.length){
  for(const heading of document.querySelectorAll('h2,h3,h4')){
   const title=tidy(heading.textContent);if(!title||title.length>100||/^(download|register|subscribe|get priority|speak with|take the first|frequently|contact|why invest|latest projects|community map)/i.test(title))continue;
   let scope=heading.parentElement;for(let i=0;i<3&&scope&&tidy(scope.innerText).length<title.length+45;i++)scope=scope.parentElement;
   if(!scope||scope.querySelectorAll('h2,h3,h4').length>1)continue;
   const content=tidy(scope.innerText);if(content.length<70||content.length>1800)continue;
   const copy=scope.cloneNode(true);for(const n of copy.querySelectorAll('h2,h3,h4,button,form,.call-to-action-btns'))n.remove();const displayText=tidy(copy.innerText);if(displayText.length<45||sections.some(s=>s.content===content))continue;
   sections.push({id:crypto.randomUUID(),title,content,displayText,imageURL:photo(scope)||photo(scope.parentElement)||photo(scope.closest('section'))});if(sections.length>=12)break;
  }
 }
 return {sections,hero:photo(document)};
}
function projectTokens(title){return [...new Set(String(title||'').toLowerCase().split(/[^a-z0-9]+/).filter(x=>x.length>2&&!['the','and','for','with','from','luxury','living','properties','property','estate','real','development','developments','project','projects','provident','com','www'].includes(x)))].slice(0,5)}
function researchLinks(sources){const found=new Map();for(const source of sources.filter(s=>s.url&&!s.error)){const tokens=projectTokens(source.title);for(const link of source.relatedLinks||[]){try{const u=new URL(link.href,source.url);if(u.protocol!=='https:'||u.username||u.password||u.hash&&u.pathname===new URL(source.url).pathname)continue;u.hash='';const target=(link.title+' '+u.pathname+' '+u.hostname).toLowerCase();if(!tokens.some(t=>target.includes(t)))continue;const key=u.href;if(sources.some(s=>s.url===key))continue;if(!found.has(key))found.set(key,{url:key,parentTitle:source.title,tokens})}catch{}}}return [...found.values()].slice(0,4)}
function relevant(source,tokens){const text=(source.title+' '+source.content).toLowerCase();return tokens.length>0&&tokens.slice(0,2).every(t=>text.includes(t))}
module.exports={documentLinks,enrichSections,researchLinks,projectTokens,relevant};
