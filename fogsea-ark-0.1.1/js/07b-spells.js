'use strict';
/* ---------------- 法师 / 法术 ----------------
   法师是单局职业：P.cls==='mage'。非法师也能拿到基础法术，
   但使用原有雾能，且不获得法师天赋与核心牌。 */

const CORE_CARDS={
  fire:['sp_flameimpact','sp_flamedetonate'],
  frost:['sp_blizzard','sp_frostring'],
  arcane:['sp_magicmissile']
};

function isMage(){return P.cls==='mage';}
function tLv(id){return P.stacks[id]||0;}
// 施法距离唯一来源：放置校验与法术索敌都走这里，避免两处公式漂移
const spellCastRange=()=>TUNE.spell.range*(1+TUNE.spell.reachPer*tLv('t_reach'));
function handCap(){return HAND_CAP+(isMage()?MAGE_TUNE.handAdd:0);}
function manaRegenRate(){return P.enRegenFlat*P.regen*(1+TALENT_TUNE.t_spring.regen*tLv('t_spring'));}
function moveSpeedMult(){
  const t=TALENT_TUNE.t_manaturb;
  return isMage()&&P.en>=P.maxEn*t.threshold?1+t.move*tLv('t_manaturb'):1;
}
function castSpeedMult(){
  const t=TALENT_TUNE.t_manaturb;
  let m=1;
  if(isMage()&&P.en>=P.maxEn*t.threshold)m*=1+t.cast*tLv('t_manaturb');
  if(P.empowerN>0)m*=1+TALENT_TUNE.t_surge.speed;
  return m;
}
function shieldCapNow(){
  return Math.max(TALENT_TUNE.t_regenshield.capRatio*P.maxEn*tLv('t_regenshield'),
    TALENT_TUNE.t_iceshield.cap*tLv('t_iceshield'));
}
function gainShield(v){
  if(!isMage()||v<=0)return;
  P.shield=Math.min(shieldCapNow(),P.shield+v);
}
function gainMana(v){
  if(v<=0)return 0;
  const before=P.en;
  P.en=Math.min(P.maxEn,P.en+v);
  const gained=P.en-before;
  if(gained>0&&isMage()){
    const l=tLv('t_regenshield');
    if(l>0){
      P.regenAcc+=gained*TALENT_TUNE.t_regenshield.convert*l;
      const add=Math.floor(P.regenAcc);
      if(add>0){P.regenAcc-=add;gainShield(add);}
    }
  }
  return gained;
}
function effManaCost(def){
  let c=def.mana||0;
  if(def.elem==='arcane')c-=TALENT_TUNE.t_arcsave.flat*tLv('t_arcsave');
  if(P.arcDiscount)c-=TALENT_TUNE.t_arcmaster.discount;
  c*=1-TALENT_TUNE.t_econ.cost*tLv('t_econ');
  return def.mana?Math.max(1,Math.round(c)):0;
}

function becomeMage(){
  if(isMage())return false;
  const ratio=P.maxHp>0?P.hp/P.maxHp:1;
  P.cls='mage';
  P.maxHp=Math.max(1,Math.round(P.maxHp*MAGE_TUNE.hpMul));
  P.hp=Math.min(P.maxHp,Math.max(1,Math.round(P.maxHp*ratio)));
  P.maxEn+=MAGE_TUNE.manaAdd;
  P.en=P.maxEn;
  P.enRegenFlat+=MAGE_TUNE.regenAdd;
  DECK.max=Math.min(handCap(),DECK.max+MAGE_TUNE.handAdd);
  ['sp_fireball','sp_frostbolt','sp_arcbolt','sp_emberburst','manawell']
    .forEach(id=>DECK.discard.push(mkCard(id)));
  P.aff.fire+=2;P.aff.frost+=1;P.aff.arcane+=1;
  purgeCard('class_mage');
  P.spellCd=0;
  S.handDirty=true;
  refreshStacks();
  toast('转职 · 法师','good');sfx('level');
  banner('法师','以法力驾驭元素','');
  return true;
}

function injectClassCard(cards){
  if(isMage()||!cards||!cards.length)return cards;
  if(S.day===2){
    cards[Math.min(1,cards.length-1)]='class_mage';
  }else if(S.day===3&&Math.random()<.40){
    cards[0]='class_mage';
  }else if(S.day===4&&Math.random()<.15){
    cards[0]='class_mage';
  }
  return cards;
}

function coreElementChance(elem){
  return Math.min(.20,.01+.012*(P.aff[elem]||0));
}
function injectCoreCards(cards){
  if(!isMage()||!cards||!cards.length)return cards;
  const pf=coreElementChance('fire'),pfr=coreElementChance('frost'),pa=coreElementChance('arcane');
  const total=Math.min(.30,pf+pfr+pa);
  if(total<=0||Math.random()>=total)return cards;
  let r=Math.random()*total,elem='fire';
  if(r<pf)elem='fire';
  else if(r<pf+pfr)elem='frost';
  else elem='arcane';
  const pool=(CORE_CARDS[elem]||[]).filter(id=>cardTotal(id)===0);
  if(!pool.length)return cards;
  const id=pool[irand(0,pool.length-1)];
  const slots=[1,2].filter(i=>i<cards.length);
  if(!slots.length)return cards;
  cards[slots[irand(0,slots.length-1)]]=id;
  return cards;
}

function spellTargets(def,tx,ty){
  const out=[];
  if(def.shape==='global'){
    for(const f of foes)if(!f.dead)out.push(f);
    return out;
  }
  if(def.shape==='multi'){
    const list=[];
    const range=spellCastRange();
    forFoes(P.x,P.y,range,f=>{if(!f.dead&&dist(P.x,P.y,f.x,f.y)<range+f.r)list.push(f);});
    list.sort((a,b)=>dist(P.x,P.y,a.x,a.y)-dist(P.x,P.y,b.x,b.y));
    if(!list.length)return out;
    const n=Math.min(def.missiles||3,list.length);
    for(let i=0;i<n;i++)out.push(list[i]);
    return out;
  }
  const cx=def.shape==='self'?P.x:tx,cy=def.shape==='self'?P.y:ty;
  const R=def.radius||1.5;
  forFoes(cx,cy,R,f=>{
    if(!f.dead&&dist(cx,cy,f.x,f.y)<R+f.r)out.push(f);
  });
  return out;
}

function spellMult(elem,f,overflow){
  const T=TALENT_TUNE;
  let m=1;
  if(elem==='fire')m*=1+T.t_firemaster.dmg*tLv('t_firemaster');
  else if(elem==='frost')m*=1+T.t_frostmaster.dmg*tLv('t_frostmaster');
  else if(elem==='arcane')m*=1+T.t_arcanemaster.dmg*tLv('t_arcanemaster');
  if(isMage()&&overflow)m*=1+T.t_manadmg.overflow*tLv('t_manadmg');
  if(isMage()&&tLv('t_resonance')>0)m*=1+T.t_resonance.per*P.resoN;
  if(f&&(f.markT||0)>0)m*=1+ST_DEF.mark.amp;
  if(f&&(f.freezeT||0)>0)m*=1+T.t_shatter.freeze*tLv('t_shatter');
  else if(f&&(f.chillT||0)>0)m*=1+T.t_shatter.chill*tLv('t_shatter');
  if(isMage())m*=1+T.t_charge.per*P.charge;
  return m;
}

function spellFx(def,tx,ty,elem,targets){
  const col=ELEMCOL[elem]||'#eef7f2';
  const cx=def.shape==='self'?P.x:tx,cy=def.shape==='self'?P.y:ty;
  const fxShape=elem==='fire'?'spark':elem==='frost'?'shard':elem==='arcane'?'rune':null;
  if(def.shape==='global')ring(P.x,P.y,col,.2,4.2,.55);
  else if(def.shape==='multi')ring(P.x,P.y,col,.2,1.3,.32);
  else ring(cx,cy,col,.2,def.radius||1.5,.45);
  puff(cx,cy,12,col,3,.55,3,0,fxShape);
  if(def.shape==='multi')for(const f of (targets||[]))puff(f.x,f.y,5,col,2.2,.4,2,0,fxShape);
  if((def.mana||0)>=45)shake(4);
  sfx(elem==='fire'?'fire':elem==='frost'?'frost':elem==='arcane'?'arcane':'cast');
}

function castSpell(def,tx,ty,overflow=isMage()&&P.en>P.maxEn*.8){
  const elem=def.elem;
  const speed=castSpeedMult();
  const targets=spellTargets(def,tx,ty);
  for(const f of targets){
    if(!f||f.dead)continue;
    let dmg=def.dmg||0;
    if(def.shape==='consume')dmg=(f.burnStacks||0)*dmg;
    dmg*=spellMult(elem,f,overflow);
    const crit=Math.random()<P.crit;
    if(crit)dmg*=2;
    if(dmg>0)damageFoe(f,dmg,Math.atan2(f.y-P.y,f.x-P.x),crit,{elem});
    if(def.status&&!f.dead)applyElement(f,elem,def.status.n,def.status.kind);
    else if(def.id==='sp_flamedetonate'){
      triggerElementReaction(f,elem);
      f.lastElem=elem;f.lastElemT=S.combatT;
      f.burnStacks=0;f.burnT=0;f.burnTick=0;
    }
  }
  if(isMage()&&elem==='arcane'&&tLv('t_arcecho')>0&&Math.random()<TALENT_TUNE.t_arcecho.chance){
    for(const f of targets){
      if(!f||f.dead)continue;
      let dmg=def.dmg||0;
      if(def.shape==='consume')dmg=(f.burnStacks||0)*dmg;
      dmg*=.5*spellMult(elem,f,overflow);
      if(dmg>0)damageFoe(f,dmg,Math.atan2(f.y-P.y,f.x-P.x),false);
    }
  }
  if(isMage()&&elem==='frost'&&tLv('t_iceshield')>0)gainShield(TALENT_TUNE.t_iceshield.per*tLv('t_iceshield'));
  spellFx(def,tx,ty,elem,targets);
  if(isMage())spellCastSideEffects(elem,def);
  P.spellCd=MAGE_TUNE.spellGcd/speed;
  return targets.length>0;
}

function spellCastSideEffects(elem,def){
  if(P.empowerN>0)P.empowerN=Math.max(0,P.empowerN-1);
  const T=TALENT_TUNE;
  if(tLv('t_resonance')>0){
    if(P.resoElem===elem)P.resoN=Math.min(T.t_resonance.max,P.resoN+1);
    else{P.resoElem=elem;P.resoN=0;}
  }
  const am=tLv('t_arcmaster'),ac=tLv('t_arccharge');
  const inc=am+(elem==='arcane'?ac+(am>0?1:0):0);
  if(inc>0){
    P.arcCharge+=inc;
    const every=T.t_arcmaster.every;
    if(P.arcCharge>=every){P.arcCharge-=every;P.arcDiscount=true;}
  }
  if(tLv('t_storm')>0){
    P.stormCount++;
    if(P.stormCount>=T.t_storm.every){P.stormCount=0;triggerElementStorm();}
  }
  if((def.mana||0)>=T.t_surge.cost&&tLv('t_surge')>0){P.empowerN=T.t_surge.stacks;P.empowerT=T.t_surge.duration;}
}

function triggerElementStorm(){
  const elems=['fire','frost','arcane'];
  const elem=elems[irand(0,elems.length-1)];
  for(const f of foes){
    if(f.dead)continue;
    damageFoe(f,TALENT_TUNE.t_storm.dmg,0,false,{noKnock:true});
    if(!f.dead)applyElement(f,elem,1);
  }
  ring(P.x,P.y,'rgba(141,141,214,.9)',.3,5.2,.65);
  puff(P.x,P.y,28,'#8d8dd6',5,.75,4,0,'rune');
  shake(8);sfx('boom');
}

function applyStatus(f,kind,n){
  if(!f||f.dead)return;
  n=n||1;
  if(kind==='burn'){
    f.burnStacks=Math.min(ST_DEF.burn.max,(f.burnStacks||0)+n);
    f.burnT=ST_DEF.burn.dur;
    if(!f.burnTick)f.burnTick=ST_DEF.burn.tick;
  }else if(kind==='chill'){
    f.chillStacks=Math.min(ST_DEF.chill.max,(f.chillStacks||0)+n);
    f.chillT=ST_DEF.chill.dur+TALENT_TUNE.t_frostmaster.chillDur*tLv('t_frostmaster')
      +TALENT_TUNE.t_frostreach.chillDur*tLv('t_frostreach');
  }else if(kind==='freeze'){
    f.freezeT=Math.max(f.freezeT||0,(f.boss?ST_DEF.freeze.bossMul:ST_DEF.freeze.dur)
      +TALENT_TUNE.t_frostreach.freezeDur*tLv('t_frostreach'));
    f.kx=0;f.ky=0;
  }else if(kind==='mark'){
    f.markT=ST_DEF.mark.dur;
  }else if(kind==='shock'){
    if(ST_DEF.shock.enabled)f.shockT=ST_DEF.shock.dur;
  }
}

function triggerElementReaction(f,elem){
  if(!f||!isMage()||tLv('t_fusion')<=0)return;
  const prev=f.lastElem,tt=S.combatT,prevT=f.lastElemT===undefined?-99:f.lastElemT;
  if(prev&&prev!==elem&&tt-prevT<=TUNE.reaction.window&&(f.reactCd||0)<=0){
    const key=[prev,elem].sort().join('|');
    const rx=RX_DEF[key];
    if(rx&&rx.enabled){
      triggerReaction(f,rx,prev,elem);
      f.reactCd=TUNE.reaction.cooldown;
    }
  }
}
function applyElement(f,elem,n,kind){
  if(!f||f.dead)return;
  const st=kind||(elem==='fire'?'burn':elem==='frost'?'chill':'mark');
  applyStatus(f,st,n);
  triggerElementReaction(f,elem);
  f.lastElem=elem;
  f.lastElemT=S.combatT;
}

function triggerReaction(f,rx,prev,elem){
  const t=TALENT_TUNE.t_fusion;
  const m=1+t.dmg*tLv('t_fusion');
  const R=rx.radius*(1+t.radius*tLv('t_fusion'));
  if(rx.id==='steam'){
    const dmg=rx.dmg*m;
    damageFoe(f,dmg,0,false,{noKnock:true});
    if(!f.dead){const a=Math.atan2(f.y-P.y,f.x-P.x);f.kx+=Math.cos(a)*4;f.ky+=Math.sin(a)*4;}
    forFoes(f.x,f.y,R,o=>{
      if(o===f||o.dead||dist(f.x,f.y,o.x,o.y)>=R+o.r)return;
      damageFoe(o,dmg*.5,Math.atan2(o.y-f.y,o.x-f.x),false,{noKnock:true});
    });
    ring(f.x,f.y,'rgba(235,250,255,.9)',.2,R,.5);
    puff(f.x,f.y,22,'#dffaff',4,.6,3,0,'soft');
    floater(f.x,f.y,'蒸汽',  '#dffaff',true);
    sfx('boom');shake(4);
  }else if(rx.id==='reso'){
    const dmg=rx.dmg*m;
    damageFoe(f,dmg,0,false,{noKnock:true});
    const other=prev==='arcane'?elem:prev;
    const st=other==='fire'?'burn':other==='frost'?'chill':'mark';
    forFoes(f.x,f.y,R,o=>{
      if(o===f||o.dead||dist(f.x,f.y,o.x,o.y)>=R+o.r)return;
      applyStatus(o,st,1);
      damageFoe(o,dmg*.5,Math.atan2(o.y-f.y,o.x-f.x),false,{noKnock:true});
    });
    ring(f.x,f.y,'rgba(141,141,214,.9)',.2,R,.45);
    puff(f.x,f.y,16,'#8d8dd6',3,.5,3,0,'rune');
    floater(f.x,f.y,'共鸣','#8d8dd6',true);
    sfx('nova');
  }
}

function updateFoeStatus(f,dt){
  f.reactCd=Math.max(0,(f.reactCd||0)-dt);
  if((f.burnT||0)>0){
    f.burnT-=dt;
    f.burnTick=(f.burnTick||ST_DEF.burn.tick)-dt;
    while(f.burnTick<=0&&(f.burnT||0)>0&&!f.dead){
      f.burnTick+=ST_DEF.burn.tick;
      const dps=(f.burnStacks||0)*ST_DEF.burn.dps*(1+TALENT_TUNE.t_firemaster.burn*tLv('t_firemaster'));
      damageFoe(f,dps*ST_DEF.burn.tick,0,false,{dot:true,noKnock:true});
    }
    if((f.burnT||0)<=0){f.burnT=0;f.burnStacks=0;f.burnTick=0;}
  }
  if((f.chillT||0)>0){
    f.chillT-=dt;
    if(f.chillT<=0){f.chillT=0;f.chillStacks=0;}
  }
  if((f.freezeT||0)>0)f.freezeT=Math.max(0,f.freezeT-dt);
  if((f.markT||0)>0)f.markT=Math.max(0,f.markT-dt);
  if((f.shockT||0)>0)f.shockT=Math.max(0,f.shockT-dt);
}

function foeSlowMult(f){
  if(!(f.chillT||0))return 1;
  const per=ST_DEF.chill.slowPer+TALENT_TUNE.t_frostreach.slowAdd*tLv('t_frostreach');
  return Math.max(TALENT_TUNE.t_frostreach.slowCap,1-per*(f.chillStacks||0));
}

function updateSpellState(dt){
  P.spellCd=Math.max(0,P.spellCd-dt);
  if(!isMage())return;
  if(P.empowerT>0){
    P.empowerT=Math.max(0,P.empowerT-dt);
    if(P.empowerT<=0)P.empowerN=0;
  }
  const l=tLv('t_hastecharge');
  if(l>0){
    const t=TALENT_TUNE.t_hastecharge;
    P.chargeAcc+=dt*(manaRegenRate()/t.chargeDiv)*(1+t.perStack*l);
    const n=Math.floor(P.chargeAcc/t.step);
    if(n>0){P.chargeAcc-=n*t.step;P.charge=Math.min(TALENT_TUNE.t_charge.max,P.charge+n);}
  }
}
