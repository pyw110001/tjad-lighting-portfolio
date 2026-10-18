export const PRESETS = Object.freeze({drift:'漂流',vortex:'旋涡',aurora:'极光',orbit:'星轨'});
export const PRESET_KEYS = Object.keys(PRESETS);
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const mix = (a, b, t) => a + (b - a) * t;
export const smooth = t => t * t * (3 - 2 * t);

// Continuous, deterministic value noise; sampled on a shared grid, not per particle.
function hash(x, y) {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
export function noise(x, y) {
  const ix=Math.floor(x), iy=Math.floor(y), tx=smooth(x-ix), ty=smooth(y-iy);
  return mix(mix(hash(ix,iy),hash(ix+1,iy),tx),mix(hash(ix,iy+1),hash(ix+1,iy+1),tx),ty);
}
export function projectControl(x, y) {
  const length=Math.hypot(x,y);
  return length>1 ? {x:x/length,y:y/length} : {x,y};
}
export function guideY(preset, x, w, h, time, band=0) {
  const u=x/w;
  if(preset==='aurora') return h*(.47+Math.sin(u*5.6+time*.07)*.13+Math.sin(u*11-time*.05)*.025+band*.14);
  return h*(.31+u*.25+Math.sin(u*6.1+time*.06)*.14+band*.18);
}

export function samplePreset(preset,x,y,w,h,time) {
  const dx=x-w/2, dy=y-h/2, r=Math.max(1,Math.hypot(dx,dy));
  const scale=clamp(Math.min(w,h)/700,.65,1.35);
  if(preset==='vortex') {
    const angle=Math.atan2(dy,dx);
    const speed=(68+26*Math.sin(r*.006-time*.12))*scale;
    const radial=r<140*scale ? (140*scale-r)*1.25 : -12-8*Math.sin(angle*3-time*.15);
    return [-dy/r*speed+dx/r*radial,dx/r*speed+dy/r*radial];
  }
  if(preset==='orbit') {
    const c=.966,s=-.259, ex=dx*c+dy*s, ey=(-dx*s+dy*c)/.53;
    const er=Math.max(1,Math.hypot(ex,ey)), base=Math.min(w,h)*.34;
    const ring=[.65,1.03,1.43,1.85].reduce((a,b)=>Math.abs(er/base-a)<Math.abs(er/base-b)?a:b);
    const pull=clamp((ring*base-er)*.45,-80,80);
    const tx=-ey/er*60*scale+ex/er*pull,ty=(ex/er*60*scale+ey/er*pull)*.53;
    return [tx*c-ty*s,tx*s+ty*c];
  }
  const n=noise(x*.0025+time*.02,y*.0025-time*.015)-.5;
  let target=guideY(preset,x,w,h,time,-1);
  for(const band of [0,1]) {
    const candidate=guideY(preset,x,w,h,time,band);
    if(Math.abs(candidate-y)<Math.abs(target-y)) target=candidate;
  }
  const u=x/w;
  const slope=preset==='aurora'
    ? h/w*(Math.cos(u*5.6+time*.07)*.728+Math.cos(u*11-time*.05)*.275)
    : h/w*(.25+Math.cos(u*6.1+time*.06)*.854);
  let vx=(preset==='aurora'?53:39)*scale;
  let vy=slope*vx+clamp((target-y)*.33,-45,45)+n*23;
  // Potential flow around a cylinder gives the central lens breathing space.
  const radius=Math.min(w,h)<500?112:139;
  const rr=Math.max(r*r,radius*radius*.65), obstacle=radius*radius/rr;
  vx+=vx*obstacle*(dy*dy-dx*dx)/rr;
  vy-=52*scale*obstacle*(2*dx*dy)/rr;
  return [vx+n*14,vy];
}
