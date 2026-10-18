// @ts-nocheck
// Adapted upstream scene source; see PROVENANCE.md.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';

export function rng(seed=7319) { return () => { seed=(Math.imul(seed ^ (seed>>>15),1|seed)+0x6d2b79f5)|0; return (seed>>>0)/4294967296; }; }
export const matte=(color,roughness=.7,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
export const light=(color,intensity=1)=>new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(intensity),toneMapped:false});
export function add(parent,geometry,material,x=0,y=0,z=0){if([bark,skin,hair].includes(material))material=material.clone();const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);parent.add(m);return m;}
export const box=(parent,w,h,d,material,x,y,z)=>add(parent,new THREE.BoxGeometry(w,h,d),material,x,y,z);
export function tube(parent,points,r,material){return add(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),Math.max(12,points.length*3),r,5,false),material);}
export function branch(parent,a,b,r,material){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),v=bv.clone().sub(av);const m=add(parent,new THREE.CylinderGeometry(r*.65,r,v.length(),6),material);m.position.copy(av).add(bv).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return m;}

function canvasTexture(c){const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
export function textTexture(title,subtitle='') {const c=document.createElement('canvas');c.width=1024;c.height=256;const g=c.getContext('2d');g.fillStyle='#403830';g.fillRect(0,0,1024,256);g.fillStyle='#ffe4bd';g.font='600 100px sans-serif';g.fillText(title,35,130);g.font='500 25px sans-serif';g.fillText(subtitle,40,195);return canvasTexture(c);}
export function displayTexture(kind='hex') {
  const c=document.createElement('canvas');c.width=1024;c.height=512;const g=c.getContext('2d'),r=rng(821);
  g.fillStyle='#041127';g.fillRect(0,0,1024,512);
  if(kind==='hex'){
    for(let j=0;j<6;j++)for(let i=0;i<12;i++){
      const x=45+i*76,y=50+j*78+(i%2)*39;g.beginPath();for(let k=0;k<6;k++){const a=k*Math.PI/3;const px=x+Math.cos(a)*45,py=y+Math.sin(a)*45;k?g.lineTo(px,py):g.moveTo(px,py);}g.closePath();
      g.fillStyle=['#f95b55','#ffb860','#36e3fd','#2494ee','#e77ba7'][Math.floor(r()*5)];g.globalAlpha=.3+r()*.6;g.fill();g.globalAlpha=1;g.strokeStyle='#52a9ed';g.lineWidth=1;g.stroke();
    }
    g.fillStyle='#061224bb';g.fillRect(730,0,294,512);g.fillStyle='#a9d5fc';g.font='20px sans-serif';g.fillText('HIVE / LIVE SYSTEM',755,50);
    for(let j=0;j<13;j++){g.fillStyle='#306591';g.fillRect(756,85+j*27,175+r()*50,2);}
  }else{
    g.fillStyle='#c4baff';g.font='20px monospace';g.fillText('LUMEN / INTERACTION FIELD',40,40);
    g.strokeStyle='#708dff';g.lineWidth=2;
    for(let j=0;j<9;j++){g.beginPath();for(let k=0;k<80;k++){const x=310+k*8,y=270+Math.sin(k*.14+j*.44)*(55+j*9);k?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();}
    for(let i=0;i<750;i++){const a=r()*Math.PI*2,b=r()*1.0,x=630+Math.cos(a)*b*290,y=270+Math.sin(a)*b*155;g.fillStyle=r()>.4?'#ad8bff':'#64e5ed';g.fillRect(x,y,2,2);}
    g.strokeStyle='#8bcbff';g.beginPath();g.arc(180,135,20,0,Math.PI*2);g.moveTo(180,156);g.lineTo(180,275);g.moveTo(180,175);g.lineTo(130,235);g.moveTo(180,175);g.lineTo(225,235);g.moveTo(180,275);g.lineTo(147,360);g.moveTo(180,275);g.lineTo(211,360);g.stroke();
    for(let j=0;j<16;j++){g.strokeStyle='#274864';g.beginPath();g.moveTo(120+j*8,155);g.lineTo(150+j*4,360);g.stroke();}
  }
  return canvasTexture(c);
}

export function createEnvironment(seed=7319){
  const scene=new THREE.Scene(),r=rng(seed);scene.background=new THREE.Color(0x030919);scene.fog=new THREE.FogExp2(0x091426,.006);
  add(scene,new THREE.SphereGeometry(120,32,20),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,vertexShader:'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 p;void main(){vec3 n=normalize(p);float h=clamp(n.y*.9+.13,0.,1.);float cloud=sin(n.x*40.+n.z*25.)*sin(n.z*66.+n.y*40.);vec3 c=mix(vec3(.025,.05,.105),vec3(.002,.007,.023),smoothstep(0.,.8,h));c+=max(cloud,0.)*.008;gl_FragColor=vec4(c,1.);}'}));
  scene.add(new THREE.HemisphereLight(0x667d9e,0x181513,1.5));
  const fill=new THREE.DirectionalLight(0x7293c0,2.1);fill.position.set(-13,20,17);scene.add(fill);
  const warm=new THREE.DirectionalLight(0xffc08b,.6);warm.position.set(6,10,14);scene.add(warm);

  const mirror=new Reflector(new THREE.PlaneGeometry(110,100),{color:0x636871,textureWidth:1024,textureHeight:1024,clipBias:.003});mirror.rotation.x=-Math.PI/2;mirror.position.set(0,-.025,0);scene.add(mirror);
  // Project the live reflection through small, irregular pavement ripples.
  mirror.material.vertexShader=mirror.material.vertexShader.replace('varying vec4 vUv;','varying vec4 vUv; varying vec2 vGround;').replace('vUv = textureMatrix * vec4( position, 1.0 );','vUv = textureMatrix * vec4( position, 1.0 ); vGround=position.xy;');
  mirror.material.fragmentShader=mirror.material.fragmentShader.replace('varying vec4 vUv;','varying vec4 vUv; varying vec2 vGround;').replace('vec4 base = texture2DProj( tDiffuse, vUv );',`
    vec2 uv=vUv.xy/vUv.w;
    float ripple=sin(vGround.x*43.0+sin(vGround.y*21.0))*sin(vGround.y*77.0);
    uv+=vec2(ripple*.0017,sin(vGround.y*53.0+vGround.x*17.0)*.0009);
    vec4 base=texture2D(tDiffuse,uv)*.5;
    base+=texture2D(tDiffuse,uv+vec2(.0008,.0021))*.25;
    base+=texture2D(tDiffuse,uv-vec2(.0008,.0021))*.25;
    float wet=.72+.20*sin(vGround.y*4.1+sin(vGround.x*3.2));
    base.rgb*=wet;`);
  const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');g.fillStyle='#55575a';g.fillRect(0,0,256,256);for(let i=0;i<9500;i++){const v=Math.floor(65+r()*100);g.fillStyle=`rgb(${v},${v},${v})`;g.fillRect(r()*256,r()*256,1+r()*2,1);}
  const rough=new THREE.CanvasTexture(c);rough.wrapS=rough.wrapT=THREE.RepeatWrapping;rough.repeat.set(30,30);
  const surface=add(scene,new THREE.PlaneGeometry(110,100),new THREE.MeshStandardMaterial({color:0x535b69,roughness:.46,metalness:.06,transparent:true,opacity:.62,bumpMap:rough,bumpScale:.025,depthWrite:false}),0,-.013,0);surface.rotation.x=-Math.PI/2;
  const seams=[];for(let x=-45;x<=45;x+=3.4)seams.push(x,.003,-40,x,.003,40);for(let z=-40;z<=40;z+=3.4)seams.push(-45,.003,z,45,.003,z);
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(seams,3));scene.add(new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:0x03070e,transparent:true,opacity:.65})));
  skyline(scene,r);
  return {scene,r,mirror};
}

function skyline(scene,r){
  const facadeMaps=[];for(let k=0;k<4;k++){const c=document.createElement('canvas');c.width=128;c.height=384;const g=c.getContext('2d');g.fillStyle='#050d1b';g.fillRect(0,0,128,384);for(let y=5;y<380;y+=12)for(let x=4;x<124;x+=12){if(r()<.52)continue;g.fillStyle=['#b69b73','#d7b684','#e1c998','#547c9b'][Math.floor(r()*4)];g.globalAlpha=.3+r()*.5;g.fillRect(x,y,5+r()*3,6);}facadeMaps.push(canvasTexture(c));}
  for(let i=0;i<24;i++){
    const x=-52+i*4.5+(r()-.5)*1.1,z=-35-r()*15,h=9+r()*24,w=2.2+r()*3.7,d=3+r()*4;
    box(scene,w,h,d,matte(0x07101e,.45,.2),x,h/2,z);
    const windows=new THREE.MeshBasicMaterial({map:facadeMaps[i%4],color:i%7===0?0x85bcff:0xc9bbab});add(scene,new THREE.PlaneGeometry(w*.96,h*.96),windows,x,h/2,z+d/2+.01);
    const side=add(scene,new THREE.PlaneGeometry(d*.95,h*.96),new THREE.MeshBasicMaterial({map:facadeMaps[i%4],color:0x5b6f82}),x+w/2+.01,h/2,z);side.rotation.y=Math.PI/2;
    if(i%4===0)box(scene,w+.05,.08,d+.06,light(0xffd7a6,.9),x,h, z);
    if(i%6===0){box(scene,.04,h,.06,light(0x198cec,1.3),x+w*.33,h/2,z+d/2+.04);}
    add(scene,new THREE.SphereGeometry(.045,6,4),light(0xff2525,2),x,h+.16,z);
  }
}

const bark=matte(0x51402c,.87),leafGeo=new THREE.IcosahedronGeometry(.045,0);
export function tree(scene,x,z,size=1,seed=1){
  const r=rng(seed),root=new THREE.Group();root.position.set(x,0,z);root.scale.setScalar(size);scene.add(root);
  const leafMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.86,emissive:0x674208,emissiveIntensity:.18});
  branch(root,[0,0,0],[.07,3.4,0],.105,bark.clone());const centers=[];
  for(let k=0;k<11;k++){const a=k*6.283/11,reach=.8+r()*1.55,tip=[Math.cos(a)*reach,3.0+r()*1.65,Math.sin(a)*reach*.72];branch(root,[.05,1.7+r(),0],tip,.022,bark.clone());centers.push(tip);branch(root,tip,[tip[0]+Math.cos(a)*.4,tip[1]+.25,tip[2]+Math.sin(a)*.3],.009,bark.clone());}
  const inst=new THREE.InstancedMesh(leafGeo.clone(),leafMat,1700),o=new THREE.Object3D();const colors=[0x8d813e,0x6d7033,0xa39650,0x434d25,0x33432a];
  for(let i=0;i<1700;i++){const a=centers[Math.floor(r()*centers.length)],angle=r()*6.28,rad=Math.sqrt(r())*.86;o.position.set(a[0]+Math.cos(angle)*rad,a[1]+(r()-.5)*.75,a[2]+Math.sin(angle)*rad*.7);o.rotation.set(r()*6,r()*6,r()*6);o.scale.set(.6+r(),1.7+r()*1.2,.6+r());o.updateMatrix();inst.setMatrixAt(i,o.matrix);inst.setColorAt(i,new THREE.Color(colors[Math.floor(r()*colors.length)]));}root.add(inst);
  const up=new THREE.PointLight(0xffb862,22,10*size,1.6);up.position.set(x,.9,z+1.0);scene.add(up);
  return root;
}

export function planter(scene,x,z,w=5,d=2){box(scene,w,.52,d,matte(0x353a40,.7),x,.26,z);box(scene,w+.02,.018,.025,light(0xffb96e,1.7),x,.39,z+d/2+.016);const r=rng(Math.round(x*77+z*51+1010));for(let i=0;i<w*12;i++){const plant=add(scene,new THREE.ConeGeometry(.07,.3+r()*.3,4),matte(0x344424),x+(r()-.5)*(w-.1),.55,z+(r()-.5)*(d-.1));plant.rotation.z=(r()-.5)*.7;}}

const skin=matte(0x8e6953,.9),hair=matte(0x101116,.95);
export function person(scene,x,z,seed=1,heading=0,scale=1){
  const r=rng(seed),root=new THREE.Group();root.position.set(x,0,z);root.rotation.y=heading;root.scale.setScalar(scale);scene.add(root);
  const cloth=matte([0x20272e,0x303038,0x554b44,0x4f5b66,0x9d9186][Math.floor(r()*5)],.9),pants=matte(0x18202a,.9),shoe=matte(0x11151d,.8);
  add(root,new THREE.SphereGeometry(.113,10,8),skin.clone(),0,1.55,0);add(root,new THREE.SphereGeometry(.116,10,8,0,6.283,0,1.9),hair.clone(),0,1.57,0);
  const torso=add(root,new THREE.CapsuleGeometry(.19,.39,3,8),cloth,0,1.12,0);torso.scale.z=.66;
  const shift=(r()-.5)*.13;
  branch(root,[-.12,.89,0],[-.13,.48,shift],.075,pants.clone());branch(root,[-.13,.48,shift],[-.15,.09,-shift],.057,pants.clone());
  branch(root,[.12,.89,0],[.13,.48,-shift],.075,pants.clone());branch(root,[.13,.48,-shift],[.15,.09,shift],.057,pants.clone());
  box(root,.14,.07,.25,shoe.clone(),-.15,.045,-shift+.03);box(root,.14,.07,.25,shoe.clone(),.15,.045,shift+.03);
  branch(root,[-.2,1.35,0],[-.27,1.04,.03],.053,cloth);branch(root,[-.27,1.04,.03],[-.29,.82,.06],.045,cloth);
  branch(root,[.2,1.35,0],[.27,1.04,-.02],.053,cloth);branch(root,[.27,1.04,-.02],[.3,.83,.01],.045,cloth);
  add(root,new THREE.SphereGeometry(.04,6,4),skin,-.29,.8,.06);add(root,new THREE.SphereGeometry(.04,6,4),skin,.3,.81,.01);
  return root;
}

export function lobby(scene,w,d,height=2.8,x=0,z=0){
  const group=new THREE.Group();group.position.set(x,0,z);scene.add(group);
  box(group,w-.3,.08,d-.3,new THREE.MeshStandardMaterial({color:0x916d47,roughness:.45,emissive:0x4e2b0e,emissiveIntensity:.3}),0,.1,0);
  box(group,w-.3,.055,d-.3,light(0xffba73,.85),0,height-.12,0);
  box(group,w-.3,height-.2,.12,new THREE.MeshBasicMaterial({color:0xd1a05c}),0,height/2,-d/2+.1);
  const glass=new THREE.MeshPhysicalMaterial({color:0xb8cad7,roughness:.09,metalness:.12,transparent:true,opacity:.15,side:THREE.DoubleSide,depthWrite:false});
  const frame=matte(0x0c1018,.32,.55);
  for(let i=0;i<=Math.round(w/.95);i++){const px=-w/2+w*i/Math.round(w/.95);box(group,.04,height,.055,frame,px,height/2,d/2+.05);}
  add(group,new THREE.PlaneGeometry(w,height-.13),glass,0,height/2,d/2+.04);
  for(const sign of [-1,1]){for(let i=0;i<=Math.round(d/.95);i++){const pz=-d/2+d*i/Math.round(d/.95);box(group,.055,height,.04,frame,sign*w/2,height/2,pz);}const side=add(group,new THREE.PlaneGeometry(d,height-.13),glass,sign*w/2,height/2,0);side.rotation.y=Math.PI/2;}
  for(let px=-w/2+1;px<w/2;px+=3){box(group,.1,height,.1,matte(0xccc2b7),px,height/2,-d*.1);box(group,1.6,.4,.7,matte(0x342d2a),px,.34,d*.05);box(group,w*.12,.018,.03,light(0xffe5bd,1.3),px,height-.19,d/2-.45);}
  for(let px=-w/2+.6;px<w/2;px+=1.65){
    box(group,.035,height-.35,.025,light(0xffc27c,1.35),px,height/2,-d/2+.19);
    box(group,.015,height-.25,.03,matte(0x96714a,.6),px+.13,height/2,-d/2+.2);
  }
  box(group,w-.4,.025,.025,light(0xffd6a0,1.8),0,height-.24,d/2-.3);
  for(const px of [-w*.3,w*.3]){const pot=box(group,.45,.42,.45,matte(0x4a4233),px,.31,-d*.22);for(let j=0;j<12;j++){const a=j*2.4;branch(group,[px,.5,-d*.22],[px+Math.cos(a)*.32,.95+(j%3)*.1,-d*.22+Math.sin(a)*.25],.015,bark.clone());add(group,new THREE.IcosahedronGeometry(.15,0),matte(0x4b5827),px+Math.cos(a)*.32,.95+(j%3)*.1,-d*.22+Math.sin(a)*.25);}}
  const il=new THREE.PointLight(0xffbf80,10,25,2);il.position.set(x,height*.55,z+d*.3);scene.add(il);
  return group;
}
