(() => {
"use strict";
const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
let W=innerWidth,H=innerHeight,DPR=Math.min(devicePixelRatio||1,2);
function resize(){W=innerWidth;H=innerHeight;canvas.width=W*DPR;canvas.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0)}
addEventListener("resize",resize);resize();

const TAU=Math.PI*2, clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const keys={};
addEventListener("keydown",e=>{keys[e.code]=true;if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code))e.preventDefault();
 if(e.code==="Escape") togglePause(); if(e.code==="KeyR") resetPlayer();});
addEventListener("keyup",e=>keys[e.code]=false);

const field={w:92,d:58,goalW:22,goalD:5};
const cam={x:0,y:13,z:22,yaw:0,pitch:.32};
const game={state:"menu",blue:0,orange:0,time:120,freeze:0,goalFlash:0};

const player={
 x:0,z:19,y:0,vx:0,vz:0,vy:0,rot:Math.PI,
 speed:18,boost:100,onGround:true,jumps:2,jumpLock:false
};
const bot={x:0,z:-19,y:0,vx:0,vz:0,vy:0,rot:0,speed:14,onGround:true};
const ball={x:0,z:0,y:1.25,vx:0,vz:0,vy:0,r:1.25};

const particles=[];
function burst(x,y,z,color,n=22,pow=10){for(let i=0;i<n;i++){const a=Math.random()*TAU,s=Math.random()*pow;particles.push({x,y,z,vx:Math.cos(a)*s,vy:(Math.random()-.1)*s,vz:Math.sin(a)*s,life:.5+Math.random()*.7,color})}}
function resetPlayer(){Object.assign(player,{x:0,z:19,y:0,vx:0,vz:0,vy:0,rot:Math.PI,onGround:true,jumps:2,boost:Math.max(player.boost,25)})}
function resetBot(){Object.assign(bot,{x:0,z:-19,y:0,vx:0,vz:0,vy:0,rot:0,onGround:true})}
function resetBall(){Object.assign(ball,{x:0,z:0,y:1.25,vx:0,vz:0,vy:0})}
function kickoff(){resetPlayer();resetBot();resetBall();game.freeze=1.0}
function start(){game.state="play";game.blue=0;game.orange=0;game.time=120;game.goalFlash=0;kickoff();document.getElementById("menu").classList.add("hidden");document.getElementById("pause").classList.add("hidden");document.getElementById("hud").classList.remove("hidden");if(innerWidth<800)document.getElementById("mobile").classList.remove("hidden")}
function finish(){game.state="menu";document.getElementById("hud").classList.add("hidden");document.getElementById("mobile").classList.add("hidden");document.getElementById("menu").classList.remove("hidden")}
function togglePause(){if(game.state==="play"){game.state="pause";document.getElementById("pause").classList.remove("hidden")}else if(game.state==="pause"){resume()}}
function resume(){game.state="play";document.getElementById("pause").classList.add("hidden")}
document.getElementById("play").onclick=start;
document.getElementById("how").onclick=()=>document.getElementById("help").classList.remove("hidden");
document.getElementById("back").onclick=()=>document.getElementById("help").classList.add("hidden");
document.getElementById("resume").onclick=resume;
document.getElementById("restart").onclick=start;
document.getElementById("quit").onclick=finish;

function goal(team){
 if(game.goalFlash>0)return;
 if(team==="blue")game.blue++;else game.orange++;
 game.goalFlash=1.25;
 document.getElementById("goalText").textContent=team==="blue"?"¡GOL AZUL!":"¡GOL NARANJA!";
 document.getElementById("goal").classList.remove("hidden");
 burst(ball.x,ball.y,ball.z,team==="blue"?"#4fd8ff":"#ff963d",70,18);
 setTimeout(()=>document.getElementById("goal").classList.add("hidden"),950);
 setTimeout(kickoff,900);
}

function driveCar(c,forward,steer,boosting,dt,isPlayer){
 const speed=Math.hypot(c.vx,c.vz);
 const fx=Math.sin(c.rot),fz=Math.cos(c.rot);
 const target=(forward>=0?c.speed:10)*forward;
 const accel=(boosting?35:18);
 c.vx+=fx*target*dt*1.4;c.vz+=fz*target*dt*1.4;
 const drag=Math.pow(.86,dt*60);
 c.vx*=drag;c.vz*=drag;
 if(boosting&&isPlayer&&player.boost>0){c.vx+=fx*32*dt;c.vz+=fz*32*dt;player.boost=clamp(player.boost-34*dt,0,100);burst(c.x,c.y+.3,c.z,"#67e7ff",2,2.5)}
 else if(isPlayer)player.boost=clamp(player.boost+12*dt,0,100);
 const turn=steer*(1.9+Math.min(speed/10,1)*1.8)*dt*(forward<0?-0.65:1);
 c.rot+=turn;
 c.x+=c.vx*dt;c.z+=c.vz*dt;
 c.y+=c.vy*dt;c.vy-=30*dt;
 if(c.y<=0){c.y=0;c.vy=0;c.onGround=true;c.jumps=2}else c.onGround=false;
 // field boundaries
 const side=field.w/2-2, end=field.d/2-2;
 if(c.x<-side){c.x=-side;c.vx=Math.abs(c.vx)*.35}
 if(c.x>side){c.x=side;c.vx=-Math.abs(c.vx)*.35}
 if(c.z<-end&&Math.abs(c.x)>field.goalW/2){c.z=-end;c.vz=Math.abs(c.vz)*.35}
 if(c.z>end&&Math.abs(c.x)>field.goalW/2){c.z=end;c.vz=-Math.abs(c.vz)*.35}
}

function jump(c,isPlayer){
 if(c.jumps>0){c.vy=c.jumps===2?13:11;c.jumps--;c.onGround=false;burst(c.x,c.y,c.z,isPlayer?"#62dfff":"#ff9b42",8,4)}
}
function updatePlayer(dt){
 let f=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0);
 let s=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0);
 const boosting=!!(keys.ShiftLeft||keys.ShiftRight)&&player.boost>1&&f>0;
 driveCar(player,f,s,boosting,dt,true);
 if(keys.Space&&!player.jumpLock){jump(player,true);player.jumpLock=true}
 if(!keys.Space)player.jumpLock=false;
}
function updateBot(dt){
 const dx=ball.x-bot.x,dz=ball.z-bot.z;
 let desired=Math.atan2(dx,dz),diff=Math.atan2(Math.sin(desired-bot.rot),Math.cos(desired-bot.rot));
 let steer=clamp(diff*2,-1,1),forward=1;
 // Defend when ball is behind the bot, otherwise chase it.
 if(ball.z>12) {const tx=0-bot.x,tz=-23-bot.z; desired=Math.atan2(tx,tz);diff=Math.atan2(Math.sin(desired-bot.rot),Math.cos(desired-bot.rot));steer=clamp(diff*2,-1,1)}
 driveCar(bot,forward,steer,false,dt,false);
 if(bot.y===0&&Math.abs(ball.z-bot.z)<8&&Math.hypot(dx,dz)<9&&Math.random()<dt*2.2)jump(bot,false);
}

function carBall(c,team){
 const dx=ball.x-c.x,dz=ball.z-c.z,dist=Math.hypot(dx,dz);
 if(dist<2.8 && Math.abs(ball.y-c.y)<3){
   const nx=dx/(dist||1),nz=dz/(dist||1);
   const impact=Math.max(7,Math.hypot(c.vx,c.vz)+8);
   ball.vx+=nx*impact;ball.vz+=nz*impact;ball.vy+=Math.max(1,Math.abs(c.vy)+3);
   ball.x=c.x+nx*2.7;ball.z=c.z+nz*2.7;
   burst(ball.x,ball.y,ball.z,team==="blue"?"#59dfff":"#ff9a43",5,4);
 }
}
function updateBall(dt){
 ball.x+=ball.vx*dt;ball.z+=ball.vz*dt;ball.y+=ball.vy*dt;ball.vy-=25*dt;
 ball.vx*=Math.pow(.985,dt*60);ball.vz*=Math.pow(.985,dt*60);
 if(ball.y<1.25){ball.y=1.25;ball.vy=Math.abs(ball.vy)*.58;ball.vx*=.93;ball.vz*=.93;if(Math.abs(ball.vy)<1)ball.vy=0}
 const side=field.w/2-1.4;
 if(ball.x<-side){ball.x=-side;ball.vx=Math.abs(ball.vx)*.75}
 if(ball.x>side){ball.x=side;ball.vx=-Math.abs(ball.vx)*.75}
 const end=field.d/2;
 if(ball.z<-end-2 && Math.abs(ball.x)<field.goalW/2){goal("blue");return}
 if(ball.z>end+2 && Math.abs(ball.x)<field.goalW/2){goal("orange");return}
 if(ball.z<-end+1&&Math.abs(ball.x)>field.goalW/2){ball.z=-end+1;ball.vz=Math.abs(ball.vz)*.75}
 if(ball.z>end-1&&Math.abs(ball.x)>field.goalW/2){ball.z=end-1;ball.vz=-Math.abs(ball.vz)*.75}
}
function collideCars(){
 const dx=bot.x-player.x,dz=bot.z-player.z,d=Math.hypot(dx,dz);
 if(d<3.2){const nx=dx/(d||1),nz=dz/(d||1),push=(3.2-d)*.5;player.x-=nx*push;player.z-=nz*push;bot.x+=nx*push;bot.z+=nz*push;player.vx-=nx*2;player.vz-=nz*2;bot.vx+=nx*2;bot.vz+=nz*2}
}
function updateParticles(dt){for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=15*dt;p.life-=dt;if(p.life<=0)particles.splice(i,1)}}

function project(x,y,z){
 // camera follows player with a mild third-person offset
 const dx=x-cam.x,dy=y-cam.y,dz=z-cam.z;
 const cy=Math.cos(cam.yaw),sy=Math.sin(cam.yaw);
 const X=dx*cy-dz*sy,Z=dx*sy+dz*cy;
 const cp=Math.cos(cam.pitch),sp=Math.sin(cam.pitch);
 const Y=dy*cp-Z*sp,ZZ=dy*sp+Z*cp;
 const f=Math.min(W,H)*.82;
 const scale=f/(ZZ+28);
 return {x:W/2+X*scale,y:H*.55-Y*scale,s:scale,z:ZZ};
}
function poly(points,fill,stroke){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}
function drawWorld(){
 ctx.fillStyle="#07101d";ctx.fillRect(0,0,W,H);
 // horizon glow
 const grd=ctx.createLinearGradient(0,0,0,H);grd.addColorStop(0,"#08142b");grd.addColorStop(.48,"#07152a");grd.addColorStop(1,"#03070e");ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);

 // floor plane
 const corners=[project(-field.w/2,0,-field.d/2),project(field.w/2,0,-field.d/2),project(field.w/2,0,field.d/2),project(-field.w/2,0,field.d/2)];
 poly(corners,"#102d3a","#315766");
 // stripes/grid
 for(let z=-field.d/2;z<=field.d/2;z+=4){
   const a=project(-field.w/2+.5,.02,z),b=project(field.w/2-.5,.02,z);
   ctx.strokeStyle="rgba(160,240,255,.07)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
 }
 for(let x=-field.w/2;x<=field.w/2;x+=4){
   const a=project(x,.02,-field.d/2+.5),b=project(x,.02,field.d/2-.5);
   ctx.strokeStyle="rgba(160,240,255,.045)";ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
 }
 // center circle
 const pts=[];for(let i=0;i<=64;i++){const a=i/64*TAU;pts.push(project(Math.cos(a)*7,.04,Math.sin(a)*7))}
 ctx.strokeStyle="rgba(200,245,255,.5)";ctx.lineWidth=2;poly(pts,null);
 // halfway line
 let a=project(-field.w/2,.05,0),b=project(field.w/2,.05,0);ctx.strokeStyle="rgba(210,250,255,.4)";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
 drawGoal(-1,"#ff7f32");drawGoal(1,"#38c9ff");
 drawBall();drawCar(bot,"#ff7f32");drawCar(player,"#37cfff");
 particles.forEach(drawParticle);
}
function drawGoal(side,color){
 const z=side*(field.d/2+2),w=field.goalW/2,h=8;
 const p1=project(-w,0,z),p2=project(w,0,z),p3=project(w,h,z),p4=project(-w,h,z);
 ctx.lineWidth=4;poly([p1,p2,p3,p4],null,color);
 const back1=project(-w,0,z+side*3),back2=project(w,0,z+side*3),back3=project(w,h,z+side*3),back4=project(-w,h,z+side*3);
 ctx.strokeStyle=color;ctx.lineWidth=2;poly([back1,back2,back3,back4],null);
 ctx.strokeStyle=color+"55";for(let i=0;i<=8;i++){const t=i/8;let q=project(-w+t*field.goalW,0,z);let r=project(-w+t*field.goalW,h,z);ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.lineTo(r.x,r.y);ctx.stroke()}
}
function drawBall(){
 const p=project(ball.x,ball.y,ball.z),r=Math.max(3,ball.r*p.s);
 ctx.beginPath();ctx.arc(p.x,p.y,r,0,TAU);ctx.fillStyle="#f4f8ff";ctx.shadowBlur=18;ctx.shadowColor="#d9f5ff";ctx.fill();ctx.shadowBlur=0;
 ctx.beginPath();ctx.arc(p.x-r*.28,p.y-r*.3,r*.25,0,TAU);ctx.fillStyle="#b8d5e2";ctx.fill();
}
function drawCar(c,color){
 const p=project(c.x,c.y+.55,c.z),q=project(c.x+Math.sin(c.rot)*2,c.y+.55,c.z+Math.cos(c.rot)*2);
 const ang=Math.atan2(q.y-p.y,q.x-p.x),len=Math.max(20,4.5*p.s),wid=Math.max(12,2.4*p.s);
 ctx.save();ctx.translate(p.x,p.y);ctx.rotate(ang+Math.PI/2);
 ctx.shadowBlur=20;ctx.shadowColor=color+"88";ctx.fillStyle=color;
 ctx.beginPath();ctx.roundRect(-wid/2,-len/2,wid,len,Math.min(7,wid/3));ctx.fill();ctx.shadowBlur=0;
 ctx.fillStyle="#09131d";ctx.beginPath();ctx.roundRect(-wid*.34,-len*.14,wid*.68,len*.36,4);ctx.fill();
 ctx.fillStyle="#dffaff";ctx.fillRect(-wid*.22,-len*.37,wid*.44,len*.12);
 ctx.fillStyle="#ff4b52";ctx.fillRect(-wid*.34,len*.31,wid*.18,len*.07);ctx.fillRect(wid*.16,len*.31,wid*.18,len*.07);
 ctx.restore();
}
function drawParticle(p){const q=project(p.x,p.y,p.z),r=Math.max(1,q.s*.12);ctx.globalAlpha=clamp(p.life,0,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(q.x,q.y,r,0,TAU);ctx.fill();ctx.globalAlpha=1}

function update(dt){
 if(game.state!=="play")return;
 if(game.freeze>0){game.freeze-=dt;updateParticles(dt);return}
 game.time-=dt;if(game.time<=0){game.time=0;game.state="pause";document.querySelector("#pause h2").textContent=game.blue===game.orange?"EMPATE":"FIN DEL PARTIDO";document.getElementById("pause").classList.remove("hidden")}
 updatePlayer(dt);updateBot(dt);carBall(player,"blue");carBall(bot,"orange");collideCars();updateBall(dt);updateParticles(dt);
 // camera smoothing
 const fx=Math.sin(player.rot),fz=Math.cos(player.rot);
 const tx=player.x-fx*17,tz=player.z-fz*17;
 cam.x+=(tx-cam.x)*Math.min(1,dt*5);cam.z+=(tz-cam.z)*Math.min(1,dt*5);cam.y+=(10+player.y-cam.y)*Math.min(1,dt*4);cam.yaw+=(player.rot-cam.yaw)*Math.min(1,dt*4);
 document.getElementById("blueScore").textContent=game.blue;document.getElementById("orangeScore").textContent=game.orange;
 const sec=Math.ceil(game.time),m=Math.floor(sec/60),s=String(sec%60).padStart(2,"0");document.getElementById("clock").textContent=`${m}:${s}`;
 document.getElementById("boostBar").style.width=player.boost+"%";document.getElementById("boostText").textContent=Math.round(player.boost);
}

let last=performance.now();
function loop(now){const dt=Math.min(.033,(now-last)/1000);last=now;update(dt);drawWorld();requestAnimationFrame(loop)}
requestAnimationFrame(loop);

// Simple touch controls
let touch={x:0,y:0,active:false};
const stick=document.getElementById("stick"),knob=document.getElementById("knob");
function stickMove(e){const r=stick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let x=e.clientX-cx,y=e.clientY-cy,l=Math.hypot(x,y),m=r.width*.38;if(l>m){x*=m/l;y*=m/l}knob.style.transform=`translate(${x}px,${y}px)`;keys.KeyW=y<-15;keys.KeyS=y>15;keys.KeyA=x<-15;keys.KeyD=x>15}
stick.addEventListener("pointerdown",e=>{stick.setPointerCapture(e.pointerId);touch.active=true;stickMove(e)});
stick.addEventListener("pointermove",e=>touch.active&&stickMove(e));
stick.addEventListener("pointerup",()=>{touch.active=false;knob.style.transform="";keys.KeyW=keys.KeyS=keys.KeyA=keys.KeyD=false});
document.getElementById("jumpBtn").addEventListener("pointerdown",()=>{keys.Space=true});document.getElementById("jumpBtn").addEventListener("pointerup",()=>{keys.Space=false});
document.getElementById("boostBtn").addEventListener("pointerdown",()=>{keys.ShiftLeft=true});document.getElementById("boostBtn").addEventListener("pointerup",()=>{keys.ShiftLeft=false});
})();