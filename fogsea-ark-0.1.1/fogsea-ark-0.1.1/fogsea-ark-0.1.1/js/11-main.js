'use strict';
/* ---------------- 流程 ---------------- */
const OVERLAYS=['menu','codexOv','endOv','pauseOv','dawnOv','removeOv','swapOv','slotOv'];
function showOv(id,on){$(id).classList.toggle('show',on);}
function closeOverlays(except){OVERLAYS.forEach(id=>{if(id!==except)showOv(id,false);});}
function blurFocus(){const el=document.activeElement;if(el&&el.blur)el.blur();}
function menuViewHeight(el){
  const pos=el.style.position,min=el.style.minHeight;
  el.style.position='static';el.style.minHeight='0';
  const h=Math.max(el.scrollHeight,Math.ceil(el.getBoundingClientRect().height));
  el.style.position=pos;el.style.minHeight=min;
  return h;
}
function setMenuView(view,focus=true){
  const panel=$('menuPanel');
  panel.dataset.view=view;
  const el=panel.querySelector(`.menuView[data-view="${view}"]`);
  // 面板为 border-box：测量值只含内容，需补回边框与内边距，否则子视图少几像素而出现滚动条
  const frame=Math.max(0,panel.offsetHeight-panel.clientHeight);
  const naturalHeight=menuViewHeight(el)+frame;
  // CSS owns the cap; read the computed pixel value so layout and scroll logic stay aligned.
  const maxHeight=parseFloat(getComputedStyle(panel).maxHeight);
  // Only enable scrolling when the content cannot fit after the height transition.
  el.classList.toggle('needs-scroll',naturalHeight>maxHeight);
  panel.style.height=Math.min(naturalHeight,maxHeight)+'px';
  if(focus)$(view==='prep'?'launchBtn':view==='load'?'btnLoadBack':'startBtn').focus({preventScroll:true});
}
function openPrep(){
  const needsFreshRun=S.mode!=='menu'&&S.mode!=='prep';
  if(needsFreshRun)initRun();
  clearInterval(emberTimer);codexOpen=false;blurFocus();closeOverlays('menu');showOv('menu',true);
  S.mode='prep';
  UI.hud.classList.add('hidden');refreshPrep();setMenuView('prep');sfx('ui');
}
function openLoadView(){
  blurFocus();codexOpen=false;S.mode='menu';
  resetLoadUi();renderLoadList(true);sfx('ui');
}
function renderLoadList(focus=true){
  const row=$('menuSlotList');row.innerHTML='';
  slots.slots.forEach((s,i)=>{
    const open=loadExpanded===i&&!!s;
    const el=document.createElement('div');
    el.className='slotCard'+(s?'':' empty')+(slots.active===i?' active':'')+(open?' open':'');
    const mage=s&&s.snap&&s.snap.P&&s.snap.P.cls==='mage'?' · 法师':'';
    el.innerHTML=`<span class="si">${i+1}</span><span class="sb"><b>${s?`第 ${s.day} 日 · ${s.phase==='night'?'雾潮':'白昼'}${mage}`:'空'}</b>${s?`<span class="slotMeta">夜 ${s.summary.nights} · 击杀 ${s.summary.kills} · 核心 ${s.summary.core}<br>${new Date(s.ts).toLocaleString('zh-CN')}</span>`:''}</span>`;
    el.addEventListener('click',()=>{
      if(!s){toast('该存档位为空','warn');return;}
      loadExpanded=open?null:i;loadDeleteArm=false;renderLoadList(false);sfx('ui');
    });
    if(open){
      const acts=document.createElement('div');acts.className='slotActions';
      const bLoad=document.createElement('button');
      bLoad.className='slotAct load';bLoad.textContent='载入';
      bLoad.addEventListener('click',e=>{e.stopPropagation();doLoadSlot(i);resetLoadUi();});
      const bDel=document.createElement('button');
      bDel.className='slotAct del'+(loadDeleteArm?' arm':'');
      bDel.textContent=loadDeleteArm?'确认删除':'删除';
      bDel.addEventListener('click',e=>{
        e.stopPropagation();
        if(!loadDeleteArm){
          loadDeleteArm=true;bDel.textContent='确认删除';bDel.classList.add('arm');
          toast('再点一次确认删除','warn');return;
        }
        if(deleteSlot(i)){
          toast('已删除存档 '+(i+1),'good');resetLoadUi();refreshContinue();renderLoadList(false);sfx('ui');
        }else toast('删除失败','warn');
      });
      acts.appendChild(bLoad);acts.appendChild(bDel);el.appendChild(acts);
    }
    row.appendChild(el);
  });
  setMenuView('load',focus!==false);
}
function startRun(){
  blurFocus();auInit();if(AU.ctx&&AU.ctx.state==='suspended')AU.ctx.resume();
  clearInterval(emberTimer);codexOpen=false;closeOverlays();
  initRun();S.mode='play';
  UI.hud.classList.remove('hidden');refreshStacks();autoSave();
  banner('第 1 日','拖动卡牌到地面筑防','');sfx('dawn');
  requestAnimationFrame(layoutHand);
}
function pauseGame(){
  if(S.mode!=='play'||codexOpen)return;
  S.mode='pause';endDrag();persist();showOv('pauseOv',true);sfx('ui');
}
function resumeGame(){if(S.mode!=='pause')return;S.mode='play';showOv('pauseOv',false);sfx('ui');}
function skipToNight(){
  if(S.mode!=='play'||S.phase!=='day')return;
  S.timeLeft=0;startNight();
}
function toTitle(){
  // 返回标题会重建单局状态，先把当前进度落盘，避免丢掉上次检查点之后的推进
  if(['play','pause','slots'].includes(S.mode))autoSave();
  stopEmberTimer();const fromPrep=S.mode==='prep',elapsed=S.elapsed;
  S.mode='menu';codexOpen=false;blurFocus();closeOverlays();
  UI.hud.classList.add('hidden');
  if(!fromPrep){initRun();S.elapsed=elapsed;}
  S.nightAmt=.55;refreshPrep();showOv('menu',true);setMenuView('title');refreshContinue();auPhase(false);
}
function refreshPrep(){
  $('emberNum').textContent=save.embers;
  $('bestChip').textContent=save.best.nights>0?`${save.best.nights} 夜 · ${save.best.kills} 击杀`:'尚无记录';
  const dr=$('diffRow');
  if(!dr.children.length){
    dr.innerHTML=Object.entries(DIFFS).map(([k,d])=>`<button class="diffBtn" data-d="${k}">${d.name}<small>${d.sub}</small></button>`).join('');
    dr.querySelectorAll('.diffBtn').forEach(el=>el.addEventListener('click',()=>{
      save.diff=el.dataset.d;persist();refreshPrep();sfx('ui');}));
  }
  dr.querySelectorAll('.diffBtn').forEach(el=>el.classList.toggle('sel',el.dataset.d===save.diff));
  const bl=$('blessList');
  bl.innerHTML=Object.entries(BLESS).map(([k,b])=>{
    const lv=save.bless[k],maxed=lv>=b.max,cost=maxed?0:b.costs[lv];
    const pips=Array.from({length:b.max},(_,i)=>`<span class="pip${i<lv?' on':''}"></span>`).join('');
    return `<div class="blessRow">${svg(b.icon,21,b.color)}
      <div class="blessInfo"><b>${b.name} <span style="color:${b.color};font-size:11px">Lv.${lv}</span></b>
      <span>${b.desc}</span><div class="pips">${pips}</div></div>
      <button class="buyBtn" data-k="${k}" ${maxed||save.embers<cost?'disabled':''}>${maxed?'满':cost}</button></div>`;
  }).join('');
  bl.querySelectorAll('.buyBtn').forEach(el=>el.addEventListener('click',()=>{
    const k=el.dataset.k,b=BLESS[k],lv=save.bless[k];
    if(lv>=b.max||save.embers<b.costs[lv])return;
    save.embers-=b.costs[lv];save.bless[k]++;persist();sfx('level');refreshPrep();
  }));
}

/* ---------------- 存档位 ---------------- */
let slotUi=null,slotPick=null,slotDeleteArm=false,slotPrevMode='play';
let loadExpanded=null,loadDeleteArm=false;
function resetLoadUi(){loadExpanded=null;loadDeleteArm=false;}

function refreshContinue(){
  $('btnContinue').classList.toggle('noSave',!slots.slots.some(Boolean));
}

function makeSlot(){
  const snap=captureSnapshot();
  snap.S.mode='play'; // 手动存档可能来自暂停/存档面板，读档后直接回到可玩状态
  return {v:SLOT_VER,ts:Date.now(),day:S.day,phase:S.phase,
    summary:{nights:S.stats.nights,kills:S.stats.kills,core:Math.ceil(core.hp)+'/'+core.max},
    snap};
}
function putSlot(i,slot){
  const arr=slots.slots.slice();arr[i]=slot;
  return persistSlots({v:SLOT_VER,active:i,slots:arr});
}
// 日初检查点：只覆盖当前活跃槽；满槽时先提示再覆盖最旧的一份
function autoSave(){
  if(!S.stats||['menu','prep','end','launch','over'].includes(S.mode))return false;
  let i=slots.active;
  if(i===null||!slots.slots[i]){
    i=slots.slots.findIndex(s=>!s);
    if(i<0){
      i=slots.slots.reduce((best,s,k,arr)=>s.ts<arr[best].ts?k:best,0);
      toast('槽位已满 · 覆盖了最旧的存档','warn');
    }
  }
  return putSlot(i,makeSlot());
}
function doSaveSlot(i){
  if(!Number.isInteger(i)||i<0||i>=SLOT_N)return false;
  if(!putSlot(i,makeSlot())){toast('存档失败 · 请检查浏览器存储','warn');return false;}
  toast('已存档至槽位 '+(i+1),'good');sfx('ui');return true;
}
function deleteSlot(i){
  if(slots.active===i)return clearActiveSlot();
  const arr=slots.slots.slice();arr[i]=null;
  return persistSlots({v:SLOT_VER,active:slots.active,slots:arr});
}
// HUD 用 _t/_v/_n 等脏标记跳过重绘；读档后必须全部清掉
function clearHudCache(){
  for(const k in UI){
    const el=UI[k];
    if(!el||typeof el!=='object'||Array.isArray(el))continue;
    for(const p in el)if(p.charAt(0)==='_')delete el[p];
  }
}
function beginRun(){
  if(slots.slots.every(Boolean))openSlots('new');else startRun();
}
function doLoadSlot(i){
  const rec=slots.slots[i];
  if(!rec){toast('该存档位为空','warn');return false;}
  blurFocus();auInit();if(AU.ctx&&AU.ctx.state==='suspended')AU.ctx.resume();
  stopEmberTimer();codexOpen=false;endDrag();
  dragBuildType=null;const dc=$('dragCard');if(dc)dc.style.display='none';
  restoreSnapshot(rec.snap);
  closeOverlays();
  slotUi=null;slotPick=null;slotDeleteArm=false;
  UI.hud.classList.remove('hidden');UI.toasts.innerHTML='';clearHudCache();
  refreshRes();refreshStacks();syncHUD();renderHand();requestAnimationFrame(layoutHand);
  auPhase(S.phase==='night');
  if(S.mode==='dawn'){renderDawn();showOv('dawnOv',true);}
  banner(`第 ${S.day} 日 · 已读档`,'','');sfx('dawn');
  if(slots.active!==i)setActiveSlot(i);
  return true;
}
function openSlots(mode){
  slotPrevMode=S.mode;slotUi=mode;slotPick=null;slotDeleteArm=false;blurFocus();
  if(S.mode==='play')S.mode='slots'; // 冻结模拟，选槽时敌人不会继续行动
  renderSlots();showOv('slotOv',true);sfx('ui');
}
function closeSlots(){
  showOv('slotOv',false);
  if(S.mode==='slots')S.mode=slotPrevMode;
  slotUi=null;slotPick=null;slotDeleteArm=false;sfx('ui');
}
function renderSlots(){
  $('slotTitle').textContent=slotUi==='load'?'继续':slotUi==='new'?'新局':'存档';
  const row=$('slotList');row.innerHTML='';
  slots.slots.forEach((s,i)=>{
    const el=document.createElement('button');
    el.className='slotCard'+(s?'':' empty')+(slotPick===i?' sel':'')+(slots.active===i?' active':'');
    const mage=s&&s.snap&&s.snap.P&&s.snap.P.cls==='mage'?' · 法师':'';
    const main=s?`第 ${s.day} 日 · ${s.phase==='night'?'雾潮':'白昼'}${mage}`:'空';
    const meta=s?`<span class="slotMeta">夜 ${s.summary.nights} · 击杀 ${s.summary.kills} · 核心 ${s.summary.core}<br>${new Date(s.ts).toLocaleString('zh-CN')}</span>`:'';
    el.innerHTML=`<span class="si">${i+1}</span><span class="sb"><b>${main}</b>${meta}</span>`;
    el.addEventListener('click',()=>onSlotClick(i,!!s));
    row.appendChild(el);
  });
  const canDelete=slotUi==='save'&&slotPick!==null&&slots.slots[slotPick];
  $('slotDelete').style.display=canDelete?'':'none';
  $('slotDelete').textContent=slotDeleteArm?'确认删除':'删除存档';
}
function onSlotClick(i,occupied){
  if(slotUi==='load'){
    if(!occupied){toast('该存档位为空','warn');return;}
    doLoadSlot(i);return;
  }
  if(!occupied||slotPick===i){
    if(slotUi==='new'){slots.active=i;closeSlots();startRun();return;}
    if(doSaveSlot(i)){refreshContinue();closeSlots();}
    return;
  }
  slotPick=i;slotDeleteArm=false;renderSlots();sfx('ui');
  toast('再点一次覆盖存档 '+(i+1),'warn');
}
function confirmDelete(){
  const i=slotPick;
  if(slotUi!=='save'||i===null||!slots.slots[i])return;
  if(!slotDeleteArm){slotDeleteArm=true;renderSlots();return;}
  if(deleteSlot(i)){toast('已删除存档 '+(i+1),'good');refreshContinue();closeSlots();}
  else toast('删除失败','warn');
}

/* ---------------- 主循环 ---------------- */
let lastT=performance.now();
function loop(now){
  requestAnimationFrame(loop);
  const dt=Math.min((now-lastT)/1000,1/30);lastT=now;
  if(codexOpen){S.elapsed+=dt*.35;render();cxDrawPreview(dt);return;}
  if(S.mode==='menu'||S.mode==='prep'){
    S.elapsed+=dt;
    const a=S.elapsed*.12;
    cam.x=CEN+Math.cos(a)*5;cam.y=CEN+Math.sin(a)*5;cam.z=lerp(cam.z,1.15,dt*2);
    P.x=CEN+2.2;P.y=CEN+.5;P.face=a+Math.PI;
    updateParts(dt);
    if(Math.random()<dt*3)puff(CEN+rand(-6,6),CEN+rand(-6,6),1,'#ffd9a0',.3,1.6,1.8,-20);
    core.beam=.6;
  }else if(S.mode==='play'){
    updateMouseWorld();
    let wdt=dt*S.speed;
    if(S.hitstop>0){S.hitstop-=dt;wdt=0;}
    if(wdt>0){
      const steps=Math.min(4,Math.ceil(S.speed)),step=wdt/steps;
      for(let k=0;k<steps&&S.mode==='play';k++)update(step);
    }
    if(S.handDirty)renderHand();
  }else if(S.mode==='launch'){
    S.launchT+=dt;S.elapsed+=dt;updateParts(dt);
    core.beam=1;cam.shake=Math.max(0,cam.shake-dt*30);
    cam.sx=rand(-1,1)*cam.shake;cam.sy=rand(-1,1)*cam.shake;
    cam.x=lerp(cam.x,core.x,dt*1.5);cam.y=lerp(cam.y,core.y,dt*1.5);
    if(Math.random()<dt*30)puff(core.x+rand(-1,1),core.y+rand(-1,1),1,'#ffe0a8',1,1.4,2.5,-60);
    if(S.launchT>=2.8)showEnd(true);
  }else if(S.mode==='over'){
    S.elapsed+=dt;updateParts(dt);
    cam.shake=Math.max(0,cam.shake-dt*30);
    cam.sx=rand(-1,1)*cam.shake;cam.sy=rand(-1,1)*cam.shake;
    S.overT-=dt;if(S.overT<=0)showEnd(false);
  }else{
    S.elapsed+=dt*.3;updateParts(dt*.3);
    if(S.handDirty)renderHand();
  }
  if(S.dragUid&&dragBuildType)drawDragBuild();
  render();syncHUD();
}

/* ---------------- 启动 ---------------- */
cacheUI();resize();setMuted(save.muted);
$('btnSpeed').textContent='1×';
$('btnNight').addEventListener('click',()=>{auInit();skipToNight();});
$('btnPause').addEventListener('click',()=>{auInit();S.mode==='play'?pauseGame():(S.mode==='pause'&&!codexOpen&&resumeGame());});
$('btnMute').addEventListener('click',()=>{auInit();setMuted(!save.muted);sfx('ui');});
$('btnSpeed').addEventListener('click',()=>{
  auInit();S.speed=S.speed===1?2:1;
  $('btnSpeed').textContent=S.speed+'×';$('btnSpeed').classList.toggle('warnState',S.speed===2);sfx('ui');});
$('btnResume').addEventListener('click',resumeGame);
$('btnSave').addEventListener('click',()=>openSlots('save'));
$('btnRestart').addEventListener('click',openPrep);
$('btnToTitle').addEventListener('click',toTitle);
$('btnAgain').addEventListener('click',openPrep);
$('btnTitle2').addEventListener('click',toTitle);
$('btnEndless').addEventListener('click',()=>{auInit();continueEndless();});
$('btnContinue').addEventListener('click',openLoadView);
$('startBtn').addEventListener('click',openPrep);
$('launchBtn').addEventListener('click',beginRun);
$('btnPrepBack').addEventListener('click',toTitle);
$('btnLoadBack').addEventListener('click',()=>{resetLoadUi();setMenuView('title');sfx('ui');});
$('slotDelete').addEventListener('click',confirmDelete);
$('slotBack').addEventListener('click',closeSlots);
$('repairBtn').addEventListener('click',tryRepair);
initRun();S.nightAmt=.55;refreshPrep();refreshStacks();setMenuView('title',false);refreshContinue();
const resizeMenu=()=>setMenuView($('menuPanel').dataset.view||'title',false);
addEventListener('resize',resizeMenu);
document.fonts?.addEventListener('loadingdone',resizeMenu);
requestAnimationFrame(loop);
