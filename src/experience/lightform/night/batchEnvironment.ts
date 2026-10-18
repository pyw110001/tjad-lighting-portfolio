// @ts-nocheck
// Adapted upstream scene source; see PROVENANCE.md.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
/** Bake only static city/landscape transforms; gallery parts keep their IDs and pivots. */
export function batchEnvironment(scene,exclude){
  scene.updateMatrixWorld(true);const groups=new Map();
  scene.traverse(node=>{
    if(!node.isMesh||node.isInstancedMesh||node.isReflector||Array.isArray(node.material)||node.material.isShaderMaterial)return;
    for(let parent=node;parent;parent=parent.parent)if(exclude.has(parent))return;
    const m=node.material,key=JSON.stringify([m.type,m.color?.getHex(),m.emissive?.getHex(),m.emissiveIntensity,m.roughness,m.metalness,m.map?.uuid,m.bumpMap?.uuid,m.bumpScale,m.transparent,m.opacity,m.side,m.depthWrite,m.toneMapped,node.castShadow,node.receiveShadow]);
    if(!groups.has(key))groups.set(key,[]);groups.get(key).push(node);
  });
  const retired=scene.userData.retiredResources??={geometries:new Set(),materials:new Set()};
  let before=0,after=0;
  for(const meshes of groups.values()){
    before+=meshes.length;after++;if(meshes.length<2)continue;
    const geometries=meshes.map(n=>{const g=n.geometry.clone().applyMatrix4(n.matrixWorld);if(!g.index)return g;const expanded=g.toNonIndexed();g.dispose();return expanded;});
    const geometry=mergeGeometries(geometries,false);if(!geometry){after+=meshes.length-1;continue;}
    geometry.computeBoundingSphere();const mesh=new THREE.Mesh(geometry,meshes[0].material);mesh.name='city-static-batch-'+after;mesh.castShadow=meshes[0].castShadow;mesh.receiveShadow=meshes[0].receiveShadow;scene.add(mesh);meshes.forEach(n=>{retired.geometries.add(n.geometry);if(n.material!==meshes[0].material)retired.materials.add(n.material);n.removeFromParent();});geometries.forEach(g=>g.dispose());
  }
  return {staticMeshesBefore:before,staticMeshesAfter:after};
}
