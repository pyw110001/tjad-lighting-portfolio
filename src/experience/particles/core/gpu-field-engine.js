// Integrated from local Field Studies; see ../PROVENANCE.md.
import * as THREE from 'three/webgpu';
import {Fn,If,Loop,uniform,instancedArray,instanceIndex,attribute,float,uint,vec2,vec3,vec4,uv,pass,smoothstep as gpuSmoothstep} from 'three/tsl';
import {bloom} from 'three/addons/tsl/display/BloomNode.js';
import {PRESET_KEYS,clamp,smooth} from './flow-math.js';
import {fieldPath,fieldForce,particleColor,particleShape,strandPosition,curtainPosition,curtainOpacity,compositeColor} from './gpu-field-shaders.js';
import {FieldTrails} from './gpu-trails.js';

const CAPACITY=65536,STEP=1/60,CHAINS=24,HISTORY=64;
export const DEFAULT_INTERACTION_SPEED=.45;

function stripGeometry(lines,segments){
  const uvData=[],ids=[],positions=[],indices=[];
  for(let line=0;line<lines;line++){
    const base=positions.length/3;
    for(let s=0;s<=segments;s++)for(const side of [-1,1]){
      positions.push(0,0,0);uvData.push(s/segments,side);ids.push(line);
    }
    for(let s=0;s<segments;s++){const i=base+s*2;indices.push(i,i+1,i+2,i+1,i+3,i+2);}
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setAttribute('flowUV',new THREE.Float32BufferAttribute(uvData,2));
  g.setAttribute('strandId',new THREE.Float32BufferAttribute(ids,1));g.setIndex(indices);return g;
}

export class GPUFieldEngine {
  constructor(canvas,{reducedMotion=false,viewport={width:1280,height:720,mobile:false},onFailure=()=>{}}={}){
    this.canvas=canvas;this.viewport=viewport;this.reducedMotion=reducedMotion;this.paused=reducedMotion;this.onFailure=onFailure;
    this.theme='dark';this.monochrome=false;this.preset='drift';this.quality=1;
    this.control={x:0,y:0};this.targetControl={x:0,y:0};this.pointer={x:0,y:0,down:false,inside:false,power:0};
    this.controlVelocity={x:0,y:0};this.seedGeneration=0;this.seeded=false;
    this.attractionLight={amount:0,velocity:0};
    this.interactionSpeed=DEFAULT_INTERACTION_SPEED;
    this.weights=[1,0,0,0];this.fromWeights=[1,0,0,0];this.transition=1.2;
    this.time=0;this.frames=0;this.renders=0;this.fps=60;this.accumulator=0;this.lastFrame=null;this.lastRender=null;
    this.performanceElapsed=0;this.frameSamples=[];this.frameHandle=null;this.ready=false;this.disposed=false;this.invalid=null;
    this.historyHead=0;this.tick=this.tick.bind(this);
    this.u={time:uniform(0),dt:uniform(STEP),size:uniform(new THREE.Vector2(this.viewport.width,this.viewport.height)),
      weights:uniform(new THREE.Vector4(1,0,0,0)),control:uniform(new THREE.Vector2()),
      pointer:uniform(new THREE.Vector4()),mono:uniform(0),light:uniform(0),energy:uniform(0),attraction:uniform(0),
      init:uniform(1),count:uniform(CAPACITY,'uint'),head:uniform(0,'uint'),damp:uniform(0),curtain:uniform(0)};
  }
  async init(){
    if(!navigator.gpu)throw new Error('此浏览器无法使用 WebGPU');
    const renderer=new THREE.WebGPURenderer({canvas:this.canvas,antialias:false,alpha:false});
    this.renderer=renderer;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
    renderer.onDeviceLost=info=>{if(!this.disposed)this.fail(new Error(info.message||'WebGPU 设备连接已中断'));};
    renderer.onError=info=>this.fail(new Error(info.message||'WebGPU 渲染失败'));
    await renderer.init();
    // r186 starts an internal RAF even for on-demand rendering. This adapter owns
    // the sole RAF so paused/inactive renderers consume no background callbacks.
    renderer._animation.stop();
    if(!renderer.backend.isWebGPUBackend)throw new Error('此设备无法使用 WebGPU 计算');
    if(this.disposed){renderer.dispose();return;}
    renderer.backend.device.lost.then(info=>{if(info.reason==='destroyed'&&!this.disposed)this.fail(new Error('WebGPU 设备连接已中断'));});
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x000000);
    this.camera=new THREE.PerspectiveCamera(35,this.viewport.width/this.viewport.height,1,10000);
    this.createParticles();this.createFilaments();this.createCurtains();this.createHistory();
    const scenePass=pass(this.scene,this.camera);this.scenePass=scenePass;
    const color=scenePass.getTextureNode('output');
    this.trails=new FieldTrails(color,this.u.damp);
    this.bloom=bloom(this.trails,.62,.38,.78).setResolutionScale(.5);
    this.pipeline=new THREE.RenderPipeline(renderer);
    // Keep the current frame at full resolution; only the soft feedback is downsampled.
    this.pipeline.outputNode=vec4(compositeColor({signal:color.add(this.trails.mul(.26)).add(this.bloom).rgb,st:uv(),size:this.u.size,light:this.u.light,mono:this.u.mono}),1);
    this.ready=true;this.resize();this.reset(false);
  }
  createParticles(){
    const seedData=new Float32Array(CAPACITY*4);let randomSeed=20261018;
    for(let i=0;i<seedData.length;i++){randomSeed=(Math.imul(randomSeed,1664525)+1013904223)>>>0;seedData[i]=randomSeed/4294967296;}
    this.seeds=instancedArray(seedData,'vec4').toReadOnly();
    this.positions=instancedArray(CAPACITY,'vec3');this.velocities=instancedArray(CAPACITY,'vec3');this.offsets=instancedArray(CAPACITY,'vec3');
    this.guides=instancedArray(CAPACITY,'vec4');this.guideVelocities=instancedArray(CAPACITY,'vec3');
    const u=this.u;
    this.compute=Fn(()=>{
      const seed=this.seeds.element(instanceIndex);
      const position=this.positions.element(instanceIndex),velocity=this.velocities.element(instanceIndex),offset=this.offsets.element(instanceIndex);
      const guide=this.guides.element(instanceIndex),guideVelocity=this.guideVelocities.element(instanceIndex);
      const phase=seed.x.add(u.time.mul(seed.w.mul(.009).add(.014))).fract();
      const target=fieldPath({seed:vec4(phase,seed.yzw),t:u.time,size:u.size,weights:u.weights,control:u.control});
      const restart=u.init.greaterThan(.5).or(phase.lessThan(guide.w));
      If(restart,()=>{guide.xyz.assign(target);guideVelocity.assign(vec3(0));}).Else(()=>{
        // Retain each particle's guide position and momentum when the force changes.
        const error=target.sub(guide.xyz),direction=guide.xy.add(vec2(.001)).normalize();
        const radialError=vec3(direction.mul(error.xy.dot(direction)),error.z);
        const width=u.size.x.min(u.size.y);
        const local=float(1).sub(gpuSmoothstep(width.mul(.30).add(110),width.mul(.70).add(132),guide.xy.length()));
        const orbit=gpuSmoothstep(0,1,u.control.x.negate().max(0)).mul(local);
        const follow=error.mul(float(1).sub(orbit)).add(radialError.mul(orbit));
        const orbitalVelocity=vec3(guide.y.negate(),guide.x,0).mul(orbit).mul(.55);
        const centripetal=vec3(guide.xy,0).mul(orbit).mul(.55*.55);
        const acceleration=follow.mul(100).add(orbitalVelocity.sub(guideVelocity).mul(20)).sub(centripetal);
        guideVelocity.assign(guideVelocity.add(acceleration.mul(u.dt)));
        const limit=u.size.x.min(u.size.y).mul(1.6);
        guideVelocity.assign(guideVelocity.mul(limit.div(guideVelocity.length().max(.0001)).min(1)));
        guide.xyz.assign(guide.xyz.add(guideVelocity.mul(u.dt)));
      });
      guide.w.assign(phase);
      const force=fieldForce({p:position,t:u.time,size:u.size,control:u.control,pointer:u.pointer});
      const damping=u.control.y.negate().max(0).mul(2.5).add(2).sub(u.control.y.max(0).mul(.8));
      const active=restart.select(0,1);
      velocity.assign(velocity.mul(u.dt.mul(damping).negate().exp()).add(force.mul(u.dt)).mul(active));
      offset.assign(offset.add(velocity.mul(u.dt)).mul(u.dt.mul(-1.1).exp()).mul(active));
      offset.assign(offset.clamp(vec3(-180),vec3(180)));
      position.assign(guide.xyz.add(offset));
    })().compute(CAPACITY).setName('Flow field: independent GPU particles');
    const material=new THREE.SpriteNodeMaterial();
    const seed=this.seeds.toAttribute(),center=this.positions.toAttribute();
    const localEnergy=center.xy.distance(u.pointer.xy).div(224).oneMinus().max(0).pow(2).mul(u.pointer.z).mul(2);
    material.positionNode=center;
    const density=float(1).sub(u.attraction.mul(.68));
    material.colorNode=particleColor({seed,mono:u.mono,energy:u.energy.add(localEnergy)}).mul(density);
    material.scaleNode=seed.z.pow(30).mul(5.5).add(seed.w.mul(2.5)).add(2.2);
    const phase=seed.x.add(u.time.mul(seed.w.mul(.009).add(.014))).fract();
    material.opacityNode=particleShape({st:uv()}).mul(gpuSmoothstep(0,.018,phase)).mul(gpuSmoothstep(0,.018,float(1).sub(phase)));
    material.transparent=true;material.depthWrite=false;material.depthTest=false;material.blending=THREE.AdditiveBlending;
    this.particleMaterial=material;
    this.particles=new THREE.Sprite(material);this.particles.count=CAPACITY;this.particles.frustumCulled=false;this.scene.add(this.particles);
  }
  createFilaments(){
    const g=stripGeometry(CHAINS*4,256),u=this.u;
    const material=new THREE.MeshBasicNodeMaterial({transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
    const id=attribute('strandId','float'),st=attribute('flowUV','vec2');
    material.positionNode=strandPosition({st,id,t:u.time,size:u.size,weights:u.weights,control:u.control});
    material.colorNode=particleColor({seed:vec4(.4,id.mul(.618).fract(),id.mul(.381).fract(),id.mul(.17).add(.23).fract()),mono:u.mono,energy:u.energy}).mul(.9);
    material.opacityNode=float(.14).mul(float(1).sub(u.control.x.negate().max(0).mul(.55)));
    this.filaments=new THREE.Mesh(g,material);this.filaments.frustumCulled=false;this.scene.add(this.filaments);
  }
  createCurtains(){
    this.curtains=[];
    for(let i=0;i<3;i++){
      const material=new THREE.MeshBasicNodeMaterial({transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
      const st=vec2(uv().x,uv().y.mul(2).sub(1));
      material.positionNode=curtainPosition({st,band:float(i),t:this.u.time,size:this.u.size,control:this.u.control});
      material.colorNode=vec3(...[[.025,.58,.48],[.04,.33,.82],[.22,.12,.56]][i]);
      material.opacityNode=curtainOpacity({st,t:this.u.time,band:float(i)}).mul(this.u.curtain).mul(float(1).sub(this.u.control.x.negate().max(0).mul(.65)));
      const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1,192,16),material);mesh.frustumCulled=false;this.scene.add(mesh);this.curtains.push(mesh);
    }
  }
  createHistory(){
    this.history=instancedArray(CHAINS*HISTORY,'vec3');const u=this.u;
    this.historyInit=Fn(()=>{
      const chain=instanceIndex.div(HISTORY).toUint();
      this.history.element(instanceIndex).assign(this.positions.element(chain.mul(313)));
    })().compute(CHAINS*HISTORY).setName('Initialize finite ribbon history');
    this.historyUpdate=Fn(()=>{
      const point=this.positions.element(instanceIndex.mul(313));
      const previous=this.history.element(instanceIndex.mul(HISTORY).add(u.head.add(HISTORY-1).mod(HISTORY)));
      If(point.distance(previous).greaterThan(u.size.x.mul(.35)),()=>{
        Loop(HISTORY,({i})=>this.history.element(instanceIndex.mul(HISTORY).add(i.toUint())).assign(point));
      });
      this.history.element(instanceIndex.mul(HISTORY).add(u.head)).assign(point);
    })().compute(CHAINS).setName('Record tracer history');
    const g=stripGeometry(CHAINS,HISTORY-1),st=attribute('flowUV','vec2'),id=attribute('strandId','float').toUint();
    const age=st.x.mul(HISTORY-1).floor().toUint();
    const slot=u.head.add(HISTORY).sub(age).mod(HISTORY);
    const p=this.history.element(id.mul(HISTORY).add(slot));
    const q=this.history.element(id.mul(HISTORY).add(slot.add(HISTORY-1).mod(HISTORY)));
    const normal=vec2(q.y.sub(p.y).negate(),q.x.sub(p.x)).add(vec2(.001)).normalize();
    const material=new THREE.MeshBasicNodeMaterial({transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
    material.positionNode=p.add(vec3(normal.mul(st.y).mul(.55),0));
    material.colorNode=vec3(.12,.64,.82);material.opacityNode=st.x.oneMinus().pow(2).mul(.50).mul(p.distance(q).lessThan(u.size.x.mul(.35)).select(1,0));
    this.tracers=new THREE.Mesh(g,material);this.tracers.frustumCulled=false;this.scene.add(this.tracers);
  }
  resize(){
    if(!this.ready)return;
    const changed=this.w!==Math.max(1,this.viewport.width)||this.h!==Math.max(1,this.viewport.height);
    this.w=Math.max(1,this.viewport.width);this.h=Math.max(1,this.viewport.height);this.mobile=this.viewport.mobile;
    this.count=(this.mobile?16384:65536)*(this.quality<1?.5:1);
    this.dpr=Math.min(devicePixelRatio||1,this.quality<1?1:this.mobile?1.25:1.5);
    this.u.size.value.set(this.w,this.h);this.u.count.value=this.count;this.compute.count=this.count;this.particles.count=this.count;
    this.renderer.setPixelRatio(this.dpr);this.renderer.setSize(this.w,this.h,false);
    this.filaments.geometry.setDrawRange(0,(this.mobile?CHAINS:CHAINS*4)*256*6);
    this.camera.aspect=this.w/this.h;this.camera.position.z=this.h/(2*Math.tan(THREE.MathUtils.degToRad(17.5)));this.camera.far=this.camera.position.z+this.h*3;
    this.camera.updateProjectionMatrix();this.bloom.setResolutionScale(this.mobile||this.quality<1?.25:.5);
    this.canvas.dataset.particles=this.count;this.canvas.dataset.quality=this.quality;this.canvas.dataset.preset=this.preset;
    if(changed||!this.seeded)this.seedFrame();
    else this.render(STEP,this.paused); // Quality/DPR changes keep simulation buffers intact.
  }
  seedFrame(){
    if(!this.ready||this.disposed)return;
    this.seeded=true;this.seedGeneration++;
    this.attractionLight={amount:Math.max(0,-this.control.x),velocity:0};
    this.updateUniforms(0);this.u.init.value=1;this.renderer.compute(this.compute);this.u.init.value=0;
    this.renderer.compute(this.historyInit);this.trails.reset();this.render(0,true);
  }
  updateUniforms(dt){
    this.u.time.value=this.time;this.u.dt.value=dt;
    this.u.weights.value.fromArray(this.weights);this.u.control.value.set(this.control.x,this.control.y);
    this.u.pointer.value.set(this.pointer.x-this.w/2,this.h/2-this.pointer.y,this.pointer.power,this.pointer.down?1:0);
    this.u.energy.value=Math.max(0,this.control.y);
    this.u.attraction.value=clamp(this.attractionLight.amount,0,1);
    this.u.curtain.value=this.weights[2]+this.weights[0]*.18;
  }
  setPreset(key){
    if(!PRESET_KEYS.includes(key)||this.preset===key)return;
    this.preset=key;this.fromWeights=[...this.weights];this.transition=0;this.canvas.dataset.preset=key;
    if(this.paused){this.weights=PRESET_KEYS.map(k=>+(k===key));this.transition=1.2;this.seedFrame();}
  }
  setAppearance(theme,monochrome){
    this.theme=theme;this.monochrome=monochrome;this.u.light.value=+(theme==='light');this.u.mono.value=+monochrome;
    if(this.ready){this.trails.reset();this.render(0,true);}
  }
  setControl(x,y){
    this.targetControl={x,y};
    const gain=Math.min(1,this.interactionSpeed),effective={x:x*gain,y:y*gain};
    // Paused does not mean unresponsive: show the new field shape without advancing time.
    if(this.paused&&this.ready&&(this.control.x!==effective.x||this.control.y!==effective.y)){this.control=effective;this.controlVelocity={x:0,y:0};this.seedFrame();}
  }
  setInteractionSpeed(value){
    const number=Number(value),next=Number.isFinite(number)?clamp(number,.10,1.50):DEFAULT_INTERACTION_SPEED;
    if(next===this.interactionSpeed)return;
    this.interactionSpeed=next;this.setControl(this.targetControl.x,this.targetControl.y);
  }
  reset(resetControl=true){
    if(resetControl){this.control={x:0,y:0};this.targetControl={x:0,y:0};this.controlVelocity={x:0,y:0};}
    this.time=0;this.frames=0;this.accumulator=0;this.lastFrame=null;this.lastRender=null;this.historyHead=0;
    this.pointer.power=0;this.pointer.down=false;this.pointer.inside=false;
    this.weights=PRESET_KEYS.map(k=>+(k===this.preset));this.fromWeights=[...this.weights];this.transition=1.2;this.seedFrame();
  }
  setPaused(value){this.paused=value;if(value)this.suspend();else this.resume();}
  suspend(){
    if(this.frameHandle!==null)cancelAnimationFrame(this.frameHandle);
    this.frameHandle=null;this.lastFrame=null;this.lastRender=null;this.accumulator=0;
    this.pointer.down=false;this.pointer.inside=false;this.frameSamples=[];this.performanceElapsed=0;
  }
  resume(){if(this.ready&&!this.disposed&&!this.paused&&!document.hidden&&this.frameHandle===null)this.frameHandle=requestAnimationFrame(this.tick);}
  step(dt){
    const scale=this.reducedMotion?.35:1;
    const gain=Math.min(1,this.interactionSpeed),omega=16*this.interactionSpeed,decay=Math.exp(-omega*dt);
    for(const axis of ['x','y']){
      const goal=this.targetControl[axis]*gain,error=this.control[axis]-goal;
      const change=(this.controlVelocity[axis]+omega*error)*dt;
      this.control[axis]=goal+(error+change)*decay;
      this.controlVelocity[axis]=(this.controlVelocity[axis]-omega*change)*decay;
    }
    // Density compensation follows the same lag as the particle guides. Raising
    // brightness before a compressed ring opens would create a false burst.
    const lightGoal=Math.max(0,-this.control.x),lightError=this.attractionLight.amount-lightGoal;
    const lightChange=(this.attractionLight.velocity+10*lightError)*dt,lightDecay=Math.exp(-10*dt);
    this.attractionLight.amount=lightGoal+(lightError+lightChange)*lightDecay;
    this.attractionLight.velocity=(this.attractionLight.velocity-10*lightChange)*lightDecay;
    const speed=this.control.y<0?1-.90*Math.pow(-this.control.y,.8):1+this.control.y*2.4;
    this.time+=dt*scale*speed;this.transition=Math.min(1.2,this.transition+dt);
    const blend=smooth(this.transition/1.2);this.weights=this.fromWeights.map((v,i)=>v+(+(PRESET_KEYS[i]===this.preset)-v)*blend);
    const power=(this.pointer.down?1:this.pointer.inside?.23:0)*gain;
    this.pointer.power+=(power-this.pointer.power)*(1-Math.exp(-dt*4*this.interactionSpeed));
    this.updateUniforms(dt*scale);this.renderer.compute(this.compute);
    this.historyHead=(this.historyHead+1)%HISTORY;this.u.head.value=this.historyHead;this.renderer.compute(this.historyUpdate);this.frames++;
  }
  render(dt,still=false){
    if(!this.ready||this.disposed)return;
    this.u.damp.value=still?0:Math.exp(-Math.LN2*dt/(.14+Math.max(0,this.control.y)*.20-Math.max(0,-this.control.y)*.10));
    if(!still){
      const e=1-Math.exp(-dt*3),px=this.pointer.inside?(this.pointer.x-this.w/2)*.012:0,py=this.pointer.inside?(this.h/2-this.pointer.y)*.012:0;
      this.camera.position.x+=(px-this.camera.position.x)*e;this.camera.position.y+=(py-this.camera.position.y)*e;this.camera.lookAt(0,0,0);
    }
    // Advance Three's node frame on demand after stopping its independent clock.
    if(this.renderer.info.autoReset)this.renderer.info.reset();
    this.renderer._nodes.nodeFrame.update();this.renderer.info.frame=this.renderer._nodes.nodeFrame.frameId;
    this.pipeline.render();this.renders++;
  }
  tick(now){
    this.frameHandle=null;if(this.disposed||this.paused||document.hidden)return;
    if(this.lastFrame===null){this.lastFrame=now;this.resume();return;}
    const elapsed=(now-this.lastFrame)/1000;this.lastFrame=now;this.accumulator+=clamp(elapsed,0,.05);
    try{
      let n=0;while(this.accumulator+1e-8>=STEP&&n<3){this.step(STEP);this.accumulator-=STEP;n++;}
      if(this.lastRender===null||now-this.lastRender>=1000/60-.7){
        const dt=this.lastRender===null?STEP:(now-this.lastRender)/1000;this.lastRender=now;this.render(dt);
        if(dt>0&&dt<1){this.frameSamples.push(dt);this.performanceElapsed+=dt;}
      }
      if(this.frameSamples.length>=120){
        this.fps=this.frameSamples.length/this.frameSamples.reduce((a,b)=>a+b,0);this.frameSamples=[];
        if(this.quality===1&&this.fps<45&&this.performanceElapsed>3){this.quality=.5;this.resize();}
      }
      this.resume();
    }catch(error){this.fail(error);}
  }
  fail(error){if(this.disposed||this.failed)return;this.failed=true;this.suspend();this.onFailure(error);}
  async sampleParticles(count=64){
    if(!this.ready||this.disposed)return null;
    count=Math.max(1,Math.min(this.count,Math.floor(Number(count)||64)));
    const buffer=await this.renderer.getArrayBufferAsync(this.positions.value,null,0,count*4*4);
    const values=[...new Float32Array(buffer)].filter((_,i)=>i%4!==3);this.invalid=values.filter(v=>!Number.isFinite(v)).length;
    return {values,invalid:this.invalid,particles:count};
  }
  snapshot(){return {backend:'webgpu',preset:this.preset,paused:this.paused,theme:this.theme,monochrome:this.monochrome,
    quality:this.quality,particles:this.count,dpr:this.dpr,fps:Math.round(this.fps),frames:this.frames,renders:this.renders,
    control:{...this.targetControl},effectiveControl:{...this.control},interactionSpeed:this.interactionSpeed,
    pointer:{down:this.pointer.down,power:this.pointer.power},weights:[...this.weights],time:this.time,
    invalid:this.invalid,ready:this.ready,activeLoop:this.frameHandle!==null,filaments:CHAINS,tracerHistory:HISTORY,
    seedGeneration:this.seedGeneration,historyHead:this.historyHead};}
  destroy(){
    this.disposed=true;this.suspend();
    if(this.scene)this.scene.traverse(obj=>{obj.geometry?.dispose();obj.material?.dispose();});
    this.trails?.dispose();this.bloom?.dispose();this.scenePass?.dispose();this.pipeline?.dispose();this.renderer?.dispose();
  }
}
