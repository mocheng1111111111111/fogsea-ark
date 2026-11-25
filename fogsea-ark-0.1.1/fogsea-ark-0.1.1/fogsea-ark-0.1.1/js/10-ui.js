'use strict';
/* ---------------- HUD ---------------- */
const UI={};
function cacheUI(){
  UI.hud=$('hud');UI.mute=$('btnMute');UI.hurt=$('hurtFx');UI.coreFx=$('coreFx');UI.nightBtn=$('btnNight');
  UI.phaseChip=$('phaseChip');UI.phaseIcon=UI.phaseChip.querySelector('svg');UI.phaseName=$('phaseName');
  UI.dayLabel=$('dayLabel');UI.nightLabel=$('nightLabel');UI.phaseBar=$('phaseBar');
  UI.hpBar=$('hpBar');UI.hpFill=UI.hpBar.firstElementChild;UI.hpTxt=$('hpTxt');
  UI.enBar=$('enBar');UI.enFill=UI.enBar.firstElementChild;UI.enTxt=$('enTxt');UI.enLabel=$('enLabel');
  UI.shieldBar=$('shieldBar');UI.shieldFill=UI.shieldBar?UI.shieldBar.firstElementChild:null;UI.shieldTxt=$('shieldTxt');
  UI.xpBar=$('xpBar');UI.xpFill=UI.xpBar.firstElementChild;UI.lvl=$('lvlNum');UI.stacks=$('ppStacks');UI.ppName=$('ppName');
  UI.dashPip=$('dashPip');UI.dashFill=UI.dashPip.querySelector('.fill');
  UI.novaPip=$('novaPip');UI.novaFill=UI.novaPip.querySelector('.fill');
  UI.coreBar=$('coreBar');UI.coreFill=UI.coreBar.firstElementChild;UI.coreTxt=$('coreTxt');UI.coreWrap=$('coreWrap');
  UI.repair=$('repairBtn');UI.toasts=$('toasts');UI.banner=$('banner');
  UI.bannerH=UI.banner.querySelector('h2');UI.bannerP=UI.banner.querySelector('p');
  UI.drawN=$('drawN');UI.discN=$('discN');UI.handN=$('handN');UI.recN=$('recN');
}
function setTxt(el,v){if(el&&el._t!==v){el._t=v;el.textContent=v;}}
function setBar(el,fill,r){const v=clamp(r,0,1).toFixed(3);if(el._v!==v){el._v=v;fill.style.transform=`scaleX(${v})`;}}
function syncHUD(){
  if(S.mode==='menu'||S.mode==='prep')return;
  const night=S.phase==='night';
  const showNight=S.mode==='play'&&!night;
  if(UI.nightBtn._s!==showNight){UI.nightBtn._s=showNight;UI.nightBtn.style.display=showNight?'':'none';}
  if(UI.phaseChip._n!==night){
    UI.phaseChip._n=night;UI.phaseChip.classList.toggle('night',night);
    UI.phaseIcon.innerHTML=ICONS[night?'moon':'sun'];UI.phaseBar.classList.toggle('night',night);
    setTxt(UI.phaseName,night?'雾潮':'白昼');
  }
  setTxt(UI.dayLabel,night?`第 ${S.day} 夜`:`第 ${S.day} 日`);
  setTxt(UI.nightLabel,`夜 ${S.stats.nights}${S.endless?'/∞':'/7'}`);
  setBar(UI.phaseBar,UI.phaseBar,night?(S.nightTotal?S.nightKilled/S.nightTotal:0):S.timeLeft/DAY_LEN);
  setBar(UI.hpBar,UI.hpFill,P.hp/P.maxHp);
  const low=P.hp/P.maxHp<.3;
  if(UI.hpBar._low!==low){UI.hpBar._low=low;UI.hpBar.classList.toggle('low',low);}
  setTxt(UI.hpTxt,`${Math.ceil(P.hp)}/${P.maxHp}`);
  const mage=isMage();
  if(UI.enBar._m!==mage){
    UI.enBar._m=mage;
    UI.enBar.classList.toggle('mage',mage);
    setTxt(UI.enLabel,mage?'法力':'雾能');
    setTxt(UI.ppName,mage?'守灯人 · 法师':'守灯人');
  }
  setBar(UI.enBar,UI.enFill,P.en/P.maxEn);
  setTxt(UI.enTxt,mage?`${Math.floor(P.en)}/${P.maxEn}`:String(Math.floor(P.en)));
  const sh=P.shield>0;
  if(UI.shieldBar){
    if(UI.shieldBar._s!==sh){UI.shieldBar._s=sh;UI.shieldBar.style.display=sh?'':'none';}
    if(sh){setBar(UI.shieldBar,UI.shieldFill,P.shield/Math.max(1,P.maxHp));setTxt(UI.shieldTxt,Math.ceil(P.shield));}
  }
  setBar(UI.xpBar,UI.xpFill,P.xp/P.next);setTxt(UI.lvl,P.lvl);
  setBar(UI.dashPip,UI.dashFill,1-P.dashCd/P.dashCdMax);
  const dr=P.dashCd<=0;if(UI.dashPip._r!==dr){UI.dashPip._r=dr;UI.dashPip.classList.toggle('ready',dr);}
  setBar(UI.novaPip,UI.novaFill,P.en/TUNE.nova.cost);
  const nr=P.en>=TUNE.nova.cost;if(UI.novaPip._r!==nr){UI.novaPip._r=nr;UI.novaPip.classList.toggle('ready',nr);}
  setBar(UI.coreBar,UI.coreFill,core.hp/core.max);
  setTxt(UI.coreTxt,`${Math.ceil(core.hp)}/${core.max}`);
  const crit=core.hp/core.max<.3;
  if(UI.coreWrap._c!==crit){UI.coreWrap._c=crit;UI.coreWrap.classList.toggle('crit',crit);}
  UI.coreFx.style.opacity=crit?(.5+.3*Math.sin(S.elapsed*4)).toFixed(2):0;
  const nc=!P.downed&&dist(P.x,P.y,core.x,core.y)<2.8&&core.hp<core.max;
  if(UI.repair._s!==nc){UI.repair._s=nc;UI.repair.classList.toggle('show',nc);}
  syncHand(false);
}
function refreshRes(bump){
  const row=$('resRow');
  if(!row.children.length){
    row.innerHTML=['wood','stone','crys'].map(k=>
      `<span class="resChip" id="res_${k}" style="color:${RESCOL[k]}">${svg(k==='crys'?'crys':k,13)}<b id="resN_${k}">0</b></span>`).join('');
    UI.resN={wood:$('resN_wood'),stone:$('resN_stone'),crys:$('resN_crys')};
    UI.resChip={wood:$('res_wood'),stone:$('res_stone'),crys:$('res_crys')};
  }
  for(const k of ['wood','stone','crys']){
    setTxt(UI.resN[k],res[k]);
    if(bump===k){const el=UI.resChip[k];el.classList.remove('bump');void el.offsetWidth;el.classList.add('bump');}
  }
}
function toast(msg,cls=''){
  const wrap=UI.toasts;
  while(wrap.children.length>=2)wrap.removeChild(wrap.firstChild);
  const el=document.createElement('div');el.className='toast '+cls;el.textContent=msg;
  wrap.appendChild(el);setTimeout(()=>{if(el.parentNode)el.remove();},2600);
}
let bannerTimer=null;
function banner(title,sub,cls){
  const el=UI.banner;el.className=cls||'';
  UI.bannerH.textContent=title;UI.bannerP.textContent=sub||'';
  void el.offsetWidth;el.classList.add('show');
  clearTimeout(bannerTimer);bannerTimer=setTimeout(()=>el.classList.remove('show'),2700);
}

/* ---------------- 图鉴 ---------------- */
const CX_CATS=[{id:'all',name:'全部'},{id:'role',name:'角色'},{id:'res',name:'资源'},{id:'card',name:'卡牌'},
  {id:'foe',name:'雾裔'},{id:'bless',name:'祝福'},{id:'legacy',name:'传承'},{id:'term',name:'术语'}];
const foeNow=t=>Math.round(FOES[t].hp*DIFFS[save.diff].hp*dayScale(Math.max(1,S.day)));
const CODEX=[
  {id:'keeper',cat:'role',name:'守灯人',icon:'lantern',color:'#ffb454',sprite:'player',
   desc:'你操控的角色。挥刃自动：范围内只要有雾裔或资源，就会持续朝目标方向攻击。',
   stats:()=>[['当前生命',`${Math.ceil(P.hp)} / ${P.maxHp}`],['挥刃伤害',P.dmg.toFixed(1)],
     ['攻击间隔',(TUNE.player.atkInterval/P.atkSpd).toFixed(2)+' 秒'],['攻击范围',P.range.toFixed(2)+' 格'],
     ['移动速度',P.spd.toFixed(2)+' 格/秒'],['暴击率',Math.round(P.crit*100)+'%'],['等级','Lv.'+P.lvl]],
   rel:['core','dash','nova','hand']},
  {id:'mage',cat:'role',name:'法师',icon:'mage',color:'#8d8dd6',
   desc:'转职后的守灯人。以法力施放元素法术，生命上限降低但手牌上限提高。',
   stats:()=>[['生命上限',P.maxHp],['法力',`${Math.floor(P.en)} / ${P.maxEn}`],
     ['法力回复',manaRegenRate().toFixed(1)+' /秒'],['手牌上限',handCap()],
     ['火/冰/奥亲和',`${P.aff.fire} / ${P.aff.frost} / ${P.aff.arcane}`]],
   rel:['mana','spell','status','reaction']},
  {id:'core',cat:'role',name:'方舟核心',icon:'core',color:'#ffb454',sprite:'core',
   desc:'家园的心脏，雾潮的最终目标。核心被毁即失败；靠近按 F 或打出修补术可修复。',
   stats:()=>[['当前耐久',`${Math.ceil(core.hp)} / ${core.max}`],
     ['修复消耗',TUNE.core.repair.wood+' 木 + '+TUNE.core.repair.stone+' 石'],
     ['单次修复','+'+TUNE.core.repair.heal],['白昼自愈',TUNE.core.regen+' /秒'],['黎明恢复','+'+TUNE.core.dawnHeal]],
   rel:['keeper','c_mend','wood','stone']},
  ...[['wood','木材','wood','tree','砍伐树木获得。既是资源也是卡牌费用，没有第二种货币。','木墙 / 箭塔 / 图腾 / 箭雨',['c_wall','c_tower','c_rain']],
      ['stone','石料','stone','rock','敲碎岩石获得，需 '+TUNE.node.hits.rock+' 次挥刃。远程火力与扩容的主要费用。','箭塔 / 雾晶炮 / 扩容',['c_tower','c_cannon','c_expand']],
      ['crys','雾晶','crys','crys','雾中凝结的能量。矿脉与击杀雾裔均可获得，高阶卡牌的燃料。','雾晶炮 / 雾晶雷 / 灯焰护盾',['c_cannon','c_mine','c_ward']]]
    .map(([id,name,icon,sprite,desc,use,rel])=>{
      const src={wood:'tree',stone:'rock',crys:'crys'}[id];
      const y=TUNE.node.yield[src],hits=TUNE.node.hits[src];
      const stats=()=>[['当前库存',res[id]],
        ...(id==='crys'?([['矿脉产出',y[0]+'–'+y[1]],['击杀掉落',Object.values(FOES).map(f=>f.crysDrop).join(' / ')],['倒下损失','−'+Math.round((1-TUNE.down.crysKeep)*100)+'%']]):
          ([['来源',name+' · '+hits+' 次挥刃'],['单次产出',y[0]+'–'+y[1]],['用途',use]]))];
      return {id,cat:'res',name,icon,color:RESCOL[id],sprite,desc,stats,rel};
    }),
  ...CIDS.map(id=>{
    const d=CDEFS[id];
    return {id:'c_'+id,cat:'card',name:d.name,icon:d.icon,color:d.color,
      sprite:d.kind==='build'?d.build:null,
      desc:d.desc+(d.kind==='build'?' 建筑永久留场，卡牌回到弃牌堆，洗牌后可再次抽到。':''),
      stats:()=>{
        const s=[['类型',KINDNAME[d.kind]],['费用',costStr(d)],
          ['牌库中',cardTotal(id)+' 张'],['累计打出',save.seen.play[id]||0]];
        if(d.kind==='build'){
          const b=BUILDS[d.build];
          s.push(['耐久',b.hp]);
          if(b.range)s.push(['射程',b.range+' 格']);
          if(b.dmg)s.push(['伤害',(b.dmg*P.towerMult).toFixed(1)]);
          if(b.rate)s.push(['间隔',b.rate+' 秒']);
          if(b.regen)s.push(['回蓝',b.regen+' /秒'],['范围',b.range+' 格']);
          s.push(['场上数量',builds.filter(x=>x.type===d.build).length]);
        }
        if(d.radius)s.push(['作用半径',d.radius+' 格'],['伤害',d.dmg]);
        if(d.mana)s.push(['法力',effManaCost(d)],['元素',ELEMNAME[d.elem]||'—']);
        if(d.shape)s.push(['施法形态',d.shape]);
        if(d.status){
          const sn={burn:'灼烧',chill:'冰缓',freeze:'冻结',mark:'奥术标记'}[d.status.kind]||d.status.kind;
          s.push(['附加状态',sn+' ×'+d.status.n]);
        }
        if(d.id==='expand')s.push(['当前上限',DECK.max+' / '+handCap()]);
        if(d.tier)s.push(['回收率增益','+'+d.tier+'%'],['当前回收率',DECK.recycle+'%']);
        if(d.kind==='build')s.push(['使用时段','仅白昼']);
        else s.push(['使用时段','昼夜皆可']);
        return s;
      },
      rel:d.kind==='build'?['wood','stone','crys','hand'].slice(0,3).concat(['hand']):
        d.tier?['recycle','hand','deck']:['hand','deck','keeper']};
  }),
  ...Object.entries(FOES).map(([id,d])=>({id,cat:'foe',name:d.name,icon:d.icon,color:d.color,
    sprite:id,desc:d.desc,rel:d.rel,
    stats:()=>{
      const s=[['基础生命',d.hp],['本局生命',foeNow(id)],['速度',d.spd]];
      if(d.fireInterval)s.push(['雾弹伤害',d.dmg],['射击间隔',d.fireInterval+' 秒'],['射程',d.fireRange+' 格']);
      else s.push(['对玩家',d.dmg]);
      if(d.stompDmg)s.push(['践踏伤害',d.stompDmg],['召唤间隔',d.summonInterval+' 秒'],['召唤数量',d.summonCount]);
      s.push(['对核心',d.coreDmg],['首次出现','第 '+d.firstNight+' 夜'],['累计击杀',save.seen.foe[id]||0]);
      return s;
    }})),
  ...BLESSINGS.map(b=>({id:'b_'+b.id,cat:'bless',name:b.n,icon:b.icon,color:RARCOL[b.rar],
    desc:b.d+'。'+(b.cls==='mage'?'法师专属。':'')+'黎明第二步三选一获得，永久被动生效，不占用牌库。',
    stats:()=>[['稀有度',RARNAME[b.rar]],['叠加上限',b.max?b.max+' 层':'无上限'],
      ['本局叠加','×'+(P.stacks[b.id]||0)],['累计选用',save.seen.card[b.id]||0]],
    rel:['dawn','keeper','hand']})),
  ...Object.entries(BLESS).map(([k,b])=>({id:'l_'+k,cat:'legacy',name:b.name+'传承',icon:b.icon,color:b.color,
    desc:b.desc+'。用文明火种在标题界面永久解锁，跨局生效。',
    stats:()=>[['当前等级',save.bless[k]+' / '+b.max],
      ['下级花费',save.bless[k]>=b.max?'已满级':b.costs[save.bless[k]]+' 火种'],['火种库存',save.embers]],
    rel:['ember','keeper']})),
  {id:'hand',cat:'term',name:'手牌与上限',icon:'cards',color:'#ffb454',
   desc:'初始上限 5 张。打出扩容牌 +1，最高 '+HAND_CAP+'（法师 '+(HAND_CAP+MAGE_TUNE.handAdd)+'）；到顶后扩容牌从牌库与奖励池永久退场。夜晚保留手牌。',
   stats:()=>[['当前手牌',DECK.hand.length],['当前上限',DECK.max],['上限天花板',handCap()],
     ['扩容存世',cardTotal('expand')+' 张']],rel:['c_expand','dawn','deck']},
  {id:'deck',cat:'term',name:'牌库循环',icon:'cards',color:'#8fe3d0',
   desc:'抽牌堆 → 手牌 → 弃牌堆 → 洗牌回到抽牌堆。建筑留场，卡牌回库，所以同一张箭塔可以反复部署。',
   stats:()=>[['抽牌堆',DECK.draw.length],['手牌',DECK.hand.length],['弃牌堆',DECK.discard.length],
     ['总张数',DECK.draw.length+DECK.hand.length+DECK.discard.length],['本局出牌',S.stats?S.stats.played:0]],
   rel:['dawn','c_tactic','hand']},
  {id:'recycle',cat:'term',name:'回收率',icon:'salvage',color:'#6fe08a',
   desc:'拆解牌分 '+['salvage5','salvage10','salvage20'].map(id=>CDEFS[id].tier).join('% / ')+'% 三档，累加至最高 '+REC_CAP+'%。移除一张牌时按当前回收率返还其造价，向下取整。到顶后拆解牌退场。',
   stats:()=>[['当前回收率',DECK.recycle+'%'],['上限',REC_CAP+'%'],
     ['拆解存世',cardTotal('salvage5')+cardTotal('salvage10')+cardTotal('salvage20')+' 张']],
   rel:['c_salvage5','c_salvage10','c_salvage20']},
  {id:'dawn',cat:'term',name:'黎明回合',icon:'sun',color:'#ffb454',
   desc:'每次天亮进入两步选择：先 3 选 1 拾获卡牌，再 3 选 1 获得祝福，都可跳过；随后抽满手牌。',
   stats:()=>[['白昼时长',DAY_LEN+' 秒'],['当前日数',S.day],['额外抽牌',P.bonusDraw+' 张'],
     ['核心自愈',TUNE.core.regen+' /秒']],rel:['hand','deck','b_blade']},
  {id:'tide',cat:'term',name:'雾潮',icon:'fog',color:'#a06bff',
   desc:'夜间敌潮，自岛缘分批刷新。夜晚构筑牌封存，只能打瞬发牌——白天没铺好，晚上就得靠操作。',
   stats:()=>[['本夜波次',S.nightTotal||'—'],['已消灭',S.nightKilled],['同屏上限',FOE_CAP],['每夜成长',S.endless?'缓增封顶':'+13% 生命']],
   rel:['seven','c_rain','c_mine']},
  {id:'seven',cat:'term',name:'七夜与无尽',icon:'clock',color:'#8fe3d0',
   desc:'远航共七夜。击溃雾潮之主即可启航，也可继续守护进入无尽；无尽每七夜重现 Boss，难度缓增封顶。',
   stats:()=>[['远航夜数',MAX_NIGHT],['已度过',S.stats?S.stats.nights:0],['最佳纪录',save.best.nights+' 夜'],
     ['累计启航',save.best.wins+' 次']],rel:['boss','ember','tide']},
  {id:'ember',cat:'term',name:'文明火种',icon:'ember',color:'#ff8a3d',
   desc:'局外货币，失败也结算，用于购买永久传承。',
   stats:()=>[['当前库存',save.embers],
     ['公式','夜数×'+TUNE.ember.perNight+' + 击杀÷'+TUNE.ember.killsDiv],
     ['胜利额外','+'+TUNE.ember.winBonus+'（仅远航）'],['难度系数',DIFFS[save.diff].ember+'×']]
     .concat(S.endless?[['无尽补发','只结算胜利基线之后的增量']]:[]),
   rel:['l_blade','l_iron','l_stock']},
  {id:'dash',cat:'term',name:'冲刺',icon:'bolt',color:'#57e6ff',
   desc:'空格短距疾冲，'+TUNE.dash.mult+' 倍速并附带无敌帧。',
   stats:()=>[['冷却',P.dashCdMax.toFixed(2)+' 秒'],['持续',TUNE.dash.dur+' 秒'],
     ['无敌',TUNE.dash.iframe+' 秒'],['倍率',TUNE.dash.mult+'×']],
   rel:['keeper','b_shadow']},
  {id:'nova',cat:'term',name:'雾爆',icon:'burst',color:'#57e6ff',
   desc:'Q 释放的自身范围新星，消耗 '+TUNE.nova.cost+' 雾能（法师为法力），与卡牌系统互不干扰。',
   stats:()=>[[isMage()?'法力消耗':'雾能消耗',String(TUNE.nova.cost)],['伤害',(TUNE.nova.dmg*P.novaMult).toFixed(1)],
     ['半径',(TUNE.nova.radius*(1+TUNE.nova.radiusPer*(P.stacks.nova||0))).toFixed(2)+' 格'],
     ['回复',manaRegenRate().toFixed(1)+' /秒']],
   rel:['keeper','b_nova','c_surge']},
  {id:'mana',cat:'term',name:'法力',icon:'crys',color:'#57e6ff',
   desc:'法师转职后的施法资源。非法师仍使用雾能；基础法术对两者都消耗当前资源。',
   stats:()=>[['当前上限',P.maxEn],['基础回复',P.enRegenFlat+' /秒'],['实际回复',manaRegenRate().toFixed(1)+' /秒'],
     ['1 费',MANA_UNIT+' 法力'],['雾爆消耗',String(TUNE.nova.cost)]],
   rel:['mage','spell','c_surge']},
  {id:'spell',cat:'term',name:'法术与施法',icon:'rune',color:'#8d8dd6',
   desc:'法术牌消耗法力/雾能，受施法冷却限制；法师额外获得元素亲和、法术强度与职业天赋。',
   stats:()=>[['施法冷却',(MAGE_TUNE.spellGcd/castSpeedMult()).toFixed(2)+' 秒'],['当前法力',Math.floor(P.en)],
     ['法术牌',CIDS.filter(id=>CDEFS[id].elem).length+' 张'],['基础法术','非法师也可获得']],
   rel:['mana','mage','status']},
  {id:'status',cat:'term',name:'元素状态',icon:'flame',color:'#ffb454',
   desc:'灼烧持续掉血，冰缓减速，冻结停止行动，奥术标记提高受到的法术伤害。',
   stats:()=>[
     ['灼烧',ST_DEF.burn.dps+' /秒/层 · '+ST_DEF.burn.max+' 层'],
     ['冰缓',Math.round(ST_DEF.chill.slowPer*100)+'% 减速/层 · '+ST_DEF.chill.max+' 层'],
     ['冻结',ST_DEF.freeze.dur+' 秒（首领 '+ST_DEF.freeze.bossMul+' 秒）'],
     ['奥术标记','法术伤害 +'+Math.round(ST_DEF.mark.amp*100)+'%']],
   rel:['spell','reaction','mage']},
  {id:'reaction',cat:'term',name:'元素反应',icon:'steam',color:'#bfe3ff',
   desc:'需要法师天赋「元素融合」。同一敌人 '+TUNE.reaction.window+' 秒内被两种元素命中触发，每敌人 '+TUNE.reaction.cooldown+' 秒冷却。',
   stats:()=>[['火+冰','蒸汽爆炸'],['奥术+火/冰','共鸣扩散'],['雷系','接口保留，未实装']],
   rel:['status','spell','b_t_fusion']},
  {id:'downed',cat:'term',name:'灯芯熄灭',icon:'skull',color:'#ff4d6d',
   desc:'生命归零后 '+TUNE.down.time+' 秒于核心重燃，恢复六成生命并损失两成雾晶。',
   stats:()=>[['重燃时间',TUNE.down.time+' 秒'],['重燃生命',Math.round(TUNE.down.hpRatio*100)+'%'],
     ['雾晶损失',Math.round((1-TUNE.down.crysKeep)*100)+'%'],['重燃无敌',TUNE.down.iframe+' 秒']],
   rel:['keeper','core','crys']}
];
const CX_BY_ID={};CODEX.forEach(e=>CX_BY_ID[e.id]=e);
let cxCat='all',cxQuery='',cxFiltered=[],cxSel=null,cxT=0;
const cxCv=$('cxPreview'),cxCtx=cxCv.getContext('2d');
let cxW=168,cxH=168;
function sizeCodexCv(){
  const r=cxCv.getBoundingClientRect();
  cxW=Math.max(60,r.width||168);cxH=Math.max(60,r.height||168);
  cxCv.width=Math.floor(cxW*DPR);cxCv.height=Math.floor(cxH*DPR);
}
function cxSeenCount(){
  const groups={foe:Object.keys(FOES),card:BLESSINGS.map(b=>b.id),play:CIDS};
  let n=0;
  for(const k in groups)for(const id of groups[k])if(save.seen[k][id]>0)n++;
  return n;
}
function cxBuildCats(){
  const wrap=$('cxCats');
  wrap.innerHTML=CX_CATS.map(c=>{
    const n=c.id==='all'?CODEX.length:CODEX.filter(e=>e.cat===c.id).length;
    return `<button class="cxCat${c.id===cxCat?' on':''}" data-c="${c.id}">${c.name}<i>${n}</i></button>`;
  }).join('');
  wrap.querySelectorAll('.cxCat').forEach(el=>el.addEventListener('click',()=>{
    cxCat=el.dataset.c;sfx('page');cxBuildCats();cxRenderList();}));
}
function cxRenderList(){
  const q=cxQuery.trim().toLowerCase();
  cxFiltered=CODEX.filter(e=>{
    if(cxCat!=='all'&&e.cat!==cxCat)return false;
    if(!q)return true;
    return (e.name+' '+e.desc).toLowerCase().includes(q);
  });
  const list=$('cxList');
  if(!cxFiltered.length)list.innerHTML='<div class="cxEmpty">雾中没有这条记录<br>换个关键词试试</div>';
  else{
    list.innerHTML=cxFiltered.map(e=>{
      let bdg='';
      if(e.cat==='foe'&&save.seen.foe[e.id])bdg='×'+save.seen.foe[e.id];
      else if(e.cat==='card'){const id=e.id.slice(2);if(cardTotal(id))bdg='×'+cardTotal(id);}
      else if(e.cat==='bless'&&save.seen.card[e.id.slice(2)])bdg='×'+save.seen.card[e.id.slice(2)];
      const cn=(CX_CATS.find(c=>c.id===e.cat)||{}).name||'';
      return `<button class="cxItem${cxSel===e.id?' on':''}" data-id="${e.id}">
        <span class="ci" style="color:${e.color};background:${e.color}1a">${svg(e.icon,16)}</span>
        <span class="ct"><b>${e.name}</b><span>${cn}</span></span>${bdg?`<span class="bdg">${bdg}</span>`:''}</button>`;
    }).join('');
    list.querySelectorAll('.cxItem').forEach(el=>el.addEventListener('click',()=>cxSelect(el.dataset.id,true)));
  }
  if(!cxFiltered.some(e=>e.id===cxSel))cxSelect(cxFiltered.length?cxFiltered[0].id:null,false);
  else cxSelect(cxSel,false);
  const track=Object.keys(FOES).length+BLESSINGS.length+CIDS.length,got=cxSeenCount();
  $('cxCount').textContent=`共 ${CODEX.length} 条 · 显示 ${cxFiltered.length} 条 · 已记录 ${got}/${track}`;
  $('cxProgFill').style.width=clamp(got/track,0,1)*100+'%';
}
function cxSelect(id,scroll){
  cxSel=id;
  document.querySelectorAll('.cxItem').forEach(el=>el.classList.toggle('on',el.dataset.id===id));
  const e=id?CX_BY_ID[id]:null;
  if(!e){$('cxName').textContent='—';$('cxTags').innerHTML='';$('cxDesc').textContent='';
    $('cxStats').innerHTML='';$('cxRel').innerHTML='';cxCv.style.display='none';$('cxIcon').innerHTML='';return;}
  $('cxName').textContent=e.name;
  const cn=(CX_CATS.find(c=>c.id===e.cat)||{}).name||'';
  $('cxTags').innerHTML=`<span class="cxTag" style="color:${e.color};border-color:${e.color}66">${cn}</span>`+
    (e.sprite?'<span class="cxTag">实景模型</span>':'');
  $('cxDesc').textContent=e.desc;
  $('cxStats').innerHTML=e.stats().map(s=>`<div class="cxStat"><span>${s[0]}</span><b>${s[1]}</b></div>`).join('');
  const rel=(e.rel||[]).filter(r=>CX_BY_ID[r]);
  $('cxRel').innerHTML=rel.length?rel.map(r=>{const t=CX_BY_ID[r];
    return `<button class="cxRelBtn" data-id="${r}">${svg(t.icon,14,t.color)}${t.name}</button>`;}).join('')
    :'<span style="font-size:12px;color:var(--dim2)">无</span>';
  $('cxRel').querySelectorAll('.cxRelBtn').forEach(el=>el.addEventListener('click',()=>{
    const t=CX_BY_ID[el.dataset.id];
    if(cxCat!=='all'&&t.cat!==cxCat){cxCat='all';cxBuildCats();}
    if(cxQuery){cxQuery='';$('cxSearch').value='';}
    cxRenderList();cxSelect(el.dataset.id,true);sfx('page');
  }));
  if(e.sprite){cxCv.style.display='block';$('cxIcon').innerHTML='';sizeCodexCv();}
  else{cxCv.style.display='none';
    $('cxIcon').innerHTML=`<div style="color:${e.color};filter:drop-shadow(0 0 18px ${e.color}88)">${svg(e.icon,72)}</div>`;}
  $('cxFootL').textContent=`雾海方舟 · ${cn} · ${e.name}`;
  if(scroll){const el=document.querySelector(`.cxItem[data-id="${id}"]`);if(el)el.scrollIntoView({block:'nearest'});sfx('page');}
}
function cxMove(d){
  if(!cxFiltered.length)return;
  let i=cxFiltered.findIndex(e=>e.id===cxSel);
  i=clamp(i+d,0,cxFiltered.length-1);cxSelect(cxFiltered[i].id,true);
}
function cxDrawPreview(dt){
  const e=cxSel?CX_BY_ID[cxSel]:null;
  if(!e||!e.sprite||cxCv.style.display==='none')return;
  if(!cxCv.width)sizeCodexCv();
  cxT+=dt;
  const main=ctx;
  try{
    ctx=cxCtx;ctx.setTransform(DPR,0,0,DPR,0,0);ctx.clearRect(0,0,cxW,cxH);
    const bg=ctx.createRadialGradient(cxW/2,cxH*.66,4,cxW/2,cxH*.66,cxW*.75);
    bg.addColorStop(0,'rgba(20,58,78,.85)');bg.addColorStop(1,'rgba(7,19,28,0)');
    ctx.fillStyle=bg;ctx.fillRect(0,0,cxW,cxH);
    const k=e.sprite,sc=Math.min(cxW,cxH)/168,coreScale=.82;
    const groundX=k==='core'?TW*coreScale+8:46,groundY=k==='core'?0:7;
    const back=groundY-groundX/2,front=groundY+groundX/2;
    ctx.save();ctx.translate(cxW/2,cxH*(k==='core'?.74:.8));ctx.scale(sc,sc);
    ctx.fillStyle='#163c3a';ctx.beginPath();ctx.moveTo(0,back);ctx.lineTo(groundX,groundY);ctx.lineTo(0,front);ctx.lineTo(-groundX,groundY);ctx.closePath();ctx.fill();
    ctx.fillStyle='#0c2a30';
    ctx.beginPath();ctx.moveTo(-groundX,groundY);ctx.lineTo(0,front);ctx.lineTo(0,front+8);ctx.lineTo(-groundX,groundY+8);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(groundX,groundY);ctx.lineTo(0,front);ctx.lineTo(0,front+8);ctx.lineTo(groundX,groundY+8);ctx.closePath();ctx.fill();
    ctx.strokeStyle='rgba(143,227,208,.28)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,back);ctx.lineTo(groundX,groundY);ctx.lineTo(0,front);ctx.lineTo(-groundX,groundY);ctx.closePath();ctx.stroke();
    const gk=(k==='crys'||k==='cannon')?'cyan':k==='totem'?'leaf':
      (k==='crawler'||k==='spitter'||k==='brute'||k==='boss')?'violet':'amber';
    ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.45;
    ctx.drawImage(GLOW[gk],-72,-104,144,144);
    ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
    const t=cxT;
    if(k==='player')drawPlayer({x:0,y:0,downed:false,moving:false,anim:0,face:.6,ifr:0,swingT:0});
    else if(k==='core'){ctx.save();ctx.scale(coreScale,coreScale);drawCore({x:0,y:0,hp:1,max:1,flash:0});ctx.restore();}
    else if(k==='tree')drawTree({type:'tree',x:0,y:0,alive:true,shake:0,sway:0,s:1.15});
    else if(k==='rock')drawRock({type:'rock',x:0,y:0,alive:true,shake:0,sway:0,s:1.25});
    else if(k==='crys')drawCrys({type:'crys',x:0,y:0,alive:true,shake:0,sway:0,s:1.3});
    else if(BUILDS[k]){ctx.save();ctx.scale(1.25,1.25);
      drawBuild({type:k,x:0,y:0,hp:1,max:1,r:.4,flash:0,pulse:t,ang:Math.sin(t*.6)*.9});ctx.restore();}
    else if(FOES[k]){const s=FOES[k].spriteScale;
      ctx.save();ctx.scale(s,s);
      drawFoe({type:k,x:0,y:0,r:FOES[k].r,hp:1,max:1,flash:0,anim:t*4,elite:false,boss:k==='boss',dead:false});ctx.restore();}
    ctx.restore();
  }catch(err){}finally{ctx=main;}
}
let cxOpener=null;
const CX_RETURN_OV={menu:'menu',pause:'pauseOv',end:'endOv'};
function openCodex(from){
  if(codexOpen)return;
  auInit();codexReturn=from;codexOpen=true;
  cxOpener=from==='menu'?$('btnCodexMenu'):from==='pause'?$('btnCodexPause'):null;
  persist();showOv(CX_RETURN_OV[from]||'pauseOv',false);showOv('codexOv',true);
  cxBuildCats();cxRenderList();sizeCodexCv();sfx('page');
  if(!isTouch)setTimeout(()=>$('cxSearch').focus(),60);
}
function closeCodex(){
  if(!codexOpen)return;
  codexOpen=false;showOv('codexOv',false);
  showOv(CX_RETURN_OV[codexReturn]||'pauseOv',true);sfx('ui');
  if(cxOpener&&!isTouch)cxOpener.focus();
}
$('cxClose').addEventListener('click',closeCodex);
$('codexOv').addEventListener('pointerdown',e=>{if(e.target.classList.contains('scrim'))closeCodex();});
$('cxSearch').addEventListener('input',e=>{cxQuery=e.target.value;cxRenderList();});
$('btnCodexMenu').addEventListener('click',()=>openCodex('menu'));
$('btnCodexPause').addEventListener('click',()=>openCodex('pause'));

