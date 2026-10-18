// @ts-nocheck
// Adapted upstream scene source; see PROVENANCE.md.
import * as THREE from 'three';
import type {ArchitectureModel} from './architectureGeometry';

/** Source crops are inferred PBR evidence, with illumination influence deliberately muted. */
export function addArchitectureMaterials(model:ArchitectureModel){
 const textures:THREE.Texture[]=[],manager=new THREE.LoadingManager();
 model.ready=new Promise<void>((resolve,reject)=>{manager.onLoad=()=>resolve();manager.onError=url=>reject(new Error('Texture failed: '+url));});
 const loader=new THREE.TextureLoader(manager);
 function channel(id:string,c:string,color=false){const t=loader.load('/assets/light-lab/night/'+model.kind+'-materials/'+id+'/'+id+'_'+c+'.png');t.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;textures.push(t);return t;}
 function maps(id:string){return {map:channel(id,'albedo',true),roughnessMap:channel(id,'roughness'),normalMap:channel(id,'normal'),normalScale:new THREE.Vector2(.025,.025),aoMap:channel(id,'ao'),aoMapIntensity:.08,bumpMap:channel(id,'height'),bumpScale:.0008};}
 const metal=new THREE.MeshStandardMaterial({...maps('metal'),color:'#0b1424',roughness:.6,metalness:.25});
 const stone=new THREE.MeshStandardMaterial({...maps('stone'),color:'#291e1a',roughness:.65,metalness:.04});
 const glass=new THREE.MeshPhysicalMaterial({...maps('glass'),color:'#b88756',roughness:.4,metalness:0,clearcoat:.12,clearcoatRoughness:.4,transparent:true,opacity:.18,side:THREE.DoubleSide,depthWrite:false,transmission:0,thickness:.3,ior:1.5,normalScale:new THREE.Vector2(.002,.002),bumpScale:.0003});
 const materialList=[metal,stone,glass];
 for(const [i,m] of materialList.entries()){
  const base=[.6,.65,.4][i],influence=[.04,.1,.02][i];
  m.onBeforeCompile=shader=>{
   shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>\nroughnessFactor=max(.4,${base}+.035*(roughnessFactor/${base}-.5));`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP\nvec4 evidenceSample=texture2D(map,vMapUv);diffuseColor*=vec4(mix(vec3(1.),evidenceSample.rgb,${influence}),1.);\n#endif`);
  };m.customProgramCacheKey=()=>model.kind+'-pbr-'+i;
 }
 const amber=new THREE.MeshBasicMaterial({color:new THREE.Color('#ffd09a').multiplyScalar(1.5),toneMapped:false});
 for(const [id,p] of model.parts)if(id!=='root')p.traverse(n=>{if(n instanceof THREE.Mesh){n.material=id==='glass-enclosure'?glass:id==='floor-slab'||id==='ceiling'||id.startsWith('pedestal-')?stone:['warm-reveal','interior-strips','plaza-lines'].includes(id)?amber:metal;if(n.geometry.attributes.uv)n.geometry.setAttribute('uv1',n.geometry.attributes.uv.clone());if(n.material===glass)n.castShadow=false;}});
 Object.values(model.materials).forEach(m=>m.dispose());model.materials={metal,stone,glass};
 const uniforms={uOn:{value:1},uTime:{value:0}};
 const emitterMaterial=new THREE.ShaderMaterial({uniforms,toneMapped:false,transparent:model.kind==='facade',depthWrite:model.kind!=='facade',
 vertexShader:model.kind==='facade'?'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}':
 'attribute vec4 panelInfo;attribute float emitter;attribute vec2 screenPosition;varying vec4 info;varying float face;varying vec2 screen;void main(){info=panelInfo;face=emitter;screen=screenPosition;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:model.kind==='facade'?`precision highp float;varying vec3 p;uniform float uOn;
 void main(){float theta=atan(p.x,p.z);float u=theta*17.;float border=7.1+.45*sin(theta*2.3+.8)+.17*sin(theta*6.1);if(p.y<3.24||p.y>border)discard;
 vec2 grid=vec2(u*6.8,p.y*6.8);grid.x+=mod(floor(grid.y),2.)*.5;
 float seed=fract(sin(dot(floor(grid),vec2(12.9898,78.233)))*43758.5453);vec2 cell=fract(grid)-.5+vec2(seed-.5,fract(seed*17.1)-.5)*.22;
 float r=length(cell*vec2(1.,.85+.15*seed));float aa=fwidth(r);float disk=1.-smoothstep(.22+.08*seed-aa,.22+.08*seed+aa,r);if(disk<.01||uOn<.01)discard;
 vec3 c=mix(vec3(1.,.50,.17),vec3(1.,.78,.44),seed);gl_FragColor=vec4(c*1.1,disk*uOn);
 #include <colorspace_fragment>
 }`:`precision highp float;varying vec4 info;varying float face;varying vec2 screen;uniform float uOn;uniform float uTime;
 void main(){vec3 dark=vec3(.004,.012,.028);float wave=.5+.5*sin(screen.x*1.1+screen.y*1.8+info.x*.1+uTime*.12);
 vec3 warm=mix(vec3(1.,.055,.012),vec3(1.,.69,.09),smoothstep(.15,.9,wave));vec3 cold=mix(vec3(.003,.035,.17),vec3(.015,.8,1.),smoothstep(.05,.75,wave));vec3 c=mix(warm,cold,info.y);
 vec2 dotCell=fract(screen*24.)-.5;float r=length(dotCell),aa=fwidth(r);float disk=1.-smoothstep(.25-aa,.25+aa,r);
 float footprint=max(length(dFdx(screen*24.)),length(dFdy(screen*24.)));
 disk=mix(disk,.19635,smoothstep(.45,1.1,footprint));
 float glowMask=info.z*step(.99,face)*uOn;gl_FragColor=vec4(mix(dark,c*(.20+.9*disk),glowMask),1.);
 #include <colorspace_fragment>
 }`});
 if(model.kind==='facade'){const host=model.parts.get('upper-shell')!.children[0] as THREE.Mesh;const geo=host.geometry.clone();geo.scale(1.001,1,1.001);const mesh=model.element(model.parts.get('dot-field')!,geo,emitterMaterial);mesh.castShadow=false;mesh.userData.explodeWithParent=true;}
 else model.parts.get('hex-panels')!.traverse(n=>{if(n instanceof THREE.Mesh)n.material=emitterMaterial;});
 return {...model,textures,lightMaterials:[amber],emitterMaterial,uniforms};
}
export type MaterialArchitectureModel=ReturnType<typeof addArchitectureMaterials>;
