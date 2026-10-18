// @ts-nocheck
// Adapted upstream scene source; see PROVENANCE.md.
import * as THREE from 'three';
import type {MaterialArchitectureModel} from './architectureMaterials';
import {perimeter} from './architectureGeometry';

export function addArchitectureRuntime(model:MaterialArchitectureModel){
 const pivots=Object.fromEntries(model.parts),sockets:Record<string,THREE.Object3D>={};
 for(const [id,p] of model.parts)if(id!=='root'){
  const socket=new THREE.Object3D();socket.name=id+':socket';const bounds=new THREE.Box3().setFromObject(p);bounds.getCenter(socket.position);p.add(socket);sockets[id]=socket;p.userData.restPosition=p.position.toArray();p.userData.destructionGroup=id;
 }
 const runtime={parts:pivots,pivots,sockets,colliders:[] as unknown[],destructionGroups:Object.fromEntries([...model.parts.keys()].filter(id=>id!=='root').map(id=>[id,[id]])),
  setExplode(amount:number){const f=THREE.MathUtils.clamp(amount,0,1);for(const [id,p] of model.parts){if(id==='root')continue;const rest=p.userData.restPosition as number[];const offset=p.userData.explodeOffset??=new THREE.Vector3(sockets[id].position.x,sockets[id].position.y-5,sockets[id].position.z);if(id==='dot-field'||id==='hex-panels')offset.copy(model.parts.get('upper-shell')!.userData.explodeOffset);if(offset.length()<.1)offset.set(0,1,0);p.position.set(rest[0]+offset.x*f*.45,rest[1]+offset.y*f*.45,rest[2]+offset.z*f*.45);}},
  pick(raycaster:THREE.Raycaster){return raycaster.intersectObject(model.root,true).find(hit=>hit.object.userData.componentId);}
 };
 const d=model.design,outer=perimeter(d),inner=perimeter(d,d.wallThickness),wallSegments=[];
 for(let i=0;i<outer.length;i++){const j=(i+1)%outer.length,a=outer[i],b=outer[j];if(Math.abs(Math.abs(a[0])-d.doorWidth/2)<1e-6&&Math.abs(a[0]+b[0])<1e-6)continue;
  const endpoint=(p:number[],inside:number[])=>{let x=(p[0]+inside[0])/2;const z=(p[1]+inside[1])/2;if(Math.abs(Math.abs(x)-d.doorWidth/2)<1e-6&&Math.abs(z)>d.depth/2-.31)x+=Math.sign(x)*d.wallThickness/2;return [x,z];};
  const ac=endpoint(a,inner[i]),bc=endpoint(b,inner[j]);wallSegments.push({id:'wall-'+i,type:'capsule',ax:ac[0],az:ac[1],bx:bc[0],bz:bc[1],radius:d.wallThickness/2});}
 model.root.userData.sculptRuntime=runtime;return {...model,runtime,wallSegments};
}
