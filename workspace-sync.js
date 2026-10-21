(function(root){'use strict';
const copy=v=>v===undefined?undefined:structuredClone(v);
function stable(v){if(Array.isArray(v))return'['+v.map(stable).join(',')+']';if(v&&typeof v==='object')return'{'+Object.keys(v).filter(k=>v[k]!==undefined).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';return JSON.stringify(v)}
const same=(a,b)=>stable(a)===stable(b),object=v=>v&&typeof v==='object'&&!Array.isArray(v),ids=v=>Array.isArray(v)&&v.every(x=>object(x)&&typeof x.id==='string')&&new Set(v.map(x=>x.id)).size===v.length;
function conflict(label){throw Error('The same saved record was changed on both devices ('+label+'). Your local edits are retained. Resolve that record before retrying; nothing was overwritten.')}
function merge(base,local,remote,path='workspace'){
 if(same(local,base))return copy(remote);if(same(remote,base)||same(local,remote))return copy(local);
 if(ids(local)&&ids(remote)&&(base===undefined||ids(base))){const b=new Map((base||[]).map(x=>[x.id,x])),l=new Map(local.map(x=>[x.id,x])),r=new Map(remote.map(x=>[x.id,x])),out=[];for(const id of new Set([...r.keys(),...l.keys()])){const bv=b.get(id),lv=l.get(id),rv=r.get(id);let value;if(same(lv,bv))value=rv;else if(same(rv,bv)||same(lv,rv))value=lv;else if(bv===undefined&&/^(repeat:|pf-renew:)/.test(id)&&same({...lv,created:undefined},{...rv,created:undefined}))value=rv;else if(path.endsWith('/taskSeries')&&lv&&rv&&same({...lv,nextDate:undefined},{...rv,nextDate:undefined}))value={...rv,nextDate:[lv.nextDate,rv.nextDate].filter(Boolean).sort().at(-1)||''};else conflict(lv?.title||rv?.title||lv?.name||rv?.name||lv?.reference||rv?.reference||'this record');if(value!==undefined)out.push(copy(value))}return out}
 if(object(local)&&object(remote)&&(base===undefined||object(base))){const out={};for(const k of new Set([...Object.keys(base||{}),...Object.keys(local),...Object.keys(remote)])){if(['__proto__','constructor','prototype'].includes(k))continue;const value=merge(base?.[k],local[k],remote[k],path+'/'+k);if(value!==undefined)out[k]=value}return out}
 conflict(path);
}
function photoMetadata(p){const {blob,cleanedBlob,approvedBlob,...metadata}=p;return metadata}
function photoRecords(manifest,local){const cache=new Map(local.map(p=>[p.id,p]));return manifest.map(p=>{const prior=cache.get(p.id),out=copy(p);for(const [blob,path]of [['blob','cloudPath'],['cleanedBlob','cleanedPath'],['approvedBlob','approvedPath']])if(prior?.[blob]&&prior[path]===p[path])out[blob]=prior[blob];return out})}
const value={merge,same,photoMetadata,photoRecords};if(typeof module!=='undefined'&&module.exports)module.exports=value;else root.HubWorkspaceSync=value;
})(typeof window==='undefined'?globalThis:window);
