'use strict';
/* ---------------- 状态 ---------------- */
const P={},res={wood:0,stone:0,crys:0};
const DECK={draw:[],hand:[],discard:[],max:5,recycle:0,uid:1};
const S={mode:'menu',phase:'day',day:1,timeLeft:70,toSpawn:0,nightTotal:0,nightKilled:0,spawnT:0,
  speed:1,hitstop:0,launchT:0,overT:0,win:false,nightAmt:0,stats:null,hints:{},elapsed:0,combatT:0,
  aimUid:null,dragUid:null,dragMoved:false,dragStart:[0,0],dragPointerId:null,
  endless:false,endlessBase:null,settled:null,handDirty:true,dawnStep:0,dawnCards:[],dawnBless:[],
  pendingSalvage:null};
const DAY_LEN=70,MAX_NIGHT=7,HAND_CAP=10,REC_CAP=80,FOE_CAP=44;
/* 个人测试作弊码（仅个人测试用，不在页面呈现任何入口或文案）
   暂停时键入 l3131 切换：雾爆伤害 ×10（提升至 1000%）、范围 ×10（提升 1000%）。 */
const CHEAT={code:'l3131',buf:'',on:false,dmg:10,rad:10};
const novaDmgValue=()=>TUNE.nova.dmg*P.novaMult*(CHEAT.on?CHEAT.dmg:1);
const novaRadius=()=>TUNE.nova.radius*(1+TUNE.nova.radiusPer*(P.stacks.nova||0))*(CHEAT.on?CHEAT.rad:1);
// 无尽段难度渐近封顶；day<=MAX_NIGHT 时必须与原公式逐值恒等
const effDay=day=>day<=MAX_NIGHT?day:MAX_NIGHT+5*(1-Math.exp(-(day-MAX_NIGHT)/14));
const dayScale=day=>1+.13*(effDay(day)-1);

function resetPlayer(){
  const b=save.bless;
  Object.assign(P,{x:CEN+2.2,y:CEN+.5,hp:100+15*b.iron,maxHp:100+15*b.iron,en:100,maxEn:100,
    lvl:1,xp:0,next:24,dmg:12*(1+.08*b.blade),atkCd:0,atkSpd:1,range:1.75,spd:4.3,face:0,moving:false,
    dashT:0,dashCd:0,dashCdMax:1.6,dashDx:0,dashDy:0,ifr:0,downed:false,respT:0,
    crit:0,ls:0,thorns:0,wave:0,magnet:2.3,gather:1,towerMult:1,novaMult:1,regen:1,bonusDraw:0,
    cls:null,shield:0,regenAcc:0,enRegenFlat:14,spellCd:0,charge:0,chargeAcc:0,arcCharge:0,arcDiscount:false,
    resoElem:null,resoN:0,stormCount:0,empowerN:0,empowerT:0,nirvanaUsed:false,
    aff:{fire:0,frost:0,arcane:0,lightning:0},
    stacks:{},anim:0,hurtT:0,swingT:0});
}
function initRun(){
  genWorld();
  builds=[];foes=[];shots=[];picks=[];parts=[];floats=[];slashes=[];ghosts=[];warns=[];
  core.hp=core.max=TUNE.core.max;core.flash=0;core.beam=0;
  resetPlayer();
  res.wood=24+20*save.bless.stock;res.stone=14+20*save.bless.stock;res.crys=4;
  Object.assign(S,{phase:'day',day:1,timeLeft:DAY_LEN,toSpawn:0,nightTotal:0,nightKilled:0,spawnT:0,
    hitstop:0,launchT:0,overT:0,win:false,nightAmt:0,elapsed:0,combatT:0,hints:{},aimUid:null,dragUid:null,
    dragMoved:false,dragStart:[0,0],dragPointerId:null,endless:false,endlessBase:null,settled:null,
    handDirty:true,dawnStep:0,pendingSalvage:null,
    stats:{kills:0,gathered:0,dmg:0,nights:0,level:1,played:0}});
  DECK.draw=[];DECK.hand=[];DECK.discard=[];DECK.max=5;DECK.recycle=0;DECK.uid=1;
  const starter=['wall','wall','wall','tower','tower','totem','rain','spring','tactic'];
  starter.forEach(id=>DECK.draw.push(mkCard(id)));
  shuffle(DECK.draw);
  // 开局保底：手中必有木墙与箭塔
  const take=id=>{const i=DECK.draw.findIndex(c=>c.id===id);if(i>=0)DECK.hand.push(DECK.draw.splice(i,1)[0]);};
  take('wall');take('tower');
  while(DECK.hand.length<DECK.max&&DECK.draw.length)DECK.hand.push(DECK.draw.pop());
  cam.x=P.x;cam.y=P.y;cam.shake=0;
  UI.toasts.innerHTML='';
  auPhase(false);refreshRes();renderHand();
  rebuildSolids();rebuildTileCost();fieldDirty=true;
}
function mkCard(id){return {uid:DECK.uid++,id};}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=irand(0,i);const t=a[i];a[i]=a[j];a[j]=t;}}
function drawOne(cap){
  if(DECK.hand.length>=(cap===undefined?DECK.max:cap))return false;
  if(!DECK.draw.length){
    if(!DECK.discard.length)return false;
    DECK.draw=DECK.discard;DECK.discard=[];shuffle(DECK.draw);
  }
  DECK.hand.push(DECK.draw.pop());S.handDirty=true;return true;
}
function drawToFull(){let n=0;while(DECK.hand.length<DECK.max&&drawOne())n++;if(n)sfx('draw');return n;}
function drawN(n,cap){let c=0;for(let i=0;i<n;i++){if(drawOne(cap))c++;else break;}if(c)sfx('draw');return c;}
function afford(def){
  if(def.mana&&P.en<effManaCost(def))return false;
  for(const k in def.cost)if(res[k]<def.cost[k])return false;
  return true;
}
function payCost(def){
  for(const k in def.cost)res[k]-=def.cost[k];
  if(def.mana){
    const c=effManaCost(def);
    P.en=Math.max(0,P.en-c);
    if(P.arcDiscount)P.arcDiscount=false;
  }
  refreshRes();
}
function cardTotal(id){
  let n=0;
  for(const p of [DECK.draw,DECK.hand,DECK.discard])for(const c of p)if(c.id===id)n++;
  return n;
}
function purgeCard(id){
  for(const p of [DECK.draw,DECK.hand,DECK.discard])
    for(let i=p.length-1;i>=0;i--)if(p[i].id===id)p.splice(i,1);
  if(S.aimUid&&!DECK.hand.some(c=>c.uid===S.aimUid))S.aimUid=null;
  S.handDirty=true;
}
function poolIds(){
  return CIDS.filter(id=>{
    const d=CDEFS[id];
    if(d.cls==='class')return false;
    if(d.core)return false;
    if(d.cls==='mage'&&!isMage()&&!d.basic)return false;
    if(id==='expand'&&DECK.max>=handCap())return false;
    if(d.tier&&DECK.recycle>=REC_CAP)return false;
    if(id==='manawell'&&builds.filter(b=>b.type==='manawell').length>=3)return false;
    return true;
  });
}
function rollRewards(n){
  const ids=poolIds(),bag=[];
  ids.forEach(id=>{
    const d=CDEFS[id];
    let w=isMage()?d.w:(d.wNonMage??d.w);
    if(S.day>=3&&(id==='cannon'||id==='mine'))w+=6;
    if(S.day>=4&&id==='salvage20')w+=3;
    for(let i=0;i<w;i++)bag.push(id);
  });
  const out=[];let guard=0;
  while(out.length<Math.min(n,ids.length)&&bag.length&&guard++<500){
    const id=bag[irand(0,bag.length-1)];
    if(!out.includes(id))out.push(id);
  }
  return out;
}

/* ---------------- 单局快照 ----------------
   const 对象只能原地恢复，禁止对 S/P/DECK/res 重新赋值。 */
const S_SAVE_FIELDS=['mode','phase','day','timeLeft','toSpawn','nightTotal','nightKilled','spawnT','speed',
  'nightAmt','win','elapsed','combatT','stats','hints','endless','endlessBase','settled',
  'dawnStep','dawnCards','dawnBless','pendingSalvage','swapLeft','swapReason'];
function _pickFields(src,keys){const out={};for(const k of keys)if(k in src)out[k]=src[k];return out;}
function _clone(v){return JSON.parse(JSON.stringify(v));}

function captureSnapshot(){
  const sd=_pickFields(S,S_SAVE_FIELDS);
  // BLESSINGS 条目带函数 f，不能序列化：只存 id，恢复时回绑原对象
  sd.dawnBless=(S.dawnBless||[]).map(b=>b&&b.id).filter(Boolean);
  if(!Array.isArray(sd.dawnCards))sd.dawnCards=[];
  if(!sd.stats)sd.stats=S.stats?_clone(S.stats):{};
  const pd=_pickFields(P,Object.keys(P));
  const cards=a=>a.map(c=>({uid:c.uid,id:c.id})).slice(0,240);
  const plain=(a,cap)=>a.map(o=>_clone(o)).slice(0,cap);
  return _clone({
    seed,nodes:plain(nodes,240),fogBlobs:plain(fogBlobs,40),
    S:sd,P:pd,res:_clone(res),
    DECK:{draw:cards(DECK.draw),hand:cards(DECK.hand),discard:cards(DECK.discard),
      max:DECK.max,recycle:DECK.recycle,uid:DECK.uid},
    core:{hp:core.hp,max:core.max},builds:plain(builds,200),
    foes:plain(foes,44),warns:plain(warns,80),shots:plain(shots,240)
  });
}
function _putObj(dst,src){for(const k in dst)delete dst[k];Object.assign(dst,src);}
function _putArr(dst,src){dst.length=0;for(const x of src)dst.push(x);}
function restoreSnapshot(s){
  if(!s||typeof s!=='object')return false;
  const d=_clone(s);
  // 地形由 seed 完全决定；nodes/fogBlobs 含随机摆放，必须覆盖 genWorld 重新掷出的结果
  genWorld(d.seed);
  _putArr(nodes,d.nodes.map(n=>_clone(n)));
  _putArr(fogBlobs,d.fogBlobs.map(b=>_clone(b)));
  rebuildSolids();rebuildTileCost();fieldDirty=true;
  const sd=d.S;
  sd.dawnBless=Array.isArray(sd.dawnBless)?sd.dawnBless.map(id=>BLESSINGS.find(b=>b.id===id)).filter(Boolean):[];
  if(sd.mode!=='dawn')sd.mode='play';
  Object.assign(sd,{hitstop:0,launchT:0,overT:0,aimUid:null,dragUid:null,dragMoved:false,
    dragStart:[0,0],dragPointerId:null,handDirty:true,pendingSalvage:null,swapLeft:0,swapReason:''});
  _putObj(S,sd);
  const pd=d.P;
  Object.assign(pd,{anim:0,hurtT:0,swingT:0,moving:false});
  _putObj(P,pd);
  _putObj(res,d.res);
  _putObj(DECK,d.DECK);
  core.hp=d.core.hp;core.max=d.core.max;core.flash=0;core.beam=0;
  _putArr(builds,d.builds.map(o=>_clone(o)));
  _putArr(foes,d.foes.map(o=>_clone(o)));
  _putArr(warns,d.warns.map(o=>_clone(o)));
  _putArr(shots,d.shots.map(o=>_clone(o)));
  nodes.forEach(n=>{n.shake=0;});
  cam.x=P.x;cam.y=P.y;cam.z=cam.tz=1.8;cam.shake=cam.sx=cam.sy=0;
  _putArr(picks,[]);_putArr(parts,[]);_putArr(floats,[]);_putArr(slashes,[]);_putArr(ghosts,[]);
  rebuildFoeGrid();fieldDirty=true;S.handDirty=true;
  return true;
}

