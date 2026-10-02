'use strict';

const canvas=document.getElementById('game');
const gl=canvas.getContext('webgl',{antialias:true,alpha:false});
if(!gl){alert('Este navegador no permite WebGL.');throw new Error('WebGL unavailable');}

const V={
 add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],
 sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],
 mul:(a,s)=>[a[0]*s,a[1]*s,a[2]*s],
 dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
 len:a=>Math.hypot(a[0],a[1],a[2]),
 norm:a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l]},
 lerp:(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]
};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const forwardYaw=y=>[Math.sin(y),0,Math.cos(y)];

function m4(){return new Float32Array(16)}
function ident(o){o.fill(0);o[0]=o[5]=o[10]=o[15]=1;return o}
function mul4(a,b){const o=m4();for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o}
function perspective(fov,asp,n,f){const o=m4(),t=1/Math.tan(fov/2);o[0]=t/asp;o[5]=t;o[10]=(f+n)/(n-f);o[11]=-1;o[14]=2*f*n/(n-f);return o}
function lookAt(e,t,u){const z=V.norm(V.sub(e,t)),x=V.norm([u[1]*z[2]-u[2]*z[1],u[2]*z[0]-u[0]*z[2],u[0]*z[1]-u[1]*z[0]]),y=[z[1]*x[2]-z[2]*x[1],z[2]*x[0]-z[0]*x[2],z[0]*x[1]-z[1]*x[0]],o=m4();o[0]=x[0];o[1]=y[0];o[2]=z[0];o[4]=x[1];o[5]=y[1];o[6]=z[1];o[8]=x[2];o[9]=y[2];o[10]=z[2];o[12]=-V.dot(x,e);o[13]=-V.dot(y,e);o[14]=-V.dot(z,e);o[15]=1;return o}

const vs=`attribute vec3 p;attribute vec3 n;uniform mat4 uMVP,uM;varying vec3 N;varying vec3 W;void main(){vec4 w=uM*vec4(p,1.0);W=w.xyz;N=mat3(uM)*n;gl_Position=uMVP*vec4(p,1.0);}`;
const fs=`precision mediump float;uniform vec4 color;uniform vec3 light;varying vec3 N;varying vec3 W;void main(){vec3 nn=normalize(N);float d=max(.28,dot(nn,normalize(light)));float fog=clamp((length(W)-55.0)/85.0,0.0,.5);vec3 c=mix(color.rgb,vec3(.04,.06,.08),fog);gl_FragColor=vec4(c*d,color.a);}`;
function shader(t,s){const x=gl.createShader(t);gl.shaderSource(x,s);gl.compileShader(x);if(!gl.getShaderParameter(x,gl.COMPILE_STATUS))throw gl.getShaderInfoLog(x);return x}
const prog=gl.createProgram();gl.attachShader(prog,shader(gl.VERTEX_SHADER,vs));gl.attachShader(prog,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(prog);gl.useProgram(prog);
const L={p:gl.getAttribLocation(prog,'p'),n:gl.getAttribLocation(prog,'n'),mvp:gl.getUniformLocation(prog,'uMVP'),m:gl.getUniformLocation(prog,'uM'),color:gl.getUniformLocation(prog,'color'),light:gl.getUniformLocation(prog,'light')};

function mesh(d){const b={};for(const k of ['p','n','i']){b[k]=gl.createBuffer();gl.bindBuffer(k==='i'?gl.ELEMENT_ARRAY_BUFFER:gl.ARRAY_BUFFER,b[k]);gl.bufferData(k==='i'?gl.ELEMENT_ARRAY_BUFFER:gl.ARRAY_BUFFER,new Float32Array(d[k]||[]),gl.STATIC_DRAW)}if(d.i){gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,b.i);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(d.i),gl.STATIC_DRAW)}b.count=d.i.length;return b}
function cube(){const v=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],f=[[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7],[4,5,1,0]],nn=[[0,0,-1],[0,0,1],[-1,0,0],[1,0,0],[0,1,0],[0,-1,0]],p=[],n=[],i=[];for(let q=0;q<6;q++){for(const k of f[q]){p.push(...v[k]);n.push(...nn[q])}const b=q*4;i.push(b,b+1,b+2,b,b+2,b+3)}return mesh({p,n,i})}
function sphere(seg=24,ring=14){const p=[],n=[],i=[];for(let y=0;y<=ring;y++){const a=y/ring*Math.PI;for(let x=0;x<=seg;x++){const b=x/seg*Math.PI*2,s=Math.sin(a),v=[Math.cos(b)*s,Math.cos(a),Math.sin(b)*s];p.push(...v);n.push(...v)}}for(let y=0;y<ring;y++)for(let x=0;x<seg;x++){const a=y*(seg+1)+x,b=a+1,c=a+seg+1,d=c+1;i.push(a,c,b,b,c,d)}return mesh({p,n,i})}
function cyl(seg=20){const p=[],n=[],i=[];for(let y=0;y<=1;y++)for(let x=0;x<=seg;x++){const a=x/seg*Math.PI*2;p.push(Math.cos(a),y-.5,Math.sin(a));n.push(Math.cos(a),0,Math.sin(a))}for(let x=0;x<seg;x++){const a=x,b=x+1,c=seg+1+x,d=c+1;i.push(a,c,b,b,c,d)}return mesh({p,n,i})}
const M={cube:cube(),sphere:sphere(),cyl:cyl()};

function model(pos,scale,rot=[0,0,0]){
 const [rx,ry,rz]=rot,[sx,sy,sz]=scale,cx=Math.cos(rx),sx1=Math.sin(rx),cy=Math.cos(ry),sy1=Math.sin(ry),cz=Math.cos(rz),sz1=Math.sin(rz);
 const Rz=[[cz,-sz1,0],[sz1,cz,0],[0,0,1]],Ry=[[cy,0,sy1],[0,1,0],[-sy1,0,cy]],Rx=[[1,0,0],[0,cx,-sx1],[0,sx1,cx]];
 const mm=(a,b)=>{const q=[];for(let r=0;r<3;r++)for(let c=0;c<3;c++)q[r*3+c]=a[r*3]*b[c]+a[r*3+1]*b[3+c]+a[r*3+2]*b[6+c];return q};
 const r=mm(mm(Rz,Ry),Rx),o=m4();o[0]=r[0]*sx;o[1]=r[1]*sx;o[2]=r[2]*sx;o[4]=r[3]*sy;o[5]=r[4]*sy;o[6]=r[5]*sy;o[8]=r[6]*sz;o[9]=r[7]*sz;o[10]=r[8]*sz;o[12]=pos[0];o[13]=pos[1];o[14]=pos[2];o[15]=1;return o;
}
let VP=ident(m4());
function draw(me,mo,c){gl.bindBuffer(gl.ARRAY_BUFFER,me.p);gl.vertexAttribPointer(L.p,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(L.p);gl.bindBuffer(gl.ARRAY_BUFFER,me.n);gl.vertexAttribPointer(L.n,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(L.n);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,me.i);gl.uniformMatrix4fv(L.m,false,mo);gl.uniformMatrix4fv(L.mvp,false,mul4(VP,mo));gl.uniform4f(L.color,c[0],c[1],c[2],1);gl.drawElements(gl.TRIANGLES,me.count,gl.UNSIGNED_SHORT,0)}

const FIELD_X=52,FIELD_Z=78,WALL_H=9,GOAL_W=16,GOAL_H=7,BALL_R=1.65;
const keys={},mouse={l:false,r:false};
addEventListener('keydown',e=>{keys[e.code]=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='Escape')pauseGame();if(e.code==='KeyR'&&state.mode==='free')resetBall()});
addEventListener('keyup',e=>keys[e.code]=false);
canvas.addEventListener('mousedown',e=>{if(e.button===0)mouse.l=true;if(e.button===2)mouse.r=true});
addEventListener('mouseup',e=>{if(e.button===0)mouse.l=false;if(e.button===2)mouse.r=false});
canvas.oncontextmenu=e=>e.preventDefault();

const menu=document.getElementById('menu'),hud=document.getElementById('hud'),pause=document.getElementById('pause');
document.getElementById('playBtn').onclick=()=>start('match');document.getElementById('freeBtn').onclick=()=>start('free');
let state={mode:'menu',paused:false,time:120,score:[0,0],count:0,goalCooldown:0,ballCam:false,spaceLatch:false};

class Car{
 constructor(team){this.team=team;this.ai=team===1;this.reset()}
 reset(){this.pos=this.team===0?[0,1.25,-25]:[0,1.25,25];this.vel=[0,0,0];this.yaw=this.team===0?0:Math.PI;this.pitch=0;this.roll=0;this.ground=true;this.jumps=0;this.boost=100;this.boosting=false;this.jumpLatch=false}
 forward(){return forwardYaw(this.yaw)}
 update(dt){this.ai?this.aiMove(dt):this.playerMove(dt)}
 playerMove(dt){
  const f=(keys.KeyW?1:0)-(keys.KeyS?1:0),s=(keys.KeyD?1:0)-(keys.KeyA?1:0),fw=this.forward();
  let speed=Math.hypot(this.vel[0],this.vel[2]);
  this.boosting=mouse.l&&this.boost>0&&f>=0;
  if(this.boosting)this.boost=Math.max(0,this.boost-34*dt);else this.boost=Math.min(100,this.boost+8*dt);
  if(this.ground){
   const steer=2.15*s*(.25+Math.min(speed/18,1))*(f<0?-0.75:1);this.yaw+=steer*dt;
   const acc=f*24+(this.boosting?35:0);this.vel[0]+=fw[0]*acc*dt;this.vel[2]+=fw[2]*acc*dt;
   const lat=this.vel[0]*(-fw[2])+this.vel[2]*fw[0],grip=(keys.ShiftLeft||keys.ShiftRight)?.72:.91;
   this.vel[0]-=(-fw[2])*lat*grip;this.vel[2]-=fw[0]*lat*grip;
   const drag=Math.pow(.986,dt*60);this.vel[0]*=drag;this.vel[2]*=drag;
   const max=this.boosting?34:24,hs=Math.hypot(this.vel[0],this.vel[2]);if(hs>max){this.vel[0]*=max/hs;this.vel[2]*=max/hs}
  }else{
   this.yaw+=s*1.8*dt;this.pitch+=(-f)*1.65*dt;
   const roll=(keys.KeyE?1:0)-(keys.KeyQ?1:0);if(roll)this.roll+=roll*7.4*dt;
   if(keys.ShiftLeft||keys.ShiftRight)this.roll+=(-s)*3.5*dt;
   this.pitch*=.996;this.roll*=.996;this.vel[1]-=24*dt;
  }
  if(mouse.r&&!this.jumpLatch){this.jumpLatch=true;if(this.ground){this.vel[1]=10.8;this.ground=false;this.jumps=1}else if(this.jumps<2){this.vel[1]=9.2;this.jumps=2}}
  if(!mouse.r)this.jumpLatch=false;
  this.integrate(dt);
 }
 aiMove(dt){
  const to=V.sub(ball.pos,this.pos),flat=[to[0],0,to[2]],d=Math.hypot(flat[0],flat[2]),ty=Math.atan2(flat[0],flat[2]),dy=Math.atan2(Math.sin(ty-this.yaw),Math.cos(ty-this.yaw));
  this.yaw+=clamp(dy,-1,1)*2.5*dt;const fw=this.forward();this.vel[0]+=fw[0]*20*dt;this.vel[2]+=fw[2]*20*dt;
  if(d>20&&this.boost>15){this.vel[0]+=fw[0]*14*dt;this.vel[2]+=fw[2]*14*dt;this.boost-=28*dt}
  if(this.ground&&ball.pos[1]>3.5&&d<11&&Math.abs(dy)<.4){this.vel[1]=10;this.ground=false;this.jumps=1}
  if(this.ground){const h=Math.hypot(this.vel[0],this.vel[2]);if(h>23){this.vel[0]*=23/h;this.vel[2]*=23/h}}else this.vel[1]-=24*dt;
  this.integrate(dt);
 }
 integrate(dt){
  this.pos[0]+=this.vel[0]*dt;this.pos[1]+=this.vel[1]*dt;this.pos[2]+=this.vel[2]*dt;
  if(this.pos[1]<=1.25){this.pos[1]=1.25;this.vel[1]=0;if(!this.ground){this.ground=true;this.jumps=0;this.pitch=0;this.roll=0}}else this.ground=false;
  const lx=FIELD_X/2-2.2,lz=FIELD_Z/2-2.2;
  if(this.pos[0]<-lx){this.pos[0]=-lx;this.vel[0]=Math.abs(this.vel[0])*.2}
  if(this.pos[0]>lx){this.pos[0]=lx;this.vel[0]=-Math.abs(this.vel[0])*.2}
  if(this.pos[2]<-lz){this.pos[2]=-lz;this.vel[2]=Math.abs(this.vel[2])*.2}
  if(this.pos[2]>lz){this.pos[2]=lz;this.vel[2]=-Math.abs(this.vel[2])*.2}
 }
}
const player=new Car(0),bot=new Car(1);
let ball={pos:[0,BALL_R,0],vel:[0,0,0],spin:0};

function start(mode){state.mode=mode;state.paused=false;state.time=120;state.score=[0,0];state.count=3;state.goalCooldown=1.6;state.ballCam=false;menu.classList.add('hidden');pause.classList.add('hidden');hud.classList.remove('hidden');player.reset();bot.reset();resetBall()}
function pauseGame(){if(state.mode==='menu')return;state.paused=!state.paused;pause.classList.toggle('hidden',!state.paused)}
function resetBall(){ball.pos=[0,BALL_R,0];ball.vel=[0,0,0]}
function resetPositions(){player.reset();bot.reset();resetBall()}

function ballPhysics(dt){
 ball.vel[1]-=19*dt;ball.vel[0]*=.998;ball.vel[2]*=.998;
 ball.pos[0]+=ball.vel[0]*dt;ball.pos[1]+=ball.vel[1]*dt;ball.pos[2]+=ball.vel[2]*dt;
 if(ball.pos[1]<BALL_R){ball.pos[1]=BALL_R;ball.vel[1]=Math.abs(ball.vel[1])*.76;if(Math.abs(ball.vel[1])<.7)ball.vel[1]=0}
 const lx=FIELD_X/2-BALL_R,lz=FIELD_Z/2-BALL_R;
 if(ball.pos[2]<-lz){ball.pos[2]=-lz;ball.vel[2]=Math.abs(ball.vel[2])*.82}
 if(ball.pos[2]>lz){ball.pos[2]=lz;ball.vel[2]=-Math.abs(ball.vel[2])*.82}
 if(ball.pos[0]<-lx){ball.pos[0]=-lx;ball.vel[0]=Math.abs(ball.vel[0])*.82}
 if(ball.pos[0]>lx){ball.pos[0]=lx;ball.vel[0]=-Math.abs(ball.vel[0])*.82}
 for(const c of [player,bot]){
  const d=V.sub(ball.pos,c.pos),dist=V.len(d),rad=2.45;
  if(dist<rad){const n=V.norm(d),rel=V.sub(ball.vel,c.vel),sep=V.dot(rel,n),imp=Math.max(4,-sep+7);ball.vel=V.add(ball.vel,V.mul(n,imp));ball.pos=V.add(ball.pos,V.mul(n,rad-dist+.03));if(c.boosting)ball.vel=V.add(ball.vel,V.mul(n,5))}
 }
}
function score(team){state.score[team]++;state.goalCooldown=2.3;document.getElementById('message').textContent='GOAL';setTimeout(()=>{if(state.mode!=='menu')document.getElementById('message').textContent=''},1100);resetPositions()}
function goalCheck(){
 if(state.goalCooldown>0)return;
 if(Math.abs(ball.pos[0])<GOAL_W/2 && ball.pos[1]<GOAL_H && ball.pos[2]<-FIELD_Z/2+1.5)score(1);
 else if(Math.abs(ball.pos[0])<GOAL_W/2 && ball.pos[1]<GOAL_H && ball.pos[2]>FIELD_Z/2-1.5)score(0);
}

function carDraw(c,base){
 const fw=c.forward(),right=[fw[2],0,-fw[0]],r=[c.pitch,c.yaw,c.roll];
 // soft ground shadow
 if(c.ground)draw(M.sphere,model([c.pos[0],.045,c.pos[2]],[2.25,.025,1.05]),[.015,.025,.02]);
 draw(M.cube,model(c.pos,[2.0,.50,1.02],r),base);
 draw(M.cube,model(V.add(c.pos,[0,.48,0]),[1.12,.34,.78],r),[base[0]*.55+.08,base[1]*.55+.08,base[2]*.55+.08]);
 draw(M.cube,model(V.add(c.pos,V.mul(fw,1.95)),[.20,.32,.92],r),[.85,.88,.92]);
 draw(M.cube,model(V.add(c.pos,V.mul(fw,-1.55)),[.16,.38,.84],r),[.03,.04,.05]);
 // windows
 draw(M.cube,model(V.add(c.pos,V.add([0,.73,0],V.mul(fw,.05))),[.78,.08,.65],r),[.04,.09,.13]);
 // spoiler
 const sp=V.add(c.pos,V.mul(fw,-1.55));draw(M.cube,model(V.add(sp,[0,.72,0]),[.12,.13,1.0],r),[.08,.09,.11]);
 for(const sx of [-1,1])for(const sz of [-1,1]){
  const p=V.add(c.pos,V.add(V.mul(right,sx*1.28),V.mul(fw,sz*1.25)));p[1]=.62;
  draw(M.cyl,model(p,[.43,.22,.43],[Math.PI/2,c.yaw,0]),[.025,.028,.03]);
 }
 if(c.boosting){
  for(let i=0;i<3;i++){const p=V.add(c.pos,V.mul(fw,-2.1-i*.55));p[1]+=.05;draw(M.sphere,model(p,[.28-i*.06,.28-i*.06,.28-i*.06]),[1,.52,.08])}
 }
}

function line(x,z,sx,sz,col){draw(M.cube,model([x,.055,z],[sx,.035,sz]),col)}
function drawGoal(side){
 const gz=side*(FIELD_Z/2-2.0), blue=side<0?[.20,.55,1]:[1,.34,.10];
 // Goal mouth/frame, oriented across the width of the pitch.
 for(const x of [-GOAL_W/2,GOAL_W/2])draw(M.cube,model([x,GOAL_H/2,gz],[.15,GOAL_H/2,2.0]),blue);
 draw(M.cube,model([0,GOAL_H,gz],[GOAL_W/2,.15,2.0]),blue);
 // Back net and roof/side net strips.
 const back=gz+side*1.8;
 for(let x=-GOAL_W/2;x<=GOAL_W/2;x+=1.25)draw(M.cube,model([x,GOAL_H/2,back],[.025,GOAL_H/2,.025]),[.72,.76,.82]);
 for(let y=1;y<GOAL_H;y+=1.15)draw(M.cube,model([0,y,back],[GOAL_W/2,.025,.025]),[.72,.76,.82]);
 for(const x of [-GOAL_W/2,GOAL_W/2])for(let y=1;y<GOAL_H;y+=1.15)draw(M.cube,model([x,y,gz+side*.9],[.025,.025,.9]),[.72,.76,.82]);
}
function drawStands(){
 const tiers=[[-FIELD_X/2-5,0],[FIELD_X/2+5,0],[0,-FIELD_Z/2-5],[0,FIELD_Z/2+5]];
 for(const [x,z] of tiers){
  const side=Math.abs(x)>1;
  const span=side?FIELD_Z:FIELD_X;
  for(let k=-span/2;k<=span/2;k+=2.5){
   const px=side?x:k,pz=side?k:z;
   const sx=side?3.0:1.4, sz=side?1.4:3.0;
   draw(M.cube,model([px,2.4,pz],[sx,2.4,sz]),[.035,.09,.16]);
   for(let row=0;row<5;row++)draw(M.cube,model([px,4.9+row*.8,pz],[sx,.25,sz]),row%2?[.07,.13,.2]:[.08,.18,.28]);
  }
 }
 // A roof ring and floodlight towers give the camera a stadium feel without covering the sky.
 for(const x of [-FIELD_X/2-7,FIELD_X/2+7])for(const z of [-FIELD_Z/2-6,FIELD_Z/2+6]){
  draw(M.cube,model([x,10,z],[.22,10,.22]),[.10,.12,.15]);
  draw(M.cube,model([x,19,z],[1.0,.12,1.0]),[.82,.84,.88]);
 }
}
function drawField(){
 // Wide football pitch with the goals directly ahead/behind the player.
 draw(M.cube,model([0,-.35,0],[FIELD_X/2,.35,FIELD_Z/2]),[.08,.48,.16]);
 draw(M.cube,model([0,-.02,-FIELD_Z/2-.8],[FIELD_X/2,.08,.8]),[.025,.06,.08]);
 draw(M.cube,model([0,-.02,FIELD_Z/2+.8],[FIELD_X/2,.08,.8]),[.025,.06,.08]);
 // Markings: long axis is Z.
 line(0,0,.06,FIELD_Z/2-.4,[.92,.95,.92]);
 draw(M.cyl,model([0,.06,0],[7.2,.04,7.2]),[.92,.95,.92]);
 line(0,-FIELD_Z/4,FIELD_X/2-.4,.06,[.92,.95,.92]);
 line(0, FIELD_Z/4,FIELD_X/2-.4,.06,[.92,.95,.92]);
 line(-FIELD_X/2+.25,0,.06,FIELD_Z/2-.25,[.92,.95,.92]);
 line( FIELD_X/2-.25,0,.06,FIELD_Z/2-.25,[.92,.95,.92]);
 for(const side of [-1,1]){
  const z=side*(FIELD_Z/2-10);
  line(0,z,GOAL_W/2+.5,.06,[.92,.95,.92]);
  line(-GOAL_W/2-.5,z,.06,8,[.92,.95,.92]);
  line( GOAL_W/2+.5,z,.06,8,[.92,.95,.92]);
  line(0,side*(FIELD_Z/2-20),GOAL_W/2+.5,.06,[.92,.95,.92]);
 }
 // Transparent-looking arena walls made from dark rails; the pitch remains visually open.
 draw(M.cube,model([0,WALL_H/2,-FIELD_Z/2-.35],[FIELD_X/2,WALL_H/2,.35]),[.025,.07,.10]);
 draw(M.cube,model([0,WALL_H/2, FIELD_Z/2+.35],[FIELD_X/2,WALL_H/2,.35]),[.025,.07,.10]);
 draw(M.cube,model([-FIELD_X/2-.35,WALL_H/2,0],[.35,WALL_H/2,FIELD_Z/2]),[.025,.07,.10]);
 draw(M.cube,model([ FIELD_X/2+.35,WALL_H/2,0],[.35,WALL_H/2,FIELD_Z/2]),[.025,.07,.10]);
 drawGoal(-1);drawGoal(1);drawStands();
}
function drawBall(){
 draw(M.sphere,model(ball.pos,[BALL_R,BALL_R,BALL_R],[0,ball.spin,0]),[.97,.97,.95]);
 // simple dark patches distributed around sphere
 const patches=[[.7,.55,.4],[-.7,.35,-.25],[.1,.78,-.6],[.3,-.72,.42],[-.45,-.35,.72]];
 for(const q of patches){const n=V.norm(q),p=V.add(ball.pos,V.mul(n,BALL_R*.92));draw(M.sphere,model(p,[.25,.25,.25]),[.03,.035,.04])}
}

let cam=[0,3.0,-33],camTar=[0,1.1,-15],last=performance.now();
function render(dt){
 gl.viewport(0,0,canvas.width,canvas.height);gl.enable(gl.DEPTH_TEST);
 gl.clearColor(.30,.62,.88,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 const asp=canvas.width/canvas.height,p=perspective(.80,asp,.08,260),fw=player.forward();
 let desired,target;
 // Low, close chase camera: the car fills the lower part of the image and the ball/field dominate ahead.
 if(state.ballCam){
   desired=V.add(player.pos,V.add(V.mul(fw,-5.6),[0,2.25,0]));
   target=V.lerp(V.add(player.pos,V.mul(fw,4)),ball.pos,.62);
 } else {
   desired=V.add(player.pos,V.add(V.mul(fw,-6.2),[0,2.35,0]));
   target=V.add(player.pos,V.add(V.mul(fw,11.5),[0,1.05,0]));
 }
 cam=V.lerp(cam,desired,1-Math.pow(.00008,dt));
 camTar=V.lerp(camTar,target,1-Math.pow(.00008,dt));
 VP=mul4(p,lookAt(cam,camTar,[0,1,0]));
 gl.uniform3fv(L.light,[-.35,1.0,.55]);
 drawField();drawBall();carDraw(player,[.10,.42,.95]);carDraw(bot,[.95,.22,.07]);
}
function updateHUD(){
 document.getElementById('blueScore').textContent=state.score[0];document.getElementById('orangeScore').textContent=state.score[1];
 const t=Math.max(0,Math.ceil(state.time));document.getElementById('timer').textContent=state.mode==='free'?'FREE PLAY':`${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`;
 document.getElementById('boostBar').style.transform=`scaleX(${player.boost/100})`;document.getElementById('ballCam').innerHTML=`BALL CAM <b>${state.ballCam?'ON':'OFF'}</b>`;
}
function tick(now){
 const dt=Math.min(.033,(now-last)/1000);last=now;
 if(state.mode!=='menu'&&!state.paused){
  if(keys.Space&&!state.spaceLatch){state.ballCam=!state.ballCam;state.spaceLatch=true}if(!keys.Space)state.spaceLatch=false;
  if(state.mode==='match'&&state.count>0){state.count-=dt;document.getElementById('message').textContent=state.count>0?String(Math.ceil(state.count)):'GO';}
  else{
   if(state.mode==='match')state.time=Math.max(0,state.time-dt);
   player.update(dt);bot.update(dt);ballPhysics(dt);goalCheck();state.goalCooldown=Math.max(0,state.goalCooldown-dt);
   if(state.mode==='match'&&state.time<=0){if(state.score[0]!==state.score[1]){document.getElementById('message').textContent='FINAL';setTimeout(()=>{menu.classList.remove('hidden');hud.classList.add('hidden');state.mode='menu'},1600)}else{document.getElementById('message').textContent='OVERTIME';state.time=99999}}
  }
  updateHUD();
 }
 render(dt);requestAnimationFrame(tick);
}
function resize(){const d=devicePixelRatio||1;canvas.width=Math.floor(innerWidth*d);canvas.height=Math.floor(innerHeight*d)}
addEventListener('resize',resize);resize();updateHUD();requestAnimationFrame(tick);
