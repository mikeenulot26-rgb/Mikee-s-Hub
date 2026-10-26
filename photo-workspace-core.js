(function(root){'use strict';
const MAX=50*1024*1024;
function safe(value){return String(value||'Property photos').normalize('NFKC').replace(/[\\/\x00-\x1f:*?"<>|]/g,'_').replace(/^\.+|\.+$/g,'').trim().slice(0,100)||'Property photos'}
function ordered(items){return [...items].sort((a,b)=>(a.order??0)-(b.order??0)||a.id.localeCompare(b.id))}
function move(items,id,position){const list=ordered(items),at=list.findIndex(p=>p.id===id);if(at<0)throw Error('Photo no longer exists');const [p]=list.splice(at,1);list.splice(Math.max(0,Math.min(list.length,Math.trunc(Number(position)||1)-1)),0,p);return list.map((p,i)=>({...p,order:i}))}
function mime(bytes){if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return'image/jpeg';if(bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71)return'image/png';if(String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')return'image/webp';throw Error('Unsupported or corrupt image. Choose JPG, PNG or WebP; convert HEIC first.')}
function validate(size){if(size<=0)throw Error('The file is empty');if(size>MAX)throw Error('Free cloud storage supports up to 50 MB per photo, not 100 MB. Keep your original and choose a smaller file.')}
function name(folder,p,kind){return safe(folder)+'/'+(p.order+1)+'_'+safe(p.name.replace(/\.[^.]+$/,''))+(kind==='original'?'_enhanced-original':'')+'.jpg'}
function blurScore(data,width){let sum=0,squared=0,n=0;const height=data.length/4/width,lum=i=>.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];for(let y=1;y<height-1;y+=2)for(let x=1;x<width-1;x+=2){const i=(y*width+x)*4,v=4*lum(i)-lum(i-4)-lum(i+4)-lum(i-width*4)-lum(i+width*4);sum+=v;squared+=v*v;n++}return n?squared/n-(sum/n)**2:0}
const api={blurScore,MAX,safe,ordered,move,mime,validate,name};if(typeof module==='object'&&module.exports)module.exports=api;else root.PhotoWorkspaceCore=api;
})(globalThis);
