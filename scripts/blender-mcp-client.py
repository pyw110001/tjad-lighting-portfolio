"""Call the pinned official Blender Lab server over MCP/stdio (not its TCP bridge).

Run with the official server's .venv/Scripts/python.exe. --script executes a local
authoring script through execute_blender_code. Images and protocol evidence go
to --evidence, outside the website's public assets.
"""
import argparse
import asyncio
import base64
import datetime
import json
import os
import subprocess
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--server", type=Path, default=Path.home() / ".codex/tools/blender-mcp-official/mcp")
    parser.add_argument("--evidence", type=Path, required=True)
    parser.add_argument("--script", type=Path)
    parser.add_argument("--scene", choices=("fluid", "field"))
    parser.add_argument("--export", action="store_true", dest="export_scene")
    parser.add_argument("--render", action="store_true")
    parser.add_argument("--tool", default="get_blendfile_summary_datablocks")
    parser.add_argument("--arguments", default="{}")
    parser.add_argument("--verify", action="store_true")
    parser.add_argument("--validate-scenes", action="store_true")
    args = parser.parse_args()
    args.evidence.mkdir(parents=True, exist_ok=True)
    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    command = args.server / ".venv/Scripts/python.exe"
    candidates = sorted((Path(os.environ.get('ProgramFiles', 'C:/Program Files')) / 'Blender Foundation').glob('Blender */blender.exe'))
    params = StdioServerParameters(command=str(command), args=["-m", "blmcp"],
                                   env={**os.environ, "PYTHONUTF8": "1", **({'BLENDER_PATH': str(candidates[-1])} if candidates else {})})
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write, read_timeout_seconds=datetime.timedelta(minutes=25)) as session:
            init = await session.initialize()
            available = await session.list_tools()
            record = {"time": stamp, "server": init.model_dump(mode="json"),
                      "tools": [t.model_dump(mode="json") for t in available.tools], "calls": []}

            async def call(name, arguments):
                response = await session.call_tool(name, arguments)
                blocks = []
                for i, block in enumerate(response.content):
                    if block.type == "image":
                        image = args.evidence / f"{stamp}-{name}-{i}.png"
                        image.write_bytes(base64.b64decode(block.data))
                        blocks.append({"image": str(image)})
                    elif block.type == "text":
                        blocks.append({"text": block.text})
                        print(block.text, flush=True)
                record["calls"].append({"tool": name, "isError": response.isError, "content": blocks})
                (args.evidence / f"{stamp}-mcp.json").write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
                if response.isError:
                    raise RuntimeError(f"MCP tool {name} failed")
                for block in blocks:
                    if 'text' in block:
                        try:
                            payload = json.loads(block['text'])
                        except ValueError:
                            continue
                        if isinstance(payload, dict) and payload.get('status') == 'error':
                            raise RuntimeError(f"Blender tool failed: {payload}")
                return response

            if args.verify:
                await call("get_blendfile_summary_datablocks", {})
                await call("get_screenshot_of_window_as_image", {"size_limit_in_bytes": 2000000})
            if args.validate_scenes:
                verifier = Path(__file__).with_name('validate-night-blender.py')
                if not candidates:
                    raise RuntimeError('No Blender executable found for isolated validation')
                record['isolatedValidation'] = []
                for kind in ('fluid','field'):
                    path = verifier.resolve().parents[1] / 'blender/night-scenes' / (kind+'.blend')
                    # Official execute_blender_code_for_cli inherits the user's add-ons.
                    # A fresh factory profile avoids third-party start-up hangs. Scene
                    # authoring/export still uses the real MCP execute_blender_code tool.
                    command = [str(candidates[-1]), '--factory-startup', '--background', str(path),
                               '--python-exit-code', '1', '--python', str(verifier.resolve())]
                    process = await asyncio.to_thread(subprocess.run, command, capture_output=True,
                                                       text=True, encoding='utf-8', errors='replace', timeout=120)
                    record['isolatedValidation'].append({'command':command,'returncode':process.returncode})
                    (args.evidence/f'{stamp}-mcp.json').write_text(json.dumps(record,indent=2),encoding='utf-8')
                    if process.returncode:
                        raise RuntimeError(process.stdout + process.stderr)
                    print(f'{kind}: isolated source and GLB round-trip validation passed', flush=True)
            elif args.script:
                code = f'__file__ = {str(args.script.resolve())!r}\n' + args.script.read_text(encoding="utf-8")
                if args.scene:
                    code = f'SCENE_KIND = {args.scene!r}\n' + code
                await call("execute_blender_code", {"code": code})
                if args.export_scene:
                    export_script = Path(__file__).with_name('export-night-scenes.py')
                    await call("execute_blender_code", {"code": f'__file__ = {str(export_script.resolve())!r}\n' + export_script.read_text(encoding='utf-8')})
                if args.render:
                    await call("render_viewport_to_path", {"output_path": f'{args.scene or "scene"}-blender.png'})
            elif not args.verify:
                await call(args.tool, json.loads(args.arguments))
            print(json.dumps({"evidence": str(args.evidence), "toolCount": len(available.tools)}))


if __name__ == "__main__":
    asyncio.run(main())
