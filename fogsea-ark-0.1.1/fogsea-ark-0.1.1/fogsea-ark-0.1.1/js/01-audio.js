'use strict';
/* ---------------- 音频 ---------------- */
const AU={ctx:null,master:null,sfxG:null,musG:null,ambG:null,noiseBuf:null,delay:null,nightDrone:null,ambFilter:null,musicTimer:null,last:{},started:false};
function auInit(){
  if(AU.started)return;AU.started=true;
  try{
    const C=new (window.AudioContext||window.webkitAudioContext)();AU.ctx=C;
    AU.master=C.createGain();AU.master.gain.value=save.muted?0:1;AU.master.connect(C.destination);
    AU.sfxG=C.createGain();AU.sfxG.gain.value=.85;AU.sfxG.connect(AU.master);
    AU.musG=C.createGain();AU.musG.gain.value=.4;AU.musG.connect(AU.master);
    AU.delay=C.createDelay(.6);AU.delay.delayTime.value=.29;
    const fb=C.createGain();fb.gain.value=.32;AU.delay.connect(fb);fb.connect(AU.delay);
    const wet=C.createGain();wet.gain.value=.22;AU.delay.connect(wet);wet.connect(AU.master);
    const len=C.sampleRate;AU.noiseBuf=C.createBuffer(1,len,C.sampleRate);
    const d=AU.noiseBuf.getChannelData(0);let last=0;
    for(let i=0;i<len;i++){const w=Math.random()*2-1;last=(last+.02*w)/1.02;d[i]=last*3.2;}
    const src=C.createBufferSource();src.buffer=AU.noiseBuf;src.loop=true;
    AU.ambFilter=C.createBiquadFilter();AU.ambFilter.type='lowpass';AU.ambFilter.frequency.value=420;
    AU.ambG=C.createGain();AU.ambG.gain.value=.05;
    src.connect(AU.ambFilter);AU.ambFilter.connect(AU.ambG);AU.ambG.connect(AU.master);src.start();
    const lfo=C.createOscillator();lfo.frequency.value=.07;
    const lg=C.createGain();lg.gain.value=.02;lfo.connect(lg);lg.connect(AU.ambG.gain);lfo.start();
    AU.nightDrone=C.createGain();AU.nightDrone.gain.value=0;AU.nightDrone.connect(AU.master);
    [55,82.5].forEach((f,i)=>{const o=C.createOscillator();o.type='sine';o.frequency.value=f;
      const g=C.createGain();g.gain.value=i?.35:.6;o.connect(g);g.connect(AU.nightDrone);o.start();});
    AU.musicTimer=setInterval(()=>{
      if(save.muted||document.hidden||!AU.ctx)return;
      const night=S.mode!=='menu'&&S.phase==='night';
      const day=[[220,261.6,329.6],[196,246.9,293.7],[174.6,220,261.6],[196,261.6,329.6]];
      const nte=[[146.8,174.6,220],[130.8,164.8,196],[146.8,196,233.1],[123.5,155.6,185]];
      const chord=(night?nte:day)[irand(0,3)];const t=AU.ctx.currentTime;
      chord.forEach((f,i)=>{
        const o=AU.ctx.createOscillator();o.type=i===0?'sine':'triangle';o.frequency.value=f*(night?.5:1);
        const g=AU.ctx.createGain();const lp=AU.ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1100;
        g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.05,t+1.1);g.gain.linearRampToValueAtTime(0,t+3.6);
        o.connect(lp);lp.connect(g);g.connect(AU.musG);g.connect(AU.delay);o.start(t);o.stop(t+3.8);
      });
    },4300);
  }catch(e){}
}
function tone(f0,f1,dur,type='sine',vol=.2,when=0){
  if(!AU.ctx||save.muted)return;
  const C=AU.ctx,t=C.currentTime+when,o=C.createOscillator(),g=C.createGain();
  o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(1,f1),t+dur);
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g);g.connect(AU.sfxG);o.start(t);o.stop(t+dur+.02);
}
function noise(dur,vol,freq,type='lowpass',when=0){
  if(!AU.ctx||save.muted)return;
  const C=AU.ctx,t=C.currentTime+when,s=C.createBufferSource();
  s.buffer=AU.noiseBuf;s.playbackRate.value=rand(.8,1.2);
  const f=C.createBiquadFilter();f.type=type;f.frequency.value=freq;
  const g=C.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  s.connect(f);f.connect(g);g.connect(AU.sfxG);s.start(t);s.stop(t+dur+.02);
}
function sfx(n){
  if(!AU.ctx||save.muted)return;
  const now=performance.now();if(AU.last[n]&&now-AU.last[n]<70)return;AU.last[n]=now;
  switch(n){
    case 'chop':noise(.07,.3,900);tone(170,80,.08,'triangle',.2);break;
    case 'stone':noise(.05,.25,2400,'highpass');tone(620,300,.06,'square',.08);break;
    case 'crystal':tone(880,1320,.13,'sine',.16);tone(1760,2200,.1,'sine',.07,.03);break;
    case 'swing':noise(.08,.12,1400,'bandpass');break;
    case 'hit':tone(150,60,.08,'triangle',.26);noise(.05,.18,700);break;
    case 'kill':tone(300,55,.2,'sawtooth',.16);noise(.14,.22,500);break;
    case 'hurt':tone(220,80,.22,'sawtooth',.24);noise(.15,.25,400);break;
    case 'dash':noise(.13,.2,1600,'bandpass');tone(400,900,.1,'sine',.08);break;
    case 'nova':tone(70,40,.45,'sine',.5);noise(.35,.4,350);tone(600,120,.3,'sawtooth',.1);break;
    case 'arrow':noise(.04,.1,3200,'highpass');tone(900,500,.04,'square',.05);break;
    case 'cannon':tone(200,60,.25,'square',.15);noise(.2,.3,600);break;
    case 'boom':tone(90,35,.35,'sine',.4);noise(.3,.35,450);break;
    case 'build':tone(220,180,.05,'triangle',.22);tone(180,140,.05,'triangle',.2,.07);noise(.06,.15,800,'lowpass',.02);break;
    case 'deny':tone(160,120,.1,'square',.12);break;
    case 'pickup':tone(660,990,.07,'sine',.1);break;
    case 'level':[523,659,784,1046].forEach((f,i)=>tone(f,f,.14,'sine',.16,i*.07));break;
    case 'horn':tone(82,78,1.1,'sawtooth',.22);tone(123,118,1.1,'sawtooth',.12);noise(1,.12,300);break;
    case 'dawn':[660,880,990].forEach((f,i)=>tone(f,f*1.01,.35,'sine',.1,i*.12));break;
    case 'victory':[523,659,784,1046,1318].forEach((f,i)=>tone(f,f,.3,'triangle',.16,i*.13));break;
    case 'defeat':tone(110,50,1.4,'sawtooth',.2);tone(165,75,1.4,'sawtooth',.1,.05);break;
    case 'boss':tone(65,50,.9,'sawtooth',.3);noise(.7,.25,250);break;
    case 'ui':tone(800,600,.04,'square',.06);break;
    case 'page':noise(.07,.12,2200,'highpass');tone(520,760,.07,'sine',.07);break;
    case 'draw':noise(.05,.1,3000,'highpass');tone(700,1000,.06,'sine',.06);break;
    case 'card':tone(420,660,.09,'triangle',.13);noise(.05,.1,2000,'highpass');break;
    case 'salvage':tone(500,180,.22,'sawtooth',.14);noise(.18,.18,900);break;
    case 'swap':tone(420,700,.1,'sine',.12);tone(700,980,.09,'sine',.08,.06);break;
    case 'heal':[523,784,1046].forEach((f,i)=>tone(f,f,.2,'sine',.12,i*.06));break;
    case 'ward':tone(320,760,.16,'sine',.14);tone(640,960,.12,'sine',.08,.04);break;
    case 'repair':tone(220,180,.05,'triangle',.2);tone(260,220,.05,'triangle',.2,.09);tone(880,1100,.12,'sine',.1,.18);break;
    case 'coreHit':tone(120,50,.2,'triangle',.3);tone(1200,900,.08,'square',.06);break;
    case 'respawn':tone(330,660,.4,'sine',.15);tone(440,880,.4,'sine',.1,.1);break;
    case 'warn':tone(500,380,.18,'sine',.08);break;
    case 'fire':noise(.18,.22,700,'lowpass');tone(190,70,.14,'sawtooth',.18);break;
    case 'frost':tone(1200,620,.12,'sine',.12);noise(.08,.1,3000,'highpass');break;
    case 'arcane':tone(420,880,.12,'sine',.12);tone(880,1320,.1,'triangle',.06,.03);break;
    case 'cast':tone(520,760,.08,'sine',.08);break;
  }
}
function auPhase(night){
  if(!AU.ctx)return;const t=AU.ctx.currentTime;
  AU.nightDrone.gain.cancelScheduledValues(t);AU.nightDrone.gain.linearRampToValueAtTime(night?.05:0,t+2.5);
  AU.ambFilter.frequency.linearRampToValueAtTime(night?260:420,t+2.5);
}
function setMuted(m){
  save.muted=m;persist();
  if(AU.master)AU.master.gain.value=m?0:1;
  UI.mute.innerHTML=svg(m?'spkOff':'spkOn',19);
  UI.mute.classList.toggle('warnState',m);
}

