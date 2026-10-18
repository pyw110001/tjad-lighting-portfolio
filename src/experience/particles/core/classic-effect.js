// Integrated from local Field Studies; see ../PROVENANCE.md.
// Adapted from gabor's Particle Drift Field. The untouched source and provenance
// remain in the upstream Field Studies project. Preserve its 400 particles, forces and alpha trails.
const LIGHT_COLORS=[[255,59,48],[255,149,0],[255,204,0],[52,199,89],[0,199,190],[50,173,230],[0,122,255],[88,86,214],[175,82,222],[255,45,85]];
const DARK_COLORS=[[255,69,58],[255,159,10],[255,214,10],[48,209,88],[100,210,255],[64,200,224],[10,132,255],[94,92,230],[191,90,242],[255,55,95]];
const STEP=1/60;

export class ClassicEffect {
  constructor(canvas,{reducedMotion=false,viewport={width:1280,height:720,mobile:false}}={}) {
    this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});
    if(!this.ctx)throw new Error('当前浏览器无法创建 Canvas 2D 画布');
    this.viewport=viewport;this.preset='classic';this.theme='dark';this.monochrome=false;
    this.reducedMotion=reducedMotion;this.paused=reducedMotion;
    this.control={x:0,y:0};this.pointer={x:0,y:0,down:false,inside:false,power:0};
    this.frameHandle=null;this.lastFrame=null;this.accumulator=0;this.frames=0;this.fps=60;
    this.measureTime=0;this.measureFrames=0;
    this.tick=this.tick.bind(this);this.particles=[];this.resize();this.reset();
  }
  destroy(){this.suspend();this.disposed=true;}
  resize() {
    this.w=Math.max(1,this.viewport.width);this.h=Math.max(1,this.viewport.height);
    this.dpr=Math.min(window.devicePixelRatio||1,2);
    this.canvas.width=Math.round(this.w*this.dpr);this.canvas.height=Math.round(this.h*this.dpr);
    this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);this.updatePalette();this.render();
  }
  updatePalette() {
    const dark=this.theme==='dark';
    const rgb=dark?(this.monochrome?'10,10,15':'13,13,18'):'245,245,247';
    this.canvas.style.backgroundColor=`rgb(${rgb})`;
    this.trail=`rgba(${rgb},0.06)`;
    this.palette=dark?DARK_COLORS:LIGHT_COLORS;
    this.mono=dark?'235,235,240':'30,30,32';
  }
  setAppearance(theme,monochrome) {
    this.theme=theme;this.monochrome=monochrome;this.updatePalette();this.clear();this.render();
  }
  setControl(x,y){this.control={x,y};}
  setPaused(value){this.paused=value;if(value)this.suspend();else this.resume();}
  suspend() {
    if(this.frameHandle!==null)cancelAnimationFrame(this.frameHandle);
    this.frameHandle=null;this.lastFrame=null;this.accumulator=0;
    this.measureTime=0;this.measureFrames=0;
    this.pointer.down=false;this.pointer.inside=false;
  }
  resume(){if(!this.disposed&&!this.paused&&!document.hidden&&this.frameHandle===null)this.frameHandle=requestAnimationFrame(this.tick);}
  clear(){this.ctx.fillStyle=this.theme==='dark'?'#0d0d12':'#f5f5f7';this.ctx.fillRect(0,0,this.w,this.h);}
  reset(resetControl=true) {
    if(resetControl)this.control={x:0,y:0};
    this.hue=0;this.time=0;this.frames=0;this.accumulator=0;this.lastFrame=null;
    this.particles=Array.from({length:400},()=>({
      x:Math.random()*this.w,y:Math.random()*this.h,
      vx:(Math.random()-.5)*.5,vy:(Math.random()-.5)*.5,
      baseSize:Math.random()*5+2,opacity:Math.random()*.45+.2,
      angle:Math.random()*Math.PI*2,orbitSpeed:(Math.random()-.5)*.02,
    }));
    this.canvas.dataset.preset='classic';this.canvas.dataset.particles='400';
    this.clear();this.render();
  }
  step() {
    const chaosMult=1+this.control.y*3,speedMult=1+Math.abs(this.control.y)*1.5;
    const gatherForce=-this.control.x*.025,orbitForce=-this.control.x*.006;
    const wander=.03+Math.abs(chaosMult)*.07,effectiveSpeed=Math.max(.08,chaosMult*speedMult);
    const maxSpeed=3+speedMult;
    for(const p of this.particles){
      const dx=this.w/2-p.x,dy=this.h/2-p.y,dist=Math.sqrt(dx*dx+dy*dy)+1;
      p.vx+=dx/dist*gatherForce;p.vy+=dy/dist*gatherForce;
      if(orbitForce!==0&&dist>10){p.vx+=-dy/dist*orbitForce;p.vy+=dx/dist*orbitForce;}
      p.vx+=(Math.random()-.5)*wander;p.vy+=(Math.random()-.5)*wander;
      p.vx*=.955;p.vy*=.955;
      const speed=Math.sqrt(p.vx*p.vx+p.vy*p.vy);
      if(speed>maxSpeed){p.vx=p.vx/speed*maxSpeed;p.vy=p.vy/speed*maxSpeed;}
      p.x+=p.vx*effectiveSpeed;p.y+=p.vy*effectiveSpeed;
      if(p.x<-20)p.x=this.w+20;if(p.x>this.w+20)p.x=-20;
      if(p.y<-20)p.y=this.h+20;if(p.y>this.h+20)p.y=-20;
    }
    if(!this.monochrome)this.hue=(this.hue+.3)%360;
    this.frames++;this.time+=STEP;
  }
  render() {
    if(!this.particles.length)return;
    const ctx=this.ctx,dark=this.theme==='dark';
    ctx.fillStyle=this.trail;ctx.fillRect(0,0,this.w,this.h);
    const sizeMult=1+Math.abs((1+this.control.y*3)-1)*.3;
    for(let i=0;i<this.particles.length;i++){
      const p=this.particles[i];
      ctx.beginPath();ctx.arc(p.x,p.y,Math.max(.5,p.baseSize*sizeMult),0,Math.PI*2);
      if(this.monochrome){
        const alpha=Math.max(.08,Math.min(.8,p.opacity+(dark?.1:0)));
        ctx.fillStyle=`rgba(${this.mono},${alpha})`;
      }else{
        const phase=(this.hue/360*10+i*.025)%10,index=Math.floor(phase),f=phase-index;
        const a=this.palette[index],b=this.palette[(index+1)%10];
        const r=Math.round(a[0]+(b[0]-a[0])*f),g=Math.round(a[1]+(b[1]-a[1])*f),blue=Math.round(a[2]+(b[2]-a[2])*f);
        const alpha=Math.max(.05,Math.min(.9,p.opacity+(dark?.15:0)));
        ctx.fillStyle=`rgba(${r},${g},${blue},${alpha})`;
      }
      ctx.fill();
    }
  }
  tick(timestamp) {
    this.frameHandle=null;
    if(this.paused||document.hidden)return;
    if(this.lastFrame===null)this.lastFrame=timestamp;
    const elapsed=Math.min(.1,Math.max(0,(timestamp-this.lastFrame)/1000));this.lastFrame=timestamp;
    // Retain the original per-frame appearance at its 60 Hz reference speed.
    this.accumulator+=elapsed*(this.reducedMotion?.35:1);
    while(this.accumulator+1e-8>=STEP){this.step();this.render();this.accumulator-=STEP;this.measureFrames++;}
    this.measureTime+=elapsed;
    if(this.measureTime>=.5){this.fps=this.measureFrames/this.measureTime;this.measureTime=0;this.measureFrames=0;}
    this.resume();
  }
  snapshot(){return {preset:this.preset,paused:this.paused,theme:this.theme,monochrome:this.monochrome,
    quality:1,particles:this.particles.length,dpr:this.dpr,fps:this.fps,frames:this.frames,time:this.time,
    control:{...this.control},pointer:{down:this.pointer.down,power:0},
    invalid:this.particles.filter(p=>!Number.isFinite(p.x+p.y+p.vx+p.vy)).length};}
}
