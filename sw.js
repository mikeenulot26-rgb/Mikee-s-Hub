'use strict';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>{const existing=clients.find(c=>new URL(c.url).origin===self.location.origin);if(existing)return existing.focus();return self.clients.openWindow('/')}))});

self.addEventListener('push',event=>{
 let message={title:'Mikee’s Hub reminder',body:'You have a scheduled reminder.',tag:'hub-reminder'};
 try{if(event.data)message={...message,...event.data.json()}}catch{}
 event.waitUntil(self.registration.showNotification(message.title,{body:message.body,tag:message.tag,icon:'/hub-icon.svg',data:{url:'/'}}));
});
