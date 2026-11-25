'use strict';
/* ---------------- 数值总表 ----------------
   逻辑与图鉴共用同一份数值，消除「一处改、另一处忘」的漂移。
   新增敌人/状态/机制时优先在此登记，再让逻辑与图鉴按 id 引用。 */
const TUNE={
  core:{max:600,repair:{wood:10,stone:6,heal:70},dawnHeal:40,regen:1},
  node:{hits:{crys:3,rock:4,tree:3},yield:{crys:[3,5],tree:[4,6],rock:[4,6]},dropCap:8},
  // 地图物体放大倍率（树木/岩石/雾晶/建筑/怪物）；主角与核心灯塔不受影响
  // nodeScale/foeScale/buildScale 为视觉倍率；colScale 为碰撞倍率封顶值（再大会封死树林通道与怪物寻路）
  world:{nodeScale:6.405,foeScale:4.8,colScale:3.2},
  player:{atkInterval:.42},
  dash:{dur:.16,iframe:.28,mult:3.4},
  nova:{cost:60,dmg:30,radius:3.1,radiusPer:.12},
  down:{time:3,hpRatio:.6,crysKeep:.8,iframe:2,en:50},
  spell:{range:7.5,reachPer:.20},
  reaction:{window:2,cooldown:1.5},
  ember:{perNight:3,killsDiv:8,winBonus:12},
  resourceDrop:{tree:'wood',rock:'stone',crys:'crys'},
  statusNames:{burn:'灼烧',chill:'冰缓',freeze:'冻结',mark:'奥术标记',shock:'感电'}
};
// 卡牌建筑视觉倍率＝树木倍率×0.5（比树木小 0.5 倍），随 nodeScale 自动同步
TUNE.world.buildScale=TUNE.world.nodeScale*.5;
/* ---------------- 建筑 & 敌人定义 ---------------- */
const BUILDS={
  wall:{name:'木墙',hp:130,r:.46},
  tower:{name:'箭塔',hp:95,r:.42,range:5.6,dmg:9,rate:.85},
  totem:{name:'愈灵图腾',hp:75,r:.36,range:3.2},
  cannon:{name:'雾晶炮',hp:115,r:.46,range:6.6,dmg:26,rate:2.4},
  manawell:{name:'法力之井',hp:80,r:.40,range:3.4,regen:3}
};
/* enemy meta：firstNight / crysDrop 供刷怪与图鉴共用；
   spitter 的射击参数、boss 的召唤与践踏参数一并归入，新增敌人只需在此登记。 */
const FOES={
  crawler:{name:'雾裔爬行者',icon:'crawler',color:'#a06bff',spriteScale:1.5,
    desc:'最常见的雾潮单位，成群直扑核心。数量是它唯一的武器。',rel:['core','c_cannon','tide'],
    hp:26,spd:2.3,dmg:6,r:.32,xp:5,coreDmg:6,firstNight:1,crysDrop:1},
  spitter:{name:'掷雾者',icon:'spitter',color:'#c9a8ff',spriteScale:1.5,
    desc:'悬浮远程单位，保持距离吐出雾弹。雾弹会被建筑挡下。',rel:['c_wall','dash','c_ward'],
    hp:22,spd:1.8,dmg:8,r:.3,xp:7,coreDmg:8,firstNight:2,crysDrop:2,
    fireInterval:2.3,fireRange:7.6,keepAway:6.8,closeIn:3.6},
  brute:{name:'雾兽',icon:'brute',color:'#8b5fd6',spriteScale:1.25,
    desc:'披甲巨兽，优先啃噬挡路建筑，对核心伤害极高。',rel:['c_wall','c_tower','nova'],
    hp:95,spd:1.25,dmg:16,r:.5,xp:12,coreDmg:18,firstNight:3,crysDrop:3},
  boss:{name:'雾潮之主',icon:'boss',color:'#ff4d6d',spriteScale:.82,
    desc:'每七夜重现的巨影。定期召唤爬行者，近身践踏。击溃它即可完成远航或继续守护。',
    rel:['seven','c_mine','c_cannon'],
    hp:900,spd:1.05,dmg:26,r:.85,xp:60,coreDmg:40,firstNight:7,crysDrop:12,
    summonFirst:5,summonInterval:6,summonCount:2,stompFirst:3,stompInterval:4,stompDmg:25,stompRange:2.4}
};

/* ---------------- 卡牌定义 ---------------- */
const KINDNAME={build:'构筑',instant:'瞬发',utility:'功能',class:'职业'};
const ELEMNAME={fire:'火',frost:'冰',arcane:'奥术',lightning:'雷'};
const ELEMCOL={fire:'#ffb454',frost:'#bfe3ff',arcane:'#8d8dd6',lightning:'#ffd98a'};
const MANA_UNIT=15;
const MAGE_TUNE={hpMul:.6,manaAdd:100,regenAdd:5,handAdd:2,spellGcd:.55};
const ST_DEF={
  burn:{max:10,dur:4,tick:.5,dps:3},
  chill:{max:3,dur:2.5,slowPer:.12},
  freeze:{dur:1,bossMul:.35},
  shock:{dur:2,amp:.2,enabled:false},
  mark:{dur:4,amp:.10}
};
const RX_DEF={
  'fire|frost':{id:'steam',name:'蒸汽爆炸',enabled:true,radius:2.0,dmg:30},
  'arcane|fire':{id:'reso',name:'共鸣扩散',enabled:true,radius:2.5,dmg:15},
  'arcane|frost':{id:'reso',name:'共鸣扩散',enabled:true,radius:2.5,dmg:15},
  'frost|lightning':{id:'paralyze',name:'范围麻痹',enabled:false,radius:2.5,freeze:1.5},
  'fire|lightning':{id:'overload',name:'过载',enabled:false,radius:2.5,dmg:45},
  'arcane|lightning':{id:'reso',name:'共鸣扩散',enabled:false,radius:2.5,dmg:15}
};
const CDEFS={
  wall:{id:'wall',kind:'build',build:'wall',name:'木墙',icon:'wall',color:'#e0b070',cost:{wood:8},
    desc:'筑起木墙阻挡雾裔。打出后卡牌回到弃牌堆，可再次抽到。',w:26},
  tower:{id:'tower',kind:'build',build:'tower',name:'箭塔',icon:'tower',color:'#8fe3d0',cost:{wood:12,stone:6},
    desc:'自动射击 5.6 格内最近雾裔，每 0.85 秒 9 点伤害。',w:24},
  totem:{id:'totem',kind:'build',build:'totem',name:'愈灵图腾',icon:'totem',color:'#6fe08a',cost:{wood:10,crys:4},
    desc:'每秒为 3.2 格内的守灯人恢复 4 点生命。',w:16},
  cannon:{id:'cannon',kind:'build',build:'cannon',name:'雾晶炮',icon:'cannon',color:'#57e6ff',cost:{stone:10,crys:10},
    desc:'重炮溅射 1.5 格，26 点伤害，专治成群爬行者。',w:14},
  rain:{id:'rain',kind:'instant',target:'point',name:'箭雨',icon:'rain',color:'#ffd166',cost:{wood:6,stone:4},
    radius:2.2,dmg:45,desc:'指定区域落下箭雨，2.2 格内 45 点伤害。夜晚可用。',w:15},
  mine:{id:'mine',kind:'instant',target:'point',name:'雾晶雷',icon:'mine',color:'#57e6ff',cost:{crys:6},
    radius:2.6,dmg:70,desc:'指定区域引爆雾晶，70 点伤害并强力击退。夜晚可用。',w:13},
  spring:{id:'spring',kind:'instant',target:'self',name:'愈灵之泉',icon:'heal',color:'#6fe08a',cost:{wood:6,crys:2},
    desc:'立刻恢复 45 点生命。夜晚可用。',w:15},
  mend:{id:'mend',kind:'instant',target:'self',name:'修补术',icon:'mend',color:'#ffb454',cost:{wood:8,stone:5},
    coreHeal:90,buildHeal:40,
    desc:'方舟核心 +90，全部建筑 +40 耐久。夜晚可用。',w:13},
  ward:{id:'ward',kind:'instant',target:'self',name:'灯焰护盾',icon:'ward',color:'#ffb454',cost:{crys:5},
    desc:'获得 4 秒无敌，穿过雾弹与包围。夜晚可用。',w:11},
  tactic:{id:'tactic',kind:'instant',target:'self',name:'战术重整',icon:'tactic',color:'#c9a8ff',cost:{wood:4},
    desc:'立刻抽 2 张牌。循环牌库的关键。',w:14},
  surge:{id:'surge',kind:'instant',target:'self',name:'雾能充盈',icon:'surge',color:'#57e6ff',cost:{crys:3},
    desc:'当前资源立即回满，冲刺冷却清零。',w:9},
  expand:{id:'expand',kind:'utility',target:'self',name:'扩容',icon:'expand',color:'#ffb454',cost:{wood:10,stone:6},
    desc:'手牌上限 +1（最高 10，法师 12），并立即抽 1 张。满上限后不再出现。',w:11},
  salvage5:{id:'salvage5',kind:'utility',target:'pick',name:'拆解·微光',icon:'salvage',color:'#6fe08a',cost:{},tier:5,
    desc:'回收率 +5%，移除一张牌并按回收率返还其造价（取整）。',w:11},
  salvage10:{id:'salvage10',kind:'utility',target:'pick',name:'拆解·熔解',icon:'salvage',color:'#8fe3d0',cost:{},tier:10,
    desc:'回收率 +10%，移除一张牌并按回收率返还其造价（取整）。',w:8},
  salvage20:{id:'salvage20',kind:'utility',target:'pick',name:'拆解·归墟',icon:'salvage',color:'#57e6ff',cost:{},tier:20,
    desc:'回收率 +20%，移除一张牌并按回收率返还其造价（取整）。',w:5},
  sp_fireball:{id:'sp_fireball',kind:'instant',target:'point',shape:'point',elem:'fire',cls:'mage',basic:true,
    name:'火球术',icon:'flame',color:ELEMCOL.fire,cost:{},mana:15,radius:1.6,dmg:20,
    status:{kind:'burn',n:2},desc:'指定区域 1.6 格内 20 火焰伤害，附加 2 层灼烧。',w:12,wNonMage:5},
  sp_frostbolt:{id:'sp_frostbolt',kind:'instant',target:'point',shape:'point',elem:'frost',cls:'mage',basic:true,
    name:'冰锥术',icon:'snow',color:ELEMCOL.frost,cost:{},mana:15,radius:1.6,dmg:16,
    status:{kind:'chill',n:1},desc:'指定区域 1.6 格内 16 冰霜伤害，附加 1 层冰缓。',w:12,wNonMage:5},
  sp_arcbolt:{id:'sp_arcbolt',kind:'instant',target:'point',shape:'point',elem:'arcane',cls:'mage',basic:true,
    name:'奥术冲击',icon:'rune',color:ELEMCOL.arcane,cost:{},mana:15,radius:1.4,dmg:18,
    status:{kind:'mark',n:1},desc:'指定区域 1.4 格内 18 奥术伤害，附加奥术标记。',w:12,wNonMage:5},
  sp_emberburst:{id:'sp_emberburst',kind:'instant',target:'point',shape:'point',elem:'fire',cls:'mage',basic:true,
    name:'余烬爆发',icon:'emberburst',color:ELEMCOL.fire,cost:{},mana:30,radius:2.2,dmg:30,
    status:{kind:'burn',n:2},desc:'指定区域 2.2 格内 30 火焰伤害，附加 2 层灼烧。',w:10,wNonMage:5},
  sp_flameimpact:{id:'sp_flameimpact',kind:'instant',target:'point',shape:'point',elem:'fire',cls:'mage',core:true,
    name:'烈焰冲击',icon:'flame',color:ELEMCOL.fire,cost:{},mana:45,radius:1.9,dmg:55,
    status:{kind:'burn',n:3},desc:'核心火系法术：1.9 格内 55 火焰伤害，附加 3 层灼烧。',w:0},
  sp_flamedetonate:{id:'sp_flamedetonate',kind:'instant',target:'point',shape:'consume',elem:'fire',cls:'mage',core:true,
    name:'火焰引爆',icon:'emberburst',color:ELEMCOL.fire,cost:{},mana:30,radius:2.6,dmg:12,
    desc:'引爆目标身上所有灼烧层数，每层造成 12 火焰伤害。',w:0},
  sp_blizzard:{id:'sp_blizzard',kind:'instant',target:'self',shape:'global',elem:'frost',cls:'mage',core:true,
    name:'暴风雪',icon:'snow',color:ELEMCOL.frost,cost:{},mana:45,dmg:26,
    status:{kind:'chill',n:2},desc:'核心冰系法术：对所有敌人造成 26 冰霜伤害，附加 2 层冰缓。',w:0},
  sp_frostring:{id:'sp_frostring',kind:'instant',target:'self',shape:'self',elem:'frost',cls:'mage',core:true,
    name:'冰封之环',icon:'snow',color:ELEMCOL.frost,cost:{},mana:30,radius:3.2,dmg:18,
    status:{kind:'freeze',n:1},desc:'核心冰系法术：冻结周围 3.2 格内敌人 1 秒并造成 18 冰霜伤害。',w:0},
  sp_magicmissile:{id:'sp_magicmissile',kind:'instant',target:'self',shape:'multi',elem:'arcane',cls:'mage',core:true,
    name:'魔法飞弹',icon:'rune',color:ELEMCOL.arcane,cost:{},mana:15,dmg:14,missiles:3,
    status:{kind:'mark',n:1},desc:'核心奥术法术：向最近 3 个敌人各发射 1 枚 14 伤害飞弹。',w:0},
  manawell:{id:'manawell',kind:'build',build:'manawell',cls:'mage',
    name:'法力之井',icon:'well',color:'#57e6ff',cost:{wood:10,crys:6},
    desc:'范围内每秒为守灯人回复 3 点法力，场上最多 3 座。',w:10},
  class_mage:{id:'class_mage',kind:'class',target:'self',cls:'class',name:'法师',icon:'mage',color:'#8d8dd6',cost:{},mana:0,
    desc:'职业启动器：转职为法师，以法力施法。生命上限降低，手牌上限提高。',w:0}
};
const CIDS=Object.keys(CDEFS);
// 手牌短文案：一次性注入到卡牌自身，显示层只读 def.brief，不再依赖独立表
const CARD_BRIEF={
  wall:'阻挡雾裔，卡牌可循环。',tower:'自动射击附近雾裔。',totem:'持续恢复附近玩家生命。',cannon:'范围爆炸伤害。',
  rain:'范围箭雨伤害。',mine:'范围伤害并击退。',spring:'恢复 45 点生命。',mend:'修复核心与建筑。',ward:'获得 4 秒无敌。',
  tactic:'抽取 2 张牌。',surge:'回满资源并重置冲刺。',expand:'手牌上限 +1。',
  salvage5:'回收率 +5%，移除一张牌。',salvage10:'回收率 +10%，移除一张牌。',salvage20:'回收率 +20%，移除一张牌。',
  sp_fireball:'范围火伤并附加灼烧。',sp_frostbolt:'范围冰伤并附加冰缓。',sp_arcbolt:'范围奥术伤害并标记。',
  sp_emberburst:'范围火伤并附加灼烧。',sp_flameimpact:'范围 55 火焰伤害。',sp_flamedetonate:'每层灼烧造成 12 伤害。',
  sp_blizzard:'全屏冰伤并附加冰缓。',sp_frostring:'冻结周围敌人。',sp_magicmissile:'攻击最近 3 个敌人。',
  manawell:'持续回复附近玩家法力。',class_mage:'转职法师，以法力施法。'
};
for(const id in CARD_BRIEF)if(CDEFS[id])CDEFS[id].brief=CARD_BRIEF[id];
const RESNAME={wood:'木',stone:'石',crys:'晶'};
const RESCOL={wood:'#e0b070',stone:'#b9c4c9',crys:'#57e6ff'};
const costStr=def=>{
  const parts=[];
  if(def.mana)parts.push(effManaCost(def)+(isMage()?'法':'雾'));
  for(const k of Object.keys(def.cost||{}))parts.push(def.cost[k]+RESNAME[k]);
  return parts.length?parts.join(' '):'免费';
};
const costHtml=(def,compact=false)=>{
  const parts=[];
  if(def.mana){
    const manaName=isMage()?'法力':'雾能';
    parts.push(compact
      ?`<b class="mana" data-mana="1" title="${effManaCost(def)}${manaName}" style="color:#8fb8ff">${svg(isMage()?'wick':'fog',12)}${effManaCost(def)}</b>`
      :`<b class="mana" data-mana="1" style="color:#8fb8ff">${effManaCost(def)}${isMage()?'法':'雾'}</b>`);
  }
  for(const k of Object.keys(def.cost||{})){
    if(compact){
      const label=k==='wood'?'木材':k==='stone'?'石料':'雾晶';
      parts.push(`<b data-k="${k}" title="${def.cost[k]}${label}" style="color:${RESCOL[k]}">${svg(k,12)}${def.cost[k]}</b>`);
    }else parts.push(`<b data-k="${k}" style="color:${RESCOL[k]}">${def.cost[k]}${RESNAME[k]}</b>`);
  }
  return parts.length?parts.join(''):'<b class="free">免费</b>';
};

/* ---------------- 天赋效果数值 ----------------
   BLESSINGS 只描述天赋「是什么」，效果数值集中在此，
   逻辑按 id 查表；新增天赋时先在此登记，避免数值散落多处。 */
const TALENT_TUNE={
  t_firemaster:{dmg:.15,burn:.20},
  t_frostmaster:{dmg:.15,chillDur:.4},
  t_arcanemaster:{dmg:.15},
  t_manadmg:{overflow:.15},
  t_resonance:{per:.05,max:5},
  t_shatter:{freeze:.30,chill:.15},
  t_charge:{per:.02,max:10}, // 原 t_hastecharge 的充能层数上限
  t_spring:{regen:.25},
  t_reach:{per:.20},
  t_econ:{cost:.10},
  t_iceshield:{per:8,cap:30},
  t_regenshield:{convert:.30,capRatio:.15},
  t_manaturb:{move:.08,cast:.08,threshold:.5},
  t_fusion:{dmg:.30,radius:.15},
  t_armor:{flat:3,threshold:.5},
  t_arcsave:{flat:15},
  t_arcmaster:{every:3,discount:15},
  t_manashield:{threshold:.2},
  t_nirvana:{hpRatio:.5,dmg:80},
  t_burnspread:{radius:2.5,count:2,maxStacks:5},
  t_frostreach:{slowAdd:.06,chillDur:.8,freezeDur:.5,slowCap:.55},
  t_storm:{every:12,dmg:40},
  t_surge:{cost:45,stacks:2,duration:8,speed:.20},
  t_arcecho:{chance:.30,ratio:.5},
  t_hastecharge:{chargeDiv:19,perStack:.5,step:2}
};
/* ---------------- 祝福 ---------------- */
const BLESSINGS=[
  {id:'blade',n:'雾刃',rar:'c',icon:'sword',d:'伤害 +25%',f:()=>P.dmg*=1.25},
  {id:'swift',n:'疾风',rar:'c',icon:'wind',d:'移速 +12%',f:()=>P.spd*=1.12},
  {id:'rapid',n:'迅击',rar:'c',icon:'bolt',d:'攻速 +18%',f:()=>P.atkSpd*=1.18},
  {id:'reach',n:'长锋',rar:'c',icon:'reach',d:'攻击范围 +18%',f:()=>P.range*=1.18},
  {id:'heart',n:'灯芯',rar:'c',icon:'heart',d:'生命上限 +25 并回满',f:()=>{P.maxHp+=25;P.hp=P.maxHp;}},
  {id:'magnet',n:'磁石',rar:'c',icon:'magnet',d:'拾取范围 +70%',f:()=>P.magnet*=1.7},
  {id:'harvest',n:'苦修',rar:'c',icon:'leaf',d:'采集 +50%',f:()=>P.gather*=1.5},
  {id:'wick',n:'燃灯',rar:'c',icon:'wick',d:'雾能回复 +50%',f:()=>P.regen*=1.5},
  {id:'leech',n:'回魂',rar:'r',icon:'leech',d:'击杀回 3 生命',f:()=>P.ls+=3},
  {id:'nova',n:'雾爆强化',rar:'r',icon:'burst',d:'雾爆伤害 +40% 半径 +12%',f:()=>P.novaMult*=1.4},
  {id:'shadow',n:'迅影',rar:'r',icon:'shadow',d:'冲刺冷却 −25%',f:()=>P.dashCdMax*=.75},
  {id:'thorn',n:'荆棘',rar:'r',icon:'thorn',d:'受击反伤 8',f:()=>P.thorns+=8},
  {id:'crit',n:'会心',rar:'r',icon:'crit',max:4,d:'15% 双倍伤害',f:()=>P.crit=Math.min(.6,P.crit+.15)},
  {id:'wave',n:'双弦',rar:'e',icon:'wave',max:2,d:'挥刃附带穿透剑气',f:()=>P.wave++},
  {id:'beacon',n:'灯塔共鸣',rar:'e',icon:'beacon',d:'建筑伤害 +25% 并修复 30',f:()=>{P.towerMult*=1.25;builds.forEach(b=>b.hp=Math.min(b.max,b.hp+30));rebuildTileCost();fieldDirty=true;}},
  {id:'draw',n:'晨读',rar:'e',icon:'cards',max:3,d:'每次黎明额外抽 1 张',f:()=>P.bonusDraw++},
  {id:'t_regenshield',n:'回能护盾',rar:'r',icon:'shield',max:2,cls:'mage',d:'获得法力时，按回复量 30% 转化为护盾，上限为 15% 法力上限/层',f:()=>{}},
  {id:'t_hastecharge',n:'急速充能',rar:'r',icon:'bolt',max:2,cls:'mage',d:'回能越快，充能叠得越快；每层 +2% 法术伤害，最多 10 层',f:()=>{}},
  {id:'t_manaturb',n:'法力湍流',rar:'r',icon:'wind',max:2,cls:'mage',d:'法力≥50% 时移速 +8%、施法速度 +8%',f:()=>{}},
  {id:'t_manadmg',n:'法力溢伤',rar:'e',icon:'crit',max:2,cls:'mage',d:'法力>80% 时，法术伤害 +15%',f:()=>{}},
  {id:'t_fusion',n:'元素融合',rar:'e',icon:'steam',max:1,cls:'mage',d:'开启元素反应；反应伤害 +30%、半径 +15%',f:()=>{}},
  {id:'t_surge',n:'咒术波动',rar:'e',icon:'bolt',max:1,cls:'mage',d:'施放 3 费法术后，下 2 次施法速度 +20%',f:()=>{}},
  {id:'t_resonance',n:'元素共鸣',rar:'r',icon:'reso',max:1,cls:'mage',d:'连续同元素法术每层 +5% 伤害，最多 5 层',f:()=>{}},
  {id:'t_manashield',n:'法力护盾',rar:'r',icon:'shield',max:1,cls:'mage',d:'致命伤害时清空法力，完全抵挡本次伤害',f:()=>{}},
  {id:'t_econ',n:'节能施法',rar:'r',icon:'cards',max:2,cls:'mage',d:'所有法术费用 -10%',f:()=>{}},
  {id:'t_firemaster',n:'火焰专精',rar:'c',icon:'flame',max:2,cls:'mage',d:'火伤 +15%，灼烧 +20%',f:()=>{}},
  {id:'t_frostmaster',n:'冰霜专精',rar:'c',icon:'snow',max:2,cls:'mage',d:'冰伤 +15%，冰缓 +0.4 秒',f:()=>{}},
  {id:'t_arcanemaster',n:'奥术专精',rar:'c',icon:'rune',max:2,cls:'mage',d:'奥术伤害 +15%',f:()=>{}},
  {id:'t_spring',n:'法力涌泉',rar:'c',icon:'crys',max:3,cls:'mage',d:'回蓝 +25%',f:()=>{}},
  {id:'t_armor',n:'魔能护甲',rar:'c',icon:'shield',max:2,cls:'mage',d:'法力≥50% 时护甲 +3',f:()=>{}},
  {id:'t_reach',n:'法术延展',rar:'c',icon:'reach',max:1,cls:'mage',d:'施法距离 +20%',f:()=>{}},
  {id:'t_storm',n:'元素风暴',rar:'e',icon:'burst',max:1,cls:'mage',d:'每 12 次法术，全屏 40 随机元素伤害',f:()=>{}},
  {id:'t_nirvana',n:'魔能涅槃',rar:'e',icon:'ember',max:1,cls:'mage',d:'每局一次：致命时清空法力，回 50% 生命并全屏爆炸',f:()=>{}},
  {id:'t_burnspread',n:'灼烧蔓延',rar:'r',icon:'flame',max:1,cls:'mage',d:'带灼烧的敌人死亡时，向附近 2 人扩散灼烧',f:()=>{}},
  {id:'t_frostreach',n:'寒霜延伸',rar:'r',icon:'snow',max:1,cls:'mage',d:'冰缓减速提升至 18%/层，冰缓/冻结延长',f:()=>{}},
  {id:'t_shatter',n:'冰冻碎甲',rar:'e',icon:'crys',max:1,cls:'mage',d:'冰缓目标受法术伤害 +15%，冻结 +30%',f:()=>{}},
  {id:'t_iceshield',n:'冰盾护体',rar:'r',icon:'shield',max:2,cls:'mage',d:'施放冰系法术获得 8 护盾，上限 30',f:()=>{}},
  {id:'t_arccharge',n:'充能加速',rar:'r',icon:'bolt',max:1,cls:'mage',d:'奥术施法额外获得 1 层奥术精通充能',f:()=>{}},
  {id:'t_arcsave',n:'法术节能',rar:'r',icon:'cards',max:1,cls:'mage',d:'奥术卡牌费用 -15，最低 1 费',f:()=>{}},
  {id:'t_arcecho',n:'奥术回响',rar:'e',icon:'reso',max:1,cls:'mage',d:'奥术法术 30% 概率回响 50% 伤害',f:()=>{}},
  {id:'t_arcmaster',n:'奥术精通',rar:'e',icon:'rune',max:1,cls:'mage',d:'每 3 次施法，下一次法术费用 -15，最低 1 费',f:()=>{}}
];
const RARNAME={c:'普通',r:'稀有',e:'传说'},RARCOL={c:'#57e6ff',r:'#c9a8ff',e:'#ffb454'};

