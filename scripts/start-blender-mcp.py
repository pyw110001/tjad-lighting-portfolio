"""Blender --online-mode --python scripts/start-blender-mcp.py (interactive)."""
import bpy
import addon_utils

module = "bl_ext.user_default.mcp"
addon_utils.enable(module, default_set=True, persistent=True)
preferences = bpy.context.preferences.addons[module].preferences
preferences.host = "127.0.0.1"
preferences.port = 9876
preferences.use_autostart = True
bpy.ops.wm.save_userpref()
from bl_ext.user_default.mcp import mcp_to_blender_server
if not mcp_to_blender_server.is_running():
    bpy.ops.blmcp.server_start()
