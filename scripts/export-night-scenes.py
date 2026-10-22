"""Execute through MCP after authoring. Packs PBR textures and exports camera/extras.

SCENE_KIND defaults to the currently authored scene ID. Includes a practical
Cycles bake of the opaque lobby walls/soffit, but leaves wet ground and dynamic
emitters physically shaded. Original materials remain in the saved source file.
"""
import bpy
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'blender/night-scenes'
OUTPUT=SOURCE/'exports'
OUTPUT.mkdir(parents=True,exist_ok=True)
scene=bpy.context.scene
kind=scene.get('sceneId','fluid')
if kind in ('fluid','field'):
    # Bake only this opaque limestone group; dynamic facade/ground remain excluded.
    ob=bpy.data.objects.get('STATIC | lobby' if kind=='fluid' else 'KIOSK_BAKE')
    if ob and not ob.get('bakedLighting'):
        bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob
        bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(island_margin=.015);bpy.ops.object.mode_set(mode='OBJECT')
        image_name=kind+'-static-irradiance'
        img=bpy.data.images.new(image_name,width=2048,height=2048,alpha=False)
        material=ob.data.materials[0]
        node=material.node_tree.nodes.new('ShaderNodeTexImage');node.image=img;material.node_tree.nodes.active=node
        scene.cycles.samples=24
        scene.render.bake.use_pass_direct=True;scene.render.bake.use_pass_indirect=True
        scene.render.bake.use_pass_glossy=False;scene.render.bake.use_pass_transmission=False
        dynamic=[o for o in scene.objects if o.name.startswith('COLUMN_EMITTER_')]
        for item in dynamic:item.hide_render=True
        bpy.ops.object.bake(type='COMBINED',margin=8)
        for item in dynamic:item.hide_render=False
        img.filepath_raw=str(SOURCE/(image_name+'.png'));img.file_format='PNG';img.save();img.pack()
        baked=bpy.data.materials.new('BAKED | '+kind+' static lighting');baked.use_nodes=True
        nodes=baked.node_tree.nodes;nodes.clear()
        out=nodes.new('ShaderNodeOutputMaterial');emission=nodes.new('ShaderNodeEmission');tex=nodes.new('ShaderNodeTexImage');tex.image=img
        baked.node_tree.links.new(tex.outputs['Color'],emission.inputs['Color']);baked.node_tree.links.new(emission.outputs[0],out.inputs['Surface'])
        ob.data.materials[0]=baked;ob['bakedLighting']=True
        scene.cycles.samples=48
for img in bpy.data.images:
    if img.source=='FILE' and not img.packed_file:img.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/(kind+'.blend')))
# Runtime uses its own animated continuous display; it is also present in GLB.
host=bpy.data.objects.get('MEDIA_FACADE')
if host:host.hide_render=False
bpy.ops.export_scene.gltf(filepath=str(OUTPUT/(kind+'-standard.glb')),export_format='GLB',
    export_yup=True,export_extras=True,export_cameras=True,export_lights=False,
    export_apply=True,export_texcoords=True,export_normals=True,export_materials='EXPORT',
    export_image_format='AUTO',export_animations=False)
if host:host.hide_render=True
result={'kind':kind,'output':str(OUTPUT/(kind+'-standard.glb')),
        'bytes':(OUTPUT/(kind+'-standard.glb')).stat().st_size}
print(json.dumps(result))
