// @ts-nocheck
// Adapted upstream scene source; see PROVENANCE.md.
import * as THREE from 'three';
import {batchEnvironment} from './batchEnvironment.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createFacadeModel} from './createFacadeModel.ts';
import {createHiveModel} from './createHiveModel.ts';
import {createEnvironment,tree,planter,person,add,light} from './urbanEnvironment.js';
import {createDisplayProps} from './displayProps';

/** Native, metre-scale digital-art pavilions. Hidden sides and interiors are designed. */
export function createPavilionScene(renderer,kind,providedModel){
 const {scene,mirror}=createEnvironment(kind==='facade'?51027:71),model=providedModel??(kind==='facade'?createFacadeModel():createHiveModel()),d=model.design;
 scene.add(model.root);for(const part of model.parts.values())part.visible=true;
 scene.children.filter(n=>n.isMesh&&n.geometry.type==='PlaneGeometry'&&n.position.y===-.013).forEach(n=>{n.material.roughness=.65;n.material.opacity=.82;});
 let environmentTarget;
 if(renderer){const env=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);environmentTarget=pmrem.fromScene(env,.04);scene.environment=environmentTarget.texture;scene.environmentIntensity=.3;env.dispose();pmrem.dispose();}
 let moonKey;scene.traverse(n=>{if(n.isDirectionalLight&&!moonKey)moonKey=n;});moonKey.position.set(-18,28,15);moonKey.castShadow=true;moonKey.shadow.mapSize.set(2048,2048);Object.assign(moonKey.shadow.camera,{left:-23,right:23,top:23,bottom:-23,far:75});moonKey.shadow.bias=-.0004;moonKey.shadow.normalBias=.02;moonKey.shadow.radius=3;moonKey.shadow.autoUpdate=false;moonKey.shadow.needsUpdate=true;
 const interior=new THREE.Group();interior.name='pavilion-interior-lighting';scene.add(interior);
 for(const [x,z] of [[-5,-2],[5,-2],[-5,2],[5,2]]){const lamp=new THREE.PointLight(0xffcb88,95,14,2);lamp.position.set(x,2.65,z);interior.add(lamp);}
 for(const x of [-d.width/2+.35,d.width/2-.35])for(let z=-d.depth/2+.6;z<d.depth/2;z+=1.3)add(interior,new THREE.BoxGeometry(.025,2.8,.025),light(0xffcb88,1.4),x,1.4,z);
 model.materials.stone.emissive=new THREE.Color('#4b3522');model.materials.stone.emissiveIntensity=.12;
 const landscape=[[-14,6,5,2],[14,5,5,2],[-14,-10,5,2],[14,-9,5,2]];
 landscape.forEach(([x,z,w,depth],i)=>{planter(scene,x,z,w,depth);tree(scene,x,z,1.65,731+i);});
 const landscapeColliders=landscape.flatMap(([x,z,w,depth],i)=>[{id:'planter-'+i,type:'box',minX:x-w/2,maxX:x+w/2,minZ:z-depth/2,maxZ:z+depth/2},{id:'tree-'+i,type:'circle',x,z,radius:.18}]);
 for(const [i,x,z] of [[1,-10,10],[2,9,10],[3,-12,-3],[4,12,-3]])person(scene,x,z,40+i,Math.PI*.2,.98);
 add(scene,new THREE.SphereGeometry(.15,16,10),light(0xffe8b7,2),8,24,-48);
 const collisions=[{id:'floor-slab',type:'support-plane',height:0},...model.wallSegments,...landscapeColliders];
 for(const z of [-d.depth/2,d.depth/2])for(const x of [-1.26,1.26])collisions.push({id:'door-frame-'+x+'-'+z,type:'box',minX:x-.06,maxX:x+.06,minZ:z-.15,maxZ:z+.15});
 for(const [id,x,z] of d.slots)collisions.push({id:'pedestal-'+id,type:'box',minX:x-.8,maxX:x+.8,minZ:z-.8,maxZ:z+.8});
 if(kind==='hive')collisions.push({id:'touch-console',type:'box',minX:-6.3,maxX:-1.7,minZ:d.depth/2+2.2,maxZ:d.depth/2+3.8});
 const assets=createDisplayProps(model);model.runtime.colliders=collisions;
 const interiorBatching=kind==='facade'?batchEnvironment(interior,new Set()):null;
 const batching={interiorBatching,...model.root.userData.batching,...batchEnvironment(scene,new Set([model.root,mirror,interior]))};
 const position=kind==='facade'?[-10,3.8,23]:[16,3.7,22],target=[0,4.5,0];
 return {scene,model,batching,ready:model.ready,mirror,interior,moonKey,landscapeColliders,kind,cameraPosition:new THREE.Vector3(...position),target:new THREE.Vector3(...target),fov:43,
  cameraPresets:{display:{position,target,fov:43},spawn:{position:[0,1.65,d.depth/2+5],target:[0,1.65,0],fov:65}},
  title:kind==='facade'?'Let every point of light breathe.':'Ideas light people.',eyebrow:kind==='facade'?'CURVED DOT FACADE':'HIVE LAB · DIGITAL ART',lightsOn:true,
  update(time){model.uniforms.uTime.value=time;for(const slot of assets.assetSlots.values())if(slot.placeholder.visible)slot.placeholder.rotation.y=time*.3;},
  setLights(on){model.uniforms.uOn.value=on?1:0;interior.visible=on;for(const id of ['warm-reveal','interior-strips','plaza-lines'])model.parts.get(id).visible=on;},
  invalidateShadows(){moonKey.shadow.needsUpdate=true;},
  dispose(){environmentTarget?.dispose();}
 };
}
