'use strict';
let confirmationBusy=false;
function confirmAction(message,options={}){
 if(confirmationBusy)return Promise.resolve(false);confirmationBusy=true;
 return new Promise(resolve=>{
  const origin=document.activeElement,dialog=document.createElement('dialog');dialog.className='confirm-modal';dialog.setAttribute('aria-labelledby','confirmHeading');dialog.setAttribute('aria-describedby','confirmDescription');
  const icon=document.createElement('div');icon.className='warning-icon';icon.textContent='!';
  const title=document.createElement('h2');title.id='confirmHeading';title.textContent=options.title||'Confirm action';
  const description=document.createElement('p');description.id='confirmDescription';description.textContent=message;
  const actions=document.createElement('div');actions.className='modal-actions';
  const cancel=document.createElement('button');cancel.className='secondary';cancel.textContent='Cancel';cancel.type='button';cancel.autofocus=true;
  const accept=document.createElement('button');accept.className='destructive';accept.textContent=options.confirmLabel||'Delete';accept.type='button';
  actions.append(cancel,accept);dialog.append(icon,title,description,actions);document.body.append(dialog);
  let settled=false;function finish(result){if(settled)return;settled=true;dialog.classList.add('closing');setTimeout(()=>{dialog.close();dialog.remove();confirmationBusy=false;if(origin?.isConnected)origin.focus();resolve(result)},matchMedia('(prefers-reduced-motion: reduce)').matches?0:140)}
  cancel.onclick=()=>finish(false);accept.onclick=()=>finish(true);dialog.addEventListener('cancel',event=>{event.preventDefault();finish(false)});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)finish(false)}});
  dialog.addEventListener('keydown',event=>{if(event.key==='Tab'){if(event.shiftKey&&document.activeElement===cancel){event.preventDefault();accept.focus()}else if(!event.shiftKey&&document.activeElement===accept){event.preventDefault();cancel.focus()}}});
  dialog.showModal();cancel.focus();
 });
}
document.addEventListener('click',event=>{if(!event.target.closest('.modulemenu'))document.querySelectorAll('.modulemenu[open]').forEach(menu=>menu.removeAttribute('open'))});
document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelectorAll('.modulemenu[open]').forEach(menu=>menu.removeAttribute('open'))});
document.addEventListener('DOMContentLoaded',()=>{
 const form=document.getElementById('projectForm'),panel=form.closest('.panel'),dialog=document.createElement('dialog');dialog.id='projectEditor';dialog.className='editor-modal';
 const bar=document.createElement('div');bar.className='panelhead';const heading=document.createElement('h2');heading.textContent='Project details';const close=document.createElement('button');close.className='secondary';close.textContent='Close';close.onclick=()=>dialog.close();bar.append(heading,close);dialog.append(bar,form);panel.remove();document.body.append(dialog);
 const grid=document.querySelector('#projects .hubgrid');grid.classList.add('project-workspace');const create=document.createElement('button');create.className='primary';create.textContent='+ Create project';create.onclick=()=>{editingProject='';form.reset();dialog.showModal();form.elements.name.focus()};document.querySelector('#projects .hubwelcome').append(create);
 const icons={
 notifications:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
 settings:'<path d="m9 3-1 3-3 1v4l-2 1 2 1v4l3 1 1 3h6l1-3 3-1v-4l2-1-2-1V7l-3-1-1-3z"/><circle cx="12" cy="12" r="3"/>'
 };for(const[id,path]of Object.entries(icons)){const b=document.getElementById(id);b.innerHTML='<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'+path+'</svg>'}
 document.querySelectorAll('.cardtitle').forEach(e=>{if(e.firstChild?.nodeType===3)e.firstChild.textContent=''});
});
