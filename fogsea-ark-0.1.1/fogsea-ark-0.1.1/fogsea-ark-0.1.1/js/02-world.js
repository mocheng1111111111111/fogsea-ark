'use strict';
/* ---------------- 画布 ---------------- */
const cv=$('cv');let ctx=cv.getContext('2d');
const mm=$('mm'),mctx=mm.getContext('2d');
let W=innerWidth,H=innerHeight,DPR=Math.min(devicePixelRatio||1,2),seaGrad=null,vigGrad=null;
function makeGlow(col){
  const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
  const rg=g.createRadialGradient(64,64,1,64,64,64);
  rg.addColorStop(0,`rgba(${col},1)`);rg.addColorStop(.42,`rgba(${col},.34)`);rg.addColorStop(1,`rgba(${col},0)`);
  g.fillStyle=rg;g.fillRect(0,0,128,128);return c;
}
const GLOW={amber:makeGlow('255,170,80'),lantern:makeGlow('255,190,110'),mint:makeGlow('143,227,208'),
  cyan:makeGlow('87,230,255'),leaf:makeGlow('111,224,138'),violet:makeGlow('160,107,255'),fog:makeGlow('159,216,207'),white:makeGlow('255,255,255'),
  fire:makeGlow('255,122,69'),frost:makeGlow('111,216,255'),arcane:makeGlow('180,140,255')};
function resize(){
  W=innerWidth;H=innerHeight;DPR=Math.min(devicePixelRatio||1,2);
  cv.width=Math.floor(W*DPR);cv.height=Math.floor(H*DPR);
  mm.width=Math.floor(124*DPR);mm.height=Math.floor(124*DPR);
  ctx.setTransform(DPR,0,0,DPR,0,0);
  seaGrad=ctx.createRadialGradient(W/2,H*.4,80,W/2,H/2,Math.max(W,H)*.8);
  seaGrad.addColorStop(0,'#123448');seaGrad.addColorStop(.55,'#0c2231');seaGrad.addColorStop(1,'#050d14');
  vigGrad=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.35,W/2,H/2,Math.max(W,H)*.75);
  vigGrad.addColorStop(0,'rgba(3,6,12,0)');vigGrad.addColorStop(1,'rgba(3,6,12,.55)');
  layoutHand();
  if(codexOpen)sizeCodexCv();
  if($('dragBuildCv')){sizeDragCv();drawDragBuild();}
}
addEventListener('resize',resize);

/* ---------------- 世界 ---------------- */
let tiles=[],groundCv=null,mmMask=null,edgeSpawns=[];
let nodes=[],builds=[],foes=[],shots=[],picks=[],parts=[],floats=[],slashes=[],ghosts=[],warns=[],fogBlobs=[];
let core={x:CEN+.5,y:CEN+.5,r:1.15,hp:600,max:600,flash:0,beam:0};
let cam={x:CEN,y:CEN,z:1.8,tz:1.8,shake:0,sx:0,sy:0};
let seed=1;
function hash(x,y){let h=(x*374761393+y*668265263+seed*974711)|0;h=(h^(h>>13))*1274126177;return((h^(h>>16))>>>0)/4294967295;}
function vnoise(x,y){
  const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  return lerp(lerp(hash(xi,yi),hash(xi+1,yi),u),lerp(hash(xi,yi+1),hash(xi+1,yi+1),u),v);
}
const walk=(x,y)=>{const ix=x|0,iy=y|0;if(ix<0||iy<0||ix>=GRID||iy>=GRID)return false;return tiles[iy*GRID+ix].land;};
const tileAt=(x,y)=>{const ix=x|0,iy=y|0;if(ix<0||iy<0||ix>=GRID||iy>=GRID)return null;return tiles[iy*GRID+ix];};
// forcedSeed 仅供读档重建；默认路径必须保持 (Math.random()*1e9)|0，以免改变启动期 RNG 序列
// 契约：hash/vnoise 与下方 tile 生成不得引入随机，否则 seed-only 地形恢复会失效
function genWorld(forcedSeed){
  seed=forcedSeed===undefined?(Math.random()*1e9)|0:forcedSeed;tiles=[];
  for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){
    const d=dist(x+.5,y+.5,CEN,CEN),n=vnoise(x*.33,y*.33)*2.6;
    let land=d+n<15.6;if(d<4.5)land=true;
    tiles.push({land,sand:false,v:hash(x*3,y*7)});
  }
  const seen=new Uint8Array(NN),stack=[(CEN|0)*GRID+(CEN|0)];seen[stack[0]]=1;
  while(stack.length){
    const i=stack.pop(),x=i%GRID,y=(i/GRID)|0;
    for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=GRID||ny>=GRID)continue;
      const j=ny*GRID+nx;if(!seen[j]&&tiles[j].land){seen[j]=1;stack.push(j);}
    }
  }
  for(let i=0;i<NN;i++)if(!seen[i])tiles[i].land=false;
  for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){
    const t=tiles[y*GRID+x];
    if(t.land)t.sand=dist(x+.5,y+.5,CEN,CEN)+vnoise(x*.33,y*.33)*2.6>13.9;
  }
  edgeSpawns=[];
  for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++)
    if(tiles[y*GRID+x].land&&dist(x+.5,y+.5,CEN,CEN)>12.3)edgeSpawns.push([x+.5,y+.5]);
  if(edgeSpawns.length<8)
    for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++)
      if(tiles[y*GRID+x].land&&dist(x+.5,y+.5,CEN,CEN)>9)edgeSpawns.push([x+.5,y+.5]);
  bakeGround();bakeMask();
  nodes=[];
  const place=(type,count,minD)=>{
    let tries=0;
    while(count>0&&tries++<1200){
      const x=rand(3,GRID-3),y=rand(3,GRID-3),t=tileAt(x,y);
      if(!t||!t.land||t.sand)continue;
      if(dist(x,y,CEN,CEN)<minD)continue;
      if(nodes.some(n=>dist(n.x,n.y,x,y)<1.8))continue;
      const hp=TUNE.node.hits[type];
      nodes.push({type,x,y,hp,max:hp,alive:true,shake:0,sway:rand(TAU),s:rand(.85,1.2)*TUNE.world.nodeScale,r:.36*TUNE.world.colScale});count--;
    }
  };
  place('tree',24,4.2);place('rock',14,4.6);place('crys',10,7);
  fogBlobs=[];
  for(let i=0;i<9;i++)fogBlobs.push({x:rand(-400,400),y:rand(-300,300),s:rand(180,420),vx:rand(4,12)*(Math.random()<.5?-1:1),a:rand(.05,.12),ph:rand(TAU)});
  rebuildSolids();rebuildTileCost();fieldDirty=true;
}
function bakeGround(){
  const OX=GRID*TW/2,M=10;
  groundCv=document.createElement('canvas');groundCv.width=GRID*TW;groundCv.height=GRID*TH+70;
  const g=groundCv.getContext('2d');
  const px=(x,y)=>{const p=proj(x,y);return[p[0]+OX,p[1]+M];};
  for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){
    const t=tileAt(x+.5,y+.5);if(t.land)continue;
    const near=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>{const n=tileAt(x+dx+.5,y+dy+.5);return n&&n.land;});
    if(!near)continue;
    const c=px(x+.5,y+.5);
    g.fillStyle='rgba(87,200,190,.10)';
    g.beginPath();g.moveTo(c[0],c[1]-TH/2);g.lineTo(c[0]+TW/2,c[1]);g.lineTo(c[0],c[1]+TH/2);g.lineTo(c[0]-TW/2,c[1]);g.closePath();g.fill();
  }
  for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){
    const t=tileAt(x+.5,y+.5);if(!t.land)continue;
    const c=px(x+.5,y+.5);
    const dia=()=>{g.beginPath();g.moveTo(c[0],c[1]-TH/2);g.lineTo(c[0]+TW/2,c[1]);g.lineTo(c[0],c[1]+TH/2);g.lineTo(c[0]-TW/2,c[1]);g.closePath();};
    if(t.sand)g.fillStyle=t.v>.5?'#c4b28c':'#b8a67e';
    else g.fillStyle=t.v<.33?'#173f3c':t.v<.66?'#1a453f':'#1d4a42';
    dia();g.fill();g.strokeStyle='rgba(8,18,24,.25)';g.lineWidth=1;dia();g.stroke();
    const CH=17,rN=tileAt(x+1.5,y+.5),lN=tileAt(x+.5,y+1.5);
    if(!rN||!rN.land){
      g.fillStyle='#0d2830';g.beginPath();g.moveTo(c[0]+TW/2,c[1]);g.lineTo(c[0],c[1]+TH/2);g.lineTo(c[0],c[1]+TH/2+CH);g.lineTo(c[0]+TW/2,c[1]+CH);g.closePath();g.fill();
      g.strokeStyle='rgba(143,227,208,.35)';g.beginPath();g.moveTo(c[0]+TW/2,c[1]+2);g.lineTo(c[0],c[1]+TH/2+2);g.stroke();
    }
    if(!lN||!lN.land){
      g.fillStyle='#0a2029';g.beginPath();g.moveTo(c[0]-TW/2,c[1]);g.lineTo(c[0],c[1]+TH/2);g.lineTo(c[0],c[1]+TH/2+CH);g.lineTo(c[0]-TW/2,c[1]+CH);g.closePath();g.fill();
      g.strokeStyle='rgba(143,227,208,.28)';g.beginPath();g.moveTo(c[0]-TW/2,c[1]+2);g.lineTo(c[0],c[1]+TH/2+2);g.stroke();
    }
    if(!t.sand){
      if(t.v>.82){g.strokeStyle='rgba(111,224,138,.4)';g.lineWidth=1.2;
        for(let i=0;i<3;i++){const ox=c[0]+(hash(x*9+i,y)-.5)*30,oy=c[1]+(hash(x,y*9+i)-.5)*12;
          g.beginPath();g.moveTo(ox,oy);g.lineTo(ox+2,oy-5);g.stroke();}}
      else if(t.v<.1){g.fillStyle='rgba(87,230,255,.35)';g.beginPath();g.arc(c[0]+(t.v-.05)*180,c[1],1.5,0,TAU);g.fill();}
      else if(t.v>.45&&t.v<.5){g.fillStyle='rgba(120,140,145,.5)';g.beginPath();g.ellipse(c[0]-8,c[1]+3,3.5,2,0,0,TAU);g.fill();}
    }
  }
  groundCv.OX=OX;groundCv.M=M;
}
function bakeMask(){
  mmMask=document.createElement('canvas');mmMask.width=124;mmMask.height=124;
  const g=mmMask.getContext('2d'),k=124/GRID;
  g.fillStyle='rgba(10,26,36,.9)';g.fillRect(0,0,124,124);
  for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){
    const t=tiles[y*GRID+x];if(!t.land)continue;
    g.fillStyle=t.sand?'#8a7d5e':'#2a5a50';g.fillRect(x*k,y*k,k+.5,k+.5);
  }
}

/* ---------------- 网格 & 流场 ---------------- */
const CELL=2,CW=Math.ceil(GRID/CELL),CN=CW*CW;
const solidGrid=new Array(CN),foeGrid=new Array(CN);
for(let i=0;i<CN;i++){solidGrid[i]=[];foeGrid[i]=[];}
let solids=[];
const cellIdx=(x,y)=>clamp(y/CELL|0,0,CW-1)*CW+clamp(x/CELL|0,0,CW-1);
function rebuildSolids(){
  solids=[{x:core.x,y:core.y,r:core.r,kind:2,obj:core}];
  for(const n of nodes)if(n.alive)solids.push({x:n.x,y:n.y,r:n.r||.36,kind:0,obj:n});
  for(const b of builds)solids.push({x:b.x,y:b.y,r:b.r,kind:1,obj:b});
  for(let i=0;i<CN;i++)solidGrid[i].length=0;
  for(const s of solids)solidGrid[cellIdx(s.x,s.y)].push(s);
}
function forSolids(x,y,r,cb){
  const x0=clamp((x-r)/CELL|0,0,CW-1),x1=clamp((x+r)/CELL|0,0,CW-1);
  const y0=clamp((y-r)/CELL|0,0,CW-1),y1=clamp((y+r)/CELL|0,0,CW-1);
  for(let cy=y0;cy<=y1;cy++)for(let cx=x0;cx<=x1;cx++){const a=solidGrid[cy*CW+cx];for(let i=0;i<a.length;i++)cb(a[i]);}
}
function rebuildFoeGrid(){
  for(let i=0;i<CN;i++)foeGrid[i].length=0;
  for(const f of foes)if(!f.dead)foeGrid[cellIdx(f.x,f.y)].push(f);
}
function forFoes(x,y,r,cb){
  const x0=clamp((x-r)/CELL|0,0,CW-1),x1=clamp((x+r)/CELL|0,0,CW-1);
  const y0=clamp((y-r)/CELL|0,0,CW-1),y1=clamp((y+r)/CELL|0,0,CW-1);
  for(let cy=y0;cy<=y1;cy++)for(let cx=x0;cx<=x1;cx++){const a=foeGrid[cy*CW+cx];for(let i=0;i<a.length;i++)cb(a[i]);}
}
const tileCost=new Float32Array(NN),coreField=new Float32Array(NN),plyField=new Float32Array(NN);
let fieldDirty=true,plyFieldT=0,plyTile=-1;
const heapI=new Int32Array(NN*6),heapC=new Float32Array(NN*6);let heapN=0;
function hPush(i,c){
  if(heapN>=heapI.length)return;
  let n=heapN++;heapI[n]=i;heapC[n]=c;
  while(n>0){const p=(n-1)>>1;if(heapC[p]<=heapC[n])break;
    const ti=heapI[p],tc=heapC[p];heapI[p]=heapI[n];heapC[p]=heapC[n];heapI[n]=ti;heapC[n]=tc;n=p;}
}
function hPop(){
  const ri=heapI[0],rc=heapC[0];heapN--;
  if(heapN>0){
    heapI[0]=heapI[heapN];heapC[0]=heapC[heapN];let n=0;
    for(;;){const l=n*2+1,r=l+1;let m=n;
      if(l<heapN&&heapC[l]<heapC[m])m=l;if(r<heapN&&heapC[r]<heapC[m])m=r;if(m===n)break;
      const ti=heapI[m],tc=heapC[m];heapI[m]=heapI[n];heapC[m]=heapC[n];heapI[n]=ti;heapC[n]=tc;n=m;}
  }
  return [ri,rc];
}
function rebuildTileCost(){
  for(let i=0;i<NN;i++)tileCost[i]=tiles[i].land?1:Infinity;
  for(const n of nodes)if(n.alive)tileCost[(n.y|0)*GRID+(n.x|0)]=Infinity;
  for(const b of builds){const i=(b.y|0)*GRID+(b.x|0);if(tileCost[i]!==Infinity)tileCost[i]=26+b.hp/b.max*10;}
}
const DIRS=[[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,1.414],[1,-1,1.414],[-1,1,1.414],[-1,-1,1.414]];
function computeField(out,gx,gy){
  out.fill(Infinity);gx=clamp(gx|0,0,GRID-1);gy=clamp(gy|0,0,GRID-1);
  let gi=gy*GRID+gx;
  if(!isFinite(tileCost[gi])){
    let best=-1,bd=1e9;
    for(let i=0;i<NN;i++)if(isFinite(tileCost[i])){
      const d=Math.abs(i%GRID-gx)+Math.abs((i/GRID|0)-gy);if(d<bd){bd=d;best=i;}}
    if(best<0)return;gi=best;
  }
  heapN=0;out[gi]=0;hPush(gi,0);
  while(heapN>0){
    const[i,c]=hPop();if(c>out[i]+1e-6)continue;
    const x=i%GRID,y=(i/GRID)|0;
    for(let k=0;k<8;k++){
      const dx=DIRS[k][0],dy=DIRS[k][1],sl=DIRS[k][2],nx=x+dx,ny=y+dy;
      if(nx<0||ny<0||nx>=GRID||ny>=GRID)continue;
      const j=ny*GRID+nx,tc=tileCost[j];if(!isFinite(tc))continue;
      if(dx&&dy&&(!isFinite(tileCost[y*GRID+nx])||!isFinite(tileCost[ny*GRID+x])))continue;
      const nc=c+sl*tc;if(nc<out[j]-1e-6){out[j]=nc;hPush(j,nc);}
    }
  }
}
function fieldDir(field,x,y,out){
  const ix=x|0,iy=y|0;if(ix<0||iy<0||ix>=GRID||iy>=GRID)return false;
  const i=iy*GRID+ix,cur=field[i];let bi=-1,bc=cur,bx=0,by=0;
  for(let k=0;k<8;k++){
    const dx=DIRS[k][0],dy=DIRS[k][1],nx=ix+dx,ny=iy+dy;
    if(nx<0||ny<0||nx>=GRID||ny>=GRID)continue;
    const j=ny*GRID+nx;if(field[j]>=bc)continue;
    if(dx&&dy&&(!isFinite(tileCost[iy*GRID+nx])||!isFinite(tileCost[ny*GRID+ix])))continue;
    bc=field[j];bi=j;bx=dx;by=dy;
  }
  if(bi<0)return false;
  const dx=ix+bx+.5-x,dy=iy+by+.5-y,m=Math.hypot(dx,dy)||1;
  out[0]=dx/m;out[1]=dy/m;return true;
}

/* ---------------- 移动 ---------------- */
function landOK(x,y,r,mx,my){
  if(!walk(x,y))return false;
  const m=Math.hypot(mx,my);
  if(m>1e-6&&!walk(x+mx/m*r*.8,y+my/m*r*.8))return false;
  return true;
}
function depenetrate(e,r,ignoreNodes){
  for(let pass=0;pass<2;pass++){
    let hit=false;
    forSolids(e.x,e.y,r+.8,s=>{
      if(ignoreNodes&&s.kind===0)return;
      const dx=e.x-s.x,dy=e.y-s.y,min=s.r+r;let d=Math.hypot(dx,dy);
      if(d>=min)return;
      let nx,ny;
      if(d<1e-4){const a=rand(TAU);nx=Math.cos(a);ny=Math.sin(a);}else{nx=dx/d;ny=dy/d;}
      const push=min-d+.002,tx=e.x+nx*push,ty=e.y+ny*push;
      if(walk(tx,ty)){e.x=tx;e.y=ty;hit=true;}
      else{const ax=e.x+nx*push;if(walk(ax,e.y))e.x=ax;const ay=e.y+ny*push;if(walk(e.x,ay))e.y=ay;}
    });
    if(!hit)break;
  }
}
function moveCircle(e,dx,dy,r,ignoreNodes){
  const len=Math.hypot(dx,dy);
  if(len<1e-7){depenetrate(e,r,ignoreNodes);return;}
  const steps=Math.min(8,Math.max(1,Math.ceil(len/.18))),sx=dx/steps,sy=dy/steps;
  for(let s=0;s<steps;s++){
    const nx=e.x+sx;if(landOK(nx,e.y,r,sx,0))e.x=nx;
    const ny=e.y+sy;if(landOK(e.x,ny,r,0,sy))e.y=ny;
    depenetrate(e,r,ignoreNodes);
  }
  if(!walk(e.x,e.y)){
    const ix=clamp(e.x|0,0,GRID-1),iy=clamp(e.y|0,0,GRID-1);let best=null,bd=1e9;
    for(let oy=-2;oy<=2;oy++)for(let ox=-2;ox<=2;ox++){
      const tx=ix+ox,ty=iy+oy;if(tx<0||ty<0||tx>=GRID||ty>=GRID)continue;
      if(!tiles[ty*GRID+tx].land)continue;
      const d=dist(e.x,e.y,tx+.5,ty+.5);if(d<bd){bd=d;best=[tx+.5,ty+.5];}
    }
    if(best){e.x=best[0];e.y=best[1];depenetrate(e,r,true);}
  }
}

