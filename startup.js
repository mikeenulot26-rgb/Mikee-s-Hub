'use strict';
// Prevent credentials from remaining in the URL or a browser form submission.
try{const url=new URL(location.href);if(url.searchParams.has('password')||url.searchParams.has('email')){url.searchParams.delete('password');url.searchParams.delete('email');history.replaceState(null,'',url.pathname+url.search+url.hash)}}catch{}
document.addEventListener('submit',event=>{if(event.target?.id==='loginForm'){event.preventDefault();if(typeof event.target.onsubmit!=='function'){const message=document.getElementById('authMessage');if(message)message.textContent='Sign-in is still loading. Please wait a moment and try again.'}}},true);
