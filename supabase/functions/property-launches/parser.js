(function(root){'use strict';const C=typeof module==='object'&&module.exports?require('./launch-core.js'):root.LaunchCore;const S=typeof module==='object'&&module.exports?require('./launch-sources.js'):root.LaunchSources;const clean=s=>String(s||'').replace(/\s+/g,' ').trim();function parse(document,url,s,at=new Date().toISOString()){
 const route=new URL(url).pathname,slug=C.norm(decodeURIComponent(route.split('/').filter(Boolean).pop()||'')),compact=x=>C.norm(x).replace(/ /g,'');
 const headings=[...document.querySelectorAll('h1,h2')].filter(x=>!x.closest('nav,header,footer'));
 const matches=value=>{const n=compact(value),r=compact(slug);return r.length>=4&&n.length>=4&&(n===r||n.includes(r))};
 const heading=headings.find(x=>x.tagName==='H1'&&matches(clean(x.textContent)))||headings.find(x=>matches(clean(x.textContent)))||document.querySelector('h1');
 const metaTitle=clean(document.querySelector('meta[property="og:title"]')?.getAttribute('content')||document.querySelector('title')?.textContent);
 let h=clean((heading&&matches(heading.textContent)?heading.textContent:matches(metaTitle)?metaTitle:heading?.textContent)||metaTitle).split(/\s*[|:]\s*/)[0].replace(/\s*\([^)]*\)\s*$/,'').slice(0,220);
 if(!h||/access denied|just a moment|captcha|latest projects|news and media|^overall$|^building works$/i.test(h))throw Error('Page has no specific project identity');
 const titleName=metaTitle.split(/\s*[|–—]\s*|\s+-\s+/)[0].replace(/\s+by\s+Beyond$/i,'').trim();if(s.id==='beyond'&&matches(titleName)&&titleName.length<h.length)h=titleName;
 const main=heading?.closest('main')||(s.official?document.querySelector('main'):document.querySelector('article'))||document.querySelector('main')||document.querySelector('article')||document.body;
 for(const el of main.querySelectorAll('script,style,nav,footer,form,[role="navigation"],[id*="search-result"],[id*="search-results"],[id*="footer"]'))el.remove();
 for(const el of main.querySelectorAll('header'))if(el.querySelector('nav'))el.remove();
 const description=clean(document.querySelector('meta[name="description"]')?.getAttribute('content'));
 const text=clean((function textOf(n){return n.nodeType===3?n.textContent:[...n.childNodes].map(textOf).join(' ')})(main)+' '+description).split(/More in the community|Recently Launched in|Related (?:projects|properties|articles)/i)[0].slice(0,70000);
 const facts={},fact=(field,value,quote)=>{if(value)facts[field]={value,status:s.official?'confirmed':'reported',source:C.canonical(url),retrievedAt:at,evidence:quote.slice(0,500)}};
 fact('project',h,h);if(s.developer)fact('developer',s.developer,'Official developer source: '+s.name);
 const em=text.match(/\b(?:located in|location[:\s]+|in)\s+(Dubai|Abu Dhabi|Sharjah|Ras Al Khaimah|Ajman)\b/i);if(em)fact('emirate',em[1],em[0]);const location=text.match(/(?:located|situated|set|location|positioned|nestled)[^.?!]{0,150}\b(Abu Dhabi|Dubai|Sharjah|Ras Al Khaimah|Ajman)\b/i);if(!em&&location)fact('emirate',location[1],location[0]);if(!em&&!location&&!s.official)throw Error('UAE location could not be established. Review the source manually.');
 const price=text.match(/(?:starting (?:price|from)|prices? start(?:ing)? (?:at|from)|from)\s*[:\s]*(AED|USD)\s*([\d,.]+\s*(?:million|billion|[mM]n\b|[mM]\b)?)/i);if(price){fact('startingPrice',price[2].replace(/[.,]+$/,''),price[0]);fact('currency',price[1].toUpperCase(),price[0])}
 const plan=text.match(/\b(?:payment plan|payment)\s*[:\s]*(\d{1,3}\s*[/:]\s*\d{1,3})\b/i);if(plan&&plan[1].split(/[/:]/).reduce((sum,x)=>sum+Number(x.trim()),0)===100)fact('paymentPlan',C.payment(plan[1]),plan[0]);
 const hand=text.match(/(?:expected handover|handover|completion date)\s*[:\s]*(Q[1-4]\s*20\d{2}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s*20\d{2}|20\d{2})/i);if(hand)fact('handover',hand[1],hand[0]);
 const category=/\bapartments?|villas?|townhouses?|residen(?:ces|tial)\b/i.test(h+' '+text.slice(0,2500))?'Residential':/\boffices?|commercial\b/i.test(h+' '+text.slice(0,2500))?'Commercial':'';if(category)fact('category',category,(h+' '+text).slice(0,400));
 const factText=['meraas','aldar'].includes(s.id)&&description?description:text;const types=[...new Set([...factText.matchAll(/\b(apartments?|villas?|townhouses?|penthouses?|duplexes?|offices?|retail units?)\b/gi)].map(m=>m[0].toLowerCase()))];if(types.length)fact('propertyTypes',types.join(', '),types.join(', '));
 const units=[...factText.matchAll(/\b(?:studio(?:s)?|[1-9](?:\s*(?:,|&|and|to|–|-)\s*[1-9])*\s*(?:-\s*)?(?:bedrooms?|beds?|BR)\b)/gi)].map(m=>m[0]);if(units.length)fact('bedrooms',[...new Set(units)].join(' · '),units.join('; '));
 const published=document.querySelector('meta[property="article:published_time"]')?.getAttribute('content')||document.querySelector('time[datetime]')?.getAttribute('datetime');if(published&&C.validDate(published.slice(0,10)))fact('announcementDate',published.slice(0,10),'Source publication date: '+published);
 const releaseType=/\bphase|tower\b/i.test(h)?'Phase / tower':/sales (?:launch|release|open)/i.test(h)?'Sales release':'New project';
 const og=document.querySelector('meta[property="og:image"]')?.getAttribute('content');
 const names=C.norm(h).split(' ').filter(x=>x.length>1),identityNames=names.filter(x=>!['the','by','at','in','and',...C.norm(s.developer).split(' ')].includes(x));
 const nameMatches=matches(h)||names.length>0&&names.every(x=>slug.split(' ').includes(x));
 const raster=u=>!/(?:logo|icon|floor.?plan|layout|map|sprite|\.svg(?:\?|$))/i.test(u);
 const namedImages=[];
 for(const img of main.querySelectorAll('img')){
  const src=img.getAttribute('data-src')||img.getAttribute('src');if(!src)continue;
  try{const u=new URL(src,url);if(u.protocol!=='https:'||!raster(u.href))continue;const alt=clean(img.getAttribute('alt')),label=C.norm(alt),path=C.norm(decodeURIComponent(u.pathname));
   const altMatch=names.length&&names.every(x=>label.split(' ').includes(x));
   const pathMatch=nameMatches&&identityNames.length&&identityNames.every(x=>path.split(' ').includes(x));
   if(altMatch||pathMatch)namedImages.push({url:u.href,alt:alt||'Project-named source image',method:altMatch?'project alt text':'project filename'});
  }catch{}
 }
 if(og&&nameMatches&&s.official){try{const u=new URL(og,url),path=C.norm(decodeURIComponent(u.pathname));if(raster(u.href)&&identityNames.length&&identityNames.every(x=>path.split(' ').includes(x)))namedImages.unshift({url:u.href,alt:h,method:'project-named Open Graph image'})}catch{}}
 namedImages.splice(0,namedImages.length,...[...new Map(namedImages.map(x=>[x.url,x])).values()].slice(0,12));
 const image=namedImages[0]?.url||og||'',projectSlug=slug;
 const communities=[['dubai creek harbour','Dubai Creek Harbour'],['dubai hills estate','Dubai Hills Estate'],['emaar south','Emaar South'],['rashid yachts','Rashid Yachts & Marina'],['business bay','Business Bay'],['expo living','Expo Living']];const community=communities.find(([slug])=>projectSlug.includes(slug));
 if(s.official&&community){fact('community',community[1],'Official project page: '+url);fact('emirate','Dubai','Official project page identifies '+community[1]+': '+url)}
 return{parserVersion:4,verificationEvidence:{official:s.official===true,projectPage:S?S.projectPage(url):/\/properties\/[^/]+/.test(route),nameMatches,uaeLocation:!!facts.emirate,namedImages},project:h,developer:s.developer||'',emirate:facts.emirate?.value||'',category,releaseType,releaseName:h,facts,publication:'review',comingSoon:/coming soon|launching soon/i.test(h),imageCandidate:image?new URL(image,url).href:'',sources:[{url:C.canonical(url),name:s.name,official:s.official,retrievedAt:at}],reviewReasons:['Confirm the project and distinct release identity','Verify the source image depicts this project','Review extracted facts against the source']};
}
const api={parse};if(typeof module==='object'&&module.exports)module.exports=api;else root.LaunchParser=api;})(globalThis);

