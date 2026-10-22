import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
await MeshoptDecoder.ready;
const root = resolve(import.meta.dirname, '..');
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const report = [];
const requireThat = (condition, message) => { if (!condition) throw new Error(message); };
for (const kind of ['fluid', 'field']) {
  const filename = join(root, `public/assets/light-lab/night/models/${kind}-web.glb`);
  const document = await io.read(filename), asset = document.getRoot();
  const nodes = asset.listNodes(), meshes = asset.listMeshes();
  const camera = nodes.find(n => n.getName() === 'CAM_REFERENCE');
  requireThat(camera?.getCamera(), `${kind}: missing reference camera`);
  requireThat(camera.getExtras().target?.length === 3, `${kind}: missing camera target`);
  const counts = { triangles: 0, vertices: 0, primitives: 0 };
  for (const node of nodes) {
    const mesh = node.getMesh(); if (!mesh) continue;
    for (const primitive of mesh.listPrimitives()) {
      counts.primitives++;
      const positions = primitive.getAttribute('POSITION'), normals = primitive.getAttribute('NORMAL');
      requireThat(positions && normals, `${node.getName()}: missing position/normal`);
      const p = positions.getArray();
      requireThat(p.every(Number.isFinite), `${node.getName()}: non-finite coordinates`);
      requireThat(primitive.getAttribute('TEXCOORD_0'), `${node.getName()}: missing UV`);
      counts.vertices += positions.getCount();
      counts.triangles += (primitive.getIndices()?.getCount() ?? positions.getCount()) / 3;
    }
  }
  const displays = nodes.filter(n => n.getExtras().role === (kind === 'fluid' ? 'display-facade' : 'column-emitter'));
  requireThat(displays.length === (kind === 'fluid' ? 1 : 56), `${kind}: missing display meshes`);
  requireThat(nodes.some(n => n.getExtras().bakedLighting === true), `${kind}: missing baked static lighting`);
  for (const texture of asset.listTextures()) {
    requireThat(texture.getImage()?.length > 0, `${kind}: missing embedded image`);
    requireThat(texture.getMimeType() === 'image/ktx2', `${kind}: uncompressed GPU texture`);
    const [w,h] = texture.getSize(); requireThat(w <= 4096 && h <= 4096, `${kind}: oversized texture`);
  }
  const bytes = statSync(filename).size;
  requireThat(bytes < 25 * 1024 ** 2 && counts.triangles < 1_000_000, `${kind}: asset budget exceeded`);
  const item = { kind, bytes, ...counts, meshes: meshes.length, displays: displays.length,
    embeddedTextures: asset.listTextures().length, extensions: asset.listExtensionsUsed().map(e => e.extensionName) };
  report.push(item); console.log(item);
}
mkdirSync(join(root, 'docs'), { recursive: true });
writeFileSync(join(root, 'docs/night-scene-assets.json'), JSON.stringify(report, null, 2));
