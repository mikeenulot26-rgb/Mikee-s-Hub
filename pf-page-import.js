function extractPFPage(html){
const clean=value=>String(value||'').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<\/p>/gi,'\n').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").trim();
let p=null;
const next=html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);if(next)try{p=JSON.parse(next[1]).props?.pageProps?.propertyResult?.property}catch{}
if(p&&typeof p.description==='string'){
 const amenities=(p.amenities||[]).map(a=>typeof a==='string'?a:a.name).filter(Boolean),beds=p.bedrooms==='studio'?'Studio':String(p.bedrooms??''),size=p.size?.value?String(p.size.value)+' '+(p.size.unit||''):'';
 const propertyFeatures=[beds==='Studio'?'Studio '+String(p.property_type||'property').toLowerCase():beds?beds+' bedroom '+String(p.property_type||'property').toLowerCase():p.property_type,size?'Property area: '+size:'',p.furnished==='NO'?'Unfurnished':p.furnished==='YES'?'Furnished':'',...amenities.filter(a=>!/shared|children|security/i.test(a))].filter(Boolean);
 const community=amenities.filter(a=>/shared|children|security/i.test(a));
 const photos=(p.images?.property||[]).map((x,i)=>({url:x.full||x.medium,thumbnail:x.thumbnail||x.medium,name:'Listing photo '+(i+1)})).filter(x=>{try{const u=new URL(x.url);return u.protocol==='https:'&&u.hostname==='static.shared.propertyfinder.ae'&&u.pathname.startsWith('/media/images/listing/')}catch{return false}});
 return {ok:true,title:clean(p.title),description:clean(p.description),location:clean(p.location?.full_name),reference:clean(p.reference),beds,baths:String(p.bathrooms??''),area:size,price:p.price?.value||null,furnishing:p.furnished==='NO'?'Unfurnished':p.furnished==='YES'?'Furnished':'',completion:p.completion_status||'',availability:p.rental_availability_date||'',handover:p.project?.delivery_date||'',amenities:amenities.join('\n'),features:propertyFeatures.join('\n'),community:community.join('\n'),photos};
}
let result=null;
function visit(value){if(!value||typeof value!=='object')return;if(Array.isArray(value)){value.forEach(visit);return}if(typeof value.description==='string'&&value.description.length>80&&/RealEstateListing|Apartment|House|Product|Residence/i.test(String(value['@type']||'')))result={ok:true,title:clean(value.name||value.headline),description:clean(value.description),location:clean(value.address?.streetAddress),photos:[]};if(value['@graph'])visit(value['@graph'])}
for(const match of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))try{visit(JSON.parse(match[1]))}catch{}
if(result)return result;
return {ok:false,message:/<title[^>]*>[^<]*(access denied|captcha|verify|just a moment)/i.test(html)?'The public page is blocked by an access challenge.':'A reliable listing description was not found in the public page.'};
}
