import { describe, it, expect } from 'vitest';
import { mapPhotoSurface } from './mapping';

describe('fixed architectural photo mapping',()=>{
  it('keeps sky, glass lobbies and the outside silhouette out of the display',()=>{
    for(const [scene,x,y] of [['collins',1025,20],['collins',1025,700],['facade',1100,700],['sphere',959,250],['sphere',959,680],['sphere',650,450]] as const){
      expect(mapPhotoSurface(scene,x,y)).toBeNull();
    }
  });
  it('maps the apex and both tower faces continuously at their shared corner',()=>{
    const left=mapPhotoSurface('collins',1024.99,420)!,right=mapPhotoSurface('collins',1025.01,420)!;
    expect(left.u).toBeCloseTo(.5,3);expect(right.u).toBeCloseTo(.5,3);expect(left.v).toBeCloseTo(right.v,3);
    expect(mapPhotoSurface('collins',1025,40)!.v).toBeLessThan(.02);
    expect(mapPhotoSurface('collins',1025,660)!.v).toBeGreaterThan(.99);
  });
  it('uses a single continuous front hemisphere with correct vertical orientation',()=>{
    const left=mapPhotoSurface('sphere',958.9,530)!,right=mapPhotoSurface('sphere',959.1,530)!;
    expect(left.u).toBeCloseTo(.5,3);expect(right.u).toBeCloseTo(.5,3);expect(left.v).toBeCloseTo(right.v,5);
    expect(mapPhotoSurface('sphere',959,455)!.v).toBeLessThan(mapPhotoSurface('sphere',959,635)!.v);
    expect(mapPhotoSurface('sphere',700,550)!.u).toBeLessThan(.2);
    expect(mapPhotoSurface('sphere',1220,550)!.u).toBeGreaterThan(.8);
  });
  it('maps media and pointer hits all the way from the crown to the lobby edge',()=>{
    const crown=mapPhotoSurface('sphere',959,263.5)!,upper=mapPhotoSurface('sphere',959,310)!,bottom=mapPhotoSurface('sphere',959,643.5)!;
    expect(crown.u).toBeCloseTo(.5,5);expect(crown.v).toBeLessThan(.035);
    expect(upper.v).toBeGreaterThan(crown.v);expect(upper.v).toBeLessThan(.32);
    expect(bottom.v).toBeGreaterThan(.99);
    expect(mapPhotoSurface('sphere',800,290)).toBeNull();
  });
});
