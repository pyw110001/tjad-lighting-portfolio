// @ts-nocheck
// Adapted upstream scene source; see PROVENANCE.md.
import * as THREE from 'three';
import { createColumnLighting, COLUMN_WARM_WHITE } from '../columnLighting';
import {createEnvironment,rng,matte,light,add,box,tube,tree,planter,person,lobby,displayTexture,textTexture} from './urbanEnvironment.js';

const shaderVertex='varying vec2 vUv;varying vec3 vP;void main(){vUv=uv;vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const hashGLSL='float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}';

function clipPolygon(poly,axis,value,less){
  const out=[];
  for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],inside=p=>less?p[axis]<=value:p[axis]>=value,ai=inside(a),bi=inside(b);
    if(ai)out.push(a);if(ai!==bi){const t=(value-a[axis])/(b[axis]-a[axis]);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}}
  return out;
}
function hexWall(parent,width,height,position,rotation,materials,r=1.2){
  const gap=.044;
  for(let col=-1;col<Math.ceil(width/(1.5*r))+1;col++)for(let row=-1;row<Math.ceil(height/(Math.sqrt(3)*r))+1;row++){
    const cx=-width/2+col*r*1.5,cy=row*Math.sqrt(3)*r+(col%2)*Math.sqrt(3)*r/2;
    let points=Array.from({length:6},(_,k)=>[cx+Math.cos(k*Math.PI/3)*(r-gap),cy+Math.sin(k*Math.PI/3)*(r-gap)]);
    points=clipPolygon(points,0,-width/2,false);points=clipPolygon(points,0,width/2,true);points=clipPolygon(points,1,0,false);points=clipPolygon(points,1,height,true);if(points.length<3)continue;
    const shape=new THREE.Shape(points.map(p=>new THREE.Vector2(...p))),seed=(col+2)*73+(row+2)*37;
    const mode=(seed%11)<2?0:(col<width/(3*r)?1:2),material=new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uOn:{value:1},uSeed:{value:seed},uMode:{value:mode}},vertexShader:shaderVertex,fragmentShader:`varying vec3 vP;uniform float uTime,uOn,uSeed,uMode;${hashGLSL}
      void main(){float wave=.5+.5*sin(vP.x*1.4+vP.y*1.6+uSeed*.17+uTime*.25);
      vec3 coral=mix(vec3(1.9,.12,.07),vec3(2.0,1.0,.12),wave);vec3 cyan=mix(vec3(.02,.18,.72),vec3(.025,1.2,1.65),wave);
      vec3 c=uMode<1.5?coral:cyan;if(uSeed<500.&&wave>.88)c=mix(c,cyan,.6);
      vec2 q=fract(vP.xy*23.)-.5;float d=length(q);float dots=1.-smoothstep(.28-fwidth(d),.28+fwidth(d),d);
      float surface=.72+.28*dots;float intensity=uMode<.5?.016:uOn;gl_FragColor=vec4(c*surface*intensity+vec3(.005,.009,.018),1.);}`});
    materials.push(material);const m=add(parent,new THREE.ShapeGeometry(shape),material,...position);m.rotation.y=rotation;
  }
}

export function createHiveScene(){
  const {scene,r}=createEnvironment(71),materials=[];
  const building=new THREE.Group();building.position.z=-2.5;scene.add(building);
  lobby(scene,18,10,3.05,0,-2.5);
  box(building,18,7.05,10,matte(0x080d19,.45,.3),0,6.57,0);
  hexWall(building,18,7.05,[0,3.06,5.018],0,materials,1.18);
  hexWall(building,10,7.05,[9.018,3.06,0],Math.PI/2,materials,1.18);
  box(building,18.16,.10,10.14,matte(0x060910,.4,.4),0,10.13,0);
  box(building,18.15,.06,10.12,matte(0x15151d,.4),0,3.04,0);
  box(scene,.12,2.93,4.1,matte(0x524b47,.7),9.12,1.5,-4.2);
  const sign=add(scene,new THREE.PlaneGeometry(3.5,.9),new THREE.MeshBasicMaterial({map:textTexture('HIVE LAB','IDEAS LIGHT PEOPLE'),color:0xffd6b0}),9.19,1.9,-3.5);sign.rotation.y=Math.PI/2;
  // Tilted interactive honeycomb table in the foreground.
  box(scene,6.8,1.05,1.95,matte(0x11151e,.45,.2),-1.5,.53,8.7);
  const screen=add(scene,new THREE.PlaneGeometry(6.55,1.82),new THREE.MeshBasicMaterial({map:displayTexture('hex'),color:0xc9ecff,toneMapped:false}),-1.5,1.20,8.7);screen.rotation.x=-Math.PI/2+.27;
  box(scene,6.9,.025,.035,light(0xffc78f,1.7),-1.5,.07,9.7);
  const edgeLight=new THREE.PointLight(0x1aabff,4,7,2);edgeLight.position.set(-1.5,1.5,9);scene.add(edgeLight);
  for(let i=0;i<17;i++)person(scene,-8+r()*17,4.5+r()*2.4,200+i,Math.PI+(r()-.5),.92+r()*.12);
  for(const [x,z,s] of [[-4.3,10.3,1.08],[-2,10.5,1.05],[.3,10.3,1.01],[8.5,8.4,1.02],[12,9,1]])person(scene,x,z,Math.floor(x*99+z*50),Math.PI,s);
  for(const [x,z] of [[-13,0],[-15,9],[14,-1],[16,8],[-10,-12],[12,-12]])tree(scene,x,z,1.15,Math.floor(x*51+1000));
  planter(scene,-12,10,4,2);planter(scene,13,10,5,2);planter(scene,-3,8.0,3,1.2);
  return {scene,cameraPosition:new THREE.Vector3(18,3.8,22),target:new THREE.Vector3(0,4.05,-1),fov:34,materials,update:t=>materials.forEach(m=>m.uniforms.uTime.value=t),setLights:on=>materials.forEach(m=>m.uniforms.uOn.value=on?1:0)};
}

function fluidSurface(top,bottom,rx,rz,columns=220,rows=38){const p=[],uv=[],ids=[];for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){const u=i/columns,a=u*Math.PI*2,v=j/rows;p.push(Math.cos(a)*rx,bottom(a)+(top(a)-bottom(a))*v,Math.sin(a)*rz);uv.push(u,v);}for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){const a=j*(columns+1)+i,b=a+1,c=a+columns+1,d=c+1;ids.push(a,c,b,b,c,d);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ids);g.computeVertexNormals();return g;}

export function createFluidScene(){
  const {scene,r}=createEnvironment(129);
  const top=a=>8.0+1.4*Math.cos(a)+.3*Math.sin(a*2),bottom=a=>3.2-.65*Math.cos(a*2)+.15*Math.sin(a*2),rx=11.7,rz=4.9;
  const material=new THREE.ShaderMaterial({side:THREE.DoubleSide,uniforms:{uTime:{value:0},uOn:{value:1}},vertexShader:shaderVertex,fragmentShader:`varying vec2 vUv;uniform float uTime,uOn;${hashGLSL}
    void main(){vec2 grid=vUv*vec2(210.,28.),cell=floor(grid),q=fract(grid)-.5;
      float d=length(q);float aa=fwidth(d);float housing=1.-smoothstep(.45-aa,.45+aa,d);float lamp=1.-smoothstep(.23-aa,.23+aa,d);
      float wave=sin(cell.x*.09+cell.y*.32+uTime*.23)+.55*sin(cell.x*.14-cell.y*.26-uTime*.14);
      float intensity=smoothstep(-.22,.66,wave);intensity=mix(.017,1.8,intensity)*uOn;
      vec3 base=mix(vec3(.009,.017,.03),vec3(.025,.039,.06),housing);
      vec3 c=mix(vec3(.35,.7,1.15),vec3(.9,1.25,1.65),intensity*.5);
      gl_FragColor=vec4(base+lamp*c*intensity,1.);}`});
  add(scene,fluidSurface(top,bottom,rx,rz),material,0,0,-2.5);
  const roofPositions=[0,8,-2.5],roofIndices=[];
  for(let i=0;i<=180;i++){const a=i/180*Math.PI*2;roofPositions.push(Math.cos(a)*rx,top(a),Math.sin(a)*rz-2.5);if(i<180)roofIndices.push(0,i+2,i+1);}
  const roofGeometry=new THREE.BufferGeometry();roofGeometry.setAttribute('position',new THREE.Float32BufferAttribute(roofPositions,3));roofGeometry.setIndex(roofIndices);roofGeometry.computeVertexNormals();add(scene,roofGeometry,matte(0x18202c,.5,.25));
  // A continuous overhang follows the rising underside of the facade.
  const soffitPositions=[],soffitIndices=[];
  for(let i=0;i<=180;i++){const a=i/180*Math.PI*2;soffitPositions.push(Math.cos(a)*rx,bottom(a)-.03,Math.sin(a)*rz-2.5,Math.cos(a)*(rx-1.0),bottom(a)-.15,Math.sin(a)*(rz-1.0)-2.5);if(i<180){const n=i*2;soffitIndices.push(n,n+1,n+2,n+1,n+3,n+2);}}
  const soffitGeometry=new THREE.BufferGeometry();soffitGeometry.setAttribute('position',new THREE.Float32BufferAttribute(soffitPositions,3));soffitGeometry.setIndex(soffitIndices);soffitGeometry.computeVertexNormals();add(scene,soffitGeometry,new THREE.MeshStandardMaterial({color:0x8c7963,roughness:.4,side:THREE.DoubleSide,emissive:0x543419,emissiveIntensity:.32}));
  for(const fn of [top,bottom]){const p=[];for(let i=0;i<=180;i++){const a=i/180*Math.PI*2;p.push([Math.cos(a)*rx,fn(a),Math.sin(a)*rz-2.5]);}tube(scene,p,.065,matte(0x73808e,.3,.6));}
  // Transparent elliptical ground floor and warm inner lobby.
  const glass=new THREE.MeshPhysicalMaterial({color:0xb4cbd6,metalness:.06,roughness:.05,transparent:true,opacity:.18,side:THREE.DoubleSide,depthWrite:false});
  add(scene,fluidSurface(a=>bottom(a)-.10,()=>.11,rx-.55,rz-.55,120,1),glass,0,0,-2.5);
  const floor=add(scene,new THREE.CylinderGeometry(1,1,.08,96),new THREE.MeshStandardMaterial({color:0x916d47,roughness:.45,emissive:0x4e2b0e,emissiveIntensity:.3}),0,.1,-2.5);floor.scale.set(rx-.5,1,rz-.5);
  const ceiling=add(scene,new THREE.CylinderGeometry(1,1,.08,96),light(0xffbe79,.8),0,2.8,-2.5);ceiling.scale.set(rx-.5,1,rz-.5);
  box(scene,11,2.45,.15,new THREE.MeshBasicMaterial({color:0xd1a05c}),0,1.35,-5.3);
  for(let i=0;i<72;i++){const a=i/72*Math.PI*2,x=Math.cos(a)*(rx-.5),z=Math.sin(a)*(rz-.5)-2.5;const h=bottom(a)-.12;box(scene,.04,h,.05,matte(0x131720,.28,.5),x,h/2+.1,z);if(i%9===0)box(scene,.17,2.65,.17,matte(0xa69582,.55),x*.7,1.45,(z+2.5)*.7-2.5);}
  for(let x=-9;x<=9;x+=1.4)box(scene,.035,2.4,.025,light(0xffbf77,1.3),x,1.4,-5.16);
  for(let x=-9;x<=9;x+=2.8){box(scene,1.6,.38,.65,matte(0x302725),x,.35,-1.8);box(scene,1.8,.025,.025,light(0xffdca9,1.4),x,2.73,.6);}
  const lobbyLight=new THREE.PointLight(0xffc38e,12,30,2);lobbyLight.position.set(0,1.6,.5);scene.add(lobbyLight);
  for(let i=0;i<24;i++)person(scene,-12+r()*24,3.8+r()*7.8,510+i,r()*Math.PI*2,.92+r()*.15);
  const rings=[];
  for(let i=0;i<9;i++){const x=-10+i*2.0,z=7.0+(i%3)*1.6,ring=add(scene,new THREE.TorusGeometry(.67,.014,6,64),light(0x7cceff,1.3),x,.023,z);ring.rotation.x=Math.PI/2;rings.push(ring);}
  planter(scene,13,7,6,2.4);planter(scene,-14,6,5,2.4);
  for(const [x,z] of [[-16,0],[-18,8],[16,0],[18,10],[-12,-13],[13,-13]])tree(scene,x,z,1.1,Math.floor(x*11+720));
  return {scene,cameraPosition:new THREE.Vector3(16,3.8,27),target:new THREE.Vector3(0,3.5,-.6),fov:38,material,setLights:on=>material.uniforms.uOn.value=on?1:0,update:t=>{material.uniforms.uTime.value=t;rings.forEach((m,i)=>m.material.color.setRGB(.35,.75,1.0).multiplyScalar(.95+.3*Math.sin(t*.5+i)));}};
}

export function createLightFieldScene(){
  const {scene,r}=createEnvironment(283),materials=[],columnLights=[];
  const glass=new THREE.MeshPhysicalMaterial({color:0xb3c4db,transparent:true,opacity:.11,roughness:.12,metalness:.18,side:THREE.DoubleSide,depthWrite:false});
  const columns=[],lighting=createColumnLighting();
  for(let row=0;row<6;row++)for(let col=0;col<7;col++){
    const x=-11+col*2.0+(r()-.5)*.45,z=-7+row*2.5+(r()-.5)*.4,h=2.4+r()*5.7;
    const color=COLUMN_WARM_WHITE;
    box(scene,.52,.09,.52,matte(0x6b686b,.38,.3),x,.045,z);
    box(scene,.23,h,.23,glass,x,h/2+.08,z);
    const outer=box(scene,.23,h,.23,new THREE.MeshBasicMaterial({visible:false}),x,h/2+.08,z);const edges=new THREE.LineSegments(new THREE.EdgesGeometry(outer.geometry),new THREE.LineBasicMaterial({color:0x9aafd0,transparent:true,opacity:.28}));edges.position.copy(outer.position);scene.add(edges);
    const mat=lighting.material(h-.08);
    materials.push(mat);box(scene,.12,h-.08,.12,mat,x,h/2+.08,z);columns.push([x,z]);
    if((row+col)%6===0){const pl=new THREE.PointLight(color,1.4,5,2);pl.position.set(x,1.0,z);scene.add(pl);columnLights.push(pl);}
  }
  // LED paths embedded in the pavement.
  const ledGeo=new THREE.BoxGeometry(.045,.015,.045),led=new THREE.InstancedMesh(ledGeo,light(0xffcb83,1.5),650),o=new THREE.Object3D();let index=0;
  for(let row=0;row<6;row++)for(let i=0;i<65;i++){o.position.set(-12+i*.38,.018,-8+row*2.65);o.updateMatrix();led.setMatrixAt(index++,o.matrix);}
  for(let row=0;row<4;row++)for(let i=0;i<65;i++){o.position.set(-12+row*4.8,.018,-8+i*.3);o.updateMatrix();led.setMatrixAt(index++,o.matrix);}scene.add(led);
  // Glass interaction pavilion on the right.
  const pavilion=new THREE.Group();pavilion.position.set(11.6,0,-1.5);scene.add(pavilion);
  box(pavilion,6.0,.22,4.5,matte(0x070b12,.38,.3),0,3.9,0);
  box(pavilion,6.0,.035,.025,light(0xffc286,1.7),0,3.76,2.27);
  for(const x of [-2.8,2.8])for(const z of [-2.1,2.1])box(pavilion,.05,3.7,.05,matte(0x19212e,.25,.6),x,1.88,z);
  const front=add(pavilion,new THREE.PlaneGeometry(5.6,3.7),glass,0,1.9,2.12);
  for(const x of [-2.8,2.8]){const side=add(pavilion,new THREE.PlaneGeometry(4.2,3.7),glass,x,1.9,0);side.rotation.y=Math.PI/2;}
  const display=add(pavilion,new THREE.PlaneGeometry(4.5,2.8),new THREE.MeshBasicMaterial({map:displayTexture('field'),toneMapped:false}),0,1.86,-1.88);
  box(pavilion,1.0,.93,.65,matte(0x121521,.4),-.5,.47,.35);
  const kiosk=add(pavilion,new THREE.PlaneGeometry(.92,.57),new THREE.MeshBasicMaterial({map:displayTexture('field'),toneMapped:false}),-.5,1.0,.35);kiosk.rotation.x=-Math.PI/2+.3;
  box(pavilion,6.0,.025,.025,light(0xffca91,1.5),0,.045,2.22);
  const kp=new THREE.PointLight(0xb58bff,3.0,8,2);kp.position.set(11.6,2.0,-1.5);scene.add(kp);
  for(const x of [-2.8,2.8])box(pavilion,.025,.025,4.2,light(0xffc286,1.4),x,3.76,0);
  tree(scene,-16,10,1.9,1071);
  person(scene,11.3,1.75,251,Math.PI,1);person(scene,15.6,6.8,252,-.5,1.06);
  for(let i=0;i<18;i++)person(scene,-11+r()*21,1+r()*9,780+i,r()*6.28,.85+r()*.2);
  for(const [x,z] of [[-18,-2],[-17,8],[19,-8],[19,5],[-10,-17],[4,-17],[13,-17]])tree(scene,x,z,1.15,Math.round(x*42+910));
  planter(scene,-14,13,7,2.8);planter(scene,16,10,5,2.0);
  add(scene,new THREE.SphereGeometry(.13,12,8),light(0xffe0b3,1.8),-7,19,-43);
  return {scene,cameraPosition:new THREE.Vector3(6,3.4,24),target:new THREE.Vector3(1,2.9,-1.0),fov:42,materials,lightingState:lighting.state,update:t=>{const state=lighting.update(t);columnLights.forEach(light=>light.intensity=1.4*state.breath);},setLights:on=>{materials.forEach(m=>m.uniforms.uOn.value=on?1:0);columnLights.forEach(l=>l.visible=on);}};
}
