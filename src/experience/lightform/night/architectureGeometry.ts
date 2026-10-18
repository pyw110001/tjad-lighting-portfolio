// @ts-nocheck
// Adapted upstream scene source; see PROVENANCE.md.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export type GalleryDesign={width:number;depth:number;height:number;lowHeight:number;leftHeight?:number;roofBackDrop?:number;lobbyHeight:number;wallThickness:number;cornerRadius:number;doorWidth:number;doorHeight:number;slots:(string|number)[][];seed:number};
export type BuildingSpec={galleryDesign:GalleryDesign;componentTree:{id:string;actionProfile:unknown}[]};
export type Point=[number,number];

/** Matched inner/outer loops, with exact portal endpoints on both straight walls. */
export function perimeter(d:GalleryDesign,inset=0):Point[]{
 const w=d.width/2-inset,z=d.depth/2-inset,r=Math.max(0,d.cornerRadius-inset),h=d.doorWidth/2,points:Point[]=[];
 const push=(x:number,z:number)=>{if(!points.length||Math.hypot(points.at(-1)![0]-x,points.at(-1)![1]-z)>1e-7)points.push([x,z]);};
 push(-w+r,z);push(-h,z);push(h,z);push(w-r,z);
 const arc=(cx:number,cz:number,start:number)=>{for(let i=1;i<=12;i++){const a=start-i*Math.PI/24;push(cx+r*Math.cos(a),cz+r*Math.sin(a));}};
 if(r)arc(w-r,z-r,Math.PI/2);else push(w,z);
 push(w,-z+r);if(r)arc(w-r,-z+r,0);else push(w,-z);
 push(h,-z);push(-h,-z);push(-w+r,-z);if(r)arc(-w+r,-z+r,-Math.PI/2);else push(-w,-z);
 push(-w,z-r);if(r)arc(-w+r,z-r,-Math.PI);else push(-w,z);
 if(Math.hypot(points.at(-1)![0]-points[0][0],points.at(-1)![1]-points[0][1])<1e-7)points.pop();return points;
}
export function polygonGeometry(points:Point[],height:number){
 const shape=new THREE.Shape(points.map(([x,z])=>new THREE.Vector2(x,-z)));
 const geo=new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,curveSegments:12});geo.rotateX(-Math.PI/2);return geo;
}
export function roofHeight(d:GalleryDesign,x:number,z=0){return THREE.MathUtils.lerp(d.leftHeight??d.height,d.lowHeight,(x+d.width/2)/d.width)-(d.roofBackDrop??0)*(d.depth/2-z)/d.depth;}
export function wallGeometry(outer:Point[],inner:Point[],bottom:number,top:(x:number,z:number)=>number){
 const points:Point[]=[...outer,...inner.slice().reverse()];const geo=polygonGeometry(points,1),p=geo.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i);p.setY(i,bottom+p.getY(i)*(top(x,p.getZ(i))-bottom));}p.needsUpdate=true;geo.computeVertexNormals();return geo;
}
export function ringGeometry(d:GalleryDesign,bottom:number,top:(x:number,z:number)=>number){
 const outer=perimeter(d),inner=perimeter(d,d.wallThickness),shape=new THREE.Shape(outer.map(([x,z])=>new THREE.Vector2(x,-z)));
 shape.holes.push(new THREE.Path(inner.slice().reverse().map(([x,z])=>new THREE.Vector2(x,-z))));
 const geo=new THREE.ExtrudeGeometry(shape,{depth:1,bevelEnabled:false});geo.rotateX(-Math.PI/2);const p=geo.attributes.position;
 for(let i=0;i<p.count;i++)p.setY(i,bottom+p.getY(i)*(top(p.getX(i),p.getZ(i))-bottom));geo.computeVertexNormals();return geo;
}

export function createArchitectureBlockout(spec:BuildingSpec,kind:'facade'|'hive'){
 const d=spec.galleryDesign,root=new THREE.Group();root.name=kind+'-root';const parts=new Map<string,THREE.Group>();parts.set('root',root);
 const metal=new THREE.MeshStandardMaterial({color:'#132036',roughness:.6,metalness:.2});
 const stone=new THREE.MeshStandardMaterial({color:'#777c86',roughness:.65});
 const glass=new THREE.MeshPhysicalMaterial({color:'#c6b38d',roughness:.4,clearcoat:.12,clearcoatRoughness:.4,transparent:true,opacity:.22,side:THREE.DoubleSide,depthWrite:false});
 function assembly(id:string){const p=new THREE.Group();p.name=id;p.userData={componentId:id,actionProfile:spec.componentTree.find(c=>c.id===id)?.actionProfile};parts.set(id,p);root.add(p);return p;}
 function element(group:THREE.Group,geometry:THREE.BufferGeometry,material:THREE.Material,x=0,y=0,z=0){
  const mesh=new THREE.Mesh(geometry,material);mesh.name=group.name+':'+group.children.length;mesh.userData.componentId=group.name;mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;
 }
 element(assembly('upper-shell'),ringGeometry(d,d.lobbyHeight,(x,z)=>roofHeight(d,x,z)-.12),metal);
 const roof=polygonGeometry(perimeter(d),.18),rp=roof.attributes.position;for(let i=0;i<rp.count;i++)rp.setY(i,roofHeight(d,rp.getX(i),rp.getZ(i))-.18+rp.getY(i));roof.computeVertexNormals();element(assembly('roof-cap'),roof,metal);
 element(assembly('floor-slab'),polygonGeometry(perimeter(d),.12),stone,0,-.12);
 element(assembly('glass-enclosure'),ringGeometry(d,0,()=>d.lobbyHeight),glass);
 return {root,parts,assembly,element,design:d,ready:Promise.resolve(),materials:{metal,stone,glass},kind};
}

export type ArchitectureModel=ReturnType<typeof createArchitectureBlockout>;
/** Real portal cuts, closed skins, and manufactured perimeter detail. */
export function addArchitectureStructure(model:ArchitectureModel){
 const {design:d,assembly,element,materials:m,parts}=model,outer=perimeter(d),inner=perimeter(d,d.wallThickness);
 const glazing=parts.get('glass-enclosure')!;glazing.children.forEach(n=>{if(n instanceof THREE.Mesh)n.geometry.dispose();});glazing.clear();
 for(let i=0;i<outer.length;i++){
  const j=(i+1)%outer.length,a=outer[i],b=outer[j];const portal=Math.abs(a[0]+d.doorWidth/2)<1e-6&&Math.abs(b[0]-d.doorWidth/2)<1e-6||Math.abs(a[0]-d.doorWidth/2)<1e-6&&Math.abs(b[0]+d.doorWidth/2)<1e-6;
  element(glazing,wallGeometry([a,b],[inner[i],inner[j]],portal?d.doorHeight:0,()=>d.lobbyHeight),m.glass);
 }
 element(assembly('ceiling'),polygonGeometry(inner,.12),m.stone,0,d.lobbyHeight-.12);
 element(assembly('perimeter-trim'),ringGeometry(d,d.lobbyHeight-.06,()=>d.lobbyHeight+.06),m.metal);
 const placements:{x:number;z:number;y:number;angle:number;height:number}[]=[];
 for(let i=0;i<outer.length;i++){
  const a=outer[i],b=outer[(i+1)%outer.length],distance=Math.hypot(b[0]-a[0],b[1]-a[1]),count=Math.ceil(distance/1.0);
  for(let k=0;k<count;k++){const t=k/count,x=THREE.MathUtils.lerp(a[0],b[0],t),z=THREE.MathUtils.lerp(a[1],b[1],t);if(Math.abs(x)<1.32&&Math.abs(z)>d.depth/2-.01)continue;
   placements.push({x,z,y:d.lobbyHeight/2,angle:-Math.atan2(b[1]-a[1],b[0]-a[0]),height:d.lobbyHeight});}
 }
 function instances(id:string,geometry:THREE.BufferGeometry,transforms:typeof placements){
  const group=assembly(id),mesh=new THREE.InstancedMesh(geometry,m.metal,transforms.length),obj=new THREE.Object3D();
  transforms.forEach((p,i)=>{obj.position.set(p.x,p.y,p.z);obj.rotation.y=p.angle;obj.scale.set(1,p.height,1);obj.updateMatrix();mesh.setMatrixAt(i,obj.matrix);});mesh.name=id+':instances';mesh.userData.componentId=id;mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return group;
 }
 instances('mullions',new THREE.BoxGeometry(.065,1,.3),placements);
 instances('panel-seams',new THREE.BoxGeometry(.018,1,.018),placements.map(p=>({...p,y:(d.lobbyHeight+roofHeight(d,p.x,p.z)-.13)/2,height:roofHeight(d,p.x,p.z)-d.lobbyHeight-.13})));
 for(const [id,z] of [['door-front',d.depth/2],['door-rear',-d.depth/2]] as const){const door=assembly(id);for(const x of [-1.26,1.26])element(door,new THREE.BoxGeometry(.12,2.4,.3),m.metal,x,1.2,z);element(door,new THREE.BoxGeometry(2.64,.12,.3),m.metal,0,2.46,z);}
 const reveal=assembly('warm-reveal');element(reveal,ringGeometry({...d,wallThickness:.04},3.02,()=>3.045),m.metal);
 const strips=assembly('interior-strips');for(let x=-7;x<=7;x+=2)element(strips,new THREE.BoxGeometry(.025,.018,d.depth-.8),m.metal,x,3.06,0);
 const plaza=assembly('plaza-lines');for(const x of [-12.4,12.4])element(plaza,new THREE.BoxGeometry(.026,.012,d.depth+6),m.metal,x,.012,0);
 for(const [id,x,z] of d.slots)element(assembly('pedestal-'+id),new THREE.BoxGeometry(1.6,.8,1.6),m.stone,Number(x),.4,Number(z));
 assembly(model.kind==='facade'?'dot-field':'hex-panels');
 if(model.kind==='hive')element(assembly('touch-console'),new THREE.BoxGeometry(4.6,1.12,1.6),m.metal,-4,.56,d.depth/2+3);
 return model;
}

function clip(poly:Point[],inside:(p:Point)=>number):Point[]{
 const out:Point[]=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],fa=inside(a),fb=inside(b);if(fa>=0)out.push(a);if((fa>=0)!==(fb>=0)){const t=fa/(fa-fb);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}}return out;
}
/** Closed manufactured hex plates. Clipped to the actual raked roof, with physical gaps. */
function hexRelief(model:ArchitectureModel){
 const {design:d}=model,geometries:THREE.BufferGeometry[]=[];
 for(const side of [0,1,2,3]){
  const width=side%2?d.depth:d.width,r=1.15,top=(x:number)=>side===0?roofHeight(d,x,d.depth/2)-.14:side===1?roofHeight(d,d.width/2,-x)-.14:side===2?roofHeight(d,-x,-d.depth/2)-.14:roofHeight(d,-d.width/2,x)-.14;
  for(let col=-1;col<=Math.ceil(width/(r*1.5))+1;col++)for(let row=-1;row<6;row++){
   const cx=-width/2+col*r*1.5,cy=d.lobbyHeight+row*Math.sqrt(3)*r+(col%2)*Math.sqrt(3)*r/2;
   let p:Point[]=Array.from({length:6},(_,k)=>[cx+Math.cos(k*Math.PI/3)*(r-.045),cy+Math.sin(k*Math.PI/3)*(r-.045)]);
   for(const predicate of [(p:Point)=>p[0]+width/2-.09,(p:Point)=>width/2-.09-p[0],(p:Point)=>p[1]-d.lobbyHeight-.035,(p:Point)=>top(p[0])-p[1]])p=clip(p,predicate);
   if(p.length<3)continue;
   const shape=new THREE.Shape(p.map(v=>new THREE.Vector2(...v))),g=new THREE.ExtrudeGeometry(shape,{depth:.045,bevelEnabled:true,bevelSize:.006,bevelThickness:.006,bevelSegments:1,steps:1}),n=g.attributes.normal,info:number[]=[],face:number[]=[],screen:number[]=[];
   const seed=(col+2)*73+(row+2)*37+side*107,active=seed%11>=2?1:0,family=side===0?(cx<d.width*.1?0:1):side===1?1:side===2?(cx<0?1:0):0;
   for(let i=0;i<n.count;i++){info.push(seed,family,active,side);face.push(n.getZ(i)>.99?1:0);screen.push(g.attributes.position.getX(i),g.attributes.position.getY(i));}
   g.setAttribute('panelInfo',new THREE.Float32BufferAttribute(info,4));g.setAttribute('emitter',new THREE.Float32BufferAttribute(face,1));g.setAttribute('screenPosition',new THREE.Float32BufferAttribute(screen,2));
   g.rotateY(side*Math.PI/2);g.translate(side===1?d.width/2+.012:side===3?-d.width/2-.012:0,0,side===0?d.depth/2+.012:side===2?-d.depth/2-.012:0);geometries.push(g);
  }
 }
 const merged=mergeGeometries(geometries,false)!;geometries.forEach(g=>g.dispose());const mesh=model.element(model.parts.get('hex-panels')!,merged,model.materials.metal);mesh.userData.explodeWithParent=true;
}
export function addArchitectureForm(model:ArchitectureModel){
 for(const [id,part] of model.parts)if(id.startsWith('pedestal-')||id.startsWith('door-'))part.traverse(n=>{if(n instanceof THREE.Mesh&&n.geometry.type==='BoxGeometry'){n.geometry.computeBoundingBox();const size=n.geometry.boundingBox!.getSize(new THREE.Vector3());n.geometry.dispose();n.geometry=new RoundedBoxGeometry(size.x,size.y,size.z,2,.012);}});
 if(model.kind==='facade'){
 const points=perimeter(model.design,.04).map(([x,z])=>new THREE.Vector3(x,roofHeight(model.design,x,z)-.035,z));
 const rims=points.map((p,i)=>new THREE.TubeGeometry(new THREE.LineCurve3(p,points[(i+1)%points.length]),1,.014,5,false));
 model.element(model.parts.get('roof-cap')!,mergeGeometries(rims,false)!,model.materials.metal);rims.forEach(g=>g.dispose());
 }else{
 const rim=ringGeometry({...model.design,wallThickness:.045},0,()=>.025),positions=rim.attributes.position;
 for(let i=0;i<positions.count;i++)positions.setY(i,positions.getY(i)+roofHeight(model.design,positions.getX(i),positions.getZ(i))-.04);
 rim.computeVertexNormals();model.element(model.parts.get('roof-cap')!,rim,model.materials.metal);
 }
 if(model.kind==='hive')hexRelief(model);return model;
}
