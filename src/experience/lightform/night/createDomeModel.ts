// @ts-nocheck
// Adapted upstream scene source; see PROVENANCE.md.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import specification from './specs/dome.json';

// Meter-scale subject refinements from geometryDescriptor, current unlocked material pass.
export const builtPass = 'optimization-pass';
export function createDomeModel() {
  const root = new THREE.Group(); root.name = 'root';
  const parts = new Map<string, THREE.Group>(); parts.set('root', root);
  const clay = new THREE.MeshStandardMaterial({ color: '#708296', roughness: .7 });
  function part(id: string, geometry: THREE.BufferGeometry, y = 0) {
    const group = new THREE.Group(); group.name = id; group.position.y = y;
    const definition = specification.componentTree.find(c => c.id === id)!;
    group.userData = { componentId: id, actionProfile: definition.actionProfile };
    const mesh = new THREE.Mesh(geometry, clay); mesh.name = id + ':mesh';
    mesh.userData.componentId = id; mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh); root.add(group); parts.set(id, group); return group;
  }
  // Continuous outer/inner envelope with a closed annular spring edge.
  const profile: THREE.Vector2[] = [];
  for (let i = 0; i <= 48; i++) {
    const t = Math.PI / 2 * (1 - i / 48);
    profile.push(new THREE.Vector2(Math.max(.0001, 10 * Math.sin(t)), 10 * Math.cos(t)));
  }
  for (let i = 0; i <= 48; i++) {
    const t = Math.PI / 2 * i / 48;
    profile.push(new THREE.Vector2(Math.max(.0001, 9.7 * Math.sin(t)), 9.7 * Math.cos(t)));
  }
  profile.push(profile[0].clone());
  part('roof-shell', new THREE.LatheGeometry(profile, 96), 2.8);
  /* const wall = [new THREE.Vector2(9.7,0),new THREE.Vector2(10,0),new THREE.Vector2(10,2.8),new THREE.Vector2(9.7,2.8),new THREE.Vector2(9.7,0)];
  part('glass-enclosure', new THREE.LatheGeometry(wall,96)); */
  part('floor-slab', new THREE.CylinderGeometry(10,10,.12,96), -.06);
  function assembly(id: string) {
    const group = new THREE.Group(); group.name = id;
    group.userData = { componentId:id, actionProfile:specification.componentTree.find(c=>c.id===id)!.actionProfile };
    root.add(group);parts.set(id,group);return group;
  }
  function element(group:THREE.Group,geometry:THREE.BufferGeometry,x=0,y=0,z=0) {
    const mesh=new THREE.Mesh(geometry,clay);mesh.position.set(x,y,z);mesh.name=group.name+':mesh';mesh.userData.componentId=group.name;
    mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;
  }
  function arc(start:number,end:number,height:number) {
    const shape=new THREE.Shape();shape.absarc(0,0,10,start,end,false);shape.lineTo(9.7*Math.cos(end),9.7*Math.sin(end));shape.absarc(0,0,9.7,end,start,true);shape.closePath();
    const g=new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,curveSegments:64});g.rotateX(-Math.PI/2);return g;
  }
  const walls=assembly('glass-enclosure'),alpha=Math.asin(1.2/9.7);
  for(const [start,end,mid] of [[Math.PI/2+alpha,3*Math.PI/2-alpha,Math.PI],[3*Math.PI/2+alpha,5*Math.PI/2-alpha,2*Math.PI]]) {
    element(walls,arc(start,mid-.08,2.8));const solid=element(walls,arc(mid-.08,mid+.08,2.8));solid.userData.solid=true;element(walls,arc(mid+.08,end,2.8));
  }
  element(walls,arc(Math.PI/2-alpha,Math.PI/2+alpha,.4),0,2.4);
  element(walls,arc(3*Math.PI/2-alpha,3*Math.PI/2+alpha,.4),0,2.4);
  const rim=assembly('roof-rim');const rm=element(rim,new THREE.TorusGeometry(9.985,.035,6,128),0,2.8);rm.rotation.x=Math.PI/2;
  const seam=assembly('crown-seam');const sm=element(seam,new THREE.TorusGeometry(Math.sqrt(100-7.1*7.1),.012,4,96),0,9.9);sm.rotation.x=Math.PI/2;
  const mullions=assembly('mullions'),placements=[];
  for(let i=0;i<64;i++){const t=i*Math.PI/32,x=9.85*Math.sin(t),z=9.85*Math.cos(t);if(Math.abs(x)<1.28)continue;placements.push({x,z,t});}
  const inst=new THREE.InstancedMesh(new THREE.BoxGeometry(.065,2.8,.3),clay,placements.length),dummy=new THREE.Object3D();
  for(let i=0;i<placements.length;i++){const {x,z,t}=placements[i];dummy.position.set(x,1.4,z);dummy.rotation.y=t;dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);}inst.castShadow=true;inst.name='mullions:instances';inst.userData.componentId='mullions';mullions.add(inst);
  for(const [id,z] of [['door-front',9.85],['door-rear',-9.85]] as const){const door=assembly(id);for(const x of [-1.26,1.26])element(door,new THREE.BoxGeometry(.12,2.4,.3),x,1.2,z);element(door,new THREE.BoxGeometry(2.64,.12,.3),0,2.46,z);}
  assembly('dot-field'); // Semantic surface host; emission is added in the material pass.
  const ring=assembly('plaza-ring');const pr=element(ring,new THREE.TorusGeometry(11.5,.015,5,160),0,.02);pr.rotation.x=Math.PI/2;
  for(const id of ['core','nw','ne','sw','se']){const definition=specification.componentTree.find(c=>c.id==='pedestal-'+id)!;const p=definition.transform.position;const pedestal=assembly('pedestal-'+id);element(pedestal,new RoundedBoxGeometry(1.6,.8,1.6,2,.012),p[0],p[1],p[2]);}
  const textures: THREE.Texture[] = [];
  const manager=new THREE.LoadingManager();
  const ready=new Promise<void>((resolve,reject)=>{manager.onLoad=()=>resolve();manager.onError=url=>reject(new Error('Material texture failed: '+url));});
  const loader=new THREE.TextureLoader(manager);
  function channel(id:string,channel:string,color=false) {
    const map=loader.load('/assets/light-lab/night/dome-materials/'+id+'_'+channel+'.png');map.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;
    map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=8;textures.push(map);return map;
  }
  function pbr(id:string,color:string,roughness:number,metalness:number){
    return new THREE.MeshStandardMaterial({color,roughness,metalness,map:channel(id,'albedo',true),roughnessMap:channel(id,'roughness'),normalMap:channel(id,'normal'),normalScale:new THREE.Vector2(.025,.025),aoMap:channel(id,'ao'),aoMapIntensity:.12,bumpMap:channel(id,'height'),bumpScale:.001});
  }
  const roofMaterial=pbr('roof','#ffffff',.6,.4),stoneMaterial=pbr('stone','#b0bdce',.65,.04);
  const frameMaterial=new THREE.MeshStandardMaterial({color:'#080f1c',roughness:.6,metalness:.4});
  const frostSize=1024,frost=new Uint8Array(frostSize*frostSize*4);
  for(let i=0;i<frostSize*frostSize;i++){const n=((Math.imul(i+731,1664525)^Math.imul(i>>>10,1013904223))>>>0)%256;frost.set([n,n,n,255],i*4);}
  const frostHeight=new THREE.DataTexture(frost,frostSize,frostSize);frostHeight.wrapS=frostHeight.wrapT=THREE.RepeatWrapping;frostHeight.repeat.set(7,1);frostHeight.needsUpdate=true;textures.push(frostHeight);
  const glassMaterial=new THREE.MeshPhysicalMaterial({color:'#b8c0c8',roughness:.4,metalness:0,transparent:true,opacity:.18,transmission:0,thickness:.3,ior:1.5,side:THREE.DoubleSide,depthWrite:false,map:channel('glass','albedo',true),roughnessMap:channel('glass','roughness'),normalMap:channel('glass','normal'),normalScale:new THREE.Vector2(.001,.001),bumpMap:frostHeight,bumpScale:.0008,aoMap:channel('glass','ao'),aoMapIntensity:.025});
  // Reference glass includes transmitted scene pixels. Keep their influence small;
  // the designed micro-frost height drives the new surface, not baked mullions.
  function boundedRoughness(material:THREE.MeshStandardMaterial,baseline:number,glass=false){
    material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>\nroughnessFactor=max(.4,${baseline.toFixed(2)}+.035*(roughnessFactor/${baseline.toFixed(2)}-.5));`);
      if(glass)shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP\nvec4 sampleGlass=texture2D(map,vMapUv);diffuseColor*=vec4(mix(vec3(1.),sampleGlass.rgb,.04),1.);\n#endif`);
    };material.customProgramCacheKey=()=>String(baseline)+'-'+glass;
  }
  boundedRoughness(roofMaterial,.6);
  const roofCompile=roofMaterial.onBeforeCompile;roofMaterial.onBeforeCompile=(shader,renderer)=>{roofCompile(shader,renderer);shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>', '#ifdef USE_MAP\nvec4 sampleRoof=texture2D(map,vMapUv);diffuseColor*=vec4(mix(vec3(.012,.02,.04),sampleRoof.rgb,.08),1.);\n#endif');};boundedRoughness(stoneMaterial,.65);boundedRoughness(glassMaterial,.4,true);
  const amberMaterial=new THREE.MeshBasicMaterial({color:new THREE.Color('#ffc781').multiplyScalar(2.1),toneMapped:false});
  for(const [id,group] of parts)group.traverse(node=>{if(node instanceof THREE.Mesh){
    node.material=id==='roof-shell'?roofMaterial:(id==='glass-enclosure'&&!node.userData.solid?glassMaterial:(id.startsWith('pedestal-')||id==='floor-slab'?stoneMaterial:(id==='plaza-ring'?amberMaterial:frameMaterial)));
    if(node.geometry.attributes.uv)node.geometry.setAttribute('uv1',node.geometry.attributes.uv.clone());
  }});
  const dotMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,uniforms:{uOn:{value:1}},
    vertexShader:'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`precision highp float;varying vec3 p;uniform float uOn;
      void main(){float theta=acos(clamp(p.y/length(p),0.,1.));float phi=atan(p.x,p.z);
      float border=1.02+.055*sin(phi*3.+.8)+.026*sin(phi*8.-.3);if(theta<border)discard;
      float row=theta/1.5707963*92.;float col=(phi/6.2831853+.5)*224.+mod(floor(row),2.)*.5;
      float seed=fract(sin(dot(floor(vec2(col,row)),vec2(12.98,78.23)))*43758.54);
      vec2 jitter=vec2(seed-.5,fract(seed*13.1)-.5)*.16;
      vec2 cell=fract(vec2(col,row))-.5-jitter;float radius=length(cell*vec2(1.,.65+.16*seed));float edge=fwidth(radius);
      float aperture=.26+.065*seed;float disk=1.-smoothstep(aperture-edge,aperture+edge,radius);if(disk<.01)discard;
      vec3 color=mix(vec3(1.0,.58,.24),vec3(1.0,.78,.48),seed);gl_FragColor=vec4(color*uOn,disk*.97*uOn);
#include <colorspace_fragment>
}`});
  const dots=new THREE.Mesh((parts.get('roof-shell')!.children[0] as THREE.Mesh).geometry.clone(),dotMaterial);dots.position.y=2.8;dots.scale.setScalar(1.0007);dots.name='dot-field:surface';dots.userData.componentId='dot-field';dots.userData.explodeWithParent=true;parts.get('dot-field')!.add(dots);
  const pivots=Object.fromEntries([...parts].map(([id,p])=>[id,p]));
  const sockets:Record<string,THREE.Object3D>={};
  for(const [id,p] of parts)if(id!=='root'){const socket=new THREE.Object3D();socket.name=id+':socket';p.add(socket);sockets[id]=socket;p.userData.destructionGroup=id;p.userData.restPosition=p.position.toArray();}
  const runtime={parts:pivots,pivots,sockets,colliders:[] as unknown[],destructionGroups:Object.fromEntries([...parts.keys()].filter(id=>id!=='root').map(id=>[id,[id]])),
    setExplode(amount:number){const factor=THREE.MathUtils.clamp(amount,0,1);for(const [id,p] of parts){if(id==='root')continue;const rest=p.userData.restPosition as number[];const center=new THREE.Box3().setFromObject(p).getCenter(new THREE.Vector3());const offset=p.userData.explodeOffset??=new THREE.Vector3(center.x,center.y-6.34,center.z);if(id==='dot-field')offset.copy(parts.get('roof-shell')!.userData.explodeOffset);if(offset.length()<.1)offset.set(0,1,0);p.position.set(rest[0]+offset.x*factor*.45,rest[1]+offset.y*factor*.45,rest[2]+offset.z*factor*.45);}},
    pick(raycaster:THREE.Raycaster){return raycaster.intersectObject(root,true).find(hit=>hit.object.userData.componentId);}};
  root.userData.sculptRuntime=runtime;
  return { root, parts, ready, runtime, materials:{roofMaterial,stoneMaterial,glassMaterial,frameMaterial,amberMaterial,dotMaterial}, textures };


}
