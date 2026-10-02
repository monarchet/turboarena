(() => {
'use strict';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', {alpha:false});
if (!ctx) { document.body.innerHTML = '<div style="padding:30px;color:white">Tu navegador no soporta Canvas.</div>'; return; }

const $ = id => document.getElementById(id);
const menu=$('menu'), controls=$('controls'), pause=$('pause'), finish=$('finish'), hud=$('hud'), hint=$('hint');
const blueScore=$('blueScore'), orangeScore=$('orangeScore'), timer=$('timer'), boostBar=$('boostBar'), camLabel=$('camLabel');

const keys = new Set();
let W=innerWidth,H=innerHeight,DPR=1, raf=0, last=0;
let mode='solo', running=false, paused=false, elapsed=0, overtime=false;
let score=[0,0], shake=0, messageTimer=0;

const field={w:100,d:64,goalW:20,goalD:7};
const player={x:0,z:20,vx:0,vz:0,angle:0,speed:0,boost:100,ground:true,jumps:0,turn:0};
const bot={x:0,z:-20,vx:0,vz:0,angle:Math.PI,ground:true,think:0};
const ball={x:0,z:0,vx:0,vz:0,y:0,vy:0,r:2.7};
let camBall=false;

function resize(){DPR=Math.min(devicePixelRatio||1,2); W=innerWidth;H=innerHeight;canvas.width=W*DPR;canvas.height=H*DPR;canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(DPR,0,0,DPR,0,0)}
addEventListener('resize',resize); resize();

function resetMatch(){
  elapsed=0;overtime=false;score=[0,0];camBall=false;messageTimer=0;shake=0;
  Object.assign(player,{x:0,z:21,vx:0,vz:0,angle:0,speed:0,boost:100,ground:true,jumps:0});
  Object.assign(bot,{x:0,z:-21,vx:0,vz:0,angle:Math.PI,ground:true});
  resetBall();
}
function resetBall(){Object.assign(ball,{x:0,z:0,vx:0,vz:0,y:0,vy:0});}

function show(s){[menu,controls,pause,finish].forEach(x=>x.classList.add('hidden'));s.classList.remove('hidden')}
$('playBtn').onclick=()=>start('solo');
$('freeBtn').onclick=()=>start('free');
$('controlsBtn').onclick=()=>show(controls);
$('backBtn').onclick=()=>show(menu);
$('resumeBtn').onclick=()=>togglePause(false);
$('restartBtn').onclick=()=>{resetMatch();togglePause(false)};
$('menuBtn').onclick=()=>{running=false;show(menu);hud.classList.add('hidden');hint.classList.add('hidden')};
$('againBtn').onclick=()=>start(mode);
$('finishMenuBtn').onclick=()=>{running=false;show(menu);hud.classList.add('hidden');hint.classList.add('hidden')};

function start(m){mode=m;resetMatch();running=true;paused=false;show(document.createElement('div'));menu.classList.add('hidden');controls.classList.add('hidden');pause.classList.add('hidden');finish.classList.add('hidden');hud.classList.remove('hidden');hint.classList.remove('hidden');last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop)}
function togglePause(v){paused=v;if(paused){pause.classList.remove('hidden');}else{pause.classList.add('hidden');last=performance.now()}}

addEventListener('keydown',e=>{
  keys.add(e.code);
  if(e.code==='Escape' && running){e.preventDefault();togglePause(!paused)}
});
addEventListener('keyup',e=>keys.delete(e.code));
canvas.addEventListener('mousedown',e=>{
  if(!running||paused)return;
  if(e.button===2){camBall=!camBall;camLabel.textContent=camBall?'CÁMARA: BALÓN':'CÁMARA: COCHE'}
});
canvas.addEventListener('contextmenu',e=>e.preventDefault());

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function len(x,z){return Math.hypot(x,z)||1}
function dist(a,b){return Math.hypot(a.x-b.x,a.z-b.z)}

function update(dt){
  if(paused)return;
  if(mode==='solo'){
    elapsed+=dt;
    const limit=120;
    if(elapsed>=limit && !overtime){
      if(score[0]!==score[1]) return endMatch();
      overtime=true;
    }
    if(overtime && score[0]!==score[1]) return endMatch();
  }

  // player
  const fwd=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0);
  const steer=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0);
  const boosting=keys.has('MouseLeft'); // set by pointer state below
  const boostActive=mouseLeft && player.boost>0 && fwd>0;
  const maxSpeed=boostActive?30:19;
  if(fwd) player.speed += fwd*(boostActive?31:23)*dt;
  else player.speed *= Math.pow(.25,dt);
  player.speed=clamp(player.speed,-10,maxSpeed);
  player.angle += steer*(1.9+Math.abs(player.speed)*.035)*dt*(player.speed>=0?1:-1);
  player.vx=Math.sin(player.angle)*player.speed;
  player.vz=Math.cos(player.angle)*player.speed;
  player.x+=player.vx*dt;player.z+=player.vz*dt;
  if(boostActive)player.boost=clamp(player.boost-32*dt,0,100); else player.boost=clamp(player.boost+8*dt,0,100);

  if(keys.has('Space') && player.ground){player.ground=false;player.jumps=1;player.vy=12}
  // allow second jump on edge-trigger
  if(spacePressed && !player.ground && player.jumps===1){player.jumps=2;player.vy=10;spacePressed=false}
  if(!player.ground){player.y=(player.y||0)+(player.vy||0)*dt;(player.vy=(player.vy||0)-30*dt);if(player.y<=0){player.y=0;player.ground=true;player.jumps=0}}
  keepCar(player);

  // bot AI
  if(mode==='solo') updateBot(dt);

  // ball
  ball.vx*=Math.pow(.32,dt);ball.vz*=Math.pow(.32,dt);
  ball.x+=ball.vx*dt;ball.z+=ball.vz*dt;
  ball.vy-=25*dt;ball.y+=ball.vy*dt;
  if(ball.y<0){ball.y=0;ball.vy*=-.42;if(Math.abs(ball.vy)<1)ball.vy=0}
  collideCarBall(player);
  if(mode==='solo')collideCarBall(bot);
  fieldCollision();
  goalCheck();

  if(shake>0)shake=Math.max(0,shake-dt);
  messageTimer=Math.max(0,messageTimer-dt);
  updateHud();
}

let mouseLeft=false, spacePressed=false;
addEventListener('mousedown',e=>{if(e.button===0)mouseLeft=true});
addEventListener('mouseup',e=>{if(e.button===0)mouseLeft=false});
addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat)spacePressed=true});
addEventListener('keyup',e=>{if(e.code==='Space')spacePressed=false});

function keepCar(c){
  const mx=field.w/2-3,mz=field.d/2-3;
  if(c.x<-mx){c.x=-mx;c.vx=Math.abs(c.vx)*.25}
  if(c.x>mx){c.x=mx;c.vx=-Math.abs(c.vx)*.25}
  if(c.z<-mz){c.z=-mz;c.vz=Math.abs(c.vz)*.25}
  if(c.z>mz){c.z=mz;c.vz=-Math.abs(c.vz)*.25}
}
function updateBot(dt){
  const dx=ball.x-bot.x,dz=ball.z-bot.z;
  const target=Math.atan2(dx,dz);
  let da=Math.atan2(Math.sin(target-bot.angle),Math.cos(target-bot.angle));
  bot.angle+=clamp(da,-2.1*dt,2.1*dt);
  const desired=da>1.8||da<-1.8?-5:16;
  bot.speed+=(desired-bot.speed)*Math.min(1,5*dt);
  bot.vx=Math.sin(bot.angle)*bot.speed;bot.vz=Math.cos(bot.angle)*bot.speed;
  bot.x+=bot.vx*dt;bot.z+=bot.vz*dt;
  keepCar(bot);
}
function collideCarBall(c){
  const dx=ball.x-c.x,dz=ball.z-c.z,d=Math.hypot(dx,dz),min=4.2;
  if(d<min){
    const nx=dx/(d||1),nz=dz/(d||1),push=min-d;
    ball.x+=nx*push;ball.z+=nz*push;
    const rel=(ball.vx-c.vx)*nx+(ball.vz-c.vz)*nz;
    if(rel<0 || Math.hypot(ball.vx,ball.vz)<2){
      const impulse=Math.max(7,-rel+5)+(c===player&&mouseLeft?8:0);
      ball.vx+=nx*impulse+ c.vx*.32;
      ball.vz+=nz*impulse+ c.vz*.32;
      ball.vy=Math.max(ball.vy,4+(c===player&&player.y>0?player.y*2:0));
      shake=.08;
    }
  }
}
function fieldCollision(){
  const halfW=field.w/2-2,halfD=field.d/2-2;
  if(ball.x<-halfW){ball.x=-halfW;ball.vx=Math.abs(ball.vx)*.78}
  if(ball.x>halfW){ball.x=halfW;ball.vx=-Math.abs(ball.vx)*.78}
  const inGoal=Math.abs(ball.x)<field.goalW/2;
  if(ball.z<-halfD&&!inGoal){ball.z=-halfD;ball.vz=Math.abs(ball.vz)*.78}
  if(ball.z>halfD&&!inGoal){ball.z=halfD;ball.vz=-Math.abs(ball.vz)*.78}
}
function goalCheck(){
  const halfD=field.d/2;
  if(ball.z<-halfD-2 && Math.abs(ball.x)<field.goalW/2){score[0]++;onGoal(0)}
  else if(ball.z>halfD+2 && Math.abs(ball.x)<field.goalW/2){score[1]++;onGoal(1)}
}
function onGoal(team){
  shake=.35;messageTimer=1.2;resetBall();
  player.x=0;player.z=21;player.speed=0;
  bot.x=0;bot.z=-21;bot.speed=0;
}
function endMatch(){
  running=false;hud.classList.add('hidden');hint.classList.add('hidden');
  $('finishTitle').textContent=score[0]>score[1]?'¡HAS GANADO!':score[1]>score[0]?'GANA LA IA':'EMPATE';
  $('finishScore').textContent=score[0]+' — '+score[1];
  show(finish);
}

function updateHud(){
  blueScore.textContent=score[0];orangeScore.textContent=score[1];
  let t=mode==='free'?0:Math.max(0,120-elapsed);
  if(overtime)timer.textContent='PRÓRROGA'; else timer.textContent=Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');
  boostBar.style.width=player.boost+'%';
  boostBar.className=player.boost<1?'empty':player.boost<35?'low':player.boost<70?'mid':'';
}

function project(x,z,y=0){
  // camera is an oblique perspective transform; robust 2D canvas pseudo-3D
  const target=camBall?ball:player;
  const cx=target.x,cz=target.z;
  const dx=x-cx,dz=z-cz;
  const rot=-player.angle;
  const rx=dx*Math.cos(rot)-dz*Math.sin(rot);
  const rz=dx*Math.sin(rot)+dz*Math.cos(rot);
  const horizon=H*.40;
  const scale=clamp(1.75-rz/75,.55,2.4);
  return {x:W/2+rx*scale*9,y:horizon+rz*scale*5-y*scale*5,s:scale};
}
function poly(points,fill,stroke){
  ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();
  if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}
}
function draw(){
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.fillStyle='#050912';ctx.fillRect(0,0,W,H);

  const sky=ctx.createLinearGradient(0,0,0,H*.55);sky.addColorStop(0,'#07101d');sky.addColorStop(1,'#101d2a');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H*.55);

  // field plane
  const corners=[project(-field.w/2,-field.d/2),project(field.w/2,-field.d/2),project(field.w/2,field.d/2),project(-field.w/2,field.d/2)];
  poly(corners,'#16472e','#294f43');
  drawFieldLines();
  drawGoals();
  drawBall();
  if(mode==='solo')drawCar(bot,'#f28b3c','#522512');
  drawCar(player,'#4aa5ff','#0d3159');
  if(messageTimer>0){ctx.save();ctx.textAlign='center';ctx.font='900 42px Arial';ctx.fillStyle='#fff';ctx.shadowBlur=16;ctx.fillText('¡GOL!',W/2,H*.25);ctx.restore()}
}
function drawFieldLines(){
  const center=project(0,0);
  ctx.strokeStyle='rgba(235,255,245,.55)';ctx.lineWidth=2;
  let a=project(-field.w/2,0),b=project(field.w/2,0);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  ctx.beginPath();const r=9*center.s*9;ctx.arc(center.x,center.y,r,0,Math.PI*2);ctx.stroke();
  [-1,1].forEach(side=>{
    const z=side*(field.d/2-11),p1=project(-field.w/2+2,z),p2=project(field.w/2-2,z);
    ctx.strokeRect(p1.x,p1.y,Math.max(1,p2.x-p1.x),Math.abs(project(0,z+11).y-project(0,z).y));
  });
}
function drawGoals(){
  for(const side of [-1,1]){
    const z=side*(field.d/2+3),l=project(-field.goalW/2,z,0),r=project(field.goalW/2,z,0);
    ctx.strokeStyle=side<0?'#58aaff':'#ff9a4a';ctx.lineWidth=5;
    ctx.beginPath();ctx.moveTo(l.x,l.y);ctx.lineTo(r.x,r.y);ctx.stroke();
    const back=project(-field.goalW/2,z+side*field.goalD,0),backR=project(field.goalW/2,z+side*field.goalD,0);
    ctx.beginPath();ctx.moveTo(l.x,l.y);ctx.lineTo(back.x,back.y);ctx.lineTo(backR.x,backR.y);ctx.lineTo(r.x,r.y);ctx.stroke();
  }
}
function drawBall(){
  const p=project(ball.x,ball.z,ball.y+ball.r);
  const rad=ball.r*5.2*p.s;
  ctx.save();ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(p.x,p.y+rad*.7,rad*1.1,rad*.35,0,0,Math.PI*2);ctx.fill();
  const g=ctx.createRadialGradient(p.x-rad*.3,p.y-rad*.4,1,p.x,p.y,rad);g.addColorStop(0,'#fff');g.addColorStop(1,'#b9c3cf');ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,rad,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#7c8792';ctx.stroke();ctx.restore();
}
function drawCar(c,body,detail){
  const p=project(c.x,c.z,0);
  const w=5.2*p.s,h=8.5*p.s;
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(-c.angle);
  ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(0,3,w*1.05,h*.45,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=body;ctx.beginPath();ctx.roundRect(-w/2,-h/2,w,h,Math.max(2,w*.18));ctx.fill();
  ctx.fillStyle=detail;ctx.fillRect(-w*.38,-h*.18,w*.76,h*.32);
  ctx.fillStyle='rgba(220,240,255,.8)';ctx.fillRect(-w*.34,-h*.36,w*.68,h*.16);
  ctx.fillStyle='#10151d';ctx.fillRect(-w*.6,-h*.34,w*.18,h*.22);ctx.fillRect(w*.42,-h*.34,w*.18,h*.22);ctx.fillRect(-w*.6,h*.12,w*.18,h*.22);ctx.fillRect(w*.42,h*.12,w*.18,h*.22);
  ctx.restore();
}
function loop(now){
  if(!running)return;
  const dt=Math.min(.033,(now-last)/1000||.016);last=now;
  if(!paused){update(dt);draw()}
  raf=requestAnimationFrame(loop);
}
draw();
})();
