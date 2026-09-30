"""Export one open Lightform Blender scene as a browser-sized GLB.

Run with Blender 5.2: blender --factory-startup -b SOURCE.blend --python THIS_FILE -- --scene collins|facade|sphere --output DEST.glb
The source .blend is never saved.
"""

import argparse
import json
import math
import os
import random
import sys
from collections import defaultdict

import bpy
from mathutils import Matrix, Vector


def args():
    cli = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--scene", choices=("collins", "facade", "sphere"), required=True)
    parser.add_argument("--output", required=True)
    return parser.parse_args(cli)


def material(name, color, metallic=0.0, roughness=0.65, emission=0.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    if emission:
        shader.inputs["Emission Color"].default_value = (*color, 1)
        shader.inputs["Emission Strength"].default_value = emission
    mat.node_tree.links.new(shader.outputs["BSDF"], out.inputs["Surface"])
    return mat


def add_mesh(name, vertices, faces, uv_faces, mat):
    mesh = bpy.data.meshes.new(name + "_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    layer = mesh.uv_layers.new(name="UVMap")
    for poly, uvs in zip(mesh.polygons, uv_faces):
        for loop_index, uv in zip(poly.loop_indices, uvs):
            layer.data[loop_index].uv = uv
    mesh.materials.append(mat)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def proxy_tree_mesh(source):
    coords = [v.co for v in source.vertices]
    x0, x1 = min(v.x for v in coords), max(v.x for v in coords)
    y0, y1 = min(v.y for v in coords), max(v.y for v in coords)
    z0, z1 = min(v.z for v in coords), max(v.z for v in coords)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    height = z1 - z0
    width = max(x1 - x0, y1 - y0)
    vertices, faces, material_indices = [], [], []

    # A tapered trunk and varied leaf cards keep the repeated city trees
    # translucent and detailed without exporting millions of leaf polygons.
    trunk_radius = width * 0.035
    for level, radius in ((z0, trunk_radius * 1.5), (z0 + height * 0.68, trunk_radius)):
        for side in range(8):
            angle = side * math.tau / 8
            vertices.append((cx + radius * math.cos(angle), cy + radius * math.sin(angle), level))
    for side in range(8):
        faces.append((side, (side + 1) % 8, 8 + (side + 1) % 8, 8 + side))
        material_indices.append(0)
    rng = random.Random(401)
    for _ in range(950):
        theta = rng.random() * math.tau
        radius = math.sqrt(rng.random()) * width * .49
        x = cx + math.cos(theta) * radius
        y = cy + math.sin(theta) * radius * .78
        z = z0 + height * (.50 + .47 * rng.random())
        size = width * (.025 + .025 * rng.random())
        angle = rng.random() * math.tau
        ux, uy = math.cos(angle) * size, math.sin(angle) * size
        start = len(vertices)
        vertices.extend(((x - ux, y - uy, z), (x, y, z + size * .65),
                         (x + ux, y + uy, z), (x, y, z - size * .65)))
        faces.append((start, start + 1, start + 2, start + 3))
        material_indices.append(1 + rng.randrange(3))
    mesh = bpy.data.meshes.new("Web tree proxy")
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.append(material("Web bark", (.11, .085, .055), roughness=.9))
    for name, color in (("Web foliage dark", (.10, .16, .045)),
                        ("Web foliage mid", (.17, .24, .065)),
                        ("Web foliage light", (.25, .31, .10))):
        leaf = material(name, color, roughness=.9, emission=.05)
        leaf.use_backface_culling = False
        mesh.materials.append(leaf)
    for poly, index in zip(mesh.polygons, material_indices):
        poly.material_index = index
        poly.use_smooth = True
    mesh.update()
    return mesh


def optimize_trees():
    groups = defaultdict(list)
    for obj in bpy.context.scene.objects:
        if obj.type == "MESH" and any(word in obj.name.lower() for word in ("tree", "shrub", "ficus")):
            groups[obj.data.as_pointer()].append(obj)
    for objects in groups.values():
        representative = objects[0]
        original = representative.data
        count = len(original.vertices)
        target = 20000 if "feature" in representative.name.lower() else 4500 if "tree" in representative.name.lower() else 1800
        if count <= target:
            continue
        if "feature" in representative.name.lower():
            continue
        if len(objects) > 4 and count > 100000:
            proxy = proxy_tree_mesh(original)
            for obj in objects:
                obj.data = proxy
            print("LIGHTFORM proxy", representative.name, count, "to", len(proxy.vertices), "instances", len(objects))
            continue
        representative.data = original.copy()
        bpy.ops.object.select_all(action="DESELECT")
        representative.select_set(True)
        bpy.context.view_layer.objects.active = representative
        modifier = representative.modifiers.new("Web tree reduction", "DECIMATE")
        modifier.ratio = max(0.01, target / count)
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        for obj in objects[1:]:
            obj.data = representative.data
        print("LIGHTFORM optimized", representative.name, count, "to", len(representative.data.vertices), "instances", len(objects))


def repair_planter_pair(wall, soil):
    """Replace the solid planter cap with a rim and recessed soil.

    The source stone box and soil both end at z=.7. Their coincident top
    faces flicker in WebGL; a small depth bias would still leave a stone lid
    across the planting bed. Build the actual open basin instead.
    """
    bounds = [wall.matrix_world @ Vector(v) for v in wall.bound_box]
    soil_bounds = [soil.matrix_world @ Vector(v) for v in soil.bound_box]
    x0, y0, z0 = (min(v[i] for v in bounds) for i in range(3))
    x1, y1, z1 = (max(v[i] for v in bounds) for i in range(3))
    ix0, iy0 = (min(v[i] for v in soil_bounds) for i in range(2))
    ix1, iy1 = (max(v[i] for v in soil_bounds) for i in range(2))
    vertices = []
    for xa, ya, xb, yb, height in ((x0, y0, x1, y1, z0), (x0, y0, x1, y1, z1),
                                  (ix0, iy0, ix1, iy1, z0), (ix0, iy0, ix1, iy1, z1)):
        vertices.extend(((xa, ya, height), (xb, ya, height),
                         (xb, yb, height), (xa, yb, height)))
    faces = [(3, 2, 1, 0)]
    for i in range(4):
        j = (i + 1) % 4
        faces.extend(((i, j, 4 + j, 4 + i),
                      (8 + j, 8 + i, 12 + i, 12 + j),
                      (4 + i, 4 + j, 12 + j, 12 + i)))
    name, mat = wall.name, wall.data.materials[0]
    bpy.data.objects.remove(wall, do_unlink=True)
    wall = add_mesh(name, vertices, faces, [[(0, 0), (1, 0), (1, 1), (0, 1)]] * len(faces), mat)
    wall["openPlanter"] = True
    soil.matrix_world.translation.z -= .04
    soil["rimClearance"] = .04
    print("LIGHTFORM repaired planter", name, "open stone rim, soil recessed 4 cm")


def repair_planters():
    pairs = [("Env_Planter_Stone_Wall", "Env_Planter_Soil")]
    pairs.extend((f"Env_Planter_Wall_{i}", f"Env_Planter_Soil_{i}") for i in range(6))
    for wall_name, soil_name in pairs:
        wall, soil = bpy.data.objects.get(wall_name), bpy.data.objects.get(soil_name)
        if wall is not None and soil is not None:
            repair_planter_pair(wall, soil)


def repair_car_lights():
    """The source's 1 m lamps overlap the entire car end at the same X."""
    head = material("Web headlamp", (1, .88, .7), emission=2.2)
    tail = material("Web tail lamp", (1, .035, .015), emission=1.5)
    cars = [obj for obj in bpy.context.scene.objects if obj.type == "MESH" and obj.name.startswith("Car_")]
    for obj in list(bpy.context.scene.objects):
        if obj.type != "MESH" or not obj.data.materials:
            continue
        name = obj.data.materials[0].name
        if name not in ("M_Headlight_Emit", "M_Taillight_Emit"):
            continue
        center = obj.matrix_world.translation.copy()
        car = min(cars, key=lambda item: (item.matrix_world.translation - center).length_squared) if cars else None
        if car is None:
            continue
        # Preserve the lamp centres and direction, reduce width/height, then
        # place the emitting surface 3 cm outside the opaque body.
        obj.data = obj.data.copy()
        for vertex in obj.data.vertices:
            vertex.co.y *= .36
            vertex.co.z *= .17
        obj.matrix_world.translation.x += .03 if center.x > car.matrix_world.translation.x else -.03
        obj.matrix_world.translation.z = .66
        obj.data.materials.clear()
        obj.data.materials.append(head if name == "M_Headlight_Emit" else tail)
        obj["bodyClearance"] = .03
        obj.name = ("WEB_HEADLAMP_" if name == "M_Headlight_Emit" else "WEB_TAILLAMP_") + obj.name


def restore_architecture(scene_id, output, dark):
    """Keep the optimized city, restore the original interactive building.

    The Blender replacements changed the silhouettes. The original GLBs are
    the geometry reference, including their continuous media UVs. Import only
    their architecture, never their previous streets or background buildings.
    """
    configs = {
        "collins": ("collins_light_house.glb", "06_Main_Building",
                    ("DARK_ROOF", "FACADE_FLOOR_LINES", "GROUND_FLOOR_LOBBY", "LED_CHANNELS",
                     "LED_STRIPS", "LEFT_GLASS_FACADE", "REAR_GLASS_FACADE", "RIGHT_GLASS_FACADE"),
                    (2.5, 2.5, 2.68), (18, 16.75, .2), "LED_STRIPS", "LED_TOWER_STRIPS"),
        "facade": ("curved_dot_facade.glb", "06_Curved_Pavilion_Main",
                   ("GLASS_LOBBY", "GOLDEN_BASE_EDGE", "INTERIOR_COLUMN_", "LED_DOT_FACADE",
                    "LOBBY_", "RIGHT_FLOOR_EDGE_", "RIGHT_RETURN", "ROOF_CAP", "UPPER_CLADDING"),
                   (1.6, 1.6, 1.6), (7.85, 6.1, .2), "LED_DOT_FACADE", "LED_CURVED_DOTS"),
        "sphere": ("sphere_studio.glb", "06_Dome_Pavilion_Main",
                   ("LED_SCREEN", "FACADE_DARK_SEAM"),
                   (2.5, 2.5, 2.5), (0, 18, .2), "LED_SCREEN", "LED_DOME_SCREEN"),
    }
    filename, collection_name, keep, scale, position, display_source, display_name = configs[scene_id]
    collection = bpy.data.collections.get(collection_name)
    assert collection, f"Missing source collection {collection_name}"
    for obj in list(collection.all_objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(os.path.dirname(os.path.abspath(output)), filename))
    # Put the sphere's longitude seam on the rear side. Rotating the geometry
    # keeps each triangle's UV interpolation continuous; wrapping individual
    # UV vertices by .5 would stretch the triangles across the new seam.
    rotation = Matrix.Rotation(math.pi, 4, "Z") if scene_id == "sphere" else Matrix.Identity(4)
    transform = Matrix.Translation(Vector(position)) @ rotation @ Matrix.Diagonal(Vector((*scale, 1)))
    display = None
    for obj in set(bpy.data.objects) - before:
        if obj.type != "MESH" or not obj.name.startswith(keep):
            bpy.data.objects.remove(obj, do_unlink=True)
            continue
        obj.matrix_world = transform @ obj.matrix_world
        if scene_id == "facade" and obj.name == "LOBBY_INTERIOR":
            obj.data.materials.clear()
            obj.data.materials.append(material("Web warm lobby wall", (.14, .065, .025), roughness=.65, emission=.5))
        if obj.name == display_source:
            display = obj
            obj.name = display_name
            obj.data.materials.clear()
            obj.data.materials.append(dark)
            assert obj.data.uv_layers.active, f"{display_name} lacks UV"
            obj["originalArchitecture"] = filename
            if scene_id == "collins":
                obj["facadeAspect"] = 1.02
                obj["stripCount"] = 96
            elif scene_id == "facade":
                obj["facadeAspect"] = 2.18
                obj["columns"] = 144
                obj["rows"] = 64
            else:
                # Normalize only the visible shell. No pixel of a media image
                # should be allocated to the buried part of a full sphere.
                uv = obj.data.uv_layers.active
                minimum = min(item.uv.y for item in uv.data)
                maximum = max(item.uv.y for item in uv.data)
                for item in uv.data:
                    item.uv.y = (item.uv.y - minimum) / (maximum - minimum)
                for poly in obj.data.polygons:
                    poly.use_smooth = True
                bounds = [obj.matrix_world @ v.co for v in obj.data.vertices]
                obj["displayBottom"] = min(v.z for v in bounds)
                obj["displayTop"] = max(v.z for v in bounds)
                obj["facadeAspect"] = 1.75
                obj["seamAtRear"] = True
                assert obj["displayBottom"] >= .19, "Dome screen extends below grade"
    assert display is not None, f"Missing original display {display_source}"
    if scene_id == "collins":
        wall = material("Web tower lobby wall", (.32, .22, .12), roughness=.65, emission=.3)
        add_mesh("TOWER_LOBBY_BACKWALL", [(8.2, 22.9, .21), (27.8, 22.9, .21),
                                        (27.8, 22.9, 2.7), (8.2, 22.9, 2.7)],
                 [(0, 1, 2, 3)], [[(0, 0), (1, 0), (1, 1), (0, 1)]], wall)
    if scene_id == "facade":
        lamp = material("Web showroom wall lights", (1, .62, .28), emission=2)
        for index, x in enumerate((.2, 4.8, 9.4, 14, 18.6, 23.2)):
            add_mesh(f"SHOWROOM_WARM_LIGHT_{index}",
                     [(x - .035, 3.1, .4), (x + .035, 3.1, .4),
                      (x + .035, 3.1, 4.3), (x - .035, 3.1, 4.3)],
                     [(0, 1, 2, 3)], [[(0, 0), (1, 0), (1, 1), (0, 1)]], lamp)
        add_mesh("MEDIA_REFLECTION",
                 [(-2.5, .3, .04), (25, .3, .04), (25, -10, .04), (-2.5, -10, .04)],
                 [(0, 1, 2, 3)], [[(0, 0), (1, 0), (1, 1), (0, 1)]], dark)


def export_night_lighting():
    # Emissive meshes alone do not illuminate their surroundings in WebGL.
    # Carry a limited, spatially distributed set of the source's practical
    # lights to Three.js, with power calibrated for the browser's inverse falloff.
    trees, streets = [], []
    for obj in list(bpy.context.scene.objects):
        if "moon" in obj.name.lower():
            bpy.data.objects.remove(obj, do_unlink=True)
            continue
        if obj.type != "LIGHT":
            continue
        if "Tree" in obj.name:
            trees.append(obj)
        elif "Lamp_" in obj.name or "Bollard_" in obj.name:
            streets.append(obj)
    lights = []
    for group, count, factor in ((trees, 6, .085), (streets, 4, .2)):
        group.sort(key=lambda obj: obj.matrix_world.translation.x)
        selected = [group[round(i * (len(group) - 1) / (min(count, len(group)) - 1))]
                    for i in range(min(count, len(group)))] if len(group) > 1 else group
        for obj in selected:
            location = obj.matrix_world.translation
            direction = obj.matrix_world.to_quaternion() @ Vector((0, 0, -1))
            convert = lambda vec: [vec.x, vec.z, -vec.y]
            lights.append({"name": obj.name, "type": obj.data.type,
                           "position": convert(location), "target": convert(location + direction * 8),
                           "color": list(obj.data.color), "intensity": min(950, obj.data.energy * factor),
                           "angle": getattr(obj.data, "spot_size", 1.2) / 2})
    marker = bpy.data.objects.new("NIGHT_LIGHTING", None)
    bpy.context.scene.collection.objects.link(marker)
    marker["lighting"] = json.dumps(lights)


def main():
    config = args()
    dark = material("Web dark LED backing", (0.007, 0.012, 0.019), metallic=0.18, roughness=0.48)
    optimize_trees()
    repair_planters()
    repair_car_lights()
    restore_architecture(config.scene, config.output, dark)
    # Procedural Blender stone colors are not exported by glTF. Explicit PBR
    # values prevent those plazas from becoming default-white surfaces.
    stone = material("Web plaza stone", (.035, .045, .055), metallic=.05, roughness=.62)
    for obj in bpy.context.scene.objects:
        if obj.type == "MESH":
            for slot in obj.material_slots:
                if slot.material and slot.material.name in ("M_Plaza_Pavers", "M_Plaza_Granite"):
                    slot.material = stone
    export_night_lighting()
    # Blender lights, cameras and HDR environments are recreated in Three.js.
    bpy.ops.export_scene.gltf(
        filepath=os.path.abspath(config.output),
        export_format="GLB",
        export_image_format="JPEG",
        export_jpeg_quality=72,
        export_cameras=False,
        export_lights=False,
        export_apply=True,
        export_extras=True,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
    )
    print("LIGHTFORM exported", config.scene, os.path.getsize(config.output))


main()
