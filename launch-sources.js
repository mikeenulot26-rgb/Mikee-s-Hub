(function(root){'use strict';
const developers=[
 ['emaar','Emaar','https://www.emaar.com/en/latest-launches',['Dubai']],
 ['aldar','Aldar','https://www.aldar.com/properties/en',['Abu Dhabi','Dubai']],
 ['nakheel','Nakheel','https://www.nakheel.com/en/new-launches',['Dubai']],
 ['dubai-holding','Dubai Holding','https://www.dubaiholding.com/en/media-hub/press-releases',['Dubai']],
 ['meraas','Meraas','https://meraas.com/en/latest-project-page',['Dubai']],
 ['sobha','Sobha Realty','https://sobharealty.com/properties-in-uae',['Dubai','Abu Dhabi']],
 ['imtiaz','Imtiaz','https://imtiaz.ae/properties',['Dubai']],
 ['beyond','BEYOND','https://beyonddevelopments.ae/',['Dubai']],
 ['dubai-properties','Dubai Properties','https://www.dp.ae/en/media-centre',['Dubai']],
 ['modon','Modon','https://www.modon.com/real-estate/',['Abu Dhabi']],
 ['bloom','Bloom Holding','https://bloomholding.com/',['Abu Dhabi','Dubai']],
 ['damac','DAMAC','https://www.damacproperties.com/en/projects/',['Dubai']],
 ['ellington','Ellington','https://ellingtonproperties.ae/en',['Dubai']],
 ['binghatti','Binghatti','https://www.binghatti.com/en/new-releases',['Dubai']]
];
const sources=developers.map(([id,name,url,emirates])=>({id,name,developer:name,url,emirates,official:true})).concat([
 {id:'national',name:'The National · Property',url:'https://www.thenationalnews.com/business/property/',official:false},
 {id:'wam',name:'Emirates News Agency',url:'https://www.wam.ae/en/business',official:false}
]);
function sourceFor(url){const host=new URL(url).hostname.replace(/^www\./,'');return sources.find(s=>{const domain=new URL(s.url).hostname.replace(/^www\./,'');return host===domain||host.endsWith('.'+domain)})}
function projectPage(url){const p=new URL(url).pathname.replace(/\/+$/,'');if(/\/(?:index\.html|en|projects|properties|real-estate|property-for-sale)$/i.test(p))return false;return /\/(?:properties|property|projects|project|residential-projects|developments|real-estate|new-launches|properties-in-uae|property-for-sale)\/[^/]+/i.test(p)}
function candidate(url,title,source){try{const u=new URL(url);if(!sourceFor(url)||sourceFor(url).id!==source.id)return false;if(/\.(?:pdf|jpg|png|webp|mp4|svg)$/i.test(u.pathname)||/contact|careers|privacy|mortgage|handover|construction-progress|about-us/i.test(u.pathname))return false;if(source.id==='nakheel'&&!/^\/en\/new-launches\/[^/]+/i.test(u.pathname))return false;if(!source.official)return /launch|unveil|new (?:phase|tower|project|residen)|sales release/i.test(title);return projectPage(url)}catch{return false}}
const api={sources,sourceFor,projectPage,candidate};if(typeof module==='object'&&module.exports)module.exports=api;else root.LaunchSources=api;
})(globalThis);

