import * as THREE from 'three';

/** Preserve the source display sculptures without bringing in model loading or roaming. */
export function createDisplayProps(model: { design?: { slots: (string | number)[][] }; parts: Map<string, THREE.Group> }) {
  const assetSlots = new Map<string, { placeholder: THREE.Mesh }>();
  for (const [id, x, z] of model.design?.slots ?? [['core', 0, 0], ['nw', -5, -4], ['ne', 5, -4], ['sw', -5, 4], ['se', 5, 4]]) {
    const placeholder = new THREE.Mesh(new THREE.IcosahedronGeometry(id === 'core' ? .42 : .26, 1),
      new THREE.MeshStandardMaterial({ color: id === 'core' ? 0xffc787 : 0xa0dbf4, roughness: .5, metalness: .25,
        wireframe: true, emissive: id === 'core' ? 0xffae4d : 0x3ba8d4, emissiveIntensity: .35 }));
    // Pedestals already carry their own local position in the dome model.
    const parent = model.parts.get(`pedestal-${id}`)!;
    placeholder.position.set(Number(x) - parent.position.x, .8 + (id === 'core' ? .55 : .36) - parent.position.y, Number(z) - parent.position.z);
    parent.add(placeholder);
    assetSlots.set(String(id), { placeholder });
  }
  return { assetSlots };
}
