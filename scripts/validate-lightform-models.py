"""Check the three exported Lightform GLBs before browser validation.

Run from the project root: python scripts/validate-lightform-models.py
"""

import json
import struct
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1] / "public/assets/light-lab/lightform/models"
SCENES = {
    "collins_street_web.glb": ("LED_TOWER_STRIPS",),
    "curved_pavilion_web.glb": ("LED_CURVED_DOTS", "MEDIA_REFLECTION"),
    "dome_pavilion_web.glb": ("LED_DOME_SCREEN",),
}
MAX_BYTES = 25 * 1024 * 1024
MAX_TRIANGLES = 1_500_000


def check(path: Path, displays: tuple[str, ...]) -> None:
    raw = path.read_bytes()
    magic, version, length = struct.unpack_from("<4sII", raw)
    assert magic == b"glTF" and version == 2 and length == len(raw), path.name
    chunk_length, chunk_type = struct.unpack_from("<I4s", raw, 12)
    assert chunk_type == b"JSON", path.name
    gltf = json.loads(raw[20 : 20 + chunk_length])
    nodes = gltf["nodes"]
    assert not any("moon" in node.get("name", "").lower() for node in nodes), f"{path.name}: moon remains"
    meshes = gltf["meshes"]
    accessors = gltf["accessors"]
    found = set()
    triangles = 0
    for node in nodes:
        if "mesh" not in node:
            continue
        for primitive in meshes[node["mesh"]]["primitives"]:
            count = accessors[primitive["indices"]]["count"] if "indices" in primitive else accessors[primitive["attributes"]["POSITION"]]["count"]
            triangles += count // 3
            if node.get("name") in displays:
                assert "TEXCOORD_0" in primitive["attributes"], f"{path.name}: {node['name']} lacks UV"
                found.add(node["name"])
    assert found == set(displays), f"{path.name}: missing {set(displays) - found}"
    if path.name == "dome_pavilion_web.glb":
        screen = next(node for node in nodes if node.get("name") == "LED_DOME_SCREEN")
        assert screen.get("extras", {}).get("displayBottom", -1) >= .19, "Dome display is below grade"
        assert screen.get("extras", {}).get("seamAtRear"), "Dome UV seam faces the default camera"
    if path.name == "collins_street_web.glb":
        assert not any(node.get("name", "").startswith("TOWER_LOBBY_LIGHT_") for node in nodes), "Exposed tower light panels remain"
        for index in range(6):
            wall = next(node for node in nodes if node.get("name") == f"Env_Planter_Wall_{index}")
            soil = next(node for node in nodes if node.get("name") == f"Env_Planter_Soil_{index}")
            assert wall.get("extras", {}).get("openPlanter"), f"Tower planter {index} is still capped"
            assert soil.get("extras", {}).get("rimClearance", 0) >= .039, f"Tower planter {index} has coplanar soil"
        lamps = [node for node in nodes if node.get("name", "").startswith(("WEB_HEADLAMP_", "WEB_TAILLAMP_"))]
        assert len(lamps) == 20 and all(node.get("extras", {}).get("bodyClearance", 0) >= .029 for node in lamps), "Car lamps intersect the body"
    if path.name == "curved_pavilion_web.glb":
        planter = next(node for node in nodes if node.get("name") == "Env_Planter_Stone_Wall")
        soil = next(node for node in nodes if node.get("name") == "Env_Planter_Soil")
        assert planter.get("extras", {}).get("openPlanter"), "Planter still has a solid stone cap"
        assert soil.get("extras", {}).get("rimClearance", 0) >= .039, "Planter soil is coplanar with its rim"
    images = gltf.get("images", [])
    assert all("bufferView" in image and image.get("mimeType") in ("image/jpeg", "image/png", "image/webp") for image in images), f"{path.name}: external or unsupported image"
    assert len(raw) <= MAX_BYTES, f"{path.name}: exceeds 25 MiB"
    assert triangles <= MAX_TRIANGLES, f"{path.name}: exceeds triangle budget"
    print(f"{path.name}: {len(raw) / 1048576:.2f} MiB, {triangles:,} triangles, {len(images)} embedded images, UV OK")


for filename, names in SCENES.items():
    check(ROOT / filename, names)
