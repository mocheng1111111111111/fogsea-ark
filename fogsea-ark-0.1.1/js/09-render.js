'use strict';
/* ---------------- 绘制 ---------------- */
function drawShadow(x,y,rx,a=.32){ctx.fillStyle=`rgba(4,10,14,${a})`;ctx.beginPath();ctx.ellipse(x,y,rx,rx*.5,0,0,TAU);ctx.fill();}
function drawTree(n){
  const[px,py]=proj(n.x,n.y);
  const sway=Math.sin(S.elapsed*1.2+n.sway)*2+(n.shake>0?rand(-3,3):0);
  drawShadow(px,py+2,16*n.s);
  if(!n.alive){ctx.fillStyle='#3d2f1e';ctx.fillRect(px-4,py-7,8,7);
    ctx.fillStyle='#5a4630';ctx.beginPath();ctx.ellipse(px,py-7,5,2.5,0,0,TAU);ctx.fill();return;}
  const s=n.s;
  if(TREES_IM&&TREES_IM.complete&&TREES_IM.naturalWidth>0){
    const v=Math.floor(n.sway/TAU*5)%5,h=64*s,w=h*TREES_FW/TREES_FH;
    ctx.drawImage(TREES_IM,v*TREES_FW,0,TREES_FW,TREES_FH,px+sway-w*TREES_AXS[v],py-h,w,h);
    return;
  }
  ctx.fillStyle='#4a3826';ctx.fillRect(px-3*s,py-20*s,6*s,20*s);
  const L=[[-46,26,'#14524a'],[-34,30,'#1a6355'],[-22,33,'#20705c']];
  for(let i=0;i<3;i++){
    const ly=L[i][0],r=L[i][1];ctx.fillStyle=L[i][2];
    ctx.beginPath();ctx.moveTo(px+sway,py+ly*s-14*s);
    ctx.lineTo(px+r*s+sway*.5,py+ly*s+8*s);ctx.lineTo(px-r*s+sway*.5,py+ly*s+8*s);ctx.closePath();ctx.fill();
  }
  ctx.strokeStyle='rgba(143,227,208,.35)';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(px+sway-2,py-58*s);ctx.lineTo(px-14*s+sway*.5,py-30*s);ctx.stroke();
}
function drawRock(n){
  const[px,py]=proj(n.x,n.y),sh=n.shake>0?rand(-2,2):0;
  drawShadow(px,py+2,15*n.s);
  if(!n.alive){ctx.fillStyle='#5c6a70';
    ctx.beginPath();ctx.ellipse(px-4,py-2,5,3,0,0,TAU);ctx.fill();
    ctx.beginPath();ctx.ellipse(px+5,py-1,4,2.5,0,0,TAU);ctx.fill();return;}
  const s=n.s;
  if(ROCKS_IM&&ROCKS_IM.complete&&ROCKS_IM.naturalWidth>0){
    const v=Math.floor(n.sway/TAU*4)%4,h=26*s,w=h*ROCKS_FW/ROCKS_FH;
    ctx.drawImage(ROCKS_IM,v*ROCKS_FW,0,ROCKS_FW,ROCKS_FH,px+sh-w*ROCKS_AXS[v],py-h,w,h);
    return;
  }
  ctx.fillStyle='#66757c';ctx.beginPath();
  ctx.moveTo(px-16*s+sh,py);ctx.lineTo(px-10*s+sh,py-16*s);ctx.lineTo(px+2*s+sh,py-22*s);
  ctx.lineTo(px+15*s+sh,py-10*s);ctx.lineTo(px+16*s+sh,py);ctx.closePath();ctx.fill();
  ctx.fillStyle='#8b9aa1';ctx.beginPath();
  ctx.moveTo(px-10*s+sh,py-16*s);ctx.lineTo(px+2*s+sh,py-22*s);ctx.lineTo(px+6*s+sh,py-12*s);ctx.lineTo(px-6*s+sh,py-9*s);ctx.closePath();ctx.fill();
}
function drawCrys(n){
  const[px,py]=proj(n.x,n.y),sh=n.shake>0?rand(-2,2):0;
  drawShadow(px,py+2,13*n.s,.25);
  if(!n.alive){ctx.fillStyle='rgba(87,230,255,.25)';ctx.beginPath();ctx.ellipse(px,py-1,7,3,0,0,TAU);ctx.fill();return;}
  const s=n.s,pulse=.7+.3*Math.sin(S.elapsed*2.5+n.sway);
  if(CRYS_IM&&CRYS_IM.complete&&CRYS_IM.naturalWidth>0){
    const v=Math.floor(n.sway/TAU*3)%3,h=34*s,w=h*CRYS_FW/CRYS_FH;
    ctx.drawImage(CRYS_IM,v*CRYS_FW,0,CRYS_FW,CRYS_FH,px+sh-w*CRYS_AXS[v],py-h,w,h);
    ctx.globalAlpha=.22*pulse;ctx.drawImage(GLOW.violet,px-16*s,py-30*s,32*s,32*s);ctx.globalAlpha=1;
    return;
  }
  const sh3=[[-8,-20,5],[2,-30,7],[10,-16,4]];
  for(let i=0;i<3;i++){
    const sx=sh3[i][0],sy=sh3[i][1],w=sh3[i][2];
    const g=ctx.createLinearGradient(px,py+sy*s,px,py);
    g.addColorStop(0,'#bff6ff');g.addColorStop(.5,'#57e6ff');g.addColorStop(1,'#1a7f9e');
    ctx.fillStyle=g;ctx.beginPath();
    ctx.moveTo(px+sx*s+sh,py+sy*s);ctx.lineTo(px+(sx+w)*s+sh,py+sy*s*.35);
    ctx.lineTo(px+sx*s+sh,py+2);ctx.lineTo(px+(sx-w)*s+sh,py+sy*s*.35);ctx.closePath();ctx.fill();
  }
  ctx.fillStyle=`rgba(87,230,255,${.18*pulse})`;ctx.beginPath();ctx.ellipse(px,py-12*s,20*s,14*s,0,0,TAU);ctx.fill();
}
function drawCore(c){
  c=c||core;
  const[px,py]=proj(c.x,c.y),pulse=.8+.2*Math.sin(S.elapsed*2),turn=S.elapsed*.22;
  const deckY=py-8,frontY=deckY+TH;
  drawShadow(px,py+4,TW,.42);
  // 2×2 格的等距投影，底座顶面比地面高 8 像素。
  ctx.fillStyle='#172a31';ctx.beginPath();ctx.moveTo(px-TW,deckY);ctx.lineTo(px,frontY);ctx.lineTo(px,py+TH);ctx.lineTo(px-TW,py);ctx.closePath();ctx.fill();
  ctx.fillStyle='#354b50';ctx.beginPath();ctx.moveTo(px+TW,deckY);ctx.lineTo(px,frontY);ctx.lineTo(px,py+TH);ctx.lineTo(px+TW,py);ctx.closePath();ctx.fill();
  ctx.fillStyle='#53665f';ctx.beginPath();ctx.moveTo(px,deckY-TH);ctx.lineTo(px+TW,deckY);ctx.lineTo(px,frontY);ctx.lineTo(px-TW,deckY);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#b78348';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(px-TW+12,deckY);ctx.lineTo(px,deckY-TH+6);ctx.lineTo(px+TW-12,deckY);ctx.lineTo(px,frontY-6);ctx.closePath();ctx.stroke();
  for(const side of [-1,1]){
    const x=px+side*(TW-12);
    ctx.fillStyle='#d09a54';ctx.beginPath();ctx.moveTo(x,deckY-5);ctx.lineTo(x+9,deckY);ctx.lineTo(x,deckY+5);ctx.lineTo(x-9,deckY);ctx.closePath();ctx.fill();
    ctx.fillStyle='#f1c77c';ctx.beginPath();ctx.arc(x,deckY,1.7,0,TAU);ctx.fill();
  }
  const cs=CORE_IM&&CORE_IM.complete&&CORE_IM.naturalWidth>0;
  const h=CORE_H,w=h*CORE_FW/CORE_FH;
  let ox=px+(CORE_LX-CORE_AX)*w,oy=py-6-h*(1-CORE_LY);
  if(cs){
    ctx.drawImage(CORE_IM,0,0,CORE_FW,CORE_FH,px-w*CORE_AX,deckY+2-h,w,h);
    ctx.globalAlpha=.3+.12*pulse;ctx.drawImage(GLOW.amber,ox-20,oy-20,40,40);ctx.globalAlpha=1;
  }else{
    ox=px;oy=py-84;
    // 灯塔脊柱与环形箍带。
    ctx.fillStyle='#182b31';ctx.beginPath();ctx.moveTo(px-9,deckY);ctx.lineTo(px-7,py-76);ctx.lineTo(px,py-83);ctx.lineTo(px+7,py-76);ctx.lineTo(px+9,deckY);ctx.lineTo(px,deckY+4);ctx.closePath();ctx.fill();
    ctx.fillStyle='#586b63';ctx.beginPath();ctx.moveTo(px-5,deckY-4);ctx.lineTo(px-4,py-73);ctx.lineTo(px,py-78);ctx.lineTo(px+1,deckY-4);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#bb8749';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(px-10,py-59);ctx.lineTo(px+10,py-59);ctx.moveTo(px-9,py-30);ctx.lineTo(px+9,py-30);ctx.stroke();
    ctx.strokeStyle='rgba(242,197,119,.8)';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(px-22,py-57);ctx.lineTo(px+22,py-57);ctx.stroke();
    // 三枚护焰支架围住核心，不遮挡其识别性光源。
    ctx.strokeStyle='#bd8b50';ctx.lineWidth=2.5;ctx.beginPath();
    ctx.moveTo(px-17,py-70);ctx.lineTo(px-11,py-87);ctx.lineTo(px-6,py-90);
    ctx.moveTo(px+17,py-70);ctx.lineTo(px+11,py-87);ctx.lineTo(px+6,py-90);
    ctx.moveTo(px-14,py-76);ctx.lineTo(px+14,py-76);ctx.stroke();
    ctx.fillStyle='#e3b96e';ctx.beginPath();ctx.arc(px-17,py-70,2,0,TAU);ctx.arc(px+17,py-70,2,0,TAU);ctx.fill();
    const g=ctx.createRadialGradient(px,oy,2,px,oy,22);
    g.addColorStop(0,'#fff7dc');g.addColorStop(.34,'#ffd078');g.addColorStop(.72,'#ff9d45');g.addColorStop(1,'rgba(255,138,61,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(px,oy,22*pulse,0,TAU);ctx.fill();
    ctx.fillStyle='#fff0bd';ctx.beginPath();ctx.arc(px,oy,6.5,0,TAU);ctx.fill();
    ctx.strokeStyle=`rgba(255,195,105,${.62*pulse})`;ctx.lineWidth=1.6;
    ctx.beginPath();ctx.ellipse(px,oy,17,5+1.5*Math.sin(S.elapsed*1.4),turn,0,TAU);ctx.stroke();
    ctx.strokeStyle=`rgba(255,232,179,${.42*pulse})`;ctx.lineWidth=1;
    ctx.beginPath();ctx.ellipse(px,oy,11,3, -turn*1.4,0,TAU);ctx.stroke();
  }
  if(c.flash>0){ctx.fillStyle=`rgba(255,77,109,${c.flash})`;ctx.beginPath();ctx.arc(ox,oy,25,0,TAU);ctx.fill();}
  if(c.hp<c.max){
    const w=64,r=clamp(c.hp/c.max,0,1);
    ctx.fillStyle='rgba(7,15,22,.8)';ctx.fillRect(px-w/2,py-124,w,7);
    ctx.fillStyle=r>.35?'#ffb454':'#ff4d6d';ctx.fillRect(px-w/2+1,py-123,(w-2)*r,5);
  }
}
function drawBuild(b,sc=1){
  const[px,py]=proj(b.x,b.y);
  // 世界渲染按 buildScale 缩放；图鉴/拖拽预览传默认 1 不受影响
  ctx.save();ctx.translate(px,py);ctx.scale(sc,sc);ctx.translate(-px,-py);
  drawShadow(px,py+2,20,.3);
  const fl=b.flash>0;
  if(b.type==='wall'){
    if(WALL_IM&&WALL_IM.complete&&WALL_IM.naturalWidth>0){
      const v=((b.x*7+b.y*13)%2+2)%2,h=28,w=54;
      ctx.drawImage(WALL_IM,v*WALL_FW,0,WALL_FW,WALL_FH,px-w/2,py+6-h,w,h);
      if(fl){ctx.fillStyle='rgba(255,240,200,.35)';ctx.fillRect(px-w/2,py+6-h,w,h);}
    }else{
    ctx.fillStyle=fl?'#ffd9a0':'#6b5334';
    ctx.beginPath();ctx.moveTo(px-24,py-4);ctx.lineTo(px,py-16);ctx.lineTo(px+24,py-4);ctx.lineTo(px+24,py+6);ctx.lineTo(px,py+18);ctx.lineTo(px-24,py+6);ctx.closePath();ctx.fill();
    ctx.fillStyle=fl?'#ffe8c4':'#8a6d44';
    ctx.beginPath();ctx.moveTo(px-24,py-4);ctx.lineTo(px,py-16);ctx.lineTo(px+24,py-4);ctx.lineTo(px,py+8);ctx.closePath();ctx.fill();
    ctx.strokeStyle='rgba(40,28,14,.6)';ctx.lineWidth=1.5;
    for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(px+i*9,py-10+Math.abs(i)*4);ctx.lineTo(px+i*9,py+12+Math.abs(i)*2);ctx.stroke();}
    }
  }else if(b.type==='tower'){
    const wood=fl?'#ffe8c4':'#705238',woodHi=fl?'#fff2d8':'#a17b4c',dark='#3b3026';
    const sp=proj(Math.cos(b.ang),Math.sin(b.ang)),m=Math.hypot(sp[0],sp[1])||1,dx=sp[0]/m,dy=sp[1]/m,tf=sp[0]<0?-1:1;
    const h=64,w=h*TOWER_FW/TOWER_FH;
    let hx=px,hy=py-34;
    if(TOWER_IM&&TOWER_IM.complete&&TOWER_IM.naturalWidth>0){
      hx=px+tf*(TOWER_HX-TOWER_AX)*w;hy=py+4-h*(1-TOWER_HY);
      ctx.save();ctx.translate(px,py+4);ctx.scale(tf,1);
      ctx.drawImage(TOWER_IM,0,0,TOWER_FW,TOWER_FH,-w*TOWER_AX,-h,w,h);
      ctx.restore();
      if(fl){ctx.fillStyle='rgba(255,240,200,.3)';ctx.fillRect(px-w/2,py+4-h,w,h);}
    }else{
    // 四脚瞭望架：外轮廓保持在原箭塔范围内，斜撑提升轮廓识别度。
    ctx.fillStyle='#263b3b';ctx.beginPath();ctx.moveTo(px-22,py-3);ctx.lineTo(px,py-14);ctx.lineTo(px+22,py-3);ctx.lineTo(px,py+7);ctx.closePath();ctx.fill();
    ctx.fillStyle='#637367';ctx.beginPath();ctx.moveTo(px-19,py-4);ctx.lineTo(px,py-13);ctx.lineTo(px+19,py-4);ctx.lineTo(px,py+2);ctx.closePath();ctx.fill();
    ctx.strokeStyle=dark;ctx.lineWidth=5;ctx.lineCap='square';ctx.beginPath();
    ctx.moveTo(px-10,py-7);ctx.lineTo(px-5,py-32);ctx.lineTo(px+5,py-32);ctx.lineTo(px+10,py-7);
    ctx.moveTo(px-8,py-20);ctx.lineTo(px+7,py-10);ctx.moveTo(px+8,py-20);ctx.lineTo(px-7,py-10);ctx.stroke();
    ctx.strokeStyle=wood;ctx.lineWidth=3;ctx.beginPath();
    ctx.moveTo(px-10,py-7);ctx.lineTo(px-5,py-32);ctx.lineTo(px+5,py-32);ctx.lineTo(px+10,py-7);
    ctx.moveTo(px-8,py-20);ctx.lineTo(px+7,py-10);ctx.moveTo(px+8,py-20);ctx.lineTo(px-7,py-10);ctx.stroke();
    ctx.fillStyle=woodHi;ctx.beginPath();ctx.moveTo(px-18,py-31);ctx.lineTo(px-7,py-39);ctx.lineTo(px+9,py-39);ctx.lineTo(px+18,py-31);ctx.lineTo(px+13,py-24);ctx.lineTo(px-13,py-24);ctx.closePath();ctx.fill();
    ctx.fillStyle=dark;ctx.fillRect(px-14,py-25,28,3);
    ctx.strokeStyle='rgba(232,193,124,.75)';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(px-16,py-31);ctx.lineTo(px+15,py-31);ctx.stroke();
    }
    // 弓弦与箭矢从紫衣射手手中指向 b.ang 目标。
    ctx.strokeStyle='#d5b47d';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(hx-dy*4,hy+dx*4);ctx.lineTo(hx+dy*4,hy-dx*4);ctx.stroke();
    ctx.strokeStyle=fl?'#fff2d8':'#e8d9b0';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(hx-dx*2,hy-dy*2);ctx.lineTo(hx+dx*6,hy+dy*6);ctx.stroke();
    ctx.fillStyle=fl?'#fff2d8':'#d8c08b';ctx.beginPath();ctx.moveTo(hx+dx*7.5,hy+dy*7.5);ctx.lineTo(hx+dx*4.5+dy*1,hy+dy*4.5-dx*1);ctx.lineTo(hx+dx*4.5-dy*1,hy+dy*4.5+dx*1);ctx.closePath();ctx.fill();
    if(fl){ctx.fillStyle='rgba(255,240,200,.9)';ctx.beginPath();ctx.arc(hx+dx*8,hy+dy*8,2,0,TAU);ctx.fill();}
    ctx.lineCap='butt';
  }else if(b.type==='totem'){
    ctx.fillStyle='#3d4a44';ctx.fillRect(px-3,py-26,6,26);
    const p=.7+.3*Math.sin(b.pulse*3),g=ctx.createRadialGradient(px,py-34,1,px,py-34,12);
    g.addColorStop(0,'#d6ffe2');g.addColorStop(.5,'#6fe08a');g.addColorStop(1,'rgba(111,224,138,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(px,py-34,12*p,0,TAU);ctx.fill();
    ctx.strokeStyle='rgba(111,224,138,.5)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.ellipse(px,py-34,9,4,b.pulse,0,TAU);ctx.stroke();
  }else if(b.type==='manawell'){
    ctx.fillStyle='#243b4a';
    ctx.beginPath();ctx.ellipse(px,py-4,18,9,0,0,TAU);ctx.fill();
    ctx.fillStyle='#162a36';
    ctx.beginPath();ctx.ellipse(px,py-8,14,7,0,0,TAU);ctx.fill();
    const p=.7+.3*Math.sin(b.pulse*3),g=ctx.createRadialGradient(px,py-14,1,px,py-14,18);
    g.addColorStop(0,'#dffaff');g.addColorStop(.35,'#57e6ff');g.addColorStop(1,'rgba(87,230,255,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(px,py-14,18*p,0,TAU);ctx.fill();
    ctx.strokeStyle='rgba(87,230,255,.55)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.ellipse(px,py-14,12,5,b.pulse,0,TAU);ctx.stroke();
  }else{
    ctx.fillStyle='#2c3e46';
    ctx.beginPath();ctx.moveTo(px-15,py-6);ctx.lineTo(px,py-14);ctx.lineTo(px+15,py-6);ctx.lineTo(px,py+2);ctx.closePath();ctx.fill();
    const sp=proj(Math.cos(b.ang),Math.sin(b.ang)),m=Math.hypot(sp[0],sp[1])||1,dx=sp[0]/m,dy=sp[1]/m;
    ctx.strokeStyle='#57e6ff';ctx.lineWidth=5;
    ctx.beginPath();ctx.moveTo(px,py-16);ctx.lineTo(px+dx*16,py-16+dy*16);ctx.stroke();
    const p=.7+.3*Math.sin(b.pulse*4);
    ctx.fillStyle=`rgba(87,230,255,${.8*p})`;ctx.beginPath();ctx.arc(px,py-16,5,0,TAU);ctx.fill();
  }
  if(b.hp<b.max&&b.max>1){
    const w=34,r=clamp(b.hp/b.max,0,1),barY=b.type==='tower'?py-72:py-46;
    ctx.fillStyle='rgba(7,15,22,.8)';ctx.fillRect(px-w/2,barY,w,5);
    ctx.fillStyle=r>.4?'#8fe3d0':'#ff4d6d';ctx.fillRect(px-w/2+1,barY+1,(w-2)*r,3);
  }
  ctx.restore();
}
const KEEPER_IM=typeof Image!=='undefined'?new Image():null;
if(KEEPER_IM)KEEPER_IM.src='assets/watcher_slash.png';
const KEEPER_FW=409,KEEPER_FH=308,KEEPER_AXS=[.4499,.2249,.4988,.4499,.4988,.4694],KEEPER_ORD=[0,1,2,3,5,4];
const CORE_IM=typeof Image!=='undefined'?new Image():null;
if(CORE_IM)CORE_IM.src='assets/core_lighthouse.png';
const CORE_FW=648,CORE_FH=707,CORE_AX=.4985,CORE_H=104,CORE_LX=.586,CORE_LY=.205;
const TREES_IM=typeof Image!=='undefined'?new Image():null;
if(TREES_IM)TREES_IM.src='assets/night_trees.png';
const TREES_FW=358,TREES_FH=752,TREES_AXS=[.4972,.486,.5,.4525,.4525];
const ROCKS_IM=typeof Image!=='undefined'?new Image():null;
if(ROCKS_IM)ROCKS_IM.src='assets/night_rocks.png';
const ROCKS_FW=366,ROCKS_FH=406,ROCKS_AXS=[.5082,.5,.5,.4918];
const CRYS_IM=typeof Image!=='undefined'?new Image():null;
if(CRYS_IM)CRYS_IM.src='assets/night_crystals.png';
const CRYS_FW=420,CRYS_FH=573,CRYS_AXS=[.5,.5,.5];
const WALL_IM=typeof Image!=='undefined'?new Image():null;
if(WALL_IM)WALL_IM.src='assets/night_walls.png';
const WALL_FW=706,WALL_FH=198,WALL_AXS=[.4986,.5];
const TOWER_IM=typeof Image!=='undefined'?new Image():null;
if(TOWER_IM)TOWER_IM.src='assets/night_tower.png';
const TOWER_FW=286,TOWER_FH=790,TOWER_AX=.4965,TOWER_HX=.612,TOWER_HY=.215;
function drawPlayer(p){
  p=p||P;if(p.downed)return;
  const[px,py]=proj(p.x,p.y),bob=p.moving?Math.sin(p.anim)*2:Math.sin(S.elapsed*2);
  const sp=proj(Math.cos(p.face),Math.sin(p.face)),flip=sp[0]<0?-1:1;
  drawShadow(px,py+2,13,.35);
  const blink=p.ifr>0&&Math.floor(S.elapsed*16)%2===0;
  ctx.save();ctx.translate(px,py+bob);ctx.scale(flip,1);
  if(blink)ctx.globalAlpha=.45;
  const sl=KEEPER_IM&&KEEPER_IM.complete&&KEEPER_IM.naturalWidth>0;
  if(sl){
    const fi=p.swingT>0?1+Math.min(4,Math.floor((1-p.swingT/.18)*5)):0;
    const src=KEEPER_ORD[fi];
    const h=62,w=h*KEEPER_FW/KEEPER_FH;
    ctx.drawImage(KEEPER_IM,src*KEEPER_FW,0,KEEPER_FW,KEEPER_FH,-w*KEEPER_AXS[src],-h,w,h);
  }else{
    ctx.lineJoin='round';ctx.lineCap='round';
    // 背后剑鞘
    ctx.strokeStyle='#4a3325';ctx.lineWidth=4;
    ctx.beginPath();ctx.moveTo(4.4,-13.5);ctx.lineTo(11.8,-0.6);ctx.stroke();
    ctx.strokeStyle='#8b939f';ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(11.0,-2.4);ctx.lineTo(12.3,-0.4);ctx.stroke();
    // 远侧手臂（提灯手）
    ctx.strokeStyle='#4b5464';ctx.lineWidth=5.4;
    ctx.beginPath();ctx.moveTo(-7.4,-26.8);ctx.lineTo(-9.4,-22.2);ctx.stroke();
    ctx.strokeStyle='#5a3f2e';ctx.lineWidth=4.2;
    ctx.beginPath();ctx.moveTo(-7.4,-26.8);ctx.lineTo(-9.4,-22.2);ctx.stroke();
    ctx.strokeStyle='#4b5464';ctx.lineWidth=4.4;
    ctx.beginPath();ctx.moveTo(-9.4,-22.2);ctx.lineTo(-9.6,-18.8);ctx.stroke();
    ctx.strokeStyle='#a9b1be';ctx.lineWidth=3.2;
    ctx.beginPath();ctx.moveTo(-9.4,-22.2);ctx.lineTo(-9.6,-18.8);ctx.stroke();
    ctx.fillStyle='#b3bcc9';ctx.beginPath();ctx.arc(-9.7,-17.9,2.1,0,TAU);ctx.fill();
    ctx.strokeStyle='#4b5464';ctx.lineWidth=.8;ctx.stroke();
    // 双腿：棕裤 + 银胫甲
    const leg=(x,shade)=>{
      ctx.fillStyle=shade?'#523a2a':'#5e4331';
      ctx.beginPath();ctx.moveTo(x-2.3,-16);ctx.lineTo(x+2.3,-16);ctx.lineTo(x+2.4,-7.6);ctx.lineTo(x-2.4,-7.6);ctx.closePath();ctx.fill();
      ctx.fillStyle=shade?'#9aa3b1':'#b6bec9';
      ctx.beginPath();ctx.moveTo(x-2.5,-7.6);ctx.lineTo(x+2.5,-7.6);ctx.lineTo(x+2.7,-1);ctx.lineTo(x-2.7,-1);ctx.closePath();ctx.fill();
      ctx.strokeStyle=shade?'#4f5765':'#59616f';ctx.lineWidth=.8;ctx.stroke();
      ctx.strokeStyle='#dde2ea';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(x-2.2,-6.4);ctx.lineTo(x+2.2,-6.4);ctx.stroke();
      ctx.fillStyle=shade?'#4b5361':'#5a6270';
      ctx.beginPath();ctx.ellipse(x+1.0,-0.9,3.6,1.9,0,0,TAU);ctx.fill();
      ctx.strokeStyle='#39404b';ctx.lineWidth=.7;ctx.stroke();
    };
    leg(-3.8,true);leg(2.6,false);
    // 皮革战裙与银护腿板
    ctx.fillStyle='#6b4a33';
    ctx.beginPath();ctx.moveTo(-6.4,-15.4);ctx.lineTo(6.4,-15.4);ctx.lineTo(5,-10);ctx.lineTo(-5,-10);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#4a3325';ctx.lineWidth=.8;ctx.stroke();
    ctx.fillStyle='#a9b2c0';
    ctx.beginPath();ctx.moveTo(-6.2,-13.8);ctx.lineTo(-3.6,-13.6);ctx.lineTo(-4,-10.4);ctx.lineTo(-6.2,-10.8);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(6.2,-13.8);ctx.lineTo(3.6,-13.6);ctx.lineTo(4,-10.4);ctx.lineTo(6.2,-10.8);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#4b5464';ctx.lineWidth=.7;ctx.stroke();
    // 颈
    ctx.fillStyle='#e0ac9b';ctx.fillRect(-0.9,-31.2,3.6,2.8);
    // 胸甲
    const g=ctx.createLinearGradient(0,-29,0,-16);
    g.addColorStop(0,'#c6cdd9');g.addColorStop(.55,'#9aa4b3');g.addColorStop(1,'#7e8795');
    ctx.fillStyle=g;ctx.beginPath();
    ctx.moveTo(-8.2,-28.6);ctx.quadraticCurveTo(0,-30.6,8.2,-28.6);ctx.lineTo(6.4,-16.2);ctx.lineTo(-6.4,-16.2);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#414a58';ctx.lineWidth=1;ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.22)';
    ctx.beginPath();ctx.moveTo(-6.4,-27.2);ctx.lineTo(-1.4,-28.4);ctx.lineTo(-0.6,-17.8);ctx.lineTo(-4.8,-18.4);ctx.closePath();ctx.fill();
    ctx.strokeStyle='rgba(52,60,74,.5)';ctx.lineWidth=.8;
    ctx.beginPath();ctx.moveTo(1.3,-29);ctx.lineTo(1.5,-16.4);ctx.stroke();
    ctx.strokeStyle='rgba(52,60,74,.45)';ctx.lineWidth=.7;
    ctx.beginPath();ctx.moveTo(-7.4,-22.4);ctx.lineTo(7.4,-22.4);ctx.stroke();
    // 领口与肩带
    ctx.fillStyle='#3c4553';
    ctx.beginPath();ctx.moveTo(-3.6,-29.4);ctx.lineTo(3.6,-29.4);ctx.lineTo(2.6,-26.6);ctx.lineTo(-2.6,-26.6);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#4a3325';ctx.lineWidth=2.6;
    ctx.beginPath();ctx.moveTo(-7.6,-27.8);ctx.lineTo(6.6,-20.2);ctx.stroke();
    ctx.strokeStyle='#5c4130';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(-7.6,-27.8);ctx.lineTo(6.6,-20.2);ctx.stroke();
    ctx.fillStyle='#d9a856';ctx.fillRect(1.2,-24,2.5,2.9);
    ctx.fillStyle='#8a6b3c';ctx.fillRect(2.2,-23.8,.7,2.5);
    // 腰带
    ctx.fillStyle='#5c4130';ctx.fillRect(-6.8,-17.2,13.6,3.2);
    ctx.fillStyle='#d9a856';ctx.fillRect(-0.9,-16.9,3.6,2.7);
    ctx.fillStyle='#8a6b3c';ctx.fillRect(0.6,-16.6,.7,2.1);
    // 远侧肩甲
    ctx.fillStyle='#8e97a6';ctx.beginPath();ctx.ellipse(-8,-28.2,4.6,3.4,0,0,TAU);ctx.fill();
    ctx.strokeStyle='#4b5464';ctx.lineWidth=.9;ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,.4)';ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(-8.6,-28.8,2.6,3.4,5.2);ctx.stroke();
    // 后发
    ctx.fillStyle='#e9ecf5';ctx.beginPath();ctx.arc(0.2,-39.2,10.6,0,TAU);ctx.fill();
    ctx.beginPath();ctx.moveTo(-10.6,-38.5);ctx.lineTo(-12.2,-34.6);ctx.lineTo(-9.6,-34.2);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(10.6,-38.6);ctx.lineTo(12.2,-34.8);ctx.lineTo(9.8,-34.4);ctx.closePath();ctx.fill();
    // 脸与耳
    ctx.fillStyle='#f6d5c0';ctx.beginPath();ctx.ellipse(1.0,-36.6,8.2,7.6,0,0,TAU);ctx.fill();
    ctx.beginPath();ctx.ellipse(8.8,-35.4,1.6,2.2,0.2,0,TAU);ctx.fill();
    ctx.strokeStyle='rgba(190,140,120,.6)';ctx.lineWidth=.7;
    ctx.beginPath();ctx.arc(8.8,-35.4,1,3.6,5.4);ctx.stroke();
    // 尖刺刘海
    ctx.fillStyle='#f5f7fc';ctx.beginPath();
    ctx.moveTo(-9.6,-37.2);ctx.lineTo(-10.2,-42.4);ctx.lineTo(-7.6,-40.6);ctx.lineTo(-6.4,-46.2);
    ctx.lineTo(-3.6,-43.4);ctx.lineTo(-1.2,-48.6);ctx.lineTo(1.4,-44.6);ctx.lineTo(4.2,-48.2);
    ctx.lineTo(6.4,-43.6);ctx.lineTo(9.0,-46.4);ctx.lineTo(10.6,-41.4);ctx.lineTo(11.4,-37.0);
    ctx.lineTo(9.4,-38.6);ctx.lineTo(8.4,-34.8);ctx.lineTo(6.8,-38.8);ctx.lineTo(5.0,-36.2);
    ctx.lineTo(3.4,-40.0);ctx.lineTo(1.0,-36.6);ctx.lineTo(-1.4,-40.2);ctx.lineTo(-3.4,-36.4);
    ctx.lineTo(-5.6,-40.4);ctx.lineTo(-7.4,-37.0);ctx.lineTo(-9.6,-39.2);ctx.closePath();ctx.fill();
    ctx.strokeStyle='rgba(150,158,182,.55)';ctx.lineWidth=.7;
    ctx.beginPath();ctx.moveTo(-1.4,-47.6);ctx.lineTo(-1.1,-41.4);ctx.moveTo(2.0,-44.4);ctx.lineTo(2.2,-39.6);
    ctx.moveTo(7.6,-44.6);ctx.lineTo(6.9,-39.4);ctx.stroke();
    // 紫瞳大眼
    ctx.fillStyle='#332e4d';
    ctx.beginPath();ctx.ellipse(-2.2,-35,2.7,3.2,0,0,TAU);ctx.fill();
    ctx.beginPath();ctx.ellipse(5.0,-35.2,2.9,3.4,0,0,TAU);ctx.fill();
    ctx.fillStyle='#6d58cf';
    ctx.beginPath();ctx.ellipse(-2.2,-34.9,2.1,2.6,0,0,TAU);ctx.fill();
    ctx.beginPath();ctx.ellipse(5.0,-35.1,2.3,2.8,0,0,TAU);ctx.fill();
    ctx.fillStyle='#241f3a';
    ctx.beginPath();ctx.ellipse(-2.2,-34.7,1,1.5,0,0,TAU);ctx.fill();
    ctx.beginPath();ctx.ellipse(5.0,-34.9,1.1,1.6,0,0,TAU);ctx.fill();
    ctx.fillStyle='#fff';
    ctx.beginPath();ctx.arc(-2.9,-36, .8,0,TAU);ctx.arc(4.3,-36.2,.85,0,TAU);ctx.fill();
    // 腮红与嘴
    ctx.fillStyle='rgba(240,168,162,.5)';
    ctx.beginPath();ctx.ellipse(-6.5,-32.6,1.9,1.2,0,0,TAU);ctx.ellipse(9.0,-32.4,1.9,1.2,0,0,TAU);ctx.fill();
    ctx.strokeStyle='#a46a62';ctx.lineWidth=.8;
    ctx.beginPath();ctx.moveTo(2.8,-30.4);ctx.quadraticCurveTo(3.6,-29.9,4.4,-30.5);ctx.stroke();
    // 近侧肩甲
    const pg=ctx.createLinearGradient(0,-32,0,-25);
    pg.addColorStop(0,'#d3d9e3');pg.addColorStop(1,'#a7b0be');
    ctx.fillStyle=pg;ctx.beginPath();ctx.ellipse(8.2,-28.6,5.1,3.7,0,0,TAU);ctx.fill();
    ctx.strokeStyle='#414a58';ctx.lineWidth=.9;ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(7.6,-29.2,2.8,3.4,5.2);ctx.stroke();
    // 举剑手臂
    ctx.strokeStyle='#4b5464';ctx.lineWidth=5.4;
    ctx.beginPath();ctx.moveTo(7.4,-27.2);ctx.lineTo(10.2,-31.4);ctx.stroke();
    ctx.strokeStyle='#5e4331';ctx.lineWidth=4.2;
    ctx.beginPath();ctx.moveTo(7.4,-27.2);ctx.lineTo(10.2,-31.4);ctx.stroke();
    ctx.strokeStyle='#4b5464';ctx.lineWidth=4.4;
    ctx.beginPath();ctx.moveTo(10.2,-31.4);ctx.lineTo(12.8,-35.4);ctx.stroke();
    ctx.strokeStyle='#b3bcc9';ctx.lineWidth=3.2;
    ctx.beginPath();ctx.moveTo(10.2,-31.4);ctx.lineTo(12.8,-35.4);ctx.stroke();
    // 剑柄、护手与剑身
    ctx.strokeStyle='#4a3325';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(13.4,-32.8);ctx.lineTo(12.2,-38.2);ctx.stroke();
    ctx.fillStyle='#c9d0da';ctx.beginPath();ctx.arc(13.6,-32.4,1.2,0,TAU);ctx.fill();
    ctx.strokeStyle='#8f97a4';ctx.lineWidth=2.6;
    ctx.beginPath();ctx.moveTo(8.2,-37.2);ctx.lineTo(16.8,-38.8);ctx.stroke();
    ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(8.2,-37.2);ctx.lineTo(7.8,-39.2);ctx.moveTo(16.8,-38.8);ctx.lineTo(17.2,-40.8);ctx.stroke();
    const bld=ctx.createLinearGradient(10,-58,13,-38);
    bld.addColorStop(0,'#ffffff');bld.addColorStop(.5,'#dfe5ee');bld.addColorStop(1,'#b9c2cf');
    ctx.fillStyle=bld;ctx.beginPath();
    ctx.moveTo(10.72,-38.73);ctx.lineTo(14.28,-39.27);ctx.lineTo(10.0,-55.6);ctx.lineTo(9.6,-57.6);ctx.lineTo(9.2,-55.4);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#6a7383';ctx.lineWidth=.8;ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,.85)';ctx.lineWidth=.8;
    ctx.beginPath();ctx.moveTo(12.6,-40.6);ctx.lineTo(10.3,-54.6);ctx.stroke();
    // 持剑手
    ctx.fillStyle='#b3bcc9';ctx.beginPath();ctx.arc(12.9,-35.6,2.2,0,TAU);ctx.fill();
    ctx.strokeStyle='#4b5464';ctx.lineWidth=.8;ctx.stroke();
  }
  ctx.restore();
}
function drawFoe(f){
  const[px,py]=proj(f.x,f.y),bob=Math.sin(f.anim)*2,fl=f.flash>0;
  // 视觉倍率独立于碰撞（碰撞由 colScale 封顶）；旧存档/图鉴无 vs 时回退由碰撞半径推导
  const vs=f.vs||f.r/FOES[f.type].r;
  const vr=FOES[f.type].r*vs;
  drawShadow(px,py+2,vr*34,.3);
  ctx.save();ctx.translate(px,py+bob*.4);ctx.scale(vs,vs);
  const bc=fl?'#ffffff':f.elite?'#c084ff':'#8b5fd6',dc=fl?'#ffffff':'#5a3a9e';
  if(f.type==='crawler'){
    ctx.fillStyle=dc;
    for(let i=0;i<4;i++){const a=f.anim+i*1.6;ctx.beginPath();ctx.ellipse(Math.cos(a)*10,-2+Math.sin(a)*2,3,4,0,0,TAU);ctx.fill();}
    const g=ctx.createLinearGradient(0,-20,0,0);g.addColorStop(0,bc);g.addColorStop(1,dc);
    ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,-9+bob*.4,13,10+bob*.3,0,0,TAU);ctx.fill();
    ctx.fillStyle='#ff4d6d';ctx.beginPath();ctx.arc(-4,-11,2.2,0,TAU);ctx.arc(4,-11,2.2,0,TAU);ctx.fill();
    ctx.fillStyle='rgba(255,77,109,.4)';ctx.beginPath();ctx.arc(-4,-11,4,0,TAU);ctx.arc(4,-11,4,0,TAU);ctx.fill();
    if(f.horn){ctx.fillStyle=fl?'#fff':'#d9c4ff';
      for(const sd of[-1,1]){ctx.beginPath();ctx.moveTo(sd*3,-16);
        ctx.quadraticCurveTo(sd*8,-19,sd*6.5,-26);
        ctx.quadraticCurveTo(sd*3,-21,sd*1.5,-17);ctx.closePath();ctx.fill();}}
  }else if(f.type==='spitter'){
    const hv=Math.sin(f.anim*.7)*3;
    ctx.strokeStyle=dc;ctx.lineWidth=2;
    for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo((i-1)*5,-8+hv);
      ctx.quadraticCurveTo((i-1)*8+Math.sin(f.anim+i)*4,2,(i-1)*6,6);ctx.stroke();}
    const g=ctx.createRadialGradient(-3,-16+hv,2,0,-13+hv,12);
    g.addColorStop(0,fl?'#fff':'#c9a8ff');g.addColorStop(1,dc);
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,-13+hv,10,0,TAU);ctx.fill();
    ctx.fillStyle='#2c1650';ctx.beginPath();ctx.arc(0,-11+hv,4,0,TAU);ctx.fill();
    ctx.fillStyle='#ff4d6d';ctx.beginPath();ctx.arc(0,-11+hv,2,0,TAU);ctx.fill();
    if(f.horn){ctx.fillStyle=fl?'#fff':'#d9c4ff';
      for(const sd of[-1,1]){ctx.beginPath();ctx.moveTo(sd*3,-20+hv);
        ctx.quadraticCurveTo(sd*8,-23+hv,sd*6.5,-30+hv);
        ctx.quadraticCurveTo(sd*3,-25+hv,sd*1.5,-21+hv);ctx.closePath();ctx.fill();}}
  }else if(f.type==='brute'){
    const g=ctx.createLinearGradient(0,-34,0,0);g.addColorStop(0,bc);g.addColorStop(1,dc);
    ctx.fillStyle=g;ctx.beginPath();
    ctx.moveTo(-18,0);ctx.quadraticCurveTo(-22,-26,-10,-32);ctx.quadraticCurveTo(0,-38,10,-32);
    ctx.quadraticCurveTo(22,-26,18,0);ctx.closePath();ctx.fill();
    ctx.fillStyle=fl?'#fff':'#d9c4ff';
    ctx.beginPath();ctx.moveTo(-10,-30);ctx.lineTo(-16,-42);ctx.lineTo(-6,-33);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(10,-30);ctx.lineTo(16,-42);ctx.lineTo(6,-33);ctx.closePath();ctx.fill();
    ctx.fillStyle='#ff4d6d';ctx.beginPath();ctx.arc(-6,-24,2.8,0,TAU);ctx.arc(6,-24,2.8,0,TAU);ctx.fill();
    ctx.strokeStyle=dc;ctx.lineWidth=5;
    ctx.beginPath();ctx.moveTo(-18,-14);ctx.lineTo(-24,-2+Math.sin(f.anim)*3);ctx.stroke();
    ctx.beginPath();ctx.moveTo(18,-14);ctx.lineTo(24,-2-Math.sin(f.anim)*3);ctx.stroke();
  }else{
    const p=.85+.15*Math.sin(f.anim*.5);
    ctx.fillStyle='rgba(160,107,255,.15)';ctx.beginPath();ctx.ellipse(0,-20,44*p,30*p,0,0,TAU);ctx.fill();
    const g=ctx.createLinearGradient(0,-64,0,0);g.addColorStop(0,fl?'#fff':'#b06bff');g.addColorStop(1,'#3d2078');
    ctx.fillStyle=g;ctx.beginPath();
    ctx.moveTo(-34,0);ctx.quadraticCurveTo(-42,-46,-20,-58);ctx.quadraticCurveTo(0,-70,20,-58);
    ctx.quadraticCurveTo(42,-46,34,0);ctx.closePath();ctx.fill();
    ctx.fillStyle=fl?'#fff':'#d9c4ff';
    for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(i*12-4,-58+Math.abs(i)*4);
      ctx.lineTo(i*12,-74+Math.abs(i)*5);ctx.lineTo(i*12+4,-58+Math.abs(i)*4);ctx.closePath();ctx.fill();}
    for(const[ex,ey]of[[-13,-42],[0,-36],[13,-42]]){
      ctx.fillStyle='rgba(255,77,109,.35)';ctx.beginPath();ctx.arc(ex,ey,7,0,TAU);ctx.fill();
      ctx.fillStyle='#ff4d6d';ctx.beginPath();ctx.arc(ex,ey,3.5,0,TAU);ctx.fill();
    }
  }
  ctx.restore();
  if(f.elite&&!f.boss){ctx.strokeStyle='rgba(255,180,84,.8)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.ellipse(px,py+bob*.4-10*vs,vr*40,vr*28,0,0,TAU);ctx.stroke();}
  if(f.hp<f.max&&!f.boss){
    const w=26,r=clamp(f.hp/f.max,0,1);
    ctx.fillStyle='rgba(7,15,22,.75)';ctx.fillRect(px-w/2,py-vr*52-8,w,4);
    ctx.fillStyle='#c9a8ff';ctx.fillRect(px-w/2+.5,py-vr*52-7.5,(w-1)*r,3);
  }
  if(f.boss&&f.hp<f.max){
    const w=90,r=clamp(f.hp/f.max,0,1);
    ctx.fillStyle='rgba(7,15,22,.85)';ctx.fillRect(px-w/2,py-92*vs,w,8);
    ctx.fillStyle='#ff4d6d';ctx.fillRect(px-w/2+1,py-92*vs+1,(w-2)*r,6);
    ctx.strokeStyle='rgba(160,107,255,.6)';ctx.lineWidth=1;ctx.strokeRect(px-w/2,py-92*vs,w,8);
  }
  const marks=[];
  if((f.burnT||0)>0)marks.push('#ff7a45');
  if((f.chillT||0)>0)marks.push('#6fd8ff');
  if((f.freezeT||0)>0)marks.push('#dffaff');
  if((f.markT||0)>0)marks.push('#b48cff');
  if(marks.length){
    const y=py-(f.boss?106*vs:vr*52+18*vs);
    let x=px-(marks.length-1)*5;
    for(const col of marks){
      ctx.fillStyle=col;ctx.beginPath();ctx.arc(x,y,3,0,TAU);ctx.fill();
      ctx.strokeStyle='rgba(5,10,16,.8)';ctx.lineWidth=1;ctx.stroke();
      x+=10;
    }
  }
}
function drawPickup(p){
  const[px,py]=proj(p.x,p.y),bob=Math.sin(p.bob)*2;
  ctx.globalAlpha=p.life<3?p.life/3:1;drawShadow(px,py+1,5,.2);
  if(p.type==='wood'){ctx.fillStyle='#8a6d44';ctx.fillRect(px-5,py-8+bob,10,5);
    ctx.fillStyle='#e0b070';ctx.beginPath();ctx.ellipse(px+5,py-5.5+bob,2,2.5,0,0,TAU);ctx.fill();}
  else if(p.type==='stone'){ctx.fillStyle='#b9c4c9';ctx.beginPath();
    ctx.moveTo(px-5,py-3+bob);ctx.lineTo(px-2,py-9+bob);ctx.lineTo(px+4,py-7+bob);ctx.lineTo(px+5,py-3+bob);ctx.closePath();ctx.fill();}
  else{ctx.drawImage(GLOW.cyan,px-8,py-14+bob,16,16);ctx.fillStyle='#57e6ff';
    ctx.beginPath();ctx.moveTo(px,py-12+bob);ctx.lineTo(px+3.5,py-6+bob);ctx.lineTo(px,py-1+bob);ctx.lineTo(px-3.5,py-6+bob);ctx.closePath();ctx.fill();}
  ctx.globalAlpha=1;
}
const dlPool=[],dlActive=[];let dlN=0;
function dlPush(d,k,o){let it=dlPool[dlN];if(!it){it={d:0,k:0,o:null};dlPool[dlN]=it;}it.d=d;it.k=k;it.o=o;dlN++;}
function drawGhost(){
  const a=aimDef();if(!a||S.mode!=='play')return;
  const def=a.def;
  if(def.target==='self'||def.target==='pick')return;
  if(def.kind==='build'){
    const[tx,ty]=ghostTile(),chk=placeCheck(def,tx,ty);
    const pp=proj(P.x,P.y);
    ctx.strokeStyle='rgba(255,255,255,.16)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.ellipse(pp[0],pp[1],5.5*TW/2,5.5*TH/2,0,0,TAU);ctx.stroke();
    const c=proj(tx,ty);
    ctx.fillStyle=chk.ok?'rgba(255,255,255,.3)':'rgba(255,77,109,.32)';
    ctx.beginPath();ctx.moveTo(c[0],c[1]-TH/2);ctx.lineTo(c[0]+TW/2,c[1]);ctx.lineTo(c[0],c[1]+TH/2);ctx.lineTo(c[0]-TW/2,c[1]);ctx.closePath();ctx.fill();
    ctx.strokeStyle=chk.ok?'rgba(255,255,255,.95)':'rgba(255,77,109,.95)';ctx.lineWidth=2;ctx.stroke();
    ctx.globalAlpha=.55;
    drawBuild({type:def.build,x:tx,y:ty,hp:1,max:1,flash:0,pulse:S.elapsed,ang:0,r:.4},TUNE.world.buildScale);
    ctx.globalAlpha=1;
    if(!chk.ok){
      ctx.font='700 12px "Noto Sans SC",sans-serif';ctx.textAlign='center';
      ctx.strokeStyle='rgba(5,10,16,.9)';ctx.lineWidth=3;ctx.strokeText(chk.msg,c[0],c[1]-52);
      ctx.fillStyle='#ff8fa3';ctx.fillText(chk.msg,c[0],c[1]-52);
    }
  }else{
    const wx=mouseWorld[0],wy=mouseWorld[1],chk=placeCheck(def,wx,wy);
    const c=proj(wx,wy),R=def.radius;
    ctx.fillStyle=chk.ok?'rgba(255,255,255,.22)':'rgba(255,77,109,.26)';
    ctx.beginPath();ctx.ellipse(c[0],c[1],R*TW/2,R*TH/2,0,0,TAU);ctx.fill();
    ctx.strokeStyle=chk.ok?'rgba(255,255,255,.95)':'rgba(255,77,109,.95)';ctx.lineWidth=2;ctx.stroke();
    ctx.globalAlpha=.5;ctx.drawImage(chk.ok?GLOW.white:GLOW.violet,c[0]-40,c[1]-40,80,80);ctx.globalAlpha=1;
  }
}
function drawDragArrow(){
  if(S.mode!=='play'||!S.dragMoved||!S.dragUid)return;
  const a=aimDef();if(!a)return;
  const def=a.def;
  if(def.target==='self'||def.target==='pick')return;
  const card=document.querySelector(`.hcard[data-uid="${S.dragUid}"]`);if(!card)return;
  const r=card.getBoundingClientRect(),cr=cv.getBoundingClientRect();
  const sx=r.left+r.width/2-cr.left,sy=r.top+Math.min(12,r.height*.12)-cr.top;
  let wx,wy;
  if(def.kind==='build'){[wx,wy]=ghostTile();}else{wx=mouseWorld[0];wy=mouseWorld[1];}
  const cp=proj(cam.x,cam.y),p=proj(wx,wy);
  const ex=(p[0]-cp[0])*cam.z+W/2+cam.sx,ey=(p[1]-cp[1])*cam.z+H/2+cam.sy;
  const dx=ex-sx,dy=ey-sy,len=Math.hypot(dx,dy);if(len<48)return;
  let hx=0,hy=-1;
  const tr=getComputedStyle(card).transform;
  if(tr&&tr!=='none'){
    const m=new DOMMatrixReadOnly(tr);hx=-m.c;hy=-m.d;const hm=Math.hypot(hx,hy);if(hm>.01){hx/=hm;hy/=hm;}
  }
  const cx=sx+hx*len/3,cy=sy+hy*len/3;
  const ux=cx-ex,uy=cy-ey,um=Math.hypot(ux,uy);if(um<1)return;
  const rx=def.kind==='build'?TW*.55*cam.z:Math.max(18,def.radius*TW/2*cam.z);
  const ry=def.kind==='build'?TH*.7*cam.z:Math.max(14,def.radius*TH/2*cam.z);
  const edge=1/Math.sqrt((ux/(um*rx))**2+(uy/(um*ry))**2)+5;
  const tx=ex+ux/um*edge,ty=ey+uy/um*edge;
  const at=t=>{const u=1-t;return{x:u*u*sx+2*u*t*cx+t*t*tx,y:u*u*sy+2*u*t*cy+t*t*ty};};
  const points=[];
  for(let i=0;i<=48;i++){
    const t=i/48,q=at(t),d1=at(Math.max(0,t-.01)),d2=at(Math.min(1,t+.01));
    const vx=d2.x-d1.x,vy=d2.y-d1.y,vm=Math.hypot(vx,vy)||1;
    points.push({t,x:q.x,y:q.y,nx:-vy/vm,ny:vx/vm,w:(3+20*Math.pow(1-t,1.45))*.5});
  }
  const tip=points[points.length-1],chk=placeCheck(def,wx,wy);
  const rgb=chk.ok?'255,255,255':'255,77,109',light=chk.ok?'255,255,255':'255,165,185',col=`rgb(${rgb})`;
  const ink=alpha=>`rgba(${rgb},${alpha})`;
  const band=edge=>{
    ctx.beginPath();
    for(let side=1;side>=-1;side-=2){
      for(let i=0;i<points.length;i++){
        const p=points[side===1?i:points.length-1-i],offset=edge(p,side),x=p.x+p.nx*offset,y=p.y+p.ny*offset;
        if(side===1&&i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      }
    }
    ctx.closePath();
  };
  const grad=ctx.createLinearGradient(sx,sy,tip.x,tip.y);
  grad.addColorStop(0,ink(0));grad.addColorStop(.18,ink(.12));grad.addColorStop(.58,ink(.4));grad.addColorStop(1,ink(.94));
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.fillStyle=grad;ctx.shadowColor=col;ctx.shadowBlur=15;ctx.globalAlpha=.24;
  band((p,side)=>side*p.w);ctx.fill();
  ctx.globalAlpha=.86;ctx.fill();
  ctx.save();band((p,side)=>side*p.w);ctx.clip();
  for(let layer=0;layer<3;layer++){
    const fog=ctx.createLinearGradient(sx,sy,tip.x,tip.y);
    for(let i=0;i<=24;i++){
      const t=i/24,wave=.5+.5*Math.sin(t*23-S.elapsed*3+layer*2.1);
      fog.addColorStop(t,`rgba(${light},${(.015+.24*wave*wave)*Math.min(1,t*5)*(1-t*.60)})`);
    }
    ctx.fillStyle=fog;ctx.filter='blur(2px)';
    band((p,side)=>p.w*(Math.sin(p.t*11-S.elapsed*2+layer*2)*.32+side*.43));ctx.fill();
  }
  ctx.restore();
  const headX=tip.ny,headY=-tip.nx,bx=tip.x-headX*12,by=tip.y-headY*12;
  ctx.beginPath();ctx.moveTo(tip.x,tip.y);
  ctx.lineTo(bx+tip.nx*5.5,by+tip.ny*5.5);ctx.lineTo(bx+headX*3,by+headY*3);
  ctx.lineTo(bx-tip.nx*5.5,by-tip.ny*5.5);ctx.closePath();
  ctx.fillStyle=ink(.97);ctx.globalAlpha=.96;ctx.fill();ctx.restore();
}
function render(){
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.fillStyle=seaGrad;ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='rgba(143,227,208,.06)';ctx.lineWidth=1.5;
  for(let i=0;i<6;i++){
    const y=(i*151+S.elapsed*8)%(H+100)-50;
    ctx.beginPath();for(let x=0;x<=W;x+=48)ctx.lineTo(x,y+Math.sin(x*.02+S.elapsed+i)*6);ctx.stroke();
  }
  const cp=proj(cam.x,cam.y);
  ctx.save();
  ctx.translate(W/2+cam.sx,H/2+cam.sy);ctx.scale(cam.z,cam.z);ctx.translate(-cp[0],-cp[1]);
  ctx.drawImage(groundCv,-groundCv.OX,-groundCv.M);
  dlN=0;
  for(const n of nodes)dlPush(n.x+n.y,0,n);
  for(const b of builds)dlPush(b.x+b.y,1,b);
  dlPush(core.x+core.y,2,null);
  for(const f of foes)if(!f.dead)dlPush(f.x+f.y,3,f);
  for(const p of picks)dlPush(p.x+p.y,4,p);
  if(!P.downed)dlPush(P.x+P.y,5,null);
  for(const g of ghosts)dlPush(g.x+g.y,6,g);
  for(const w of warns)dlPush(w.x+w.y,7,w);
  dlActive.length=dlN;for(let i=0;i<dlN;i++)dlActive[i]=dlPool[i];
  dlActive.sort((a,b)=>a.d-b.d);
  for(let i=0;i<dlN;i++){
    const it=dlActive[i];
    switch(it.k){
      case 0:{const n=it.o;n.type==='tree'?drawTree(n):n.type==='rock'?drawRock(n):drawCrys(n);break;}
      case 1:drawBuild(it.o,TUNE.world.buildScale);break;
      case 2:drawCore();break;
      case 3:drawFoe(it.o);break;
      case 4:drawPickup(it.o);break;
      case 5:drawPlayer();break;
      case 6:{const g=it.o,p=proj(g.x,g.y);ctx.globalAlpha=.3*(1-g.t/.3);ctx.fillStyle='#8d8dd6';
        ctx.beginPath();ctx.ellipse(p[0],p[1]-15,9,16,0,0,TAU);ctx.fill();ctx.globalAlpha=1;break;}
      case 7:{
        const w=it.o,p=proj(w.x,w.y),t=1-w.t/(w.boss?1.6:.95);
        ctx.strokeStyle=w.boss?'rgba(255,77,109,.8)':'rgba(160,107,255,.7)';ctx.lineWidth=2.5;
        for(let i=0;i<3;i++){ctx.beginPath();
          ctx.ellipse(p[0],p[1],(14+i*8)*(1-t*.3),(7+i*4)*(1-t*.3),S.elapsed*3+i*2,0,Math.PI*1.4);ctx.stroke();}
        ctx.fillStyle=`rgba(160,107,255,${.25+.2*Math.sin(S.elapsed*10)})`;
        ctx.beginPath();ctx.ellipse(p[0],p[1],18,9,0,0,TAU);ctx.fill();break;}
    }
  }
  drawGhost();
  for(const s of slashes){
    const t=s.t/.18,c0=proj(s.x,s.y);
    ctx.globalAlpha=(1-t)*.8;
    const g=ctx.createRadialGradient(c0[0],c0[1],4,c0[0],c0[1],Math.max(6,s.R*TW/2));
    g.addColorStop(0,'rgba(255,220,160,0)');g.addColorStop(.7,'rgba(255,200,120,.5)');g.addColorStop(1,'rgba(255,180,84,.9)');
    ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(c0[0],c0[1]-10);
    for(let i=0;i<=10;i++){const a=s.ang-1.1+i/10*2.2,p=proj(s.x+Math.cos(a)*s.R,s.y+Math.sin(a)*s.R);ctx.lineTo(p[0],p[1]-10);}
    ctx.closePath();ctx.fill();ctx.globalAlpha=1;
  }
  for(const s of shots){
    const p=proj(s.x,s.y),px=p[0],py=p[1],z=s.z||10;
    if(s.type==='arrow'){
      const sp=proj(s.vx,s.vy),m=Math.hypot(sp[0],sp[1])||1;
      ctx.strokeStyle='#e8d9b0';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(px-sp[0]/m*7,py-z-sp[1]/m*7);ctx.lineTo(px+sp[0]/m*7,py-z+sp[1]/m*7);ctx.stroke();
    }else if(s.type==='cannon'){ctx.drawImage(GLOW.cyan,px-10,py-z-10,20,20);
      ctx.fillStyle='#dffaff';ctx.beginPath();ctx.arc(px,py-z,3,0,TAU);ctx.fill();}
    else if(s.type==='fog'){ctx.drawImage(GLOW.violet,px-9,py-21,18,18);
      ctx.fillStyle='#e0ccff';ctx.beginPath();ctx.arc(px,py-12,2.6,0,TAU);ctx.fill();}
    else{const sp=proj(s.vx,s.vy),m=Math.hypot(sp[0],sp[1])||1;
      ctx.strokeStyle='rgba(143,227,208,.9)';ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(px-sp[1]/m*12,py-12+sp[0]/m*6);ctx.lineTo(px+sp[1]/m*12,py-12-sp[0]/m*6);ctx.stroke();}
  }
  for(const p of parts){
    const pr=proj(p.x,p.y),px=pr[0],py=pr[1],t=p.life/p.max;
    if(p.ring){
      const r=lerp(p.r1,p.r0,t);
      ctx.strokeStyle=p.col;ctx.globalAlpha=t;ctx.lineWidth=3*t+1;
      ctx.beginPath();ctx.ellipse(px,py,r*TW/2,r*TH/2,0,0,TAU);ctx.stroke();ctx.globalAlpha=1;
    }else if(p.shape&&FX_SHAPE[p.shape]!==undefined){
      const sz=(p.size*t+.5)*2.6;
      ctx.globalAlpha=t;
      ctx.drawImage(fxAtlas(p.col),FX_SHAPE[p.shape]*64,0,64,64,px-sz/2,py-p.z-sz/2,sz,sz);
      ctx.globalAlpha=1;
    }else{ctx.globalAlpha=t;ctx.fillStyle=p.col;
      ctx.beginPath();ctx.arc(px,py-p.z,p.size*t+.5,0,TAU);ctx.fill();ctx.globalAlpha=1;}
  }
  ctx.textAlign='center';
  for(const f of floats){
    const p=proj(f.x,f.y),t=f.life/.9;
    ctx.globalAlpha=Math.min(1,t*2);
    ctx.font=(f.big?'900 17px':'700 13px')+' "Noto Sans SC",sans-serif';
    ctx.strokeStyle='rgba(5,10,16,.9)';ctx.lineWidth=3;
    ctx.strokeText(f.txt,p[0],p[1]-34-(1-t)*22);
    ctx.fillStyle=f.col;ctx.fillText(f.txt,p[0],p[1]-34-(1-t)*22);ctx.globalAlpha=1;
  }
  ctx.restore();
  const night=(S.mode==='menu'||S.mode==='prep')?.55:S.nightAmt;
  if(night>0.02){
    ctx.fillStyle=`rgba(5,9,22,${.52*night})`;ctx.fillRect(0,0,W,H);
    ctx.globalCompositeOperation='lighter';
    const light=(x,y,r,img,a)=>{
      const p=proj(x,y),sx=(p[0]-cp[0])*cam.z+W/2+cam.sx,sy=(p[1]-cp[1])*cam.z+H/2+cam.sy,rr=r*cam.z;
      if(rr<2||sx<-rr||sy<-rr||sx>W+rr||sy>H+rr)return;
      ctx.globalAlpha=clamp(a*night,0,1);ctx.drawImage(img,sx-rr,sy-rr,rr*2,rr*2);
    };
    {
      const cpr=proj(core.x,core.y),csx=(cpr[0]-cp[0])*cam.z+W/2+cam.sx,csy=(cpr[1]-cp[1])*cam.z+H/2+cam.sy;
      const cw2=CORE_H*CORE_FW/CORE_FH;
      const lx=csx+(CORE_LX-CORE_AX)*cw2*cam.z,ly=csy+(-6-CORE_H*(1-CORE_LY))*cam.z;
      const fk=.9+.08*Math.sin(S.elapsed*9.1)+.04*Math.sin(S.elapsed*17.3);
      const pr=150*cam.z;
      ctx.globalAlpha=clamp(.4*night,0,1);
      ctx.save();ctx.translate(csx,csy+2*cam.z);ctx.scale(1,.5);ctx.drawImage(GLOW.amber,-pr,-pr,pr*2,pr*2);ctx.restore();
      const col=core.flash>0?'255,90,90':'255,190,110';
      const ang=S.elapsed*.35,L=300*cam.z;
      ctx.save();ctx.translate(lx,ly);ctx.scale(1,.5);
      for(const a of [ang,ang+Math.PI]){
        ctx.save();ctx.rotate(a);
        const bg=ctx.createLinearGradient(0,0,L,0);
        bg.addColorStop(0,`rgba(${col},${.5*night*fk})`);bg.addColorStop(1,`rgba(${col},0)`);
        ctx.fillStyle=bg;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(L,-L*.12);ctx.lineTo(L,L*.12);ctx.closePath();ctx.fill();
        ctx.restore();
      }
      ctx.restore();
      const hr=30*cam.z;
      ctx.globalAlpha=clamp(.6*fk*night,0,1);ctx.drawImage(GLOW.amber,lx-hr,ly-hr,hr*2,hr*2);
      for(const [fx2,fy2] of [[.275,.662],[.432,.789]]){
        const wx=csx+(fx2-CORE_AX)*cw2*cam.z,wy=csy+(-6-CORE_H*(1-fy2))*cam.z,wr=10*cam.z;
        ctx.globalAlpha=clamp(.5*fk*night,0,1);ctx.drawImage(GLOW.amber,wx-wr,wy-wr,wr*2,wr*2);
      }
      ctx.globalAlpha=1;
    }
    if(!P.downed){
      const pp=proj(P.x,P.y),psx=(pp[0]-cp[0])*cam.z+W/2+cam.sx,psy=(pp[1]-cp[1])*cam.z+H/2+cam.sy;
      const sp=proj(Math.cos(P.face),Math.sin(P.face)),fl=sp[0]<0?-1:1;
      const bob=P.moving?Math.sin(P.anim)*2:Math.sin(S.elapsed*2);
      const lx=psx-13*fl*cam.z,ly=psy+(bob-11)*cam.z;
      const fk=.88+.09*Math.sin(S.elapsed*11.3)+.05*Math.sin(S.elapsed*23.7+1.7);
      const rr=64*cam.z;
      if(rr>2&&psx>-rr&&psy>-rr&&psx<W+rr&&psy<H+rr){
        ctx.globalAlpha=clamp(.55*fk*night,0,1);
        ctx.save();ctx.translate(psx-10*fl*cam.z,psy+2*cam.z);ctx.scale(1,.5);
        ctx.drawImage(GLOW.lantern,-rr,-rr,rr*2,rr*2);ctx.restore();
      }
      const mr=95*cam.z;
      if(mr>2&&lx>-mr&&ly>-mr&&lx<W+mr&&ly<H+mr){
        ctx.globalAlpha=clamp(.2*fk*night,0,1);ctx.drawImage(GLOW.lantern,lx-mr,ly-mr,mr*2,mr*2);
      }
      const hr=15*cam.z;
      ctx.globalAlpha=clamp(.5*fk*night,0,1);ctx.drawImage(GLOW.lantern,lx-hr,ly-hr,hr*2,hr*2);
      ctx.globalAlpha=1;
    }
    for(const b of builds){
      if(b.type==='tower')light(b.x,b.y,70,GLOW.lantern,.35);
      else if(b.type==='cannon')light(b.x,b.y,90,GLOW.cyan,.35);
      else if(b.type==='totem')light(b.x,b.y,90,GLOW.leaf,.3);
      else if(b.type==='manawell')light(b.x,b.y,100,GLOW.cyan,.4);
    }
    for(const n of nodes)if(n.alive&&n.type==='crys')light(n.x,n.y,60,GLOW.violet,.35);
    for(const s of shots)if(s.type==='cannon'||s.type==='fog'){
      light(s.x,s.y,40,s.type==='fog'?GLOW.violet:GLOW.cyan,.35);
    }
    ctx.globalAlpha=1;
    const cpr=proj(core.x,core.y),cpx=(cpr[0]-cp[0])*cam.z+W/2+cam.sx,cpy=(cpr[1]-cp[1])*cam.z+H/2+cam.sy;
    const beamA=(S.mode==='launch'?Math.min(1,S.launchT/1.2):core.beam*.35)*night;
    if(beamA>0.02){
      const bw=(S.mode==='launch'?20+S.launchT*60:12)*cam.z;
      const g=ctx.createLinearGradient(cpx,cpy-90*cam.z,cpx,cpy-90*cam.z-320*cam.z);
      g.addColorStop(0,`rgba(255,200,120,${beamA})`);g.addColorStop(1,'rgba(255,200,120,0)');
      ctx.fillStyle=g;ctx.fillRect(cpx-bw/2,cpy-90*cam.z-320*cam.z,bw,320*cam.z);
    }
    ctx.globalCompositeOperation='source-over';
  }else{ctx.fillStyle='rgba(255,190,120,.05)';ctx.fillRect(0,0,W,H);}
  for(const f of fogBlobs){
    const sx=W/2+f.x-cp[0]*.12,sy=H/2+f.y-cp[1]*.12+Math.sin(S.elapsed*.3+f.ph)*14;
    ctx.globalAlpha=clamp(f.a*(1+night*.8),0,1);ctx.drawImage(GLOW.fog,sx-f.s,sy-f.s,f.s*2,f.s*2);
  }
  ctx.globalAlpha=1;ctx.fillStyle=vigGrad;ctx.fillRect(0,0,W,H);
  if(S.mode==='launch'&&S.launchT>1.6){ctx.fillStyle=`rgba(255,240,214,${Math.min(1,(S.launchT-1.6)/1)})`;ctx.fillRect(0,0,W,H);}
  drawDragArrow();
  renderMinimap();
}
function renderMinimap(){
  mctx.setTransform(DPR,0,0,DPR,0,0);mctx.clearRect(0,0,124,124);
  mctx.drawImage(mmMask,0,0,124,124);
  const k=124/GRID;
  const dot=(x,y,r,col)=>{mctx.fillStyle=col;mctx.beginPath();mctx.arc(x*k,y*k,r,0,TAU);mctx.fill();};
  for(const b of builds)dot(b.x,b.y,1.6,'#57e6ff');
  if(Math.floor(S.elapsed*6)%2===0)for(const w of warns)dot(w.x,w.y,2.5,'#a06bff');
  for(const f of foes)if(!f.dead)dot(f.x,f.y,f.boss?3.5:1.6,f.boss?'#ff4d6d':'#ff7a90');
  dot(core.x,core.y,3+Math.sin(S.elapsed*3)*.7,'#ffb454');
  if(!P.downed){
    dot(P.x,P.y,2.4,'#ffffff');
    mctx.strokeStyle='rgba(255,255,255,.6)';mctx.lineWidth=1;
    mctx.beginPath();mctx.moveTo(P.x*k,P.y*k);mctx.lineTo(P.x*k+Math.cos(P.face)*5,P.y*k+Math.sin(P.face)*5);mctx.stroke();
  }
}

