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
  const select=el('select');select.setAttribute('aria-label','Photo for '+p.name);for(const photo of media)select.add(new Option(photo.name,photo.id));select.value=media.some(x=>x.id===p.socialPhoto)?p.socialPhoto:media.some(x=>x.id===p.hero)?p.hero:media[0].id;
  const preview=el('img','carousel-photo-preview');preview.alt='Selected image for '+p.name;preview.hidden=true;let version=0;
  async function showPhoto(){const v=++version,photo=media.find(x=>x.id===select.value);try{const image=await imageFor(photo,true);if(v!==version)return;preview.src=image.src;preview.hidden=false}catch(e){if(v===version){preview.hidden=true;toast('Photo preview unavailable: '+e.message)}}}
  check.onchange=()=>{const index=selection.findIndex(s=>s.property===p.id);if(check.checked&&index<0)selection.push({property:p.id,photo:select.value});else if(!check.checked&&index>=0)selection.splice(index,1);if(check.checked)showPhoto();else{version++;preview.hidden=true}redrawOrder()};
  select.onchange=()=>{const s=selection.find(s=>s.property===p.id);if(s){s.photo=select.value;showPhoto()}};row.append(el('small','muted',p.community||p.code||''),select,preview);list.append(row);
 }
 if(!state.properties.length)list.append(el('p','muted','Save properties and upload their photos in Marketing Studio first.'));
 exportButton.onclick=async()=>{exportButton.disabled=true;try{const slides=carouselSelections(selection,state.properties,all);$('utilityDialog').close();await busy(async()=>{const files=[];for(let i=0;i<slides.length;i++){const {property,photo}=slides[i];$('progress').textContent='Rendering property '+(i+1)+' of '+slides.length;const image=await drawStory(canvas(1080,1080),true,photo,{property,photos:[photo]});files.push({name:String(i+1).padStart(2,'0')+'_'+C.safe(property.code||property.name)+'.png',blob:await blobOf(image,'image/png')})}download(await C.zip(files),'selected-properties-carousel.zip');$('progress').textContent=slides.length+' property slides exported';toast('Selected property carousel ready.');})}catch(e){toast(e.message)}finally{exportButton.disabled=selection.length<2}};
 $('utilityBody').append(list,el('h3','','Slide order'),order,status,exportButton);redrawOrder();
}
