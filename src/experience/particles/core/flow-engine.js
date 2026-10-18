// Integrated from local Field Studies; see ../PROVENANCE.md.
import {PRESET_KEYS,clamp,mix,smooth,guideY,samplePreset} from './flow-math.js';

const COLORS_DARK=['40,145,211','36,181,228','63,218,218','75,152,237','142,134,233','178,224,236'];
const COLORS_LIGHT=['25,100,130','15,133,140','18,147,132','49,107,160','112,86,160','45,114,126'];
const STEP=1/120;

export class FlowEngine {
  constructor(canvas,{reducedMotion=false,viewport={width:1280,height:720,mobile:false},onQualityChange=()=>{}}={}) {
    this.canvas=canvas;this.viewport=viewport;
    this.ctx=canvas.getContext('2d',{alpha:false});
    if(!this.ctx) throw new Error('当前浏览器无法创建 Canvas 2D 画布');
    this.theme='dark'; this.monochrome=false; this.preset='drift';
    this.reducedMotion=reducedMotion; this.paused=reducedMotion;
    this.onQualityChange=onQualityChange; this.quality=1;
    this.weights=[1,0,0,0]; this.fromWeights=[1,0,0,0]; this.transition=1.2;
    this.control={x:0,y:0};this.targetControl={x:0,y:0};
    this.pointer={x:0,y:0,down:false,inside:false,power:0};
    this.time=0;this.accumulator=0;this.frames=0;this.renderCount=0;this.fps=60;
    this.frameSamples=[];this.performanceElapsed=0;this.frameHandle=null;
    this.lastFrame=0;this.lastRender=0;this.historyAge=0;this.fieldAge=1;this.disposed=false;this.particles=[];
    this.tick=this.tick.bind(this);
    this.updatePalette();this.resize();
  }
  updatePalette() {
    const palette=this.theme==='dark'?COLORS_DARK:COLORS_LIGHT;
    this.colors=this.monochrome?palette.map(()=>this.theme==='dark'?'158,205,207':'49,92,96'):palette;
    this.strokes=this.colors.map(rgb=>[.25,.78,.92].map(a=>`rgba(${rgb},${a})`));
    this.glows=this.colors.map(rgb=>{
      const sprite=document.createElement('canvas');sprite.width=sprite.height=48;
      const g=sprite.getContext('2d'),gradient=g.createRadialGradient(24,24,0,24,24,24);
      gradient.addColorStop(0,`rgba(${rgb},.65)`);gradient.addColorStop(.12,`rgba(${rgb},.32)`);
      gradient.addColorStop(.35,`rgba(${rgb},.08)`);gradient.addColorStop(1,`rgba(${rgb},0)`);
      g.fillStyle=gradient;g.fillRect(0,0,48,48);return sprite;
    });
  }
  makeBackground() {
    this.background=document.createElement('canvas');this.background.width=this.canvas.width;this.background.height=this.canvas.height;
    const b=this.background.getContext('2d');b.setTransform(this.dpr,0,0,this.dpr,0,0);
    const gradient=b.createRadialGradient(this.w*.52,this.h*.49,0,this.w*.5,this.h*.5,Math.max(this.w,this.h)*.7);
    gradient.addColorStop(0,this.theme==='dark'?'#07171b':'#edf4f3');
    gradient.addColorStop(.7,this.theme==='dark'?'#030e11':'#eaf2f1');
    gradient.addColorStop(1,this.theme==='dark'?'#020b0e':'#e7efee');
    b.fillStyle=gradient;b.fillRect(0,0,this.w,this.h);
  }
  resize() {
    const oldW=this.w,oldH=this.h;
    this.w=Math.max(1,this.viewport.width);this.h=Math.max(1,this.viewport.height);
    this.mobile=this.viewport.mobile;this.dpr=Math.min(window.devicePixelRatio||1,this.quality<1?1.25:2);
    this.canvas.width=Math.round(this.w*this.dpr);this.canvas.height=Math.round(this.h*this.dpr);
    this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
    this.targetCount=Math.round((this.mobile?480:1200)*this.quality);
    this.cols=Math.ceil(this.w/40)+2;this.rows=Math.ceil(this.h/40)+2;
    this.fieldX=new Float32Array(this.cols*this.rows);this.fieldY=new Float32Array(this.cols*this.rows);
    this.makeBackground();
    if(oldW&&oldH) for(const p of this.particles){p.x=p.x/oldW*this.w;p.y=p.y/oldH*this.h;p.lastX=p.x;p.lastY=p.y;p.historyCount=0;}
    this.syncCount();this.fieldAge=1;this.clear();this.prime(oldW?12:60);
  }
  syncCount() {
    if(this.particles.length>this.targetCount)this.particles.length=this.targetCount;
    while(this.particles.length<this.targetCount)this.particles.push(this.createParticle());
    this.bins=Array.from({length:18},()=>[]);
    for(const p of this.particles)this.bins[p.color*3+p.layer].push(p);
    this.canvas.dataset.particles=this.particles.length;this.canvas.dataset.quality=this.quality;
  }
  createParticle() {
    const seed=Math.random(),layer=seed<.32?0:seed<.94?1:2,band=Math.floor(Math.random()*3)-1;
    const x=Math.random()*this.w;
    let y=layer===0?Math.random()*this.h:guideY(this.preset,x,this.w,this.h,this.time,band)+(Math.random()-.5)*this.h*.14;
    if(this.preset==='orbit'||this.preset==='vortex') {
      const a=Math.random()*Math.PI*2,r=(.3+Math.random()*.65)*Math.min(this.w,this.h);
      y=this.h/2+Math.sin(a)*r*(this.preset==='orbit'?.53:1);
      const px=this.w/2+Math.cos(a)*r;
      return this.finishParticle(px,y,seed,layer,band);
    }
    return this.finishParticle(x,clamp(y,0,this.h),seed,layer,band);
  }
  finishParticle(x,y,seed,layer,band) {
    const color=Math.random()<.12?4:Math.floor(Math.random()*4);
    if(color===4&&layer>0&&(this.preset==='drift'||this.preset==='aurora'))y=this.h*(x/this.w*1.14-.09)+(Math.random()-.5)*this.h*.07;
    const grain=new Float32Array(96);
    for(let i=0;i<32;i++){grain[i*3]=(Math.random()-.5)*100;grain[i*3+1]=(Math.random()-.5)*48;grain[i*3+2]=.7+Math.random()*1.2;}
    return {x,y,lastX:x,lastY:y,vx:25,vy:0,seed,layer,band,color,grain,age:Math.random()*30,history:new Float32Array(64),head:0,historyCount:0,
      size:layer===0?.45+Math.random()*.25:layer===1?.6+Math.random()*.45:1.3+Math.random()*.8};
  }
  clear() {
    this.ctx.globalCompositeOperation='source-over';this.ctx.globalAlpha=1;
    this.ctx.drawImage(this.background,0,0,this.w,this.h);
    for(const p of this.particles){p.lastX=p.x;p.lastY=p.y;}
  }
  prime(steps) {
    for(let i=0;i<steps;i++){this.step(1/60);if(i%3===0)this.render(1/30);}
    this.render(1/60);
  }
  setPreset(key) {
    if(!PRESET_KEYS.includes(key)||key===this.preset)return;
    this.preset=key;this.fromWeights=[...this.weights];this.transition=0;
    for(const p of this.particles){
      p.fromX=p.x;p.fromY=p.y;p.historyCount=0;
      const n=(p.seed*137.7)%1,a=p.seed*Math.PI*14;
      if(key==='orbit'||key==='vortex'){
        const r=(key==='orbit'?[.65,1.03,1.43,1.85][Math.floor(n*4)]*.34:.18+n*.55)*Math.min(this.w,this.h);
        const ex=Math.cos(a)*r,ey=Math.sin(a)*r*(key==='orbit'?.53:1);
        p.goalX=this.w/2+ex*.966-ey*(-.259);p.goalY=this.h/2+ex*(-.259)+ey*.966;
      }else{
        p.goalX=clamp(p.x,0,this.w);
        p.goalY=p.layer===0?p.y:p.color===4?this.h*(p.goalX/this.w*1.14-.09)+Math.sin(p.seed*100)*this.h*.035:guideY(key,p.goalX,this.w,this.h,this.time,p.band)+Math.sin(p.seed*100)*this.h*.045;
      }
    }
    this.canvas.dataset.preset=key;
    if(this.paused){this.weights=PRESET_KEYS.map(k=>+(k===key));this.transition=1.2;this.reset(false);}
  }
  setAppearance(theme,monochrome) {
    this.theme=theme;this.monochrome=monochrome;this.updatePalette();this.makeBackground();this.clear();
    // Re-render the existing positions without changing the simulation when paused.
    this.render(.016,true);
  }
  setControl(x,y){this.targetControl={x,y};}
  setPaused(value) {
    this.paused=value;
    if(value)this.suspend();else this.resume();
  }
  suspend(){if(this.frameHandle!==null)cancelAnimationFrame(this.frameHandle);this.frameHandle=null;this.lastFrame=0;this.lastRender=0;this.accumulator=0;this.frameSamples=[];this.performanceElapsed=0;this.pointer.down=false;this.pointer.inside=false;}
  resume(){if(!this.disposed&&!this.paused&&!document.hidden&&this.frameHandle===null){this.lastFrame=0;this.frameHandle=requestAnimationFrame(this.tick);}}
  reset(resetControl=true) {
    if(resetControl){this.control={x:0,y:0};this.targetControl={x:0,y:0};}
    this.pointer.power=0;this.pointer.down=false;this.pointer.inside=false;
    this.time=0;this.particles=[];this.weights=PRESET_KEYS.map(k=>+(k===this.preset));this.fromWeights=[...this.weights];this.transition=1.2;
    this.syncCount();this.fieldAge=1;this.clear();this.prime(60);this.lastFrame=0;this.accumulator=0;
  }
  updateField() {
    for(let gy=0;gy<this.rows;gy++)for(let gx=0;gx<this.cols;gx++) {
      const x=gx*40,y=gy*40,index=gy*this.cols+gx;
      let vx=0,vy=0;
      for(let i=0;i<4;i++)if(this.weights[i]>.001){const v=samplePreset(PRESET_KEYS[i],x,y,this.w,this.h,this.time);vx+=v[0]*this.weights[i];vy+=v[1]*this.weights[i];}
      this.fieldX[index]=vx;this.fieldY[index]=vy;
    }
    this.fieldAge=0;
  }
  step(dt) {
    const timeScale=this.reducedMotion?.35:1;
    this.time+=dt*timeScale;this.transition=Math.min(1.2,this.transition+dt);
    const blend=smooth(this.transition/1.2);
    this.weights=this.fromWeights.map((v,i)=>mix(v,+(PRESET_KEYS[i]===this.preset),blend));
    const easing=1-Math.exp(-dt*10);
    this.control.x=mix(this.control.x,this.targetControl.x,easing);this.control.y=mix(this.control.y,this.targetControl.y,easing);
    this.pointer.power=mix(this.pointer.power,this.pointer.down?1:this.pointer.inside?.23:0,1-Math.exp(-dt*4));
    this.fieldAge+=dt;if(this.fieldAge>=.045)this.updateField();
    this.historyAge+=dt;const saveHistory=this.historyAge>=1/30;if(saveHistory)this.historyAge=0;
    const speed=mix(.28,1.8,(this.control.y+1)/2)*timeScale;
    const chaos=mix(.1,1.8,(this.control.y+1)/2);
    const response=1-Math.exp(-dt*2.8);
    const safeRadius=this.mobile?110:132;
    for(const p of this.particles) {
      const fx=clamp(p.x/40,0,this.cols-2),fy=clamp(p.y/40,0,this.rows-2);
      const ix=Math.floor(fx),iy=Math.floor(fy),tx=fx-ix,ty=fy-iy,index=iy*this.cols+ix;
      let vx=mix(mix(this.fieldX[index],this.fieldX[index+1],tx),mix(this.fieldX[index+this.cols],this.fieldX[index+this.cols+1],tx),ty);
      let vy=mix(mix(this.fieldY[index],this.fieldY[index+1],tx),mix(this.fieldY[index+this.cols],this.fieldY[index+this.cols+1],tx),ty);
      if(p.layer===0){vx=vx*.22+Math.cos(p.seed*30+this.time*.09)*5;vy=vy*.18+Math.sin(p.seed*20+this.time*.08)*5;}
      else vy+=Math.sin(p.seed*100)*18*(this.weights[0]+this.weights[2]);
      if(p.color===4&&p.layer>0){
        const ribbon=this.weights[0]+this.weights[2];
        const target=this.h*(p.x/this.w*1.14-.09)+Math.sin(p.seed*100)*this.h*.035;
        vx=mix(vx,40,ribbon);vy=mix(vy,this.h/this.w*1.14*40+clamp((target-p.y)*.4,-70,70),ribbon);
      }
      const dx=p.x-this.w/2,dy=p.y-this.h/2,r=Math.max(1,Math.hypot(dx,dy));
      const force=this.control.x*100*(1/(1+r/650));
      vx+=dx/r*force-dy/r*(-this.control.x*24);vy+=dy/r*force+dx/r*(-this.control.x*24);
      if(r<safeRadius&&this.control.x<-.05){const f=(safeRadius-r)*1.7;vx+=dx/r*f;vy+=dy/r*f;}
      const wander=Math.sin(p.y*.011+p.seed*20+this.time*.3)*chaos*9;
      vx+=wander;vy+=Math.cos(p.x*.009+p.seed*15-this.time*.2)*chaos*9;
      if(this.pointer.power>.002) {
        const px=this.pointer.x-p.x,py=this.pointer.y-p.y,rr=px*px+py*py;
        if(rr<50000){const d=Math.sqrt(rr)+8,falloff=(1-rr/50000)*this.pointer.power;
          const attract=this.pointer.down?85:-35;vx+=(px/d*attract-py/d*28)*falloff;vy+=(py/d*attract+px/d*28)*falloff;}
      }
      const depth=p.layer===0?.52:p.layer===1?1:1.12;
      p.vx=mix(p.vx,vx,response);p.vy=mix(p.vy,vy,response);
      p.x+=p.vx*dt*speed*depth;p.y+=p.vy*dt*speed*depth;p.age+=dt;
      if(this.transition<1.2&&p.goalX!==undefined){
        p.x=mix(p.fromX,p.goalX,blend);p.y=mix(p.fromY,p.goalY,blend);p.historyCount=0;
      }
      let wrapped=false;
      const margin=22;
      if(p.x>this.w+margin){p.x=-margin;wrapped=true;}else if(p.x< -margin){p.x=this.w+margin;wrapped=true;}
      if(p.y>this.h+margin){p.y=-margin;wrapped=true;}else if(p.y< -margin){p.y=this.h+margin;wrapped=true;}
      if(wrapped){p.lastX=p.x;p.lastY=p.y;p.historyCount=0;}
      if(saveHistory){p.head=(p.head+1)%32;p.history[p.head*2]=p.x;p.history[p.head*2+1]=p.y;p.historyCount=Math.min(32,p.historyCount+1);}
    }
    this.frames++;
  }
  render(dt,still=false) {
    const ctx=this.ctx;
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
    ctx.drawImage(this.background,0,0,this.w,this.h);ctx.globalAlpha=1;
    ctx.globalCompositeOperation='source-over';
    ctx.lineCap='round';
    for(let color=0;color<this.colors.length;color++)for(let layer=0;layer<3;layer++) {
      const bin=this.bins[color*3+layer];
      ctx.strokeStyle=this.strokes[color][layer];ctx.lineWidth=layer===0?.4:layer===1?.5:.65;
      for(let section=3;section>=0;section--){
        ctx.globalAlpha=(1-section/4)*.65;ctx.beginPath();
        for(const p of bin){
          const start=section*8,end=Math.min(start+9,p.historyCount);
          if(start>=end)continue;
          for(let i=start;i<end;i++){
            const index=((p.head-i+32)%32)*2,x=p.history[index],y=p.history[index+1];
            if(i===start)ctx.moveTo(x,y);else ctx.lineTo(x,y);
          }
        }
        ctx.stroke();
      }
      ctx.globalAlpha=1;
      ctx.fillStyle=this.strokes[color][layer];ctx.beginPath();
      for(const p of bin){
        ctx.moveTo(p.x+p.size,p.y);ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
        if(layer>0){
          const speed=Math.max(1,Math.hypot(p.vx,p.vy)),ux=p.vx/speed,uy=p.vy/speed;
          for(let i=0;i<32;i++){
            const along=p.grain[i*3],across=p.grain[i*3+1],size=p.grain[i*3+2];
            ctx.rect(p.x+ux*along-uy*across,p.y+uy*along+ux*across,size,size);
          }
        }
      }
      ctx.fill();
    }
    for(const p of this.particles)if(p.layer===2) {
      const halo=this.theme==='dark'?12:5;
      ctx.drawImage(this.glows[p.color],p.x-halo,p.y-halo,halo*2,halo*2);
      ctx.fillStyle=this.theme==='dark'?'rgba(200,250,246,.75)':'rgba(10,104,112,.6)';
      ctx.fillRect(p.x-.5,p.y-.5,1,1);
    }
    ctx.globalCompositeOperation='source-over';this.renderCount++;
    for(const p of this.particles){p.lastX=p.x;p.lastY=p.y;}
  }
  assessPerformance(fps) {
    this.fps=fps;
    // Deliberately step down once, avoiding quality oscillation during interaction.
    if(fps<42&&this.quality===1&&this.performanceElapsed>3){
      this.quality=.6;this.resize();this.onQualityChange(this.quality);
    }
  }
  tick(now) {
    this.frameHandle=null;if(this.disposed||this.paused||document.hidden)return;
    if(!this.lastFrame){this.lastFrame=now;this.frameHandle=requestAnimationFrame(this.tick);return;}
    const elapsed=(now-this.lastFrame)/1000;this.lastFrame=now;
    const dt=clamp(elapsed,0,.05);this.accumulator+=dt;
    let steps=0;while(this.accumulator>=STEP&&steps<6){this.step(STEP);this.accumulator-=STEP;steps++;}
    if(!this.lastRender||now-this.lastRender>=1000/60-.7){
      const renderElapsed=this.lastRender?(now-this.lastRender)/1000:1/60;
      this.render(renderElapsed);this.lastRender=now;
      if(renderElapsed>0&&renderElapsed<.25){this.frameSamples.push(renderElapsed);this.performanceElapsed+=renderElapsed;}
    }
    if(this.frameSamples.length>=120){const seconds=this.frameSamples.reduce((a,b)=>a+b,0);this.assessPerformance(this.frameSamples.length/seconds);this.frameSamples=[];}
    this.frameHandle=requestAnimationFrame(this.tick);
  }
  snapshot(){
    let edge=0,invalid=0;
    for(const p of this.particles){if(!Number.isFinite(p.x)||!Number.isFinite(p.y))invalid++;if(p.x<24||p.x>this.w-24||p.y<24||p.y>this.h-24)edge++;}
    return {preset:this.preset,paused:this.paused,theme:this.theme,monochrome:this.monochrome,quality:this.quality,particles:this.particles.length,dpr:this.dpr,fps:Math.round(this.fps),frames:this.frames,renders:this.renderCount,control:{...this.targetControl},pointer:{down:this.pointer.down,power:this.pointer.power},weights:[...this.weights],time:this.time,edgeFraction:edge/this.particles.length,invalid};
  }
  destroy(){this.disposed=true;this.suspend();}
}
