// @ts-nocheck
// Adapted upstream scene source; see PROVENANCE.md.
import * as THREE from 'three';
import type {ArchitectureModel} from './architectureGeometry';

/** Batch within each semantic component; retain closed span geometry and transparent sorting. */
export function optimizeArchitecture<T extends ArchitectureModel>(model:T):T {
 let before=0,after=0;
 for(const [id,part] of model.parts){
  if(id==='root')continue;
  const groups=new Map<THREE.Material,THREE.Mesh[]>();
  for(const child of [...part.children])if(child instanceof THREE.Mesh&&!(child instanceof THREE.InstancedMesh)&&!Array.isArray(child.material)){
   const list=groups.get(child.material)??[];list.push(child);groups.set(child.material,list);
  }
  for(const [material,meshes] of groups){
   before+=meshes.length;if(meshes.length<2){after+=meshes.length;continue;}
   const geometries=meshes.map(m=>m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone());
   const vertices=geometries.reduce((s,g)=>s+g.attributes.position.count,0);
   const batch=new THREE.BatchedMesh(meshes.length,vertices,0,material);
   batch.name=id+':batch';batch.userData.componentId=id;batch.castShadow=meshes[0].castShadow;batch.receiveShadow=meshes[0].receiveShadow;
   geometries.forEach((geometry,i)=>{meshes[i].updateMatrix();const instance=batch.addInstance(batch.addGeometry(geometry));batch.setMatrixAt(instance,meshes[i].matrix);});
   batch.computeBoundingBox();batch.computeBoundingSphere();part.add(batch);
   meshes.forEach(m=>{m.removeFromParent();m.geometry.dispose();});geometries.forEach(g=>g.dispose());after++;
  }
 }
 model.root.userData.batching={componentMeshesBefore:before,componentMeshesAfter:after};
 return model;
}
