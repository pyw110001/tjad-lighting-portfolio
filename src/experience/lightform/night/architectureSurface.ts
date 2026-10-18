// @ts-nocheck
// Adapted upstream scene source; see PROVENANCE.md.
import * as THREE from 'three';
import {perimeter} from './architectureGeometry';
import type {MaterialArchitectureModel} from './architectureMaterials';

export function addArchitectureSurface(model:MaterialArchitectureModel){
 const size=1024,data=new Uint8Array(size*size*4);
 for(let i=0;i<size*size;i++){const n=((Math.imul(i+731,1664525)^Math.imul(i>>>10,1013904223))>>>0)%256;data.set([n,n,n,255],i*4);}
 const micro=new THREE.DataTexture(data,size,size);micro.wrapS=micro.wrapT=THREE.RepeatWrapping;micro.repeat.set(2,2);micro.needsUpdate=true;model.textures.push(micro);
 model.materials.glass.bumpMap=micro;model.materials.glass.bumpScale=.0006;model.materials.glass.normalScale.set(.003,.003);model.materials.glass.needsUpdate=true;
 const stone=model.materials.stone,prior=stone.onBeforeCompile;
 stone.onBeforeCompile=(shader,renderer)=>{prior(shader,renderer);shader.vertexShader='varying vec3 tilePosition;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntilePosition=position;');shader.fragmentShader='varying vec3 tilePosition;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>\nvec2 tile=abs(fract(tilePosition.xz/1.2)-.5);float joint=smoothstep(.48,.495,max(tile.x,tile.y));roughnessFactor=max(.4,roughnessFactor+.06*joint);diffuseColor.rgb*=1.-.18*joint;`);};stone.customProgramCacheKey=()=>model.kind+'-stone-joints';stone.needsUpdate=true;
 if(model.kind==='facade'){
  const mesh=model.parts.get('dot-field')!.children[0] as THREE.Mesh,g=mesh.geometry,p=g.attributes.position,loop=perimeter(model.design);const uv:number[]=[],lengths:number[]=[0];
  for(let i=0;i<loop.length;i++)lengths.push(lengths[i]+Math.hypot(loop[(i+1)%loop.length][0]-loop[i][0],loop[(i+1)%loop.length][1]-loop[i][1]));
  // Each independent triangle projects to a single sampled perimeter segment; no wrap interpolation.
  for(let i=0;i<p.count;i+=3){const cx=(p.getX(i)+p.getX(i+1)+p.getX(i+2))/3,cz=(p.getZ(i)+p.getZ(i+1)+p.getZ(i+2))/3;let best=Infinity,segment=0;
   for(let j=0;j<loop.length;j++){const a=loop[j],b=loop[(j+1)%loop.length],dx=b[0]-a[0],dz=b[1]-a[1],t=THREE.MathUtils.clamp(((cx-a[0])*dx+(cz-a[1])*dz)/(dx*dx+dz*dz),0,1),dist=Math.hypot(cx-a[0]-dx*t,cz-a[1]-dz*t);if(dist<best){best=dist;segment=j;}}
   const a=loop[segment],b=loop[(segment+1)%loop.length],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
   for(let k=0;k<3;k++)uv.push(lengths[segment]+((p.getX(i+k)-a[0])*dx+(p.getZ(i+k)-a[1])*dz)/length,p.getY(i+k));
  }
  g.setAttribute('emitterPosition',new THREE.Float32BufferAttribute(uv,2));
  model.emitterMaterial.vertexShader='attribute vec2 emitterPosition;varying vec2 lattice;\n'+model.emitterMaterial.vertexShader.replace('p=position;','p=position;lattice=emitterPosition;');
  model.emitterMaterial.fragmentShader='varying vec2 lattice;\n'+model.emitterMaterial.fragmentShader.replace('vec2 grid=vec2(u*6.8,p.y*6.8);','vec2 grid=lattice*6.8;');model.emitterMaterial.needsUpdate=true;
 }else{
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;const c=canvas.getContext('2d')!;c.fillStyle='#07192a';c.fillRect(0,0,1024,512);c.strokeStyle='#20dbf4';c.lineWidth=2;
  for(let x=100;x<980;x+=90)for(let y=80;y<450;y+=80){c.beginPath();for(let i=0;i<6;i++){const a=Math.PI*i/3;c.lineTo(x+Math.cos(a)*42,y+Math.sin(a)*42);}c.closePath();c.stroke();}
  c.fillStyle='#e7b670';c.font='32px sans-serif';c.fillText('HIVE LAB / LIGHT ATLAS',40,45);c.font='18px sans-serif';c.fillText('Touch light. Explore the city.',40,490);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;model.textures.push(map);const screen=new THREE.MeshBasicMaterial({map,toneMapped:false});
  const panel=model.element(model.parts.get('touch-console')!,new THREE.BoxGeometry(4.2,.04,1.35),screen,-4,1.16,model.design.depth/2+3);panel.rotation.x=.18;
 }
 return model;
}
