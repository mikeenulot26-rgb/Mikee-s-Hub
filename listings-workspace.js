'use strict';
// Extend the existing Listings page; keep the same records, RLS and dashboard tasks.
{
 const form=$('pfListingForm'),label=el('label','','Or enter agent name manually'),manual=el('input');manual.name='manualAgent';manual.maxLength=160;label.append(manual);form.elements.agent.closest('label').after(label);
 const sort=el('select');sort.id='pfSort';sort.className='pw-sort';sort.setAttribute('aria-label','Sort listings');for(const [v,t]of [['updated','Recently updated'],['name','Property name'],['reference','Reference'],['due','Next task date']])sort.add(new Option(t,v));sort.onchange=renderPF;$('pfSearch').after(sort);
 const open=$('pfAddListing'),previous=open.onclick;open.onclick=()=>{previous?.();if(!$('pfListingDialog').open)$('pfListingDialog').showModal()};
 for(const dialog of [$('pfListingDialog')])dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()});
}
