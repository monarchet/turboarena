'use strict';
// Turbo Arena: original WebGL implementation inspired by the functional feel of browser car-soccer games.
const canvas=document.getElementById('game'), gl=canvas.getContext('webgl',{antialias:true,alpha:false});
if(!gl) alert('Este navegador no permite WebGL.');

const V3={add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],mul:(a,s)=>[a[0]*s,a[1]*s,a[2]*s],dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],len:a=>Math.hypot(a[0],a[1],a[2]),norm:a=>{let l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l]},lerp:(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const yawVec=y=>[Math.sin(y),0,Math.cos(y)];
const rotY=(v,a)=>[v[0]*Math.cos(a)+v[2]*Math.sin(a),v[1],-v[0]*Math.sin(a)+v[2]*Math.cos(a)];

function mat4(){return new Float32Array(16)}
function identity(o){o[0]=1;o[1]=0;o[2]=0;o[3]=0;o[4]=0;o[5]=1;o[6]=0;o[7]=0;o[8]=0;o[9]=0;o[10]=1;o[11]=0;o[12]=0;o[13]=0;o[14]=0;o[15]=1;return o}
function mul4(a,b){let o=mat4();for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o}
function perspective(fov,asp,n,f){let o=mat4(),t=1/Math.tan(fov/2);o[0]=t/asp;o[5]=t;o[10]=(f+n)/(n-f);o[11]=-1;o[14]=2*f*n/(n-f);return o}
function lookAt(eye,tar,up){let z=V3.norm(V3.sub(eye,tar)),x=V3.norm(V3.cross(up,z)),y=V3.cross(z,x),o=mat4();o[0]=x[0];o[1]=y[0];o[2]=z[0];o[4]=x[1];o[5]=y[1];o[6]=z[1];o[8]=x[2];o[9]=y[2];o[10]=z[2];o[12]=-V3.dot(x,eye);o[13]=-V3.dot(y,eye);o[14]=-V3.dot(z,eye);o[15]=1;return o}

const vs=`attribute vec3 p; attribute vec3 n; attribute vec2 uv; uniform mat4 uMVP,uM; varying vec3 N; varying vec2 U; varying vec3 W; void main(){vec4 w=uM*vec4(p,1.0);W=w.xyz;N=mat3(uM)*n;U=uv;gl_Position=uMVP*vec4(p,1.0);}`;
const fs=`precision mediump float; uniform vec4 color; uniform vec3 light; uniform sampler2D tex; uniform float useTex; varying vec3 N; varying vec2 U; varying vec3 W; void main(){vec3 nn=normalize(N);float d=max(.22,dot(nn,normalize(light)));vec3 c=color.rgb;if(useTex>.5)c*=texture2D(tex,U).rgb;float fog=clamp((length(W)-35.0)/85.0,0.0,.65);c=mix(c,vec3(.035,.045,.065),fog);gl_FragColor=vec4(c*d,color.a);}`;
function shader(type,src){let s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw gl.getShaderInfoLog(s);return s}
const prog=gl.createProgram();gl.attachShader(prog,shader(gl.VERTEX_SHADER,vs));gl.attachShader(prog,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(prog);gl.useProgram(prog);
const loc={p:gl.getAttribLocation(prog,'p'),n:gl.getAttribLocation(prog,'n'),uv:gl.getAttribLocation(prog,'uv'),mvp:gl.getUniformLocation(prog,'uMVP'),m:gl.getUniformLocation(prog,'uM'),color:gl.getUniformLocation(prog,'color'),light:gl.getUniformLocation(prog,'light'),useTex:gl.getUniformLocation(prog,'useTex')};

function mesh(data){let b={};b.v=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b.v);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data.p),gl.STATIC_DRAW);b.n=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b.n);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data.n),gl.STATIC_DRAW);b.u=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b.u);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data.uv||new Array(data.p.length/3*2).fill(0)),gl.STATIC_DRAW);b.i=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,b.i);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(data.i),gl.STATIC_DRAW);b.count=data.i.length;return b}
function box(){let p=[],n=[],uv=[],i=[],vs=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],fs=[[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7],[4,5,1,0]],ns=[[0,0,-1],[0,0,1],[-1,0,0],[1,0,0],[0,1,0],[0,-1,0]];for(let f=0;f<6;f++){let base=f*4;for(let q=0;q<4;q++){let v=vs[fs[f][q]];p.push(...v);n.push(...ns[f]);uv.push(q===1||q===2?1:0,q>=2?1:0)}i.push(base,base+1,base+2,base,base+2,base+3)}return mesh({p,n,uv,i})}
function sphere(seg=20,rings=12){let p=[],n=[],uv=[],i=[];for(let y=0;y<=rings;y++){let v=y/rings,ph=v*Math.PI;for(let x=0;x<=seg;x++){let u=x/seg,th=u*Math.PI*2,s=Math.sin(ph);p.push(Math.cos(th)*s,Math.cos(ph),Math.sin(th)*s);n.push(Math.cos(th)*s,Math.cos(ph),Math.sin(th)*s);uv.push(u,v)}}for(let y=0;y<rings;y++)for(let x=0;x<seg;x++){let a=y*(seg+1)+x,b=a+1,c=a+seg+1,d=c+1;i.push(a,c,b,b,c,d)}return mesh({p,n,uv,i})}
function cyl(seg=16){let p=[],n=[],uv=[],i=[];for(let y=0;y<=1;y++)for(let x=0;x<=seg;x++){let u=x/seg,t=u*Math.PI*2;p.push(Math.cos(t),y-.5,Math.sin(t));n.push(Math.cos(t),0,Math.sin(t));uv.push(u,y)}for(let x=0;x<seg;x++){let a=x,b=x+1,c=seg+1+x,d=c+1;i.push(a,c,b,b,c,d)}return mesh({p,n,uv,i})}
const M={box:box(),sphere:sphere(),cyl:cyl()};
function transform(pos,scale,rot=[0,0,0]){let [x,y,z]=rot,[sx,sy,sz]=scale,cx=Math.cos(x),sx1=Math.sin(x),cy=Math.cos(y),sy1=Math.sin(y),cz=Math.cos(z),sz1=Math.sin(z);let rx=[[1,0,0],[0,cx,-sx1],[0,sx1,cx]],ry=[[cy,0,sy1],[0,1,0],[-sy1,0,cy]],rz=[[cz,-sz1,0],[sz1,cz,0],[0,0,1]];function mm(a,b){let q=[];for(let r=0;r<3;r++)for(let c=0;c<3;c++)q[r*3+c]=a[r*3]*b[c]+a[r*3+1]*b[3+c]+a[r*3+2]*b[6+c];return q}let r=mm(mm(rz,ry),rx),o=mat4();o[0]=r[0]*sx;o[1]=r[1]*sx;o[2]=r[2]*sx;o[4]=r[3]*sy;o[5]=r[4]*sy;o[6]=r[5]*sy;o[8]=r[6]*sz;o[9]=r[7]*sz;o[10]=r[8]*sz;o[12]=pos[0];o[13]=pos[1];o[14]=pos[2];o[15]=1;return o}
function draw(me,model,col){let mvp=mul4(VP,model);gl.bindBuffer(gl.ARRAY_BUFFER,me.v);gl.vertexAttribPointer(loc.p,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(loc.p);gl.bindBuffer(gl.ARRAY_BUFFER,me.n);gl.vertexAttribPointer(loc.n,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(loc.n);gl.bindBuffer(gl.ARRAY_BUFFER,me.u);gl.vertexAttribPointer(loc.uv,2,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(loc.uv);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,me.i);gl.uniformMatrix4fv(loc.m,false,model);gl.uniformMatrix4fv(loc.mvp,false,mvp);gl.uniform4fv(loc.color,[...col,1]);gl.uniform1f(loc.useTex,0);gl.drawElements(gl.TRIANGLES,me.count,gl.UNSIGNED_SHORT,0)}

const W=48,D=30,WALL=5,GOALW=13,GOALD=6,BALLR=1.25;
const keys={},mouse={l:false,r:false};
addEventListener('keydown',e=>{keys[e.code]=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='Escape')togglePause();if(e.code==='KeyR'&&state.mode==='free')resetBall();});
addEventListener('keyup',e=>keys[e.code]=false);canvas.addEventListener('mousedown',e=>{if(e.button===0)mouse.l=true;if(e.button===2)mouse.r=true});addEventListener('mouseup',e=>{if(e.button===0)mouse.l=false;if(e.button===2)mouse.r=false});canvas.oncontextmenu=e=>e.preventDefault();
const menu=document.getElementById('menu'),hud=document.getElementById('hud'),pause=document.getElementById('pause');
document.getElementById('playBtn').onclick=()=>start('match');document.getElementById('freeBtn').onclick=()=>start('free');
let state={mode:'menu',paused:false,time:120,score:[0,0],count:0,msg:'',goalCooldown:0,ballCam:false};
function start(mode){state.mode=mode;state.paused=false;state.time=mode==='match'?120:0;state.score=[0,0];state.count=3;state.goalCooldown=1.5;menu.classList.add('hidden');pause.classList.add('hidden');hud.classList.remove('hidden');resetPositions();}
function togglePause(){if(state.mode==='menu')return;state.paused=!state.paused;pause.classList.toggle('hidden',!state.paused)}
class Car{constructor(team){this.team=team;this.pos=team===0?[-12,1.05,0]:[12,1.05,0];this.vel=[0,0,0];this.yaw=team===0?Math.PI/2:-Math.PI/2;this.pitch=0;this.roll=0;this.ground=true;this.jumps=0;this.boost=100;this.wheel=0;this.boosting=false;this.ai=team===1;}
forward(){return yawVec(this.yaw)}
update(dt){if(this.ai){this.updateAI(dt);return}this.control(dt)}
control(dt){let f=(keys.KeyW?1:0)-(keys.KeyS?1:0),s=(keys.KeyD?1:0)-(keys.KeyA?1:0);this.boosting=mouse.l&&this.boost>0&&this.ground&&this.vel[2]*this.forward()[2]+this.vel[0]*this.forward()[0]>-2;if(this.boosting){this.boost-=34*dt}else this.boost=Math.min(100,this.boost+8*dt);let speed=V3.len([this.vel[0],0,this.vel[2]]);let steer=(this.ground?2.35:1.1)*s*(.3+Math.min(speed/15,1));if(f<0)steer*=-.75;this.yaw+=steer*dt*(this.ground?1:0.45);let fw=this.forward();let accel=(f*19)+(this.boosting?27:0);if(this.ground){this.vel[0]+=fw[0]*accel*dt;this.vel[2]+=fw[2]*accel*dt;let lat=this.vel[0]*(-fw[2])+this.vel[2]*fw[0];let grip=(keys.ShiftLeft||keys.ShiftRight)?.82:.9;this.vel[0]-=(-fw[2])*lat*grip;this.vel[2]-=fw[0]*lat*grip;let drag=Math.pow(.985,dt*60);this.vel[0]*=drag;this.vel[2]*=drag;let max=this.boosting?31:22;let hs=Math.hypot(this.vel[0],this.vel[2]);if(hs>max){let k=max/hs;this.vel[0]*=k;this.vel[2]*=k}}
if(mouse.r&&!this._jumpLatch){this._jumpLatch=true;if(this.ground){this.vel[1]=9.5;this.ground=false;this.jumps=1}else if(this.jumps<2){this.vel[1]=8.2;this.jumps=2}}if(!mouse.r)this._jumpLatch=false;
if(!this.ground){this.vel[1]-=22*dt;let airYaw=s*2.2*dt;this.yaw+=airYaw;this.pitch+=(-f)*1.7*dt;
// A/D controlan el giro horizontal en el aire. Q/E son air-roll izquierda/derecha.
let airRoll=(keys.KeyE?1:0)-(keys.KeyQ?1:0);
if(airRoll!==0)this.roll+=airRoll*5.2*dt;
// Shift sigue permitiendo air-roll continuo con A/D, como alternativa.
if(keys.ShiftLeft||keys.ShiftRight)this.roll+=(-s)*4.0*dt;
this.pitch*=.995;this.roll*=.992}else{this.pitch*=.82;this.roll*=.75}
this.integrate(dt);}
updateAI(dt){let to=V3.sub(ball.pos,this.pos),flat=[to[0],0,to[2]],dist=V3.len(flat);let targetYaw=Math.atan2(flat[0],flat[2]);let dy=Math.atan2(Math.sin(targetYaw-this.yaw),Math.cos(targetYaw-this.yaw));let turn=clamp(dy,-1,1);let f=dist>5?1:.45;this.yaw+=turn*2.5*dt;let fw=this.forward();let accel=18;this.vel[0]+=fw[0]*accel*f*dt;this.vel[2]+=fw[2]*accel*f*dt;if(dist>18&&this.boost>15){this.vel[0]+=fw[0]*18*dt;this.vel[2]+=fw[2]*18*dt;this.boost-=28*dt}if(ball.pos[1]>3&&dist<10&&this.ground&&Math.abs(dy)<.35){this.vel[1]=9;this.ground=false;this.jumps=1}if(this.ground){let hs=Math.hypot(this.vel[0],this.vel[2]);if(hs>21){let k=21/hs;this.vel[0]*=k;this.vel[2]*=k}}else this.vel[1]-=22*dt;this.integrate(dt)}
integrate(dt){this.pos[0]+=this.vel[0]*dt;this.pos[1]+=this.vel[1]*dt;this.pos[2]+=this.vel[2]*dt;if(this.pos[1]<=1.05){this.pos[1]=1.05;this.vel[1]=0;if(!this.ground){this.ground=true;this.jumps=0;this.pitch=0;this.roll=0}}else this.ground=false;let limX=W/2-1.8,limZ=D/2-1.8;if(this.pos[0]<-limX){this.pos[0]=-limX;this.vel[0]=Math.abs(this.vel[0])*.25}if(this.pos[0]>limX){this.pos[0]=limX;this.vel[0]=-Math.abs(this.vel[0])*.25}if(this.pos[2]<-limZ){this.pos[2]=-limZ;this.vel[2]=Math.abs(this.vel[2])*.25}if(this.pos[2]>limZ){this.pos[2]=limZ;this.vel[2]=-Math.abs(this.vel[2])*.25}}
}
const player=new Car(0),bot=new Car(1);let ball={pos:[0,BALLR,0],vel:[0,0,0],spin:0};
function resetPositions(){Object.assign(player,{pos:[-12,1.05,0],vel:[0,0,0],yaw:Math.PI/2,pitch:0,roll:0,ground:true,jumps:0,boost:100});Object.assign(bot,{pos:[12,1.05,0],vel:[0,0,0],yaw:-Math.PI/2,pitch:0,roll:0,ground:true,jumps:0,boost:100});resetBall();}
function resetBall(){ball.pos=[0,BALLR,0];ball.vel=[0,0,0]}
function ballPhysics(dt){ball.vel[1]-=18*dt;ball.vel[0]*=.999;ball.vel[2]*=.999;ball.pos[0]+=ball.vel[0]*dt;ball.pos[1]+=ball.vel[1]*dt;ball.pos[2]+=ball.vel[2]*dt;if(ball.pos[1]<BALLR){ball.pos[1]=BALLR;ball.vel[1]=Math.abs(ball.vel[1])*.73;if(Math.abs(ball.vel[1])<.8)ball.vel[1]=0}let xlim=W/2-BALLR,zlim=D/2-BALLR;if(ball.pos[0]<-xlim){ball.pos[0]=-xlim;ball.vel[0]=Math.abs(ball.vel[0])*.78}if(ball.pos[0]>xlim){ball.pos[0]=xlim;ball.vel[0]=-Math.abs(ball.vel[0])*.78}if(ball.pos[2]<-zlim){ball.pos[2]=-zlim;ball.vel[2]=Math.abs(ball.vel[2])*.78}if(ball.pos[2]>zlim){ball.pos[2]=zlim;ball.vel[2]=-Math.abs(ball.vel[2])*.78}for(const c of [player,bot]){let d=V3.sub(ball.pos,c.pos),dist=V3.len(d),rad=2.05;if(dist<rad){let n=V3.norm(d);let rel=V3.sub(ball.vel,c.vel),sep=V3.dot(rel,n);let power=Math.max(5,-sep+3);ball.vel=V3.add(ball.vel,V3.mul(n,power));ball.vel[1]+=Math.max(0,c.vel[1])*0.35;let push=(rad-dist)+.02;ball.pos=V3.add(ball.pos,V3.mul(n,push));ball.vel[0]*=1.015;ball.vel[2]*=1.015}}}
function goalCheck(){if(state.goalCooldown>0)return;let z=Math.abs(ball.pos[2]);if(z>GOALW/2 && Math.abs(ball.pos[0])>W/2-3)return; if(ball.pos[0]<-W/2+0.3 && z<GOALW/2 && ball.pos[1]<7){score(1)}else if(ball.pos[0]>W/2-0.3&&z<GOALW/2&&ball.pos[1]<7){score(0)}}
function score(team){state.score[team]++;state.goalCooldown=2.2;state.msg='GOAL';document.getElementById('message').textContent='GOAL';setTimeout(()=>{if(state.mode!=='menu')document.getElementById('message').textContent='';},1200);resetPositions()}

function carDraw(c,col){let base=transform(c.pos,[1.75,.42,.9],[c.pitch,c.yaw,c.roll]);draw(M.box,base,col);let roofPos=[c.pos[0],c.pos[1]+.55,c.pos[2]-.12];draw(M.box,transform(roofPos,[.9,.25,.68],[c.pitch,c.yaw,c.roll]),[col[0]*.45+.15,col[1]*.45+.15,col[2]*.45+.15]);let fw=c.forward(),right=[fw[2],0,-fw[0]];for(const sx of [-1,1])for(const sz of [-1,1]){let p=V3.add(c.pos,V3.add(V3.mul(right,sx*.98),V3.mul(fw,sz*.62)));p[1]=.67;draw(M.cyl,transform(p,[.32,.16,.32],[Math.PI/2,c.yaw,0]),[.03,.035,.045])}let bumper=V3.add(c.pos,V3.mul(fw,1.72));draw(M.box,transform([bumper[0],bumper[1],bumper[2]],[.16,.25,.72],[c.pitch,c.yaw,c.roll]),[.8,.8,.8]);if(c.boosting){let bp=V3.add(c.pos,V3.mul(fw,-1.75));draw(M.sphere,transform(bp,[.28,.28,.28]),[1,.5,.12])}}
function drawField(){draw(M.box,transform([0,-.3,0],[W/2,.3,D/2]),[.055,.10,.07]);draw(M.box,transform([0,WALL/2,-D/2-.25],[W/2,WALL/2,.25]),[.06,.08,.12]);draw(M.box,transform([0,WALL/2,D/2+.25],[W/2,WALL/2,.25]),[.06,.08,.12]);draw(M.box,transform([-W/2-.25,WALL/2,0],[.25,WALL/2,D/2]),[.06,.08,.12]);draw(M.box,transform([W/2+.25,WALL/2,0],[.25,WALL/2,D/2]),[.06,.08,.12]);
// center line/circle approximation
for(let x=-W/2+3;x<W/2-2;x+=4)draw(M.box,transform([x,.03,0],[1.3,.025,.055]),[.55,.62,.65]);draw(M.cyl,transform([0,.04,0],[5.2,.04,5.2],[0,0,0]),[.25,.32,.38]);
// goal frames
for(const side of [-1,1]){let gx=side*(W/2-2.3);for(const z of [-GOALW/2,GOALW/2])draw(M.box,transform([gx,3.5,z],[2.3,.18,.18]),[.8,.82,.86]);draw(M.box,transform([gx,7,0],[2.3,.18,.18]),[.8,.82,.86]);draw(M.box,transform([gx,3.5,0],[.15,3.5,GOALW/2]),[.12,.16,.2]);for(let zz=-GOALW/2;zz<=GOALW/2;zz+=2)draw(M.box,transform([gx+side*2,3.5,zz],[.05,3.4,.025]),[.25,.3,.35])}}
function drawBall(){draw(M.sphere,transform(ball.pos,[BALLR,BALLR,BALLR],[0,ball.spin,0]),[.94,.94,.92]);for(let i=0;i<6;i++){let a=i*Math.PI/3;let p=[ball.pos[0]+Math.cos(a)*BALLR*.68,ball.pos[1]+.2,ball.pos[2]+Math.sin(a)*BALLR*.68];draw(M.sphere,transform(p,[.17,.17,.17]),[.06,.07,.08])}}

let VP=identity(mat4()),last=performance.now(),cam=[0,5,10],camTar=[0,1,0];
function render(dt){gl.viewport(0,0,canvas.width,canvas.height);gl.enable(gl.DEPTH_TEST);gl.clearColor(.025,.035,.055,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);let aspect=canvas.width/canvas.height;let p=perspective(1.15,aspect,.1,180);let fw=player.forward();let desired=state.ballCam?V3.add(ball.pos,[0,3.5,0]):V3.add(player.pos,V3.add(V3.mul(fw,-8.5),[0,4.2,0]));let target=state.ballCam?ball.pos:V3.add(player.pos,[0,1.0,0]);cam=V3.lerp(cam,desired,1-Math.pow(.001,dt));camTar=V3.lerp(camTar,target,1-Math.pow(.001,dt));VP=mul4(p,lookAt(cam,camTar,[0,1,0]));gl.uniform3fv(loc.light,[-.4,1,.55]);drawField();drawBall();carDraw(player,[.18,.55,.95]);carDraw(bot,[.95,.3,.12])}
function updateHUD(){document.getElementById('blueScore').textContent=state.score[0];document.getElementById('orangeScore').textContent=state.score[1];let t=Math.max(0,Math.ceil(state.time));document.getElementById('timer').textContent=state.mode==='free'?'FREE PLAY':`${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`;document.getElementById('boostBar').style.transform=`scaleX(${player.boost/100})`;document.getElementById('ballCam').innerHTML=`BALL CAM <b>${state.ballCam?'ON':'OFF'}</b>`}
function tick(now){
  let dt=Math.min(.033,(now-last)/1000); last=now;
  if(state.mode!=='menu'&&!state.paused){
    if(keys.Space&&!state.spaceLatch){state.ballCam=!state.ballCam;state.spaceLatch=true}
    if(!keys.Space)state.spaceLatch=false;
    if(state.mode==='match'&&state.count>0){
      state.count-=dt;
      document.getElementById('message').textContent=state.count>0?String(Math.ceil(state.count)):'';
    }else{
      if(state.mode==='match')state.time=Math.max(0,state.time-dt);
      player.update(dt); bot.update(dt); ballPhysics(dt); goalCheck();
      state.goalCooldown=Math.max(0,state.goalCooldown-dt);
      if(state.mode==='match'&&state.time<=0){
        if(state.score[0]!==state.score[1]){
          state.msg='FINAL'; document.getElementById('message').textContent='FINAL';
          setTimeout(()=>{menu.classList.remove('hidden');hud.classList.add('hidden');state.mode='menu'},1800);
        }else{
          document.getElementById('message').textContent='OVERTIME';
          state.time=99999; state.msg='OVERTIME';
        }
      }
    }
    updateHUD();
  }
  render(dt); requestAnimationFrame(tick);
}
function resize(){let d=devicePixelRatio||1;canvas.width=innerWidth*d;canvas.height=innerHeight*d}addEventListener('resize',resize);resize();updateHUD();requestAnimationFrame(tick);
