'use strict';
(()=>{
 const root=document.getElementById('games'),canvas=document.getElementById('kartCanvas'),ctx=canvas.getContext('2d');
 const ui=id=>document.getElementById(id),LENGTH=6000,LAPS=3,VIEW=1500;
 const keys=new Set();let active=false,frame=0,last=0,mode='ready',distance=0,speed=0,x=0,time=0,coins=0,boost=1,countdown=3,hit=0,shake=0,hitCount=0;
 let best=0;try{best=Number(localStorage.getItem('hub-kart-best-v1'))||0}catch{}
 const collected=new Set(),collided=new Set(),objects=[];
 for(let i=0;i<40;i++){const z=220+i*143;objects.push({z,lane:Math.sin(i*2.1)*.78,type:i%5===0?'rival':i%3===0?'cone':'coin',id:i})}
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const format=t=>Math.floor(t/60)+':'+(t%60).toFixed(2).padStart(5,'0');
 function overlay(title,message,label){ui('kartOverlay').hidden=false;ui('kartOverlayTitle').textContent=title;ui('kartOverlayText').textContent=message;ui('kartStart').textContent=label}
 function hideOverlay(){ui('kartOverlay').hidden=true}
 function updateHUD(){ui('kartLap').textContent=Math.min(3,Math.floor(distance/LENGTH)+1)+' / 3';ui('kartTime').textContent=format(time);ui('kartCoins').textContent=String(coins);ui('kartSpeed').textContent=Math.round(speed*.65);ui('kartBoostMeter').value=boost;ui('kartBest').textContent=best?format(best):'Set your first time';ui('kartPause').disabled=!['running','countdown','paused'].includes(mode);ui('kartPause').textContent=mode==='paused'?'Resume':'Pause'}
 function round(x,y,w,h,r,fill){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill()}
 function polygon(points,color){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fillStyle=color;ctx.fill()}
 function project(z,lane=0){const depth=1/(1+z/140),w=canvas.width,h=canvas.height;return {x:w/2+(Math.sin((distance+z)/1050)-Math.sin(distance/1050))*w*.29+lane*w*.62*depth,y:h*.35+h*.78*depth,half:w*.62*depth,scale:depth}}
 function kart(px,py,size,color,player=false){
  ctx.save();ctx.translate(px,py);if(player)ctx.rotate((keys.has('right')-keys.has('left'))*.06);
  ctx.fillStyle='#15243a';ctx.beginPath();ctx.ellipse(0,10*size,46*size,12*size,0,0,Math.PI*2);ctx.fill();
  round(-42*size,-20*size,15*size,31*size,5*size,'#19213b');round(27*size,-20*size,15*size,31*size,5*size,'#19213b');
  round(-31*size,-36*size,62*size,50*size,13*size,color);round(-23*size,-48*size,46*size,25*size,9*size,'#faf3dc');
  round(-16*size,-47*size,32*size,17*size,7*size,'#354c6d');round(-24*size,-8*size,48*size,8*size,3*size,'#ffe5ad');
  round(-37*size,9*size,74*size,8*size,3*size,color);
  if(player&&keys.has('boost')&&boost>.01&&speed>70){polygon([[-15*size,20*size],[-5*size,45*size],[2*size,20*size]],'#80f5ed');polygon([[10*size,20*size],[19*size,46*size],[24*size,20*size]],'#80f5ed')}
  ctx.restore();
 }
 function draw(){
  const w=canvas.width,h=canvas.height;ctx.save();if(shake>0)ctx.translate(Math.sin(time*85)*shake*5,0);
  const sky=ctx.createLinearGradient(0,0,0,h*.5);sky.addColorStop(0,'#a7cdeb');sky.addColorStop(1,'#f9dec4');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#fff5d7';ctx.beginPath();ctx.arc(w*.78,h*.17,h*.06,0,Math.PI*2);ctx.fill();
  for(let i=0;i<7;i++){const bx=i*w/5-100-Math.sin(distance/9000)*60;polygon([[bx,h*.39],[bx+w*.18,h*.14+(i%2)*h*.06],[bx+w*.36,h*.39]],i%2?'#8dbab4':'#abc7c0')}
  ctx.fillStyle='#79ac93';ctx.fillRect(0,h*.35,w,h*.65);
  for(let i=69;i>=0;i--){const z=i*VIEW/70,a=project(z),b=project(z+VIEW/70),band=Math.floor((distance+z)/120)%2;
   polygon([[0,a.y],[w,a.y],[w,b.y],[0,b.y]],band?'#84b49a':'#7bab91');
   polygon([[a.x-a.half*1.08,a.y],[a.x+a.half*1.08,a.y],[b.x+b.half*1.08,b.y],[b.x-b.half*1.08,b.y]],band?'#fff2dc':'#e9a29b');
   polygon([[a.x-a.half,a.y],[a.x+a.half,a.y],[b.x+b.half,b.y],[b.x-b.half,b.y]],band?'#525b75':'#566079');
   if(band)for(const lane of [-1/3,1/3]){const aw=a.half*.012,bw=b.half*.012;polygon([[a.x+a.half*lane-aw,a.y],[a.x+a.half*lane+aw,a.y],[b.x+b.half*lane+bw,b.y],[b.x+b.half*lane-bw,b.y]],'#e1e3db')}
  }
  for(let i=14;i>=0;i--){const z=((i*145-distance%145)+VIEW)%VIEW,p=project(z),side=i%2?-1:1;const tx=p.x+side*p.half*1.36,s=p.scale;
   round(tx-4*s,p.y-45*s,8*s,45*s,2*s,'#795e54');ctx.fillStyle=i%3?'#386e66':'#588779';ctx.beginPath();ctx.arc(tx,p.y-65*s,31*s,0,Math.PI*2);ctx.fill();
  }
  const sprites=[];const lap=Math.floor(distance/LENGTH);
  for(const object of objects)for(const cycle of [lap,lap+1]){if(cycle>=LAPS)continue;const z=object.z+cycle*LENGTH-distance,key=cycle+':'+object.id;if(z>15&&z<VIEW&&!collected.has(key))sprites.push({...object,z,key})}
  sprites.sort((a,b)=>b.z-a.z);
  for(const object of sprites){const p=project(object.z,object.lane),s=p.scale*2.5;
   if(object.type==='coin'){ctx.fillStyle='#ffe09b';ctx.beginPath();ctx.ellipse(p.x,p.y-25*s,10*s,14*s,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ad773c';ctx.lineWidth=2*s;ctx.stroke();ctx.fillStyle='#fff5cd';ctx.fillRect(p.x-2*s,p.y-32*s,3*s,14*s)}
   else if(object.type==='cone'){polygon([[p.x,p.y-38*s],[p.x-18*s,p.y],[p.x+18*s,p.y]],'#f3a27d');round(p.x-23*s,p.y-3*s,46*s,8*s,2*s,'#ffcfad');ctx.fillStyle='#fff5df';ctx.fillRect(p.x-8*s,p.y-22*s,16*s,6*s)}
   else kart(p.x,p.y,s*.57,object.id%2?'#b3a3e2':'#82d8d1');
  }
  const player=project(45,x*.82);if(!hit||Math.floor(time*14)%2)kart(player.x,h*.88,w/960,'#ee8a8a',true);
  if(hit>0){ctx.fillStyle='rgba(255,211,176,.12)';ctx.fillRect(0,0,w,h)}
  if(mode==='countdown'){ctx.textAlign='center';ctx.font='800 '+Math.round(h*.18)+'px system-ui';ctx.fillStyle='#fffaf0';ctx.shadowColor='#18243a';ctx.shadowBlur=15;ctx.fillText(String(Math.ceil(countdown)),w/2,h*.55);ctx.shadowBlur=0}
  ctx.restore();
 }
 function step(dt){
  if(mode==='countdown'){countdown-=dt;if(countdown<=0){mode='running';ui('kartAnnounce').textContent='Go! Race three laps.'}return}
  if(mode!=='running')return;
  time+=dt;hit=Math.max(0,hit-dt);shake=Math.max(0,shake-dt*3);
  const boosting=keys.has('boost')&&boost>0&&speed>70,braking=keys.has('brake');
  if(boosting)boost=Math.max(0,boost-dt*.38);else boost=Math.min(1,boost+dt*.10);
  const top=(Math.abs(x)>1?135:boosting?390:280)*(hit>.7?.6:1);
  speed=clamp(speed+(braking?-260:speed<top?100:-180)*dt,0,braking?390:Math.max(top,speed));
  const steering=(keys.has('right')?1:0)-(keys.has('left')?1:0);
  x=clamp(x+steering*dt*(.8+speed/250)-Math.cos(distance/1050)*dt*speed/1400,-1.3,1.3);
  const previous=distance;distance=Math.min(LENGTH*LAPS,distance+speed*dt);
  for(const object of objects){const lap=Math.floor(previous/LENGTH);for(const cycle of [lap,lap+1]){const position=object.z+cycle*LENGTH,key=cycle+':'+object.id;
   if(cycle>=LAPS||position<previous||position>=distance||Math.abs(x*.82-object.lane)>.24)continue;
   if(object.type==='coin'&&!collected.has(key)){collected.add(key);coins++;boost=Math.min(1,boost+.08)}
   else if(object.type!=='coin'&&!collided.has(key)&&!hit){collided.add(key);speed*=.48;hit=1.15;shake=1;hitCount++;ui('kartAnnounce').textContent='Bump! Keep going.'}
  }}
  if(distance>=LENGTH*LAPS){mode='finished';speed=0;keys.clear();const record=!best||time<best;if(record){best=time;try{localStorage.setItem('hub-kart-best-v1',String(best))}catch{}}
   overlay(record?'New best time!':'Finish line!',format(time)+' · '+coins+' coins · '+hitCount+' bumps. '+(record?'Your quickest three laps so far.':'Your best: '+format(best)), 'Race again');ui('kartAnnounce').textContent='Race finished. '+format(time);}
 }
 function loop(now){frame=0;if(!active||!['running','countdown'].includes(mode))return;const dt=last?Math.min((now-last)/1000,.045):0;last=now;step(dt);updateHUD();draw();if(['running','countdown'].includes(mode))frame=requestAnimationFrame(loop)}
 function run(){last=0;if(!frame&&active&&['running','countdown'].includes(mode))frame=requestAnimationFrame(loop)}
 function reset(){distance=0;speed=0;x=0;time=0;coins=0;boost=1;countdown=3;hit=0;shake=0;hitCount=0;collected.clear();collided.clear();keys.clear();mode='countdown';hideOverlay();ui('kartAnnounce').textContent='Get ready';updateHUD();draw();run()}
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
