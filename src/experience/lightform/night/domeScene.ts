// @ts-nocheck
// Adapted upstream scene source; see PROVENANCE.md.
import * as THREE from 'three';
import {batchEnvironment} from './batchEnvironment.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import {createDisplayProps} from './displayProps';
import { createDomeModel } from './createDomeModel.ts';
import { createEnvironment, tree, planter, add, light, matte } from './urbanEnvironment.js';

/** Meter-scale enterable pavilion. Photo exterior; designed hidden interior. */
export function createDomeScene(renderer) {
  const {scene,mirror}=createEnvironment(260106);
  // Stone keeps a broad soft reflection rather than a plastic mirror highlight.
  scene.children.filter(n=>n.isMesh&&n.geometry.type==='PlaneGeometry'&&n.position.y===-.013).forEach(n=>{n.material.roughness=.65;n.material.opacity=.82;});
  const model=createDomeModel();scene.add(model.root);
  let environmentTarget;
  if(renderer){const env=new RoomEnvironment();const pmrem=new THREE.PMREMGenerator(renderer);environmentTarget=pmrem.fromScene(env,.04);scene.environment=environmentTarget.texture;scene.environmentIntensity=.3;env.dispose();pmrem.dispose();}
  let moonKey;scene.traverse(n=>{if(n.isDirectionalLight&&!moonKey)moonKey=n;});
  moonKey.position.set(-18,28,15);moonKey.castShadow=true;moonKey.shadow.mapSize.set(2048,2048);moonKey.shadow.camera.left=-23;moonKey.shadow.camera.right=23;moonKey.shadow.camera.top=23;moonKey.shadow.camera.bottom=-23;moonKey.shadow.camera.far=75;moonKey.shadow.bias=-.0004;moonKey.shadow.normalBias=.02;moonKey.shadow.radius=3;moonKey.shadow.autoUpdate=false;moonKey.shadow.needsUpdate=true;
  add(scene,new THREE.SphereGeometry(.15,16,10),light(0xffe8b7,2),8,24,-48);
  const interior=new THREE.Group();interior.name='gallery-lighting';scene.add(interior);
  const ring=add(interior,new THREE.TorusGeometry(9.36,.018,6,128),light(0xffcf91,1.3),0,2.62,0);ring.rotation.x=Math.PI/2;
  for(const [x,z] of [[-4,-4],[4,-4],[-4,4],[4,4]]){const lamp=new THREE.PointLight(0xffcb88,95,16,2);lamp.position.set(x,2.45,z);interior.add(lamp);}
  const stripMaterial=light(0xffc992,1.4),stripTransforms=[];
  for(let i=0;i<32;i++){const a=i*Math.PI/16,x=9.43*Math.sin(a),z=9.43*Math.cos(a);if(Math.abs(x)>=1.5)stripTransforms.push([x,z]);}
  const strips=new THREE.InstancedMesh(new THREE.BoxGeometry(.025,2.4,.025),stripMaterial,stripTransforms.length),transform=new THREE.Object3D();strips.name='interior-light-strips';
  stripTransforms.forEach(([x,z],i)=>{transform.position.set(x,1.2,z);transform.updateMatrix();strips.setMatrixAt(i,transform.matrix);});interior.add(strips);
  // Three-dimensional structural floor and pedestals receive local light.
  const stone=model.materials.stoneMaterial;stone.emissive=new THREE.Color('#4b3522');stone.emissiveIntensity=.14;
  const landscape=[[-15,7,6,2],[15,5,6,2],[-14,-10,5,2],[14,-9,5,2]];
  for(let i=0;i<landscape.length;i++){const [x,z,w,d]=landscape[i];planter(scene,x,z,w,d);tree(scene,x,z,1.7,731+i);}
  const wallColliders=landscape.map(([x,z,w,d],i)=>({id:'planter-'+i,type:'box',minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2}));
  const treeColliders=landscape.map(([x,z],i)=>({id:'tree-'+i,type:'circle',x,z,radius:.18}));
  const batching=batchEnvironment(scene,new Set([model.root,interior,mirror]));
  const collisions=[];
  const assets=createDisplayProps(model);model.runtime.colliders=collisions;
  return {scene,model,collisions,batching,invalidateShadows(){moonKey.shadow.needsUpdate=true;},ready:model.ready,mirror,cameraPosition:new THREE.Vector3(0,6.7,32),target:new THREE.Vector3(0,5.0,0),fov:43,
    cameraPresets:{display:{position:[0,6.7,32],target:[0,5,0],fov:43},spawn:{position:[0,1.65,14],target:[0,1.65,0],fov:65}},
    landscapeColliders:[...wallColliders,...treeColliders],
    title:'A city of light. A space to explore.',eyebrow:'CITY DOME · DIGITAL ART',
    update(time){for(const slot of assets.assetSlots.values())if(slot.placeholder.visible)slot.placeholder.rotation.y=time*.3;},setLights(on){model.materials.dotMaterial.uniforms.uOn.value=on?1:0;model.materials.amberMaterial.visible=on;model.parts.get('plaza-ring').visible=on;interior.visible=on;},lightsOn:true,dispose(){environmentTarget?.dispose();}};
}
