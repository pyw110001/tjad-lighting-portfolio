"""Read-only source and standard-GLB round-trip verification in a fresh MCP CLI worker."""
import bpy
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
source = Path(bpy.data.filepath)
kind = source.stem
missing = [img.filepath for img in bpy.data.images if img.source == 'FILE' and not img.packed_file
           and not Path(bpy.path.abspath(img.filepath)).exists()]
assert not missing, f'Missing source images: {missing}'
original = [ob for ob in bpy.context.scene.objects if ob.type == 'MESH']
triangles = sum(len(p.vertices)-2 for ob in original for p in ob.data.polygons)
role = 'display-facade' if kind == 'fluid' else 'column-emitter'
dimensions = {ob.name: list(ob.dimensions) for ob in original if ob.get('role') == role}
baked = [ob.name for ob in original if ob.get('bakedLighting')]
assert baked, 'Missing static light bake'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source.parent/'exports'/(kind+'-standard.glb')))
imported = [ob for ob in bpy.context.scene.objects if ob.type == 'MESH']
round_trip = sum(len(p.vertices)-2 for ob in imported for p in ob.data.polygons)
for name, expected in dimensions.items():
    ob = bpy.data.objects.get(name)
    assert ob is not None, f'Missing round-trip object {name}'
    assert max(abs(float(a)-float(b)) for a,b in zip(ob.dimensions,expected)) < .001, f'Scale changed: {name}'
assert abs(round_trip - triangles) < 100, 'Round-trip triangle discrepancy'
assert all(ob.data.uv_layers for ob in imported), 'Round-trip UV loss'
result = {'kind':kind,'sourceBlend':str(source),'sourceTriangles':triangles,'roundTripTriangles':round_trip,
          'sourceMeshes':len(original),'roundTripMeshes':len(imported),'missingSourceImages':missing,
          'bakedMeshes':baked,'displayMeshes':len(dimensions),'scaleToleranceMetres':.001,
          'sourceModified':False}
(root/'docs'/f'{kind}-blender-validation.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
