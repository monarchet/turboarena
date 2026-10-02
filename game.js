(() => {
"use strict";
const canvas=document.getElementById("gl"), gl=canvas.getContext("webgl",{antialias:true,alpha:false});
if(!gl){alert("Este navegador no soporta WebGL.");return}
let DPR=Math.min(devicePixelRatio||1,2), W=innerWidth,H=innerHeight;
function resize(){W=innerWidth;H=innerHeight;canvas.width=W*DPR;canvas.height=H*DPR;gl.viewport(0,0,canvas.width,canvas.height)}addEventListener("resize",resize);resize();

const vs=`attribute vec3 p,n;uniform mat4 M,V,P;varying vec3 N,W;void main(){vec4 w=M*vec4(p,1.0);W=w.xyz;N=mat3(M)*n;gl_Position=P*V*w;}`;
const fs=`precision mediump float;varying vec3 N,W;uniform vec4 C;uniform vec3 L;void main(){vec3 nn=normalize(N);float d=max(dot(nn,normalize(L)),0.0);float rim=pow(1.0-max(dot(nn,normalize(vec3(0.0,1.0,0.0))),0.0),2.0)*.16;vec3 col=C.rgb*(.30+.70*d)+rim;gl_FragColor=vec4(col,C.a);}`;
function shader(t,s){let x=gl.createShader(t);gl.shaderSource(x,s);gl.compileShader(x);return x}
const prog=gl.createProgram();gl.attachShader(prog,shader(gl.VERTEX_SHADER,vs));gl.attachShader(prog,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(prog);gl.useProgram(prog);
const ap=gl.getAttribLocation(prog,"p"),an=gl.getAttribLocation(prog,"n"),uM=gl.getUniformLocation(prog,"M"),uV=gl.getUniformLocation(prog,"V"),uP=gl.getUniformLocation(prog,"P"),uC=gl.getUniformLocation(prog,"C"),uL=gl.getUniformLocation(prog,"L");

function mesh(data){let v=gl.createBuffer(),n=gl.createBuffer(),i=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,v);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data.p),gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,n);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data.n),gl.STATIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,i);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(data.i),gl.STATIC_DRAW);return {v,n,i,count:data.i.length}}
function cube(){const p=[-1,-1,-1,1,-1,-1,1,1,-1,-1,1,-1,-1,-1,1,1,-1,1,1,1,1,-1,1,1],n=[0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,1,0,0,1,0,0,1,0,0,1,-1,0,0,-1,0,0,-1,0,0,-1,0,0,1,0,0,1,0,0,1,0,0,1,0,0],i=[0,1,2,0,2,3,4,6,5,4,7,6,0,4,5,0,5,1,3,2,6,3,6,7,1,5,6,1,6,2,0,3,7,0,7,4];return mesh({p,n,i})}
function sphere(r=1,seg=20,rings=12){let p=[],n=[],i=[];for(let y=0;y<=rings;y++){let v=y/rings,th=v*Math.PI;for(let x=0;x<=seg;x++){let u=x/seg*2*Math.PI,s=Math.sin(th),c=Math.cos(th);p.push(r*s*Math.cos(u),r*c,r*s*Math.sin(u));n.push(s*Math.cos(u),c,s*Math.sin(u))}}for(let y=0;y<rings;y++)for(let x=0;x<seg;x++){let a=y*(seg+1)+x,b=a+seg+1;i.push(a,b,a+1,b,b+1,a+1)}return mesh({p,n,i})}
const CUBE=cube(),BALL=sphere(.98,22,14);
function mat4(){return new Float32Array(16)}
function ident(m){m.fill(0);m[0]=m[5]=m[10]=m[15]=1;return m}
function mul(a,b){let o=mat4();for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o}
function persp(fov,asp,n,f){let m=mat4(),q=1/Math.tan(fov/2);m[0]=q/asp;m[5]=q;m[10]=(f+n)/(n-f);m[11]=-1;m[14]=2*f*n/(n-f);return m}
function look(ex,ey,ez,cx,cy,cz){let zx=ex-cx,zy=ey-cy,zz=ez-cz,l=Math.hypot(zx,zy,zz);zx/=l;zy/=l;zz/=l;let xx=zy*0-zz*1,xy=zz*0-zx*0,xz=zx*1-zy*0;l=Math.hypot(xx,xy,xz);xx/=l;xy/=l;xz/=l;let yx=zy*xz-zz*xy,yy=zz*xx-zx*xz,yz=zx*xy-zy*xx,m=mat4();m[0]=xx;m[1]=yx;m[2]=zx;m[4]=xy;m[5]=yy;m[6]=zy;m[8]=xz;m[9]=yz;m[10]=zz;m[12]=-(xx*ex+xy*ey+xz*ez);m[13]=-(yx*ex+yy*ey+yz*ez);m[14]=-(zx*ex+zy*ey+zz*ez);return m}
function model(x,y,z,sx,sy,sz,ry=0){let c=Math.cos(ry),s=Math.sin(ry),m=mat4();m[0]=c*sx;m[2]=-s*sx;m[5]=sy;m[8]=s*sz;m[10]=c*sz;m[12]=x;m[13]=y;m[14]=z;m[15]=1;return m}
function draw(M,object,color){gl.uniformMatrix4fv(uM,false,M);gl.uniform4fv(uC,new Float32Array([...color,1]));gl.bindBuffer(gl.ARRAY_BUFFER,object.v);gl.enableVertexAttribArray(ap);gl.vertexAttribPointer(ap,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,object.n);gl.enableVertexAttribArray(an);gl.vertexAttribPointer(an,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,object.i);gl.drawElements(gl.TRIANGLES,object.count,gl.UNSIGNED_SHORT,0)}

const field={w:92,d:58,goalW:22,wall:1.2};
const player={x:0,y:0,z:20,vx:0,vy:0,vz:0,rot:Math.PI,boost:100,jumps:2,ground:true};
const bot={x:0,y:0,z:-20,vx:0,vy:0,vz:0,rot:0,jumps:2,ground:true};
const ball={x:0,y:1.05,z:0,vx:0,vy:0,vz:0,r:1.05};
const state={mode:"solo",running:false,paused:false,time:120,blue:0,orange:0,overtime:false,ballCam:false};
const keys={};let mouseL=false,mouseR=false;
addEventListener("keydown",e=>{keys[e.code]=true;if(e.code==="Space"){state.ballCam=!state.ballCam;e.preventDefault()}if(e.code==="Escape")pause();if(e.code==="KeyR")resetCar(player)});addEventListener("keyup",e=>keys[e.code]=false);
canvas.addEventListener("mousedown",e=>{if(e.button===0)mouseL=true;if(e.button===2)mouseR=true});addEventListener("mouseup",e=>{if(e.button===0)mouseL=false;if(e.button===2)mouseR=false});canvas.oncontextmenu=e=>e.preventDefault();

function resetCar(c){c.x=c===player?0:0;c.z=c===player?20:-20;c.y=0;c.vx=c.vz=c.vy=0;c.rot=c===player?Math.PI:0;c.jumps=2;c.ground=true}
function resetBall(){Object.assign(ball,{x:0,y:1.05,z:0,vx:0,vy:0,vz:0})}
function kickoff(){resetCar(player);resetCar(bot);resetBall();state.freeze=1}
function start(){state.running=true;state.paused=false;state.time=120;state.blue=state.orange=0;state.overtime=false;kickoff();document.getElementById("menu").classList.add("hidden");document.getElementById("hud").classList.remove("hidden");document.getElementById("crosshair").classList.remove("hidden");}
function pause(){if(!state.running)return;state.paused=!state.paused;document.getElementById("pause").classList.toggle("hidden",!state.paused)}
function finish(){state.running=false;document.getElementById("hud").classList.add("hidden");document.getElementById("crosshair").classList.add("hidden");document.getElementById("pause").classList.add("hidden");document.getElementById("menu").classList.remove("hidden")}

document.querySelectorAll(".mode").forEach(b=>b.onclick=()=>{document.querySelectorAll(".mode").forEach(x=>x.classList.remove("active"));b.classList.add("active");state.mode=b.dataset.mode});
document.getElementById("play").onclick=start;
document.getElementById("controls").onclick=()=>document.getElementById("controlsPanel").classList.remove("hidden");
document.getElementById("closeControls").onclick=()=>document.getElementById("controlsPanel").classList.add("hidden");
document.getElementById("resume").onclick=()=>{state.paused=false;document.getElementById("pause").classList.add("hidden")};
document.getElementById("restart").onclick=start;document.getElementById("menuBtn").onclick=finish;

function drive(c,forward,steer,boost,dt){let fx=Math.sin(c.rot),fz=Math.cos(c.rot),speed=Math.hypot(c.vx,c.vz);let accel=boost?42:27;c.vx+=fx*forward*accel*dt;c.vz+=fz*forward*accel*dt;let drag=Math.pow(.90,dt*60);c.vx*=drag;c.vz*=drag;if(Math.abs(forward)<.01){c.vx*=Math.pow(.94,dt*60);c.vz*=Math.pow(.94,dt*60)}c.rot+=steer*(1.2+Math.min(speed/15,1)*2.2)*dt*(forward<0?-.7:1);if(boost&&c===player)c.boost=Math.max(0,c.boost-35*dt);else if(c===player)c.boost=Math.min(100,c.boost+10*dt);c.x+=c.vx*dt;c.z+=c.vz*dt;c.vy-=28*dt;c.y+=c.vy*dt;if(c.y<=0){c.y=0;c.vy=0;c.ground=true;c.jumps=2}else c.ground=false;const sx=field.w/2-2,ez=field.d/2-2;if(c.x<-sx){c.x=-sx;c.vx=Math.abs(c.vx)*.25}if(c.x>sx){c.x=sx;c.vx=-Math.abs(c.vx)*.25}if(c.z<-ez&&Math.abs(c.x)>field.goalW/2){c.z=-ez;c.vz=Math.abs(c.vz)*.25}if(c.z>ez&&Math.abs(c.x)>field.goalW/2){c.z=ez;c.vz=-Math.abs(c.vz)*.25}}
function jump(c){if(c.jumps>0){c.vy=c.ground?13:11;c.jumps--;c.ground=false}}
function playerUpdate(dt){let f=(keys.KeyW?1:0)-(keys.KeyS?1:0),s=(keys.KeyD?1:0)-(keys.KeyA?1:0),b=mouseL&&player.boost>0&&f>0;drive(player,f,s,b,dt);if(mouseR&&!player.jumpHeld){jump(player);player.jumpHeld=true}if(!mouseR)player.jumpHeld=false;if(keys.ShiftLeft||keys.ShiftRight){player.rot+=s*3.5*dt}}
function botUpdate(dt){let dx=ball.x-bot.x,dz=ball.z-bot.z;let target= Math.atan2(dx,dz),diff=Math.atan2(Math.sin(target-bot.rot),Math.cos(target-bot.rot));if(ball.z>10){target=Math.atan2(-bot.x,-24-bot.z);diff=Math.atan2(Math.sin(target-bot.rot),Math.cos(target-bot.rot))}drive(bot,1,Math.max(-1,Math.min(1,diff*2)),false,dt);if(Math.hypot(dx,dz)<6&&bot.ground)jump(bot)}
function carHit(c){let dx=ball.x-c.x,dz=ball.z-c.z,d=Math.hypot(dx,dz);if(d<2.9&&Math.abs(ball.y-c.y)<2.7){let nx=dx/(d||1),nz=dz/(d||1),sp=Math.hypot(c.vx,c.vz);ball.x=c.x+nx*2.7;ball.z=c.z+nz*2.7;ball.vx+=nx*(8+sp*.95);ball.vz+=nz*(8+sp*.95);ball.vy=Math.max(ball.vy,4+Math.abs(c.vy)*.5)}}
function ballUpdate(dt){ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;ball.z+=ball.vz*dt;ball.vy-=25*dt;ball.vx*=Math.pow(.992,dt*60);ball.vz*=Math.pow(.992,dt*60);if(ball.y<ball.r){ball.y=ball.r;ball.vy=Math.abs(ball.vy)*.58;ball.vx*=.94;ball.vz*=.94;if(Math.abs(ball.vy)<1)ball.vy=0}let sx=field.w/2-1.4;if(ball.x<-sx){ball.x=-sx;ball.vx=Math.abs(ball.vx)*.75}if(ball.x>sx){ball.x=sx;ball.vx=-Math.abs(ball.vx)*.75}let ez=field.d/2;if(ball.z<-ez-3&&Math.abs(ball.x)<field.goalW/2)return goal("blue");if(ball.z>ez+3&&Math.abs(ball.x)<field.goalW/2)return goal("orange");if(ball.z<-ez+1&&Math.abs(ball.x)>field.goalW/2){ball.z=-ez+1;ball.vz=Math.abs(ball.vz)*.75}if(ball.z>ez-1&&Math.abs(ball.x)>field.goalW/2){ball.z=ez-1;ball.vz=-Math.abs(ball.vz)*.75}}
function goal(t){if(t==="blue")state.blue++;else state.orange++;let b=document.getElementById("banner");b.textContent=t==="blue"?"GOAL!":"GOAL!";b.className="flash";setTimeout(()=>b.className="hidden",900);if(state.overtime){state.time=0;state.running=false;setTimeout(finish,1000)}else setTimeout(kickoff,700)}
function update(dt){if(!state.running||state.paused)return;if(state.freeze>0){state.freeze-=dt;return}if(state.mode==="solo")state.time-=dt;playerUpdate(dt);if(state.mode==="solo")botUpdate(dt);carHit(player);if(state.mode==="solo")carHit(bot);ballUpdate(dt);if(state.mode==="solo"&&state.time<=0){if(state.blue!==state.orange){state.running=false;setTimeout(finish,500)}else{state.overtime=true;state.time=999}}document.getElementById("bs").textContent=state.blue;document.getElementById("os").textContent=state.orange;let t=Math.max(0,Math.ceil(state.time)),m=Math.floor(t/60),s=String(t%60).padStart(2,"0");document.getElementById("time").textContent=state.overtime?"OT":`${m}:${s}`;document.getElementById("boost").style.width=player.boost+"%";}

function render(){gl.enable(gl.DEPTH_TEST);gl.clearColor(.008,.018,.035,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);let fx=Math.sin(player.rot),fz=Math.cos(player.rot),dist=state.ballCam?19:15;let tx=player.x-fx*dist,tz=player.z-fz*dist,ex=tx,ey=state.ballCam?11:8+player.y,ez=tz;let target=state.ballCam?{x:ball.x,y:1.4,z:ball.z}:{x:player.x+fx*3,y:1.2,z:player.z+fz*3};let V=look(ex,ey,ez,target.x,target.y,target.z),P=persp(Math.PI/3,W/H,.1,250);gl.uniformMatrix4fv(uV,false,V);gl.uniformMatrix4fv(uP,false,P);gl.uniform3f(uL,-.5,1,.7);
 // field
 draw(model(0,-.65,0,field.w/2,.65,field.d/2),CUBE,[.035,.16,.19]);draw(model(0,.02,0,field.w/2,.03,field.d/2),CUBE,[.055,.23,.26]);
 // center line and circle approximated with thin boxes
 draw(model(0,.07,0,.04,.03,field.d/2),CUBE,[.35,.75,.78]);for(let x=-40;x<=40;x+=8)draw(model(x,.075,0,.025,.025,.9),CUBE,[.11,.38,.42]);
 // walls
 draw(model(-field.w/2,.9,0,.7,.9,field.d/2),CUBE,[.025,.07,.11]);draw(model(field.w/2,.9,0,.7,.9,field.d/2),CUBE,[.025,.07,.11]);draw(model(0,.9,-field.d/2,.7,.9,field.w/2),CUBE,[.025,.07,.11]);draw(model(0,.9,field.d/2,.7,.9,field.w/2),CUBE,[.025,.07,.11]);
 // goals
 draw(model(0,4,-field.d/2-2,field.goalW/2,.12,.12),CUBE,[1,.25,.08]);draw(model(-field.goalW/2,4,-field.d/2-2,.12,4,.12),CUBE,[1,.25,.08]);draw(model(field.goalW/2,4,-field.d/2-2,.12,4,.12),CUBE,[1,.25,.08]);
 draw(model(0,4,field.d/2+2,field.goalW/2,.12,.12),CUBE,[.08,.65,1]);draw(model(-field.goalW/2,4,field.d/2+2,.12,4,.12),CUBE,[.08,.65,1]);draw(model(field.goalW/2,4,field.d/2+2,.12,4,.12),CUBE,[.08,.65,1]);
 drawCar(player,[.06,.65,1]);if(state.mode==="solo")drawCar(bot,[1,.32,.08]);draw(model(ball.x,ball.y,ball.z,.98,.98,.98),BALL,[.92,.95,.98]);
}
function drawCar(c,color){draw(model(c.x,.8+c.y,c.z,1.65,.55,2.35,c.rot),CUBE,color);draw(model(c.x,.35+c.y,c.z,1.85,.18,2.45,c.rot),CUBE,[.025,.035,.05]);draw(model(c.x,.99+c.y,c.z,1.15,.4,1.0,c.rot),CUBE,[.08,.12,.18]);}
let last=performance.now();function loop(now){let dt=Math.min(.033,(now-last)/1000);last=now;update(dt);render();requestAnimationFrame(loop)}requestAnimationFrame(loop);
})();