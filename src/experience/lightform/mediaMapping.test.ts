import { describe, expect, it } from 'vitest';
import { containTransform, mapMediaPoint, mediaTransform, mirroredHemisphereU } from './mediaMapping';
import { bindNightSurfaces, type NativeNightScene } from './nightSurfaces';
import * as THREE from 'three';

const centered = { offset: 0, vertical: 0 };
describe('complete media and matching interaction coordinates', () => {
  it('contains a landscape image on a much wider perimeter without cropping its edges', () => {
    const scale = containTransform(8, 2);
    expect(scale).toEqual({ x: 4, y: 1 });
    expect(mapMediaPoint(.375, 0, 8, 2, centered)).toEqual({ u: 0, v: 0 });
    expect(mapMediaPoint(.625, 1, 8, 2, centered)).toEqual({ u: 1, v: 1 });
    expect(mapMediaPoint(.2, .5, 8, 2, centered)).toBeNull();
  });
  it('contains portrait media and rejects interaction in dark margins', () => {
    expect(containTransform(1, .5)).toEqual({ x: 2, y: 1 });
    expect(mapMediaPoint(.1, .5, 1, .5, centered)).toBeNull();
    expect(mapMediaPoint(.25, .5, 1, .5, centered)).toEqual({ u: 0, v: .5 });
  });
  it('letterboxes vertically on a tall surface and keeps top/bottom orientation', () => {
    expect(mapMediaPoint(0, .25, 1, 2, centered)).toEqual({ u: 0, v: 0 });
    expect(mapMediaPoint(1, .75, 1, 2, centered)).toEqual({ u: 1, v: 1 });
    expect(mapMediaPoint(.5, .9, 1, 2, centered)).toBeNull();
  });
  it('applies the same offsets to rendering and input; returning to zero restores complete media', () => {
    expect(mapMediaPoint(.6, .3, 1, 1, { offset: 10, vertical: -20 })).toEqual({ u: .5, v: .5 });
    expect(mapMediaPoint(0, 0, 1, 1, centered)).toEqual({ u: 0, v: 0 });
  });
  it('stretches fluid media and interaction to every edge for any input aspect', () => {
    expect(mediaTransform(8, .6, 'stretch')).toEqual({ x: 1, y: 1 });
    expect(mapMediaPoint(0, 0, 8, .6, centered, 'stretch')).toEqual({ u: 0, v: 0 });
    expect(mapMediaPoint(1, 1, 8, .6, centered, 'stretch')).toEqual({ u: 1, v: 1 });
  });
  it('folds the rear hemisphere into the same UVs as the mirrored front', () => {
    expect(mirroredHemisphereU(.25)).toBeCloseTo(0);
    expect(mirroredHemisphereU(.75)).toBeCloseTo(1);
    expect(mirroredHemisphereU(0)).toBeCloseTo(.5);
    for (const longitude of [.28, .35, .5, .65, .72]) {
      expect(mirroredHemisphereU(longitude)).toBeCloseTo(mirroredHemisphereU((.5 - longitude + 1) % 1));
    }
  });
});

describe('physical media surfaces', () => {
  it('dome media is outer hemisphere only and both front/rear centers show the image center', () => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(10), new THREE.MeshBasicMaterial());
    const group = new THREE.Group(); group.add(mesh);
    const native: NativeNightScene = { scene: new THREE.Scene(), cameraPosition: new THREE.Vector3(0, 7, 32), target: new THREE.Vector3(0, 5, 0), model: { parts: new Map([['dot-field', group]]) } };
    const { surfaces } = bindNightSurfaces('dome', native), geometry = surfaces[0].geometry;
    const p = geometry.attributes.position, uv = geometry.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      expect(p.getY(i)).toBeGreaterThanOrEqual(-1e-6);
      expect(Math.hypot(p.getX(i), p.getY(i), p.getZ(i))).toBeCloseTo(10, 4);
      if (Math.abs(p.getX(i)) < 1e-5 && Math.abs(p.getZ(i)) > 5) expect(uv.getX(i)).toBeCloseTo(.5, 4);
    }
    geometry.dispose(); surfaces[0].material.dispose(); mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose();
  });
  it('the autonomous plaza has no media geometry or hit target', () => {
    const scene = new THREE.Scene();
    const result = bindNightSurfaces('field', { scene, cameraPosition: new THREE.Vector3(), target: new THREE.Vector3() });
    expect(result.surfaces).toEqual([]);
  });
});
