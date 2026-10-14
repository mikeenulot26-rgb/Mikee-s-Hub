'use strict';
let approvalBatch=[],approvalSettings=null;
const previousEditPhoto=edit;
edit=async function(p){await hydratePhoto(p);await previousEditPhoto(p);$('savePhoto').textContent='Approve enhanced version';$('photoApprovalHint').textContent='Original preserved. Approval saves this adjustment and a separate 800 × 600 enhanced export. Brightness cannot recover detail clipped in the source.';$('skipPhotoApproval').hidden=!approvalBatch.length;$('downloadApprovedVersion').hidden=!p.approvedPath&&!p.approvedBlob;};
async function startPhotoApproval(){
 if(!photos.length){toast('Upload photos first.');return}approvalBatch=[...photos];approvalSettings=defaults();await showNextApproval();
}
async function showNextApproval(){
 if(!approvalBatch.length){approvalSettings=null;toast('Photo review finished. Only approved adjustments were saved.');return}
 await edit(approvalBatch[0]);$('editPreset').value=approvalSettings.preset;$('editIntensity').value=approvalSettings.intensity;$('editFit').value=approvalSettings.fit;await updatePreview();$('photoApprovalHint').textContent='Photo '+(photos.length-approvalBatch.length+1)+' of '+photos.length+' · review before approving. Originals and export dimensions stay unchanged.';
}
const previousApprovePhoto=$('savePhoto').onclick;
$('savePhoto').onclick=async()=>{const id=editing?.id,p=photos.find(p=>p.id===id),before=p?.enhancementHistory?.length||0;const b=$('savePhoto');b.disabled=true;try{await previousApprovePhoto();if(approvalBatch.length&&(p.enhancementHistory?.length||0)>before){approvalBatch.shift();await showNextApproval()}}finally{b.disabled=false}};
$('skipPhotoApproval').onclick=async()=>{$('editDialog').close();approvalBatch.shift();await showNextApproval()};
$('closeDialog').onclick=()=>{approvalBatch=[];approvalSettings=null;$('editDialog').close();toast('Unapproved photo changes discarded.')};
$('editDialog').addEventListener('cancel',()=>{approvalBatch=[];approvalSettings=null});
$('downloadApprovedVersion').onclick=async()=>{try{const p=photos.find(p=>p.id===editing?.id);if(!p)return;const blob=p.approvedBlob||(p.approvedPath?await Cloud.download({cloudPath:p.approvedPath}):null);if(blob)download(blob,C.safe(p.name)+'_approved-enhanced.jpg')}catch(e){toast(e.message)}};
$('apply').onclick=()=>startPhotoApproval().catch(e=>toast(e.message));for(const id of ['preset','intensity','fit'])$(id).onchange=()=>startPhotoApproval().catch(e=>toast(e.message));
