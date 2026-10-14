(function(root){
function rect(sw,sh,w,h,fit,x=.5,y=.5){const scale=fit==='cover'?Math.max(w/sw,h/sh):Math.min(w/sw,h/sh);const dw=sw*scale,dh=sh*scale;return [(w-dw)*x,(h-dh)*y,dw,dh]}
function safe(s){return String(s||'PROPERTY').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,60)||'PROPERTY'}
function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0)}return (c^0xffffffff)>>>0}
async function zip(files){const enc=new TextEncoder(),parts=[],central=[];let offset=0,size=0;for(const f of files){const data=new Uint8Array(await f.blob.arrayBuffer()),name=enc.encode(f.name),crc=crc32(data);const local=new Uint8Array(30+name.length),v=new DataView(local.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);local.set(name,30);parts.push(local,data);const c=new Uint8Array(46+name.length),d=new DataView(c.buffer);d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(8,0x800,true);d.setUint32(16,crc,true);d.setUint32(20,data.length,true);d.setUint32(24,data.length,true);d.setUint16(28,name.length,true);d.setUint32(42,offset,true);c.set(name,46);central.push(c);offset+=local.length+data.length;size+=c.length}const end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,size,true);e.setUint32(16,offset,true);return new Blob([...parts,...central,end],{type:'application/zip'})}

function professional(data,amount,region){
 const width=region.width||data.length/4,height=Math.floor(data.length/4/width),x0=Math.max(0,region.x0||0),x1=Math.min(width,region.x1??width),y0=Math.max(0,region.y0||0),y1=Math.min(height,region.y1??height);
 const hist=new Uint32Array(256),neutral=[0,0,0];let count=0,neutralCount=0;
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const i=(y*width+x)*4;if(!data[i+3])continue;const r=data[i],g=data[i+1],b=data[i+2],l=.2126*r+.7152*g+.0722*b;hist[Math.round(l)]++;count++;if(l>55&&l<220&&Math.max(r,g,b)-Math.min(r,g,b)<35){neutral[0]+=r;neutral[1]+=g;neutral[2]+=b;neutralCount++}}
 if(!count)return;let cumulative=0,median=128;for(let n=0;n<256;n++){cumulative+=hist[n];if(cumulative>=count*.5){median=n;break}}
 const gamma=Math.max(.62,Math.min(1.05,Math.log(.60)/Math.log(Math.max(.05,Math.min(.95,median/255))))),gains=[1,1,1],target=(neutral[0]+neutral[1]+neutral[2])/3;
 if(neutralCount>count*.02)for(let j=0;j<3;j++)gains[j]=Math.max(.9,Math.min(1.1,target/Math.max(1,neutral[j])));
 const source=new Uint8ClampedArray(data),denoised=new Uint8ClampedArray(data);
 for(let y=y0+1;y<y1-1;y++)for(let x=x0+1;x<x1-1;x++){const i=(y*width+x)*4,center=.2126*source[i]+.7152*source[i+1]+.0722*source[i+2],sums=[0,0,0];let total=0;
 for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const n=((y+dy)*width+x+dx)*4,lum=.2126*source[n]+.7152*source[n+1]+.0722*source[n+2],weight=Math.exp(-Math.abs(center-lum)/10)*(dx===0&&dy===0?2:1);total+=weight;for(let j=0;j<3;j++)sums[j]+=source[n+j]*weight}
 for(let j=0;j<3;j++)denoised[i+j]=source[i+j]*(1-.24*amount)+sums[j]/total*.24*amount;
 }
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const i=(y*width+x)*4;if(!data[i+3])continue;const lum=(.2126*denoised[i]+.7152*denoised[i+1]+.0722*denoised[i+2])/255,shift=Math.pow(lum,1+(gamma-1)*amount)-lum,shoulder=1-Math.pow(lum,5);
 for(let j=0;j<3;j++){const original=denoised[i+j]/255,balanced=original*(1+(gains[j]-1)*amount*shoulder);let value=balanced+shift*shoulder;
 if(y>y0&&y<y1-1&&x>x0&&x<x1-1){const average=(denoised[i-4+j]+denoised[i+4+j]+denoised[i-width*4+j]+denoised[i+width*4+j])/4;const detail=denoised[i+j]-average;if(Math.abs(detail)>2&&Math.abs(detail)<35)value+=Math.max(-5,Math.min(5,detail*.16*amount))/255}
 data[i+j]=Math.round(Math.max(0,Math.min(1,value))*255);}
 }
}

function enhance(data,preset,intensity,region={}){
 const amount=Math.max(0,Math.min(100,Number(intensity)||0))/100;if(preset==='original'||!amount)return;if(preset==='professional'){professional(data,amount,region);return}
 const width=region.width||data.length/4;
 const included=i=>{const n=i/4,x=n%width,y=Math.floor(n/width);return data[i+3]&&x>=(region.x0??0)&&x<(region.x1??width)&&y>=(region.y0??0)&&y<(region.y1??Infinity)};
 const hist=new Uint32Array(256),neutral=[0,0,0];let count=0,sum=0,neutralCount=0;
 for(let i=0;i<data.length;i+=4){if(!included(i))continue;const r=data[i]/255,g=data[i+1]/255,b=data[i+2]/255,l=.2126*r+.7152*g+.0722*b;hist[Math.round(l*255)]++;count++;sum+=l;
  const high=Math.max(r,g,b),low=Math.min(r,g,b);
  if(l>.25&&l<.92&&high-low<.3*high){neutral[0]+=r;neutral[1]+=g;neutral[2]+=b;neutralCount++}
 }
 if(!count)return;
 const gains=[1,1,1];
 if(preset==='uniform'&&neutralCount>=Math.max(1,count*.015)){
  const target=(neutral[0]+neutral[1]+neutral[2])/3;
  for(let j=0;j<3;j++)gains[j]=Math.max(.82,Math.min(1.22,target/Math.max(.001,neutral[j])));
 }
 let cumulative=0,median=128;for(let i=0;i<256;i++){cumulative+=hist[i];if(cumulative>=count*.5){median=i;break}}
 const mean=sum/count;
 const base=preset==='bright'?.3:preset==='premium'?.19:.16;
 const automatic=Math.max(.42,Math.min(1.14,Math.log(.64)/Math.log(Math.max(.04,Math.min(.96,median/255)))));
 const gamma=preset==='uniform'?1+(automatic-1)*amount:1-(base+Math.max(0,Math.min(.18,.5-mean)))*amount;
 const contrast=1+(preset==='uniform'?.025:preset==='premium'?.15:.07)*amount;
 const saturation=1+(preset==='uniform'?0:preset==='premium'?.10:.035)*amount;
 for(let i=0;i<data.length;i+=4){if(!included(i))continue;
  const rgb=[data[i],data[i+1],data[i+2]].map((value,j)=>{
   let v=value/255;
   if(preset==='uniform'){const correction=1+(gains[j]-1)*amount;const protectedGain=1+(correction-1)*(1-Math.pow(v,4));v=Math.max(0,Math.min(1,v*protectedGain))}
   v=Math.pow(v,gamma);return Math.max(0,Math.min(1,(v-.5)*contrast+.5));
  });
  const l=.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
  for(let j=0;j<3;j++)data[i+j]=Math.round(Math.max(0,Math.min(1,l+(rgb[j]-l)*saturation))*255);
 }
}

root.StudioCore={rect,safe,crc32,zip,enhance};if(typeof module!=='undefined')module.exports=root.StudioCore;
})(typeof window==='undefined'?globalThis:window);
