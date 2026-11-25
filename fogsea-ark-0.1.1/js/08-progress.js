'use strict';
/* ---------------- 黎明选择 ---------------- */
function rollDawnBless(){
  const pool=BLESSINGS.filter(b=>{
    if(b.cls==='mage'&&!isMage())return false;
    if(b.id==='t_nirvana'&&P.nirvanaUsed)return false;
    return (P.stacks[b.id]||0)<(b.max||(S.endless?8:Infinity));
  });
  const weights={c:60,r:30,e:12},bag=[];
  pool.forEach(b=>{for(let i=0;i<weights[b.rar];i++)bag.push(b);});
  S.dawnBless=[];let guard=0;
  while(S.dawnBless.length<Math.min(3,pool.length)&&bag.length&&guard++<400){
    const b=bag[irand(0,bag.length-1)];if(!S.dawnBless.includes(b))S.dawnBless.push(b);
  }
}
function openDawn(){
  S.mode='dawn';S.dawnStep=0;
  S.dawnCards=rollRewards(3);
  injectClassCard(S.dawnCards);
  injectCoreCards(S.dawnCards);
  rollDawnBless();
  renderDawn();showOv('dawnOv',true);
}
function renderDawn(){
  const row=$('dawnRow');row.innerHTML='';
  const t=$('dawnTitle'),sub=$('dawnSub');
  if(S.dawnStep===0){
    $('dawnStep').textContent='1 / 2 · 拾获卡牌';
    t.className='dawnTitle';t.textContent=`第 ${S.day} 日 · 黎明`;
    const fullHand=DECK.hand.length>=DECK.max;
    sub.innerHTML=`选择一张加入牌库 <span class="kb-hint">（1 / 2 / 3）</span> · 手牌 ${DECK.hand.length}/${DECK.max}`+
      (fullHand?' <i style="color:var(--cyan);font-style:normal">手牌已满 · 新牌入牌库，本日可换牌</i>':'');
    S.dawnCards.forEach((id,i)=>{
      const d=CDEFS[id],own=cardTotal(id);
      const el=document.createElement('button');
      el.className='pcard';el.style.borderColor=d.color+'88';
      const cost=d.cls==='class'?'<b style="color:#8d8dd6">职业</b>':costHtml(d);
      el.innerHTML=`<span class="pcHk kb kb-hint">${i+1}</span>${own?`<span class="pcOwn">已有 ×${own}</span>`:''}
        <div class="pcArt" style="color:${d.color}">${svg(d.icon,34)}</div>
        <b>${d.name}</b><div class="pcKind" style="color:${d.color}">${d.cls==='class'?'职业':KINDNAME[d.kind]+(d.elem?' · '+ELEMNAME[d.elem]:'')}</div>
        <p>${d.desc}</p><div class="pcCost">${cost}</div>`;
      el.addEventListener('click',()=>pickDawn(i));
      row.appendChild(el);
    });
    $('dawnSkip').textContent='跳过 · 保持精简';
  }else{
    $('dawnStep').textContent='2 / 2 · 灯芯祝福';
    t.className='dawnTitle vio';t.textContent='灯芯升华';
    sub.innerHTML=`选择一项永久祝福 <span class="kb-hint">（1 / 2 / 3）</span> · 当前 Lv.${P.lvl}`;
    S.dawnBless.forEach((b,i)=>{
      const st=P.stacks[b.id]||0;
      const el=document.createElement('button');
      el.className='pcard';el.style.borderColor=RARCOL[b.rar]+'99';
      el.innerHTML=`<span class="pcHk kb kb-hint">${i+1}</span>${st?`<span class="pcOwn">×${st}</span>`:''}
        <div class="pcArt" style="color:${RARCOL[b.rar]}">${svg(b.icon,34)}</div>
        <b>${b.n}</b><div class="pcKind" style="color:${RARCOL[b.rar]}">${RARNAME[b.rar]}祝福</div>
        <p>${b.d}</p><div class="pcCost"><b style="color:${RARCOL[b.rar]}">被动生效</b></div>`;
      el.addEventListener('click',()=>pickDawn(i));
      row.appendChild(el);
    });
    $('dawnSkip').textContent='跳过祝福';
  }
}
function pickDawn(i){
  if(S.mode!=='dawn')return;
  if(S.dawnStep===0){
    const id=S.dawnCards[i];if(!id)return;
    if(id==='class_mage'){
      S.stats.played++;bumpSeen('play','class_mage');
      becomeMage();
      rollDawnBless();
      S.dawnStep=1;renderDawn();sfx('card');
      return;
    }
    DECK.discard.push(mkCard(id));
    if(CDEFS[id].elem)P.aff[CDEFS[id].elem]++;
    toast('获得 '+CDEFS[id].name,'good');sfx('card');
    S.dawnStep=1;renderDawn();
  }else{
    const b=S.dawnBless[i];if(!b)return;
    if(b.f)b.f();P.stacks[b.id]=(P.stacks[b.id]||0)+1;
    bumpSeen('card',b.id);refreshStacks();
    toast('祝福 '+b.n,'good');sfx('level');
    finishDawn();
  }
}
function skipDawn(){
  if(S.mode!=='dawn')return;
  if(S.dawnStep===0){S.dawnStep=1;renderDawn();sfx('ui');}
  else finishDawn();
}
function finishDawn(){
  showOv('dawnOv',false);S.mode='play';
  const before=DECK.hand.length;
  const full=drawToFull();
  const cap=Math.min(handCap(),DECK.max+P.bonusDraw);
  const extra=drawN(P.bonusDraw,cap);
  const n=full+extra;
  const hasCards=DECK.draw.length+DECK.discard.length>0;
  let blocked=P.bonusDraw-extra;
  if(before>=DECK.max&&blocked===0&&hasCards)blocked=1;
  S.handDirty=true;
  banner(`第 ${S.day} 日`,'黎明 · 抽 '+n+' 张','');
  if(n)toast('抽入 '+n+' 张牌','good');
  if(blocked>0&&DECK.hand.length>=DECK.max&&hasCards)
    offerSwap(Math.min(blocked,DECK.hand.length),'黎明抽牌 · 手牌已满');
  autoSave(); // 黎明选择已落地，此处是干净的第 N 日检查点
}
$('dawnSkip').addEventListener('click',skipDawn);

/* ---------------- 胜负 ---------------- */
function stopEmberTimer(){clearInterval(emberTimer);emberTimer=null;}
function awardEmbers(win){
  const st=S.stats;
  const em=TUNE.ember;
  let e=st.nights*em.perNight+Math.floor(st.kills/em.killsDiv)+(win?em.winBonus:0);
  return Math.round(e*DIFFS[save.diff].ember);
}
// 胜负一旦确定即结算并写档；S.settled 同时是幂等闸门与展示快照
function settle(win){
  if(S.settled)return S.settled;
  const st=S.stats;
  if(S.endless&&S.endlessBase){
    // 无尽阶段只补发胜利基线之后的增量：不重复 +12、不重复 wins++、DIFFS 只施加一次
    const b=S.endlessBase;
    const em=TUNE.ember;
    const delta=em.perNight*(st.nights-b.nights0)+Math.floor(st.kills/em.killsDiv)-Math.floor(b.kills0/em.killsDiv);
    const e=Math.round(delta*DIFFS[save.diff].ember);
    save.embers+=e;
    save.best.nights=Math.max(save.best.nights,st.nights);
    save.best.kills=Math.max(save.best.kills,st.kills);
    persist();clearActiveSlot(); // 本局已结束，清掉对应存档位
    S.settled={win,embers:e,nights0:b.nights0,kills0:b.kills0,incremental:true};
    return S.settled;
  }
  const e=awardEmbers(win);
  save.embers+=e;
  save.best.nights=Math.max(save.best.nights,st.nights);
  save.best.kills=Math.max(save.best.kills,st.kills);
  if(win)save.best.wins++;
  persist();clearActiveSlot();
  S.settled={win,embers:e,nights0:st.nights,kills0:st.kills};
  return S.settled;
}
function freezeBattle(){
  shots.length=0;warns.length=0;
  core.hp=clamp(core.hp,0,core.max);
  stopEmberTimer();
}
function winRun(){S.mode='launch';S.launchT=0;S.win=true;freezeBattle();settle(true);banner('方舟启航','','');sfx('victory');}
function loseRun(){
  S.mode='over';S.overT=1.3;S.win=false;freezeBattle();settle(false);
  puff(core.x,core.y,60,'#ff8a3d',5,1.2,5);ring(core.x,core.y,'rgba(255,77,109,.9)',.5,6,1);
  shake(14);sfx('defeat');
}
function continueEndless(){
  if(!S.settled||!S.settled.win)return;
  S.endlessBase={nights0:S.settled.nights0,kills0:S.settled.kills0};
  S.settled=null;S.endless=true;
  showOv('endOv',false);stopEmberTimer();blurFocus();
  S.launchT=0;S.overT=0;S.win=false;
  S.aimUid=null;S.dragUid=null;S.dragPointerId=null;S.dragStart=[0,0];
  dragBuildType=null;$('dragCard').style.display='none';
  enterNextDay();
}
let emberTimer=null;
function showEnd(win){
  S.mode='end';
  if(!S.settled)settle(win); // 兜底：正常路径在判胜/判负瞬间已结算
  const e=S.settled.embers,realWin=S.settled.win,st=S.stats;
  $('endTitle').textContent=realWin?'方舟启航':'灯熄雾海';
  $('endTitle').className=realWin?'win':'lose';
  $('endSub').textContent=realWin?(S.endless?'远航已完成 · 守护继续':'七夜已过'):(S.endless?'无尽守护结束':'核心陷落');
  const cells=[[st.nights+(S.endless?' / ∞':' / 7'),'夜晚'],[st.kills,'击杀'],[st.gathered,'采集'],
    ['Lv.'+st.level,'等级'],[st.played,'出牌'],[DECK.recycle+'%','回收率']];
  $('statsGrid').innerHTML=cells.map(c=>`<div class="statCell"><b>${c[0]}</b><span>${c[1]}</span></div>`).join('');
  $('emberTotal').textContent=`（库存 ${save.embers}）`;
  $('btnEndless').style.display=(realWin&&!S.endless)?'':'none';
  showOv('endOv',true);
  let cur=0;stopEmberTimer();
  emberTimer=setInterval(()=>{
    cur=Math.min(e,cur+Math.max(1,Math.ceil(e/30)));
    $('emberGain').textContent='+'+cur;
    if(cur>=e)clearInterval(emberTimer);
  },40);
}

