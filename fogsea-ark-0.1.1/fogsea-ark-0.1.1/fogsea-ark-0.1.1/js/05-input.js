'use strict';
/* ---------------- 输入 ---------------- */
const keys={};
let mouseX=W/2,mouseY=H/2,mouseWorld=[CEN,CEN],mouseActive=false;
let stickVec=[0,0];
let holdTimer=null;
const HOLD_MS=180;
/* ---------------- 个人测试作弊码（仅 JS 内部，不在页面呈现） ----------------
   暂停时依次键入 l3131 即切换「雾爆强化」：伤害 ×10（提升至 1000%）、
   范围 ×10（提升 1000%）。再次输入可关闭。反馈只走控制台与音效。 */
function cheatKey(k){
  if(k.length!==1||!/[a-z0-9]/.test(k))return;
  CHEAT.buf=(CHEAT.buf+k).slice(-16);
  if(!CHEAT.buf.endsWith(CHEAT.code))return;
  CHEAT.buf='';
  CHEAT.on=!CHEAT.on;
  console.log('[cheat] 雾爆强化 '+(CHEAT.on?'开启':'关闭')+
    '：伤害×'+CHEAT.dmg+' 范围×'+CHEAT.rad);
  sfx('level');
}
function clearHold(){if(holdTimer){clearTimeout(holdTimer);holdTimer=null;}}
addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  if(codexOpen){
    if(k==='escape'){e.preventDefault();closeCodex();}
    else if(k==='arrowdown'||k==='arrowup'){e.preventDefault();cxMove(k==='arrowdown'?1:-1);}
    return;
  }
  if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k)&&S.mode!=='menu'&&S.mode!=='prep')e.preventDefault();
  if(e.repeat){keys[k]=true;return;}
  keys[k]=true;
  if(slotUi){
    if(k==='escape'){e.preventDefault();closeSlots();}
    else if(['1','2','3'].includes(k)){const el=$('slotList').children[+k-1];if(el&&el.click)el.click();}
    return;
  }
  if(S.mode==='dawn'){
    if(['1','2','3'].includes(k))pickDawn(+k-1);
    if(k==='escape')skipDawn();
    return;
  }
  if(S.mode==='remove'){
    if(k==='escape')cancelSalvage();
    else if(k>='1'&&k<='9'){const b=$('rmList').children[+k-1];if(b&&b.click)b.click();}
    return;
  }
  if(S.mode==='swap'){
    if(k==='escape')closeSwap(true);
    else if(k>='1'&&k<='9'){const b=$('swapList').children[+k-1];if(b&&b.click)b.click();}
    return;
  }
  if(S.mode==='play'){
    const hi=HAND_KEYS.indexOf(k);
    if(hi>=0&&DECK.hand[hi])selectCard(DECK.hand[hi].uid);
    if(k==='q')castNova();
    if(k===' ')tryDash();
    if(k==='f')tryRepair();
    if(k==='n')skipToNight();
    if(k==='escape'){if(S.aimUid)clearAim();else pauseGame();}
    if(k==='p')pauseGame();
    if(k==='m')setMuted(!save.muted);
    if(k==='k')openSlots('save');
  }else if(S.mode==='pause'){
    if(k==='escape'||k==='p')resumeGame();
    else if(k==='s')openSlots('save');
    else cheatKey(k);
  }
  else if(S.mode==='menu'&&k==='enter'&&e.target===document.body){e.preventDefault();openPrep();}
  else if(S.mode==='prep'){
    if(k==='escape'){e.preventDefault();toTitle();}
    else if(k==='enter'&&e.target===document.body){e.preventDefault();beginRun();}
  }
});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;endDrag();});
addEventListener('pointermove',e=>{
  if(S.dragUid&&e.pointerId!==S.dragPointerId)return;
  mouseX=e.clientX;mouseY=e.clientY;mouseActive=true;
  if(S.dragUid){
    if(!S.dragMoved&&Math.hypot(mouseX-S.dragStart[0],mouseY-S.dragStart[1])>7){
      S.dragMoved=true;showDragCard(S.dragUid);
    }
    if(S.dragMoved)moveDragCard(mouseX,mouseY);
  }
},{passive:true});
cv.addEventListener('pointerdown',e=>{
  auInit();if(AU.ctx&&AU.ctx.state==='suspended')AU.ctx.resume();
  mouseX=e.clientX;mouseY=e.clientY;mouseActive=true;updateMouseWorld();
  if(S.mode!=='play'||codexOpen)return;
  if(S.dragUid&&e.pointerId!==S.dragPointerId)return;
  if(e.button===2){clearAim();return;}
  if(S.aimUid){const uid=S.aimUid;tryPlayAt(uid,mouseWorld[0],mouseWorld[1]);}
});
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('wheel',e=>{e.preventDefault();cam.tz=clamp(cam.tz-Math.sign(e.deltaY)*.12,.9,2.6);},{passive:false});
addEventListener('pointerup',e=>{
  if(!S.dragUid||e.pointerId!==S.dragPointerId)return;
  const uid=S.dragUid,moved=S.dragMoved;
  const overCanvas=document.elementFromPoint(e.clientX,e.clientY)===cv;
  mouseX=e.clientX;mouseY=e.clientY;mouseActive=true;
  endDrag();
  if(S.mode!=='play')return;
  if(moved){
    if(overCanvas){updateMouseWorld();tryPlayAt(uid,mouseWorld[0],mouseWorld[1]);}
    else selectCard(uid);
  }else{
    if(S.aimUid===uid)clearAim();else selectCard(uid);
  }
});
addEventListener('pointercancel',e=>{if(S.dragUid&&e.pointerId===S.dragPointerId)endDrag();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&S.mode==='play'&&!codexOpen)pauseGame();});
function updateMouseWorld(){
  const cp=proj(cam.x,cam.y);
  mouseWorld=unproj((mouseX-W/2-cam.sx)/cam.z+cp[0],(mouseY-H/2-cam.sy)/cam.z+cp[1]);
}
if(isTouch){
  const stick=$('stick'),knob=$('knob');let sid=null,so=[0,0];
  stick.addEventListener('pointerdown',e=>{sid=e.pointerId;const r=stick.getBoundingClientRect();
    so=[r.left+r.width/2,r.top+r.height/2];try{stick.setPointerCapture(sid);}catch(err){}e.preventDefault();});
  stick.addEventListener('pointermove',e=>{
    if(e.pointerId!==sid)return;
    let dx=e.clientX-so[0],dy=e.clientY-so[1];const m=Math.hypot(dx,dy),max=42;
    if(m>max){dx*=max/m;dy*=max/m;}
    knob.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
    stickVec=[dx/max,dy/max];
  });
  const end=e=>{if(e.pointerId!==sid)return;sid=null;stickVec=[0,0];knob.style.transform='translate(-50%,-50%)';};
  stick.addEventListener('pointerup',end);stick.addEventListener('pointercancel',end);
  $('btnDash').addEventListener('pointerdown',e=>{e.preventDefault();auInit();tryDash();});
  $('btnNova').addEventListener('pointerdown',e=>{e.preventDefault();auInit();castNova();});
}

