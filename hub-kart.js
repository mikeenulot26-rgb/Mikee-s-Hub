'use strict';
(()=>{
 const root=document.getElementById('games'),canvas=document.getElementById('kartCanvas'),ctx=canvas.getContext('2d');
 const ui=id=>document.getElementById(id),LENGTH=6000,LAPS=3,VIEW=1500;
 const keys=new Set();let active=false,frame=0,last=0,mode='ready',distance=0,speed=0,x=0,time=0,coins=0,boost=1,countdown=3,hit=0,shake=0,hitCount=0,lives=3,steer=0,driveFeel=0;
 let best=0;try{best=Number(localStorage.getItem('hub-kart-tokyo-best-v2'))||0}catch{}
 const collected=new Set(),collided=new Set(),objects=[];
 for(let i=0;i<40;i++){const z=220+i*143;objects.push({z,lane:Math.sin(i*2.1)*.78,type:i%7===2?'boost':i%5===0?'rival':i%3===0?'cone':'coin',id:i})}
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const format=t=>Math.floor(t/60)+':'+(t%60).toFixed(2).padStart(5,'0');
 function overlay(title,message,label){ui('kartOverlay').hidden=false;ui('kartOverlayTitle').textContent=title;ui('kartOverlayText').textContent=message;ui('kartStart').textContent=label}
 function hideOverlay(){ui('kartOverlay').hidden=true}
 function updateHUD(){ui('kartLap').textContent=Math.min(3,Math.floor(distance/LENGTH)+1)+' / 3';ui('kartTime').textContent=format(time);ui('kartCoins').textContent=String(coins);ui('kartLives').textContent='♥'.repeat(lives)+'♡'.repeat(3-lives);ui('kartLives').setAttribute('aria-label',lives+' of 3 lives remaining');ui('kartSpeed').textContent=Math.round(speed*.65);ui('kartBoostMeter').value=boost;ui('kartBest').textContent=best?format(best):'Set your first time';ui('kartPause').disabled=!['running','countdown','paused'].includes(mode);ui('kartPause').textContent=mode==='paused'?'Resume':'Pause'}
 function round(x,y,w,h,r,fill){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill()}
 function polygon(points,color){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fillStyle=color;ctx.fill()}
 function project(z,lane=0){const depth=1/(1+z/(140-driveFeel*10)),w=canvas.width,h=canvas.height;return {x:w/2+(Math.sin((distance+z)/1050)-Math.sin(distance/1050))*w*.29+lane*w*.62*depth,y:h*.35+h*.78*depth,half:w*.62*depth,scale:depth}}
 function kart(px,py,size,color,player=false){
  ctx.save();ctx.translate(px,py);ctx.scale(size,size);if(player)ctx.rotate(steer*.045);
  ctx.fillStyle='#0008';ctx.beginPath();ctx.ellipse(0,14,62,12,0,0,Math.PI*2);ctx.fill();
  if(player&&keys.has('boost')&&boost>.01&&speed>70){
   ctx.shadowBlur=22;ctx.shadowColor='#45e5ff';polygon([[-34,16],[-27,43+Math.sin(time*40)*9],[-20,16]],'#8ef5ff');polygon([[20,16],[27,43+Math.cos(time*40)*9],[34,16]],'#8ef5ff');ctx.shadowBlur=0;
  }
  round(-53,-26,17,42,6,'#080d17');round(36,-26,17,42,6,'#080d17');
  const paint=ctx.createLinearGradient(0,-65,0,20);paint.addColorStop(0,player?'#ffffff':color);paint.addColorStop(.65,player?'#eef1f6':color);paint.addColorStop(1,player?'#8898ab':'#627087');
  ctx.beginPath();ctx.moveTo(-51,5);ctx.quadraticCurveTo(-55,-28,-36,-36);ctx.lineTo(-27,-65);ctx.quadraticCurveTo(0,-80,27,-65);ctx.lineTo(36,-36);ctx.quadraticCurveTo(55,-28,51,5);ctx.quadraticCurveTo(0,23,-51,5);ctx.closePath();ctx.fillStyle=paint;ctx.fill();
  polygon([[-24,-61],[24,-61],[32,-36],[-32,-36]],'#121e35');polygon([[-19,-59],[19,-59],[25,-40],[-25,-40]],'#2d4661');polygon([[-18,-59],[0,-59],[-6,-40],[-25,-40]],'#5b779077');
  for(let j=0;j<5;j++)round(-22,-31+j*3,44,1,0,'#8493a0');
  round(-52,-15,104,10,5,'#283244');ctx.shadowBlur=player?12:4;ctx.shadowColor='#ff4f78';round(-48,-13,96,4,2,'#ff567d');ctx.shadowBlur=0;
  ctx.fillStyle='#2d3749';ctx.font='600 6px Arial';ctx.textAlign='center';ctx.fillText(player?'C A R R E R A':'NIGHT RUN',0,-2);
  round(-16,3,32,9,2,'#f8f4e8');ctx.fillStyle='#283244';ctx.font='700 7px Arial';ctx.fillText(player?'911':'TOKYO',0,10);
  round(-45,13,90,7,3,'#283244');round(-34,14,14,5,2,'#97a8ba');round(20,14,14,5,2,'#97a8ba');
  ctx.restore();
 }
 let city=null;
 function cityBackdrop(){
  if(city)return city;city=document.createElement('canvas');city.width=960;city.height=540;const c=city.getContext('2d');
  const sky=c.createLinearGradient(0,0,0,300);sky.addColorStop(0,'#090e24');sky.addColorStop(.65,'#272344');sky.addColorStop(1,'#954e79');c.fillStyle=sky;c.fillRect(0,0,960,540);
  c.fillStyle='#d8e9ff';c.beginPath();c.arc(730,65,24,0,Math.PI*2);c.fill();
  for(let layer=0;layer<2;layer++)for(let i=0;i<32;i++){
   const bx=i*34-10,hh=45+((i*71+layer*53)%116),by=226-hh;c.fillStyle=layer?'#10192d':'#24253f';c.fillRect(bx,by+layer*24,29,hh);
   for(let yy=by+8+layer*24;yy<225;yy+=10)for(let xx=bx+5;xx<bx+25;xx+=8)if((xx+yy+i)%4)c.fillStyle=(i+yy)%3?'#9ec4d65c':'#ffcaad7a',c.fillRect(xx,yy,3,4);
  }
  c.strokeStyle='#f59798';c.lineWidth=2;c.beginPath();c.moveTo(195,223);c.lineTo(231,55);c.lineTo(267,223);c.moveTo(205,180);c.lineTo(256,180);c.moveTo(219,120);c.lineTo(243,120);c.stroke();c.fillStyle='#ffadac';c.fillRect(214,132,34,7);c.fillRect(220,102,22,5);
  c.font='700 21px Arial';c.fillStyle='#f7a5df';c.shadowColor='#ff52bc';c.shadowBlur=14;c.fillText('TOKYO',430,119);c.shadowBlur=0;
  const haze=c.createLinearGradient(0,180,0,270);haze.addColorStop(0,'#a46d9700');haze.addColorStop(1,'#a46d9755');c.fillStyle=haze;c.fillRect(0,180,960,90);
  return city;
 }
 function draw(){
  const w=canvas.width,h=canvas.height;ctx.save();if(shake>0)ctx.translate(Math.sin(time*85)*shake*5,0);
  ctx.drawImage(cityBackdrop(),0,0,w,h);
  ctx.fillStyle='#172235';ctx.fillRect(0,h*.35,w,h*.65);
  for(let i=69;i>=0;i--){const z=i*VIEW/70,a=project(z),b=project(z+VIEW/70),band=Math.floor((distance+z)/120)%2;
   polygon([[0,a.y+1],[w,a.y+1],[w,b.y],[0,b.y]],band?'#19283d':'#18263b');
   polygon([[a.x-a.half*1.09,a.y+1],[a.x+a.half*1.09,a.y+1],[b.x+b.half*1.09,b.y],[b.x-b.half*1.09,b.y]],band?'#d666a3':'#7aaec6');
   polygon([[a.x-a.half,a.y+1],[a.x+a.half,a.y+1],[b.x+b.half,b.y],[b.x-b.half,b.y]],band?'#303a50':'#2e384e');
   if(band)for(const lane of [-1/3,1/3]){const aw=a.half*.009,bw=b.half*.009;polygon([[a.x+a.half*lane-aw,a.y+1],[a.x+a.half*lane+aw,a.y+1],[b.x+b.half*lane+bw,b.y],[b.x+b.half*lane-bw,b.y]],'#9ab2c2')}
  }
  for(let i=14;i>=0;i--){const z=((i*145-distance%145)+VIEW)%VIEW,p=project(z),side=i%2?-1:1,tx=p.x+side*p.half*1.32,scale=p.scale;
   round(tx-3*scale,p.y-155*scale,6*scale,155*scale,2*scale,'#354258');
   ctx.fillStyle=i%2?'#ffb8e8':'#97edff';ctx.fillRect(tx-34*scale,p.y-160*scale,68*scale,5*scale);
   if(i%3===0){round(tx-34*scale,p.y-135*scale,68*scale,72*scale,3*scale,i%2?'#752b69':'#174a61');ctx.fillStyle='#eaf7ff';ctx.font='700 '+Math.max(1,Math.round(15*scale))+'px Arial';ctx.textAlign='center';ctx.fillText(i%2?'東京':'NIGHT',tx,p.y-107*scale);ctx.fillText(i%2?'DRIVE':'RUN',tx,p.y-84*scale)}
  }
  if(keys.has('boost')&&boost>0&&speed>100){ctx.strokeStyle='#8cecff55';ctx.lineWidth=2;for(let i=0;i<10;i++){const sy=h*.46+((time*500+i*89)%(h*.5)),sx=i%2?w*.04:w*.96;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx+(i%2?-30:30),sy+45);ctx.stroke()}}
  const sprites=[];const lap=Math.floor(distance/LENGTH);
  for(const object of objects)for(const cycle of [lap,lap+1]){if(cycle>=LAPS)continue;const z=object.z+cycle*LENGTH-distance,key=cycle+':'+object.id;if(z>15&&z<VIEW&&!collected.has(key))sprites.push({...object,z,key})}
  sprites.sort((a,b)=>b.z-a.z);
  for(const object of sprites){const p=project(object.z,object.lane),s=p.scale*2.5;
   if(object.type==='coin'){ctx.fillStyle='#ffe09b';ctx.beginPath();ctx.ellipse(p.x,p.y-25*s,10*s,14*s,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ad773c';ctx.lineWidth=2*s;ctx.stroke();ctx.fillStyle='#fff5cd';ctx.fillRect(p.x-2*s,p.y-32*s,3*s,14*s)}
   else if(object.type==='boost'){ctx.save();ctx.translate(p.x,p.y-28*s);ctx.rotate(Math.sin(time*2)*.08);ctx.shadowColor='#49eaff';ctx.shadowBlur=16*s;round(-19*s,-20*s,38*s,40*s,8*s,'#124c70');ctx.strokeStyle='#66efff';ctx.lineWidth=2*s;ctx.stroke();polygon([[3*s,-15*s],[-10*s,2*s],[-1*s,2*s],[-3*s,15*s],[11*s,-3*s],[2*s,-3*s]],'#a7f9ff');ctx.restore()}
   else if(object.type==='cone'){polygon([[p.x,p.y-38*s],[p.x-18*s,p.y],[p.x+18*s,p.y]],'#f3a27d');round(p.x-23*s,p.y-3*s,46*s,8*s,2*s,'#ffcfad');ctx.fillStyle='#fff5df';ctx.fillRect(p.x-8*s,p.y-22*s,16*s,6*s)}
   else kart(p.x,p.y,s*.57,object.id%2?'#b3a3e2':'#82d8d1');
  }
  const player=project(45,x*.82);if(!hit||Math.floor(time*14)%2)kart(player.x,h*.88,w/960*1.13,'#ffffff',true);
  if(hit>0){ctx.fillStyle='rgba(255,211,176,.12)';ctx.fillRect(0,0,w,h)}
  if(mode==='countdown'){ctx.textAlign='center';ctx.font='800 '+Math.round(h*.18)+'px system-ui';ctx.fillStyle='#fffaf0';ctx.shadowColor='#18243a';ctx.shadowBlur=15;ctx.fillText(String(Math.ceil(countdown)),w/2,h*.55);ctx.shadowBlur=0}
  ctx.restore();
 }
 function step(dt){
  if(mode==='countdown'){countdown-=dt;if(countdown<=0){mode='running';ui('kartAnnounce').textContent='Go! Race three laps.'}return}
  if(mode!=='running')return;
  time+=dt;hit=Math.max(0,hit-dt);shake=Math.max(0,shake-dt*3);
  const boosting=keys.has('boost')&&boost>0&&speed>70,braking=keys.has('brake');
  if(boosting)boost=Math.max(0,boost-dt*.32);
  driveFeel+=(Number(boosting)-driveFeel)*(1-Math.exp(-dt*5));
  const top=(Math.abs(x)>1?135:boosting?420:290)*(hit>.7?.6:1);
  speed=clamp(speed+(braking?-260:speed<top?100:-180)*dt,0,braking?390:Math.max(top,speed));
  const steering=(keys.has('right')?1:0)-(keys.has('left')?1:0);
  steer+=(steering-steer)*(1-Math.exp(-dt*10));
  x=clamp(x+steer*dt*(.65+speed/270)-Math.cos(distance/1050)*dt*speed/1400,-1.3,1.3);
  const previous=distance;distance=Math.min(LENGTH*LAPS,distance+speed*dt);
  for(const object of objects){const lap=Math.floor(previous/LENGTH);for(const cycle of [lap,lap+1]){const position=object.z+cycle*LENGTH,key=cycle+':'+object.id;
   if(cycle>=LAPS||position<previous||position>=distance||Math.abs(x*.82-object.lane)>.24)continue;
   if(object.type==='coin'&&!collected.has(key)){collected.add(key);coins++;}
   else if(object.type==='boost'&&!collected.has(key)){collected.add(key);boost=Math.min(1,boost+.55);ui('kartAnnounce').textContent='Boost collected!';}
   else if((object.type==='cone'||object.type==='rival')&&!collided.has(key)&&!hit){collided.add(key);speed*=.48;hit=1.15;shake=1;hitCount++;lives=Math.max(0,lives-1);ui('kartAnnounce').textContent=lives+' lives remaining.';if(!lives){mode='gameover';speed=0;keys.clear();overlay('Run over','Three hits. '+coins+' coins collected in '+format(time)+'. Try another Tokyo night run.','Try again');return}}
  }}
  if(distance>=LENGTH*LAPS){mode='finished';speed=0;keys.clear();const record=!best||time<best;if(record){best=time;try{localStorage.setItem('hub-kart-tokyo-best-v2',String(best))}catch{}}
   overlay(record?'New best time!':'Finish line!',format(time)+' · '+coins+' coins · '+hitCount+' bumps. '+(record?'Your quickest three laps so far.':'Your best: '+format(best)), 'Race again');ui('kartAnnounce').textContent='Race finished. '+format(time);}
 }
 function loop(now){frame=0;if(!active||!['running','countdown'].includes(mode))return;const dt=last?Math.min((now-last)/1000,.045):0;last=now;step(dt);updateHUD();draw();if(['running','countdown'].includes(mode))frame=requestAnimationFrame(loop)}
 function run(){last=0;if(!frame&&active&&['running','countdown'].includes(mode))frame=requestAnimationFrame(loop)}
 function reset(){distance=0;speed=0;x=0;time=0;coins=0;boost=.4;countdown=3;hit=0;shake=0;hitCount=0;lives=3;steer=0;driveFeel=0;collected.clear();collided.clear();keys.clear();mode='countdown';hideOverlay();ui('kartAnnounce').textContent='Get ready';updateHUD();draw();run()}
 function pause(){if(!['running','countdown'].includes(mode))return;mode='paused';keys.clear();cancelAnimationFrame(frame);frame=0;overlay('Pit stop','Your race is paused. Pick up where you left off.','Resume race');updateHUD()}
 function resume(){if(!active)return;mode=countdown>0?'countdown':'running';keys.clear();hideOverlay();run();updateHUD()}
 ui('kartStart').onclick=()=>{canvas.focus();mode==='paused'?resume():reset()};ui('kartPause').onclick=()=>mode==='paused'?resume():pause();
 ui('kartRestart').onclick=()=>{canvas.focus();reset()};
 const controls={ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',ArrowDown:'brake',s:'brake',S:'brake',' ':'boost'};
 document.addEventListener('keydown',event=>{if(!active||event.target.closest('input,textarea,select'))return;if(event.code==='Escape'||event.key==='p'||event.key==='P'){if(mode==='paused')resume();else pause();return}const key=controls[event.key];if(key&&['running','countdown'].includes(mode)){event.preventDefault();keys.add(key)}});
 document.addEventListener('keyup',event=>{const key=controls[event.key];if(key)keys.delete(key)});
 for(const button of root.querySelectorAll('[data-kart-control]')){const key=button.dataset.kartControl;
  button.addEventListener('pointerdown',event=>{event.preventDefault();button.setPointerCapture(event.pointerId);if(mode==='running')keys.add(key)});
  const release=()=>keys.delete(key);for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,release);
 }
 window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
 window.hubKartVisibility=visible=>{active=visible;if(!visible){pause();cancelAnimationFrame(frame);frame=0;keys.clear()}else{draw();updateHUD()}};
 updateHUD();draw();
})();
