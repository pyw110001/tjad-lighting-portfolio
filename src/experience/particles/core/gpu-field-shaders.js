import {wgslFn} from 'three/tsl';

// World units are CSS pixels on the camera's z=0 plane. All art is procedural.
// Apply the same deformation to particles, full-path filaments and light curtains.
// Forces alone are too weak when the next compute step re-anchors a particle to its path.
export const controlPath=wgslFn(`
fn control_path(point:vec3f,t:f32,size:vec2f,control:vec2f)->vec3f {
  let width=min(size.x,size.y);
  let gather=smoothstep(0.0,1.0,clamp(-control.x,0.0,1.0));
  let repel=smoothstep(0.0,1.0,clamp(control.x,0.0,1.0));
  let chaos=max(control.y,0.0);
  let calm=max(-control.y,0.0);
  var p=point;
  let q=p/width;
  let swirl=vec3f(sin(q.y*8.0+t*0.95)-cos(q.z*7.0-t*0.62),
    sin(q.z*7.5+t*0.78)-cos(q.x*8.0+t*0.69),
    sin(q.x*6.0-t*0.57)-cos(q.y*7.0+t*0.71));
  p+=swirl*width*0.105*chaos;
  p.z*=1.0-calm*0.60;
  let r=max(length(p.xy),0.001);
  let direction=select(vec2f(1.0,0.0),p.xy/r,r>0.01);
  let safe=select(136.0,114.0,size.x<=600.0);
  let orbit=safe+width*0.10*r/(r+width*0.5);
  var radius=mix(r,orbit,gather);
  radius=radius*(1.0+repel*0.20)+repel*width*(0.18+0.035*sin(t*1.3-r/width*5.0));
  // Compress/expand along the original direction. Orbital motion belongs to
  // local particle dynamics, never to a rotation of the scene coordinate frame.
  return vec3f(direction*radius,p.z*(1.0-gather*0.65));
}`);

export const fieldPath=wgslFn(`
fn field_path(seed:vec4f,t:f32,size:vec2f,weights:vec4f,control:vec2f)->vec3f {
  let u=seed.x;
  let band=floor(seed.y*3.0);
  let grain=fract(seed.y*3.0)*2.0-1.0;
  let spread=sign(grain)*pow(abs(grain),1.35)*(1.0+max(control.y,0.0)*1.75-max(-control.y,0.0)*0.65);
  let depth=sin(u*6.283+band*1.7+t*0.09)*0.065+(seed.z-0.5)*0.12;
  let width=min(size.x,size.y);
  let x=(u-0.5)*size.x*1.25;
  let driftY=sin(u*6.4+t*0.085+band*0.5)*0.15+(band-1.0)*0.195+(u-0.5)*0.13;
  let waveY=sin(u*6.6-t*0.095+band*1.20)*0.175+sin(u*13.5+band*0.6+t*0.07)*0.036+(1.0-band)*0.145;
  let fold=sin(u*19.0+band*1.8+t*0.14)*0.008;
  let drift=vec3f(x,(driftY+spread*0.062+fold)*size.y,depth*size.y);
  var aurora=vec3f(x,(waveY+spread*0.065+fold)*size.y,(depth+sin(u*11.0+band)*0.035)*size.y);
  let progress=u;
  let radius=(0.19+pow(progress,0.76)*0.71+spread*0.022)*width;
  let angle=band*2.094395+progress*3.7+t*0.17+spread*(0.22+progress*1.05)+sin(progress*11.0+t*0.12)*0.055;
  let vortex=vec3f(cos(angle)*radius,sin(angle)*radius*0.80,sin(angle)*radius*0.27+(seed.z-0.5)*width*0.075);
  let ring=floor(seed.y*4.0);
  let ringRadius=(0.65+ring*0.40)*width*0.34;
  let orbitAngle=u*6.283185+t*(0.10+ring*0.018);
  let ex=cos(orbitAngle)*(ringRadius+spread*width*0.012);
  let ey=sin(orbitAngle)*ringRadius*0.53;
  let orbit=vec3f(ex*0.966+ey*0.259,-ex*0.259+ey*0.966,sin(orbitAngle)*width*0.13+(seed.z-0.5)*width*0.035);
  var p=drift*weights.x+vortex*weights.y+aurora*weights.z+orbit*weights.w;
  if(seed.w>=0.09 && seed.w<0.22){
    let a=u*6.283185+t*0.17;
    let rr=(0.24+spread*0.018)*width;
    let annulus=vec3f(cos(a)*rr,sin(a)*rr*0.84,sin(a)*width*0.12);
    p=mix(p,annulus,weights.y);
  }
  // Local, continuous folds create small whirlpools within the larger light curtains.
  let waveWeight=weights.x+weights.z;
  for(var eddy=0u;eddy<2u;eddy++){
    let cu=select(0.23,0.77,eddy==1u);
    let cy=sin(cu*6.6-t*0.095+band*1.20)*0.175+sin(cu*13.5+band*0.6+t*0.07)*0.036+(1.0-band)*0.145;
    let center=vec2f((cu-0.5)*size.x*1.25,cy*size.y);
    let d=(p.xy-center)/width;
    let turn=(1.9+sin(t*0.11+band)*0.25+spread*0.7)*exp(-dot(d,d)/0.014)*select(1.0,-1.0,eddy==1u);
    let rotated=vec2f(d.x*cos(turn)-d.y*sin(turn),d.x*sin(turn)+d.y*cos(turn));
    p=vec3f(mix(p.xy,center+rotated*width,waveWeight),p.z);
  }
  // A small minority of violet light threads weave diagonally across the wave bands.
  if(seed.w>0.90 && (weights.x+weights.z)>0.01){
    let violet=vec3f(x,(0.43-u*0.87+spread*0.025+sin(u*9.0+t*0.1)*0.045)*size.y,depth*size.y-45.0);
    p=mix(p,violet,(weights.x+weights.z)*0.70);
  }
  // Very dim distant dust remains outside the main ribbons.
  if(seed.w<0.09){
    p=vec3f((seed.x-0.5)*size.x*1.3,(seed.y-0.5)*size.y*1.3,-size.y*0.18);
    p+=vec3f(sin(t*0.05+seed.z*40.0)*8.0,cos(t*0.04+seed.x*20.0)*6.0,0.0);
  }
  return control_path(p,t,size,control);
}`, [controlPath]);

export const fieldForce=wgslFn(`
fn field_force(p:vec3f,t:f32,size:vec2f,control:vec2f,pointer:vec4f)->vec3f {
  let r=max(length(p.xy),1.0);
  let radial=control.x*select(120.0,24.0,control.x<0.0)/(1.0+r/650.0);
  var force=vec3f(p.xy/r*radial,0.0);
  let safe=select(132.0,110.0,size.x<=600.0);
  let width=min(size.x,size.y);
  let orbital=max(-control.x,0.0)*(1.0-smoothstep(safe+width*0.30,safe+width*0.70,r));
  force+=vec3f(-p.y,p.x,0.0)/r*(orbital*28.0);
  if(control.x< -0.05 && r<safe){force+=vec3f(p.xy/r*(safe-r)*2.8,0.0);}
  // Analytic curl components each omit their own axis: smooth divergence-free eddies.
  let curl=vec3f(sin(p.y*0.014+t*0.21)-cos(p.z*0.019+t*0.10),
    sin(p.z*0.016+t*0.13)-cos(p.x*0.013-t*0.16),
    sin(p.x*0.011+t*0.15)-cos(p.y*0.015+t*0.12));
  force+=curl*(6.0+max(control.y,0.0)*110.0)*(1.0-max(-control.y,0.0)*0.96);
  let delta=pointer.xy-p.xy;
  let rr=dot(delta,delta);
  if(rr<50000.0 && pointer.z>0.001){
    let falloff=(1.0-rr/50000.0)*pointer.z;
    let direction=delta/(sqrt(rr)+8.0);
    let attract=select(-115.0,255.0,pointer.w>0.5);
    force+=vec3f((direction*attract+vec2f(-direction.y,direction.x)*80.0)*falloff,0.0);
  }
  return force;
}`);

export const particleColor=wgslFn(`
fn particle_color(seed:vec4f,mono:f32,energy:f32)->vec3f {
  var col=mix(vec3f(0.025,0.49,0.66),vec3f(0.08,0.27,0.92),smoothstep(0.25,0.75,seed.z));
  if(seed.y<0.34){col=vec3f(0.018,0.64,0.53);}
  if(seed.w>0.90){col=vec3f(0.33,0.16,0.70);}
  if(mono>0.5){col=vec3f(0.28,0.62,0.65);}
  let core=pow(seed.z,36.0);
  col=mix(col,vec3f(0.55,0.90,1.0),core*0.35);
  var brightness=(0.55+pow(seed.w,1.7)*0.60+core*2.5)*(0.38+0.62*pow(0.5+0.5*sin(seed.x*12.57+seed.y*3.0),2.0));
  if(seed.w<0.09){brightness*=0.36;}
  return col*brightness*(1.0+energy*0.25);
}`);

export const particleShape=wgslFn(`
fn particle_shape(st:vec2f)->f32 {
  let r=length(st-vec2f(0.5));
  return (exp(-r*r*65.0)+exp(-r*r*13.0)*0.12)*smoothstep(0.5,0.32,r);
}`);

export const strandPosition=wgslFn(`
fn strand_position(st:vec2f,id:f32,t:f32,size:vec2f,weights:vec4f,control:vec2f)->vec3f {
  let seed=vec4f(st.x,fract(id*0.6180339+0.13),fract(id*0.3819),0.10+fract(id*0.17+0.23)*0.90);
  let p=field_path(seed,t,size,weights,control);
  let q=field_path(vec4f(min(st.x+0.001,1.0),seed.yzw),t,size,weights,control);
  let normal=normalize(vec2f(-(q.y-p.y),q.x-p.x)+vec2f(0.0001));
  return p+vec3f(normal*st.y*(0.25+fract(id*0.31)*0.45),0.0);
}`, [fieldPath]);

export const curtainPosition=wgslFn(`
fn curtain_position(st:vec2f,band:f32,t:f32,size:vec2f,control:vec2f)->vec3f {
  let u=st.x;
  let wave=sin(u*6.6-t*0.095+band*1.20)*0.175+sin(u*13.5+band*0.6+t*0.07)*0.036+(1.0-band)*0.145;
  let breadth=1.0+max(control.y,0.0)*1.1-max(-control.y,0.0)*0.65;
  let y=(wave+st.y*0.09*breadth)*size.y;
  let z=(sin(u*6.283+band*1.7+t*0.09)*0.065+sin(u*11.0+band)*0.035+st.y*0.09)*size.y;
  return control_path(vec3f((u-0.5)*size.x*1.25,y,z),t,size,control);
}`, [controlPath]);

export const curtainOpacity=wgslFn(`
fn curtain_opacity(st:vec2f,t:f32,band:f32)->f32 {
  let edge=pow(max(0.0,1.0-abs(st.y)),2.5);
  let filament=pow(0.5+0.5*sin(st.x*380.0+sin(st.x*17.0+t*0.12)*9.0+band*2.0),8.0);
  let fold=0.35+0.65*pow(0.5+0.5*sin(st.x*18.0+band+t*0.08),2.0);
  return edge*fold*(0.07+filament*0.11);
}`);

export const compositeColor=wgslFn(`
fn composite_color(signal:vec3f,st:vec2f,size:vec2f,light:f32,mono:f32)->vec3f {
  // Grade the full scene so curtains, filaments, trails and bloom share one hue.
  let graded=mix(signal,vec3f(0.45,0.94,1.0)*dot(signal,vec3f(0.2126,0.7152,0.0722)),mono);
  let center=exp(-dot((st-0.5)*vec2f(1.1,1.0),(st-0.5)*vec2f(1.1,1.0))*4.0);
  let dark=mix(vec3f(0.0006,0.002,0.003),vec3f(0.002,0.008,0.010),center);
  let lens=select(110.0,90.0,size.x<=600.0);
  let calm=0.33+0.67*smoothstep(lens*0.8,lens*1.3,length((st-0.5)*size));
  if(light<0.5){return min(dark+graded*calm,vec3f(12.0));}
  let density=clamp(max(graded.x,max(graded.y,graded.z))*1.05,0.0,0.88);
  let violet=clamp((graded.x-graded.y*0.4)*2.5,0.0,1.0)*(1.0-mono);
  let ink=mix(vec3f(0.035,0.22,0.25),vec3f(0.19,0.11,0.28),violet);
  return mix(vec3f(0.87,0.91,0.89),ink,density);
}`);
