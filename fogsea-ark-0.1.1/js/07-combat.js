'use strict';
/* ---------------- 战斗 ---------------- */
function autoAttack(){
  if(P.downed||P.atkCd>0)return;
  let tgt=null,bd=1e9;
  forFoes(P.x,P.y,P.range+1.2,f=>{
    if(f.dead)return;
    const d=dist(P.x,P.y,f.x,f.y);
    if(d<=P.range+f.r&&d<bd){bd=d;tgt=f;}
  });
  if(!tgt){
    for(const n of nodes){
      if(!n.alive)continue;
      const d=dist(P.x,P.y,n.x,n.y);
      if(d<=P.range+.4&&d<bd){bd=d;tgt=n;}
    }
  }
  if(!tgt)return;
  swing(Math.atan2(tgt.y-P.y,tgt.x-P.x));
}
function swing(ang){
  P.atkCd=TUNE.player.atkInterval/P.atkSpd;P.swingT=.18;P.face=ang;
  slashes.push({x:P.x,y:P.y,ang,t:0,R:P.range});
  sfx('swing');
  const inArc=(t,extra)=>{
    const d=dist(P.x,P.y,t.x,t.y);
    if(d>P.range+extra)return false;
    if(d<.75)return true;
    const a=Math.atan2(t.y-P.y,t.x-P.x);
    let da=Math.abs(a-ang);da=Math.min(da,TAU-da);
    return da<=1.15;
  };
  let hit=false;
  forFoes(P.x,P.y,P.range+1.2,f=>{
    if(f.dead||!inArc(f,f.r))return;
    let dmg=P.dmg;const crit=Math.random()<P.crit;if(crit)dmg*=2;
    damageFoe(f,dmg,ang,crit);hit=true;
  });
  for(const n of nodes){if(!n.alive||!inArc(n,.4))continue;hitNode(n);hit=true;}
  if(P.wave>0)shots.push({x:P.x+Math.cos(ang)*.5,y:P.y+Math.sin(ang)*.5,vx:Math.cos(ang)*10,vy:Math.sin(ang)*10,
    type:'wave',dmg:P.dmg*(.5+.2*P.wave),life:.34,pierce:2,z:12});
  if(hit)S.hitstop=Math.max(S.hitstop,.02);
}
function damageFoe(f,dmg,ang,crit,opts){
  if(f.dead)return;
  opts=opts||{};
  f.hp-=dmg;f.flash=.13;S.stats.dmg+=dmg;
  if(!opts.noKnock){f.kx+=Math.cos(ang)*3.2;f.ky+=Math.sin(ang)*3.2;}
  if(!opts.dot){
    floater(f.x,f.y,Math.round(dmg),crit?'#ffb454':'#eef7f2',crit);
    puff(f.x,f.y,4,'#cfe8ff',2.4,.4,2.5);sfx('hit');
  }
  if(f.hp<=0)killFoe(f);
}
function killFoe(f){
  if(f.dead)return;f.dead=true;
  S.stats.kills++;if(S.phase==='night')S.nightKilled++;
  bumpSeen('foe',f.type);gainXP(f.xp);
  puff(f.x,f.y,f.boss?36:12,'#a06bff',3,.7,f.boss?6:3.5);
  ring(f.x,f.y,'rgba(160,107,255,.7)',.2,f.boss?3:1.2,.5);
  const crys=FOES[f.type].crysDrop;
  for(let i=0;i<crys;i++)dropPickup(f.x,f.y,'crys',1);
  if(P.ls>0)healPlayer(P.ls);
  if(isMage()&&tLv('t_burnspread')>0&&(f.burnStacks||0)>0){
    const bt=TALENT_TUNE.t_burnspread;
    let n=0;
    forFoes(f.x,f.y,bt.radius,o=>{
      if(n>=bt.count||o===f||o.dead||dist(f.x,f.y,o.x,o.y)>=bt.radius+o.r)return;
      applyStatus(o,'burn',Math.min(bt.maxStacks,f.burnStacks));n++;
    });
  }
  sfx('kill');shake(f.boss?10:2);
  if(f.boss){banner('雾潮之主已溃','','');sfx('boom');S.hitstop=.12;}
}
function hitNode(n){
  n.hp--;n.shake=.2;
  const cols={tree:'#6fe08a',rock:'#b9c4c9',crys:'#57e6ff'};
  puff(n.x,n.y,5,cols[n.type],2,.45,2.5);
  sfx(n.type==='tree'?'chop':n.type==='rock'?'stone':'crystal');
  if(n.hp<=0){
    n.alive=false;rebuildSolids();rebuildTileCost();fieldDirty=true;
    const yld=TUNE.node.yield[n.type],amt=Math.round(irand(yld[0],yld[1])*P.gather);
    const type=TUNE.resourceDrop[n.type];
    const drops=Math.min(amt,TUNE.node.dropCap),q=Math.floor(amt/drops),r=amt%drops;
    for(let i=0;i<drops;i++)dropPickup(n.x,n.y,type,q+(i<r?1:0));
    gainXP(3);puff(n.x,n.y,10,cols[n.type],3,.6,3);
  }
}
function dropPickup(x,y,type,amt){
  const a=rand(TAU);
  picks.push({x,y,type,amt,vx:Math.cos(a)*rand(1,3),vy:Math.sin(a)*rand(1,3),life:25,bob:rand(TAU)});
}
function healPlayer(v){
  if(P.downed)return;
  const b=P.hp;P.hp=Math.min(P.maxHp,P.hp+v);
  if(P.hp-b>=1)floater(P.x,P.y,'+'+Math.round(P.hp-b),'#6fe08a');
}
let hurtFxT=null;
function damagePlayer(dmg,src){
  if(P.ifr>0||P.downed)return;
  dmg*=DIFFS[save.diff].dmg;
  const ar=TALENT_TUNE.t_armor;
  if(isMage()&&P.en>=P.maxEn*ar.threshold&&tLv('t_armor')>0)
    dmg=Math.max(1,dmg-ar.flat*tLv('t_armor'));
  if(P.shield>0){
    const absorb=Math.min(P.shield,dmg);
    P.shield-=absorb;dmg-=absorb;
    if(dmg<=0){
      P.ifr=Math.max(P.ifr,.3);P.hurtT=.2;
      floater(P.x,P.y,'护盾','#bfe3ff');sfx('ward');
      return;
    }
  }
  if(dmg>=P.hp&&isMage()){
    if(tLv('t_nirvana')>0&&!P.nirvanaUsed&&P.en>0){
      const nv=TALENT_TUNE.t_nirvana;
      P.nirvanaUsed=true;P.en=0;P.hp=Math.max(1,Math.round(P.maxHp*nv.hpRatio));P.ifr=TUNE.down.iframe;
      delete P.stacks.t_nirvana;refreshStacks();
      const elems=['fire','frost','arcane'],elem=elems[irand(0,elems.length-1)];
      for(const f of foes)if(!f.dead){
        damageFoe(f,TALENT_TUNE.t_nirvana.dmg,0,false,{noKnock:true});
        if(!f.dead)applyElement(f,elem,2);
      }
      ring(P.x,P.y,'rgba(255,180,84,.95)',.3,4.5,.7);
      puff(P.x,P.y,30,'#ffb454',5,.8,4);
      toast('魔能涅槃 · 每局一次','good');sfx('boom');shake(10);
      return;
    }
    if(tLv('t_manashield')>0&&P.en>=P.maxEn*TALENT_TUNE.t_manashield.threshold){
      P.en=0;P.ifr=Math.max(P.ifr,1.2);P.hurtT=.2;
      ring(P.x,P.y,'rgba(191,227,255,.95)',.2,2.2,.5);
      puff(P.x,P.y,20,'#bfe3ff',3,.6,3);
      floater(P.x,P.y,'法力护盾','#bfe3ff',true);sfx('ward');
      return;
    }
  }
  P.hp-=dmg;P.ifr=.6;P.hurtT=.35;
  floater(P.x,P.y,'-'+Math.round(dmg),'#ff4d6d',true);
  puff(P.x,P.y,8,'#ff4d6d',2.5,.5,3);sfx('hurt');shake(5);
  UI.hurt.style.opacity=.9;clearTimeout(hurtFxT);hurtFxT=setTimeout(()=>UI.hurt.style.opacity=0,140);
  if(P.thorns>0&&src&&src.hp!==undefined&&!src.dead){
    src.hp-=P.thorns;src.flash=.1;floater(src.x,src.y,Math.round(P.thorns),'#6fe08a');
    if(src.hp<=0)killFoe(src);
  }
  if(P.hp<=0){
    P.hp=0;P.downed=true;P.respT=TUNE.down.time;
    res.crys=Math.floor(res.crys*TUNE.down.crysKeep);refreshRes();
    puff(P.x,P.y,24,'#ffb454',3,.8,4);toast('灯芯熄灭 · '+TUNE.down.time+' 秒重燃','bad');sfx('defeat');
  }
}
function damageCore(dmg){
  if(S.mode!=='play')return;
  core.hp=Math.max(0,core.hp-dmg*DIFFS[save.diff].dmg);core.flash=.3;sfx('coreHit');shake(3);
  if(core.hp<=0)loseRun();
}
function damageBuild(b,dmg){
  b.hp-=dmg*DIFFS[save.diff].dmg;b.flash=.15;
  puff(b.x,b.y,3,'#e0b070',1.5,.3,2);
  if(b.hp<=0){
    const i=builds.indexOf(b);if(i>=0)builds.splice(i,1);
    rebuildSolids();rebuildTileCost();fieldDirty=true;
    puff(b.x,b.y,14,'#e0b070',2.5,.6,3);floater(b.x,b.y,'建筑被毁','#ff4d6d');sfx('boom');
  }else{rebuildTileCost();fieldDirty=true;}
}
function tryDash(){
  if(S.mode!=='play'||P.dashCd>0||P.downed)return;
  let dx=0,dy=0;
  if(keys['w']||keys['arrowup'])dy-=1;if(keys['s']||keys['arrowdown'])dy+=1;
  if(keys['a']||keys['arrowleft'])dx-=1;if(keys['d']||keys['arrowright'])dx+=1;
  if(isTouch&&(stickVec[0]||stickVec[1])){dx=stickVec[0]+stickVec[1];dy=stickVec[1]-stickVec[0];}
  if(!dx&&!dy){dx=Math.cos(P.face);dy=Math.sin(P.face);}
  const m=Math.hypot(dx,dy)||1;
  P.dashDx=dx/m;P.dashDy=dy/m;P.dashT=TUNE.dash.dur;P.dashCd=P.dashCdMax;P.ifr=Math.max(P.ifr,TUNE.dash.iframe);sfx('dash');
}
function castNova(){
  if(S.mode!=='play'||P.downed||P.en<TUNE.nova.cost)return;
  P.en-=TUNE.nova.cost;
  // 个人测试作弊：暂停时键入 l3131 可整体放大雾爆（不新增任何页面元素）
  const R=novaRadius(),dmg=novaDmgValue();
  ring(P.x,P.y,'rgba(87,230,255,.9)',.3,R,.5);ring(P.x,P.y,'rgba(160,107,255,.7)',.2,R*.7,.4);
  puff(P.x,P.y,26,'#57e6ff',5,.6,3.5);
  for(const f of foes){
    if(f.dead)continue;
    if(dist(P.x,P.y,f.x,f.y)<R+f.r){
      const a=Math.atan2(f.y-P.y,f.x-P.x);let dm=dmg;if(Math.random()<P.crit)dm*=2;
      f.kx+=Math.cos(a)*6;f.ky+=Math.sin(a)*6;damageFoe(f,dm,a,false);
    }
  }
  for(const n of nodes)if(n.alive&&dist(P.x,P.y,n.x,n.y)<R)hitNode(n);
  sfx('nova');shake(8);S.hitstop=Math.max(S.hitstop,.04);
}
function tryRepair(){
  if(S.mode!=='play'||P.downed)return;
  if(dist(P.x,P.y,core.x,core.y)>2.8)return;
  if(core.hp>=core.max){toast('核心完好');return;}
  const rc=TUNE.core.repair;
  if(res.wood<rc.wood||res.stone<rc.stone){toast('资源不足','warn');sfx('deny');return;}
  res.wood-=rc.wood;res.stone-=rc.stone;refreshRes();
  core.hp=Math.min(core.max,core.hp+rc.heal);
  puff(core.x,core.y,16,'#ffb454',2,.7,3);floater(core.x,core.y,'+'+rc.heal,'#ffb454',true);sfx('repair');
}
function gainXP(v){
  P.xp+=v;
  while(P.xp>=P.next){
    P.xp-=P.next;P.lvl++;S.stats.level=P.lvl;P.next=24+(P.lvl-1)*16;
    P.maxHp+=8;healPlayer(20);
    ring(P.x,P.y,'rgba(160,107,255,.8)',.3,2.2,.6);
    puff(P.x,P.y,16,'#d9c4ff',2.5,.7,3);
    floater(P.x,P.y,'Lv.'+P.lvl,'#c9a8ff',true);
    toast('等级 '+P.lvl+' · 黎明可选祝福','good');sfx('level');
  }
}
function refreshStacks(){
  const ks=Object.keys(P.stacks);
  UI.stacks.textContent=ks.length?ks.slice(0,3).map(k=>{
    const c=BLESSINGS.find(x=>x.id===k);return c?c.n+'×'+P.stacks[k]:'';
  }).filter(Boolean).join(' '):'尚无祝福';
}

/* ---------------- 敌人 ---------------- */
function freeSpawnNear(x,y){
  for(let t=0;t<24;t++){
    const nx=x+rand(-1.2,1.2),ny=y+rand(-1.2,1.2);
    if(!walk(nx,ny))continue;
    let ok=true;forSolids(nx,ny,1.2,s=>{if(dist(nx,ny,s.x,s.y)<s.r+.4)ok=false;});
    if(ok)return[nx,ny];
  }
  return[x,y];
}
function spawnFoe(type,x,y,elite){
  const d=FOES[type],mult=DIFFS[save.diff];
  const hpM=mult.hp*dayScale(S.day)*(elite?1.6:1);
  const[fx,fy]=type==='boss'?[x,y]:freeSpawnNear(x,y);
  foes.push({type,x:fx,y:fy,hp:d.hp*hpM,max:d.hp*hpM,spd:d.spd*rand(.9,1.1),dmg:d.dmg,r:d.r*TUNE.world.colScale,vs:TUNE.world.foeScale,
    xp:elite?d.xp*2:d.xp,coreDmg:d.coreDmg,atkCd:rand(.5,1.2),retarget:0,target:'core',kx:0,ky:0,flash:0,
    anim:rand(TAU),elite,boss:type==='boss',dead:false,fireCd:rand(1,2.5),
    spawnCd:d.summonFirst||5,stompCd:d.stompFirst||3,
    px:fx,py:fy,stuckT:0,stuckN:0,detourT:0,detourSign:1,phaseT:0,strafe:Math.random()<.5?-1:1});
  // 约半数个体长 Q 版角：复用 anim 的随机值，不额外消耗 RNG 序列
  foes[foes.length-1].horn=foes[foes.length-1].anim>Math.PI;
}
function pickFoeType(){
  const day=S.day,bag=[['crawler',10]];
  if(day>=2)bag.push(['spitter',2+effDay(day)]);
  if(day>=3)bag.push(['brute',1+effDay(day)*.8]);
  let tot=0;bag.forEach(b=>tot+=b[1]);
  let r=rand(tot);
  for(const[t,w]of bag){r-=w;if(r<=0)return t;}
  return 'crawler';
}
function startNight(){
  S.phase='night';S.nightKilled=0;S.spawnT=1.4;
  const mult=DIFFS[save.diff],isBossNight=S.day%MAX_NIGHT===0;
  S.nightTotal=Math.round((6+4.2*effDay(S.day))*mult.count);
  if(isBossNight)S.nightTotal=Math.round(S.nightTotal*.7)+1;
  S.toSpawn=S.nightTotal;
  if(isBossNight){
    const p=edgeSpawns[irand(0,edgeSpawns.length-1)];
    warns.push({x:p[0],y:p[1],t:1.6,types:['boss'],boss:true});S.toSpawn--;
    banner(`第 ${S.day} 夜 · 雾潮之主`,'','danger');sfx('boss');
  }else{banner(`第 ${S.day} 夜`,'仅可使用瞬发牌','night');sfx('horn');}
  auPhase(true);S.handDirty=true;
  if(!S.hints.night){S.hints.night=true;toast('夜晚：构筑牌封存，瞬发可用','warn');}
}
function enterNextDay(){
  S.day++;S.phase='day';S.timeLeft=DAY_LEN;
  core.hp=Math.min(core.max,core.hp+TUNE.core.dawnHeal);
  if(!P.downed)healPlayer(P.maxHp*.25);
  let regrew=0;
  nodes.forEach(n=>{
    if(n.alive||Math.random()>=.6)return;
    if(builds.some(b=>dist(b.x,b.y,n.x,n.y)<.9))return;
    if(dist(P.x,P.y,n.x,n.y)<.9)return;
    let busy=false;forFoes(n.x,n.y,1.2,f=>{if(dist(f.x,f.y,n.x,n.y)<.8)busy=true;});
    if(busy)return;
    n.alive=true;n.hp=n.max;regrew++;
  });
  if(regrew){rebuildSolids();rebuildTileCost();fieldDirty=true;}
  auPhase(false);sfx('dawn');
  openDawn();
}
function dawn(){
  if(S.mode!=='play')return;
  if(core.hp<=0){loseRun();return;}
  S.stats.nights=S.day;
  if(!S.endless&&S.day>=MAX_NIGHT){winRun();return;}
  enterNextDay();
}
const _dir=[0,0];
function updateFoes(dt){
  rebuildFoeGrid();
  if(fieldDirty){rebuildTileCost();computeField(coreField,core.x,core.y);fieldDirty=false;plyFieldT=0;}
  plyFieldT-=dt;
  const pt=(P.y|0)*GRID+(P.x|0);
  let needPly=false;for(const f of foes)if(f.target==='player'){needPly=true;break;}
  if(!P.downed&&(needPly||S.phase==='night')&&(plyFieldT<=0||pt!==plyTile)){
    computeField(plyField,P.x,P.y);plyTile=pt;plyFieldT=.2;
  }
  for(const f of foes){
    if(f.dead)continue;
    f.anim+=dt*6;f.flash=Math.max(0,f.flash-dt);f.atkCd-=dt;f.retarget-=dt;
    f.detourT=Math.max(0,f.detourT-dt);f.phaseT=Math.max(0,f.phaseT-dt);
    updateFoeStatus(f,dt);
    if(f.dead)continue;
    if((f.freezeT||0)>0)continue;
    if(f.retarget<=0){
      f.retarget=.3;
      const pd=P.downed?99:dist(f.x,f.y,P.x,P.y);
      f.target=(f.type==='brute'||f.boss)?(pd<1.6?'player':'core'):(pd<3.4?'player':'core');
    }
    const tgt=f.target==='player'?P:core,tx=tgt.x,ty=tgt.y;
    const d=dist(f.x,f.y,tx,ty),ga=Math.atan2(ty-f.y,tx-f.x);
    const gx=Math.cos(ga),gy=Math.sin(ga);
    let dx=0,dy=0,wants=false,attacking=false,adjB=null;
    forSolids(f.x,f.y,f.r+1,s=>{
      if(s.kind!==1||adjB)return;
      const dd=dist(f.x,f.y,s.x,s.y);
      if(dd<f.r+s.r+.16){
        const bx=(s.x-f.x)/(dd||1),by=(s.y-f.y)/(dd||1);
        if(bx*gx+by*gy>.1||d<2.4)adjB=s.obj;
      }
    });
    if(adjB){attacking=true;if(f.atkCd<=0){f.atkCd=1.1;damageBuild(adjB,f.dmg);puff(adjB.x,adjB.y,3,'#c9a8ff',1.5,.3,2);}}
    if(!attacking){
      const reach=f.target==='player'?f.r+.42:core.r+f.r+.25;
      if(f.type==='spitter'){
        const sd=FOES.spitter;
        f.fireCd-=dt;
        if(d>sd.keepAway)wants=true;
        else if(d<sd.closeIn){dx=-gx;dy=-gy;wants=true;}
        else{dx=-gy*f.strafe*.55;dy=gx*f.strafe*.55;wants=true;if(Math.random()<dt*.4)f.strafe*=-1;}
        if(f.fireCd<=0&&d<sd.fireRange){
          f.fireCd=sd.fireInterval;
          shots.push({x:f.x,y:f.y,vx:gx*6.5,vy:gy*6.5,type:'fog',dmg:f.dmg,life:2.5,z:12});sfx('warn');
        }
        if(d<=reach&&f.atkCd<=0){
          f.atkCd=1.2;
          if(f.target==='player')damagePlayer(f.dmg,f);
          else{damageCore(f.coreDmg);puff(core.x,core.y,4,'#ff8a3d',1.5,.3,2);}
        }
      }else if(d<=reach){
        if(f.atkCd<=0){
          f.atkCd=f.boss?1.4:1.0;
          if(f.target==='player')damagePlayer(f.dmg,f);
          else{damageCore(f.coreDmg);puff(core.x,core.y,5,'#ff8a3d',2,.4,3);}
        }
      }else wants=true;
      if(wants&&dx===0&&dy===0){
        if(d<2.4){dx=gx;dy=gy;}
        else{const field=f.target==='player'?plyField:coreField;
          if(fieldDir(field,f.x,f.y,_dir)){dx=_dir[0];dy=_dir[1];}else{dx=gx;dy=gy;}}
      }
    }
    f.stuckT+=dt;
    if(f.stuckT>=.5){
      const moved=dist(f.x,f.y,f.px,f.py);
      if(wants&&moved<.12){f.stuckN++;f.detourT=.75;f.detourSign=Math.random()<.5?-1:1;
        if(f.stuckN>=3){f.phaseT=1.1;f.stuckN=0;}}
      else f.stuckN=0;
      f.px=f.x;f.py=f.y;f.stuckT=0;
    }
    if(f.detourT>0&&wants){
      const px=-gy*f.detourSign,py=gx*f.detourSign;
      dx=dx*.25+px*.9;dy=dy*.25+py*.9;
      const m=Math.hypot(dx,dy)||1;dx/=m;dy/=m;
    }
    let sepx=0,sepy=0;
    forFoes(f.x,f.y,f.r+1.2,o=>{
      if(o===f||o.dead)return;
      const dd=dist(f.x,f.y,o.x,o.y),min=f.r+o.r;
      if(dd<min&&dd>.001){const push=(min-dd)/min;sepx+=(f.x-o.x)/dd*push;sepy+=(f.y-o.y)/dd*push;}
    });
    const sm=Math.hypot(sepx,sepy);if(sm>1){sepx/=sm;sepy/=sm;}
    const fs=f.spd*foeSlowMult(f);
    moveCircle(f,(dx*fs+sepx*fs*.9+f.kx)*dt,(dy*fs+sepy*fs*.9+f.ky)*dt,f.r,f.phaseT>0);
    f.kx*=Math.pow(.0015,dt);f.ky*=Math.pow(.0015,dt);
    if(f.boss){
      f.spawnCd-=dt;f.stompCd-=dt;
      const bd=FOES.boss;
      if(f.spawnCd<=0&&foes.length<FOE_CAP){
        f.spawnCd=bd.summonInterval;
        for(let i=0;i<bd.summonCount;i++)spawnFoe('crawler',f.x+rand(-1,1),f.y+rand(-1,1));
        sfx('boss');ring(f.x,f.y,'rgba(160,107,255,.6)',.5,2,.5);
      }
      if(f.stompCd<=0&&!P.downed&&dist(f.x,f.y,P.x,P.y)<bd.stompRange){
        f.stompCd=bd.stompInterval;damagePlayer(bd.stompDmg,f);
        ring(f.x,f.y,'rgba(255,77,109,.8)',.3,2.6,.45);shake(9);sfx('boom');
      }
    }
  }
  for(let i=foes.length-1;i>=0;i--)if(foes[i].dead)foes.splice(i,1);
  rebuildFoeGrid(); // 敌人移动后重建，箭塔索敌与弹体碰撞才不会查到旧坐标
}
function updateBuilds(dt){
  for(const b of builds){
    b.flash=Math.max(0,b.flash-dt);b.pulse+=dt;
    const def=BUILDS[b.type];
    if(b.type==='tower'||b.type==='cannon'){
      b.cd-=dt;let best=null,bd=def.range;
      forFoes(b.x,b.y,def.range,f=>{if(f.dead)return;const d=dist(b.x,b.y,f.x,f.y);if(d<bd){bd=d;best=f;}});
      if(best){
        const ta=Math.atan2(best.y-b.y,best.x-b.x);
        let da=ta-b.ang;while(da>Math.PI)da-=TAU;while(da<-Math.PI)da+=TAU;
        b.ang+=da*Math.min(1,dt*8);
        if(b.cd<=0){
          b.cd=def.rate;const dmg=def.dmg*P.towerMult;
          if(b.type==='tower'){shots.push({x:b.x,y:b.y,vx:Math.cos(b.ang)*12,vy:Math.sin(b.ang)*12,type:'arrow',dmg,life:1,z:22});sfx('arrow');}
          else{shots.push({x:b.x,y:b.y,vx:Math.cos(b.ang)*8,vy:Math.sin(b.ang)*8,type:'cannon',dmg,life:1.2,z:20});sfx('cannon');}
          b.flash=.08;
        }
      }
    }else if(b.type==='totem'){
      b.cd-=dt;
      if(b.cd<=0){b.cd=1;
        if(!P.downed&&dist(b.x,b.y,P.x,P.y)<def.range&&P.hp<P.maxHp){healPlayer(4);puff(P.x,P.y,3,'#6fe08a',1,.5,2);}
        puff(b.x,b.y,2,'#6fe08a',.8,.7,2);}
    }else if(b.type==='manawell'){
      b.cd-=dt;
      if(b.cd<=0){b.cd=.6;puff(b.x,b.y,1,'#57e6ff',.6,.6,2);}
      if(!P.downed&&dist(b.x,b.y,P.x,P.y)<=def.range)
        gainMana(def.regen*P.regen*(1+TALENT_TUNE.t_spring.regen*tLv('t_spring'))*dt);
    }
  }
}
function shotStepHit(s){
  if(s.type==='arrow'||s.type==='wave'){
    let dead=false;
    forFoes(s.x,s.y,1.2,f=>{
      if(dead||f.dead)return;
      if(dist(s.x,s.y,f.x,f.y)<f.r+.22){
        if(s.type==='wave'){
          if(!s.hitSet)s.hitSet=new Set();
          if(s.hitSet.has(f))return; // 同一目标只结算一次穿透
          s.hitSet.add(f);
        }
        damageFoe(f,s.dmg,Math.atan2(s.vy,s.vx),false);
        if(s.type==='wave'){s.pierce--;if(s.pierce<=0)dead=true;}else dead=true;
      }
    });
    return dead;
  }
  if(s.type==='cannon'){
    let boom=false;
    forFoes(s.x,s.y,1.2,f=>{if(boom||f.dead)return;if(dist(s.x,s.y,f.x,f.y)<f.r+.3)boom=true;});
    if(boom){
      ring(s.x,s.y,'rgba(87,230,255,.9)',.2,1.5,.4);puff(s.x,s.y,14,'#57e6ff',3.5,.5,3);
      for(const o of foes){if(o.dead)continue;if(dist(s.x,s.y,o.x,o.y)<1.5+o.r)damageFoe(o,s.dmg,Math.atan2(o.y-s.y,o.x-s.x),false);}
      sfx('boom');shake(3);return true;
    }
    return false;
  }
  if(s.type==='fog'){
    if(!P.downed&&P.ifr<=0&&dist(s.x,s.y,P.x,P.y)<.45){damagePlayer(s.dmg);return true;}
    if(dist(s.x,s.y,core.x,core.y)<core.r+.1){damageCore(8);puff(s.x,s.y,5,'#a06bff',2,.4,2);return true;}
    let hit=false;
    forSolids(s.x,s.y,.9,o=>{if(hit||o.kind!==1)return;if(dist(s.x,s.y,o.x,o.y)<o.r+.15){damageBuild(o.obj,8);hit=true;}});
    return hit;
  }
  return false;
}
function updateShots(dt){
  for(let i=shots.length-1;i>=0;i--){
    const s=shots[i];
    const steps=Math.min(8,Math.max(1,Math.ceil(Math.hypot(s.vx,s.vy)*dt/.25)));
    const sx=s.vx*dt/steps,sy=s.vy*dt/steps,st=dt/steps;
    let dead=false;
    for(let k=0;k<steps&&!dead;k++){
      s.x+=sx;s.y+=sy;s.life-=st;
      if(s.life<=0||!walk(s.x,s.y)){dead=true;break;}
      dead=shotStepHit(s);
    }
    if(dead){if(s.type==='fog')puff(s.x,s.y,4,'#a06bff',1.5,.3,2);shots.splice(i,1);}
  }
}
function updatePicks(dt){
  for(let i=picks.length-1;i>=0;i--){
    const p=picks[i];p.life-=dt;p.bob+=dt*5;
    p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.pow(.01,dt);p.vy*=Math.pow(.01,dt);
    if(!P.downed){
      const d=dist(p.x,p.y,P.x,P.y);
      if(d<P.magnet){const a=Math.atan2(P.y-p.y,P.x-p.x),pull=lerp(14,4,d/P.magnet);
        p.x+=Math.cos(a)*pull*dt;p.y+=Math.sin(a)*pull*dt;}
      if(d<.55){
        res[p.type]+=p.amt;S.stats.gathered+=p.amt;
        floater(P.x,P.y-.3,`+${p.amt}${RESNAME[p.type]}`,RESCOL[p.type]);
        sfx('pickup');refreshRes(p.type);picks.splice(i,1);continue;
      }
    }
    if(p.life<=0)picks.splice(i,1);
  }
}
function updateParts(dt){
  for(let i=parts.length-1;i>=0;i--){
    const p=parts[i];p.life-=dt;
    if(p.life<=0){parts.splice(i,1);partPool.push(p);continue;}
    if(!p.ring){p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vz-=(p.grav||140)*dt;if(p.z<0){p.z=0;p.vz*=-.4;}}
  }
  for(let i=floats.length-1;i>=0;i--){const f=floats[i];f.life-=dt;f.y-=dt*.9;if(f.life<=0)floats.splice(i,1);}
  for(let i=slashes.length-1;i>=0;i--){slashes[i].t+=dt;if(slashes[i].t>.18)slashes.splice(i,1);}
  for(let i=ghosts.length-1;i>=0;i--){ghosts[i].t+=dt;if(ghosts[i].t>.3)ghosts.splice(i,1);}
  for(const n of nodes)if(n.shake>0)n.shake=Math.max(0,n.shake-dt);
}
function update(dt){
  S.elapsed+=dt;S.combatT+=dt;rebuildFoeGrid();
  if(S.phase==='day'){
    S.timeLeft-=dt;S.nightAmt=Math.max(0,S.nightAmt-dt*.5);
    if(S.timeLeft<10&&S.timeLeft+dt>=10){toast('夜幕将至 · 构筑即将封存','warn');sfx('warn');}
    if(S.timeLeft<=0)startNight();
    core.hp=Math.min(core.max,core.hp+dt*TUNE.core.regen);
    if(!P.downed&&dist(P.x,P.y,core.x,core.y)<3)healPlayer(dt*2);
  }else{
    S.nightAmt=Math.min(1,S.nightAmt+dt*.4);S.spawnT-=dt;
    if(S.spawnT<=0&&S.toSpawn>0&&foes.length+warns.length*4<FOE_CAP){
      const n=Math.min(S.toSpawn,irand(2,2+Math.floor(S.day/2)),5);
      const pts=Math.random()<.4?2:1;let made=0;
      for(let p=0;p<pts&&made<n;p++){
        const pt=edgeSpawns[irand(0,edgeSpawns.length-1)];
        const types=[],share=Math.ceil((n-made)/(pts-p));
        for(let i=0;i<share&&made+types.length<n;i++)types.push(pickFoeType());
        warns.push({x:pt[0],y:pt[1],t:.95,types});made+=types.length;
      }
      S.toSpawn-=made;S.spawnT=Math.max(1.6,3.4-S.day*.22);
    }
    for(let i=warns.length-1;i>=0;i--){
      const w=warns[i];w.t-=dt;
      if(w.t<=0){w.types.forEach(t=>spawnFoe(t,w.x,w.y,S.day>=5&&t!=='boss'&&Math.random()<.12));
        puff(w.x,w.y,8,'#a06bff',2,.5,3);warns.splice(i,1);}
    }
    if(S.toSpawn<=0&&warns.length===0&&foes.length===0)dawn();
    if(S.mode!=='play')return; // 判胜/判负/黎明确定的同一帧不再推进战斗
  }
  if(P.downed){
    P.respT-=dt;
    if(P.respT<=0){
      P.downed=false;const[rx,ry]=freeSpawnNear(core.x+1.6,core.y);
      P.x=rx;P.y=ry;P.hp=P.maxHp*TUNE.down.hpRatio;P.en=TUNE.down.en;P.ifr=TUNE.down.iframe;
      puff(P.x,P.y,18,'#ffb454',2.5,.7,3);ring(P.x,P.y,'rgba(255,180,84,.8)',.2,1.6,.5);
      sfx('respawn');toast('灯芯重燃','good');
    }
  }else{
    let dx=0,dy=0;
    if(keys['w']||keys['arrowup'])dy-=1;if(keys['s']||keys['arrowdown'])dy+=1;
    if(keys['a']||keys['arrowleft'])dx-=1;if(keys['d']||keys['arrowright'])dx+=1;
    if(isTouch&&(Math.abs(stickVec[0])>.12||Math.abs(stickVec[1])>.12)){dx=stickVec[0]+stickVec[1];dy=stickVec[1]-stickVec[0];}
    const m=Math.hypot(dx,dy);P.moving=m>0;
    if(P.dashT>0){
      P.dashT-=dt;moveCircle(P,P.dashDx*P.spd*moveSpeedMult()*TUNE.dash.mult*dt,P.dashDy*P.spd*moveSpeedMult()*TUNE.dash.mult*dt,.3,false);
      ghosts.push({x:P.x,y:P.y,t:0});
      if(Math.random()<.5)puff(P.x,P.y,1,'#8d8dd6',.5,.3,2);
    }else if(m>0){
      dx/=m;dy/=m;moveCircle(P,dx*P.spd*moveSpeedMult()*dt,dy*P.spd*moveSpeedMult()*dt,.3,false);
      P.face=Math.atan2(dy,dx);P.anim+=dt*10;
    }else depenetrate(P,.3,false);
    P.atkCd-=dt;P.swingT=Math.max(0,P.swingT-dt);
    P.dashCd=Math.max(0,P.dashCd-dt);P.ifr=Math.max(0,P.ifr-dt);P.hurtT=Math.max(0,P.hurtT-dt);
    gainMana(manaRegenRate()*dt);
    autoAttack();
  }
  updateSpellState(dt);
  updateFoes(dt);updateBuilds(dt);updateShots(dt);updatePicks(dt);updateParts(dt);
  core.flash=Math.max(0,core.flash-dt);
  core.beam=lerp(core.beam,S.phase==='night'?1:.25,dt*2);
  let lx=P.x,ly=P.y;
  if(mouseActive&&!isTouch&&!S.dragUid){lx+=(mouseWorld[0]-P.x)*.14;ly+=(mouseWorld[1]-P.y)*.14;}
  cam.x=lerp(cam.x,lx,Math.min(1,dt*6));cam.y=lerp(cam.y,ly,Math.min(1,dt*6));
  cam.z=lerp(cam.z,cam.tz,Math.min(1,dt*8));
  cam.shake=Math.max(0,cam.shake-dt*30);cam.sx=rand(-1,1)*cam.shake;cam.sy=rand(-1,1)*cam.shake;
  if(!S.hints.move&&S.elapsed>1.2){S.hints.move=true;toast(isTouch?'摇杆移动 · 拖卡牌落地':'WASD 移动 · 拖动卡牌到地面打出');}
}

