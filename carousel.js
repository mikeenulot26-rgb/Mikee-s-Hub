'use strict';
function carouselSelections(selection,properties,media){
 if(selection.length<2)throw Error('Select at least two different properties.');
 if(new Set(selection.map(s=>s.property)).size!==selection.length)throw Error('Each property can appear only once.');
 return selection.map(s=>{const property=properties.find(p=>p.id===s.property),photo=media.find(p=>p.id===s.photo&&p.property===s.property);if(!property||!photo)throw Error('A selected property or photo is no longer available. Reopen the carousel builder.');return {property,photo}});
}
async function openPropertyCarousel(){
 const all=await request(db.transaction('photos').objectStore('photos').getAll()),selection=[];
 utility('Build a property carousel',['Choose at least two different properties. Pick one uploaded image for each, then arrange the slide order.']);
 const list=el('div','carousel-property-list'),order=el('div','carousel-order'),status=el('p','carousel-status'),exportButton=el('button','primary','Download carousel ZIP');exportButton.type='button';exportButton.disabled=true;
 const redrawOrder=()=>{order.replaceChildren();status.textContent=selection.length+' properties selected · '+selection.length+' slides';exportButton.disabled=selection.length<2;selection.forEach((s,i)=>{const row=el('div','carousel-order-row');row.append(el('strong','',(i+1)+'. '+state.properties.find(p=>p.id===s.property)?.name));const up=button('↑',()=>{[selection[i-1],selection[i]]=[selection[i],selection[i-1]];redrawOrder()}),down=button('↓',()=>{[selection[i+1],selection[i]]=[selection[i],selection[i+1]];redrawOrder()});up.disabled=i===0;down.disabled=i===selection.length-1;up.setAttribute('aria-label','Move slide up');down.setAttribute('aria-label','Move slide down');row.append(up,down);order.append(row)})};
 for(const p of state.properties){
  const media=all.filter(photo=>photo.property===p.id).sort((a,b)=>(a.order||0)-(b.order||0)),row=el('div','carousel-property-row'),label=el('label','carousel-check'),check=el('input');check.type='checkbox';check.disabled=!media.length;label.append(check,el('strong','',p.name));row.append(label);
  if(!media.length){row.append(el('p','muted','Upload a photo for this property first.'));list.append(row);continue}
  let chosen=media.some(x=>x.id===p.socialPhoto)?p.socialPhoto:media.some(x=>x.id===p.hero)?p.hero:media[0].id;
  const grid=el('div','carousel-thumbnail-grid');grid.hidden=true;grid.setAttribute('role','group');grid.setAttribute('aria-label','Choose a photo for '+p.name);
  const tiles=[];
  const refresh=()=>{for(const {tile,photo}of tiles){const active=photo.id===chosen;tile.classList.toggle('selected',active);tile.setAttribute('aria-pressed',String(active))}};
  for(const [index,photo]of media.entries()){
   const tile=el('button','carousel-thumbnail'),image=el('img'),mark=el('span','carousel-selected-mark','✓');tile.type='button';tile.setAttribute('aria-label','Choose photo '+(index+1)+' for '+p.name);image.alt='Photo '+(index+1)+' of '+p.name;image.loading='lazy';image.decoding='async';tile.append(image,mark);tiles.push({tile,photo});
   tile.onclick=()=>{chosen=photo.id;if(!check.checked){check.checked=true;selection.push({property:p.id,photo:chosen})}else{const s=selection.find(s=>s.property===p.id);if(s)s.photo=chosen}refresh();redrawOrder()};
   grid.append(tile);
   const load=async()=>{try{if(!$('utilityDialog').open||!grid.isConnected||grid.hidden||tile._thumbnailLoaded||tile._thumbnailLoading)return;tile._thumbnailLoading=true;const img=await imageFor(photo,true);if(grid.isConnected){image.src=img.src;tile._thumbnailLoaded=true}}catch{tile.classList.add('photo-unavailable');tile.append(el('span','','Image unavailable'))}finally{tile._thumbnailLoading=false}};
   tile._loadThumbnail=load;
  }
  check.onchange=()=>{grid.hidden=!check.checked;if(check.checked)for(const tile of grid.querySelectorAll('.carousel-thumbnail'))tile._loadThumbnail();const index=selection.findIndex(s=>s.property===p.id);if(check.checked&&index<0)selection.push({property:p.id,photo:chosen});else if(!check.checked&&index>=0)selection.splice(index,1);redrawOrder()};
  row.append(el('small','muted',p.community||p.code||''),grid);list.append(row);refresh();

 }
 if(!state.properties.length)list.append(el('p','muted','Save properties and upload their photos in Marketing Studio first.'));
 exportButton.onclick=async()=>{exportButton.disabled=true;try{const slides=carouselSelections(selection,state.properties,all);$('utilityDialog').close();await busy(async()=>{const files=[];for(let i=0;i<slides.length;i++){const {property,photo}=slides[i];$('progress').textContent='Rendering property '+(i+1)+' of '+slides.length;const image=await drawStory(canvas(1080,1080),true,photo,{property,photos:[photo]});files.push({name:String(i+1).padStart(2,'0')+'_'+C.safe(property.code||property.name)+'.png',blob:await blobOf(image,'image/png')})}download(await C.zip(files),'selected-properties-carousel.zip');$('progress').textContent=slides.length+' property slides exported';toast('Selected property carousel ready.');})}catch(e){toast(e.message)}finally{exportButton.disabled=selection.length<2}};
 $('utilityBody').append(list,el('h3','','Slide order'),order,status,exportButton);redrawOrder();
 const thumbnails=Array.from(list.querySelectorAll('.carousel-thumbnail'));
 if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);entry.target._loadThumbnail()}},{root:$('utilityDialog'),rootMargin:'150px'});for(const tile of thumbnails)observer.observe(tile);$('utilityDialog').addEventListener('close',()=>observer.disconnect(),{once:true})}else{let index=0;const worker=async()=>{while(index<thumbnails.length&&$('utilityDialog').open)await thumbnails[index++]._loadThumbnail()};Promise.all([worker(),worker(),worker()]);}
}
