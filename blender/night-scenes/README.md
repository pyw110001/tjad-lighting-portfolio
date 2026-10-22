# Blender 夜景源工程

`fluid.blend` 为流线灯幕；`field.blend` 为光柱广场。两景采用米制，人体约 1.7 米，其余尺寸根据参考图估算。模型、树木、人物和贴图由项目脚本生成，贴图已经打包进 `.blend`。参考图保存在 `references/`，最终 Cycles 预览为同目录下的 `*-blender.png`。

## 文件与用途

- `exports/*-standard.glb`：标准 PBR 交换文件，保留物理灯具和静态灯效预览，可重新导入 Blender。
- 网站实际使用项目根目录 `public/assets/light-lab/night/models/*-web.glb`，采用 Meshopt 和 KTX2 压缩。
- 浏览器在 GLB 的 `MEDIA_FACADE` 上绑定动态媒体，在 `COLUMN_EMITTER_*` 上驱动紫青或暖白灯效；半分辨率地面反射与辉光由 Three.js 提供。因此通用 GLB 查看器显示静态材质预览，完整交互效果请打开网站。
- `CAM_REFERENCE` 为默认相机，`target` 自定义属性以 Blender 的 Z-up 米制坐标保存。glTF 导出使用 Y-up；网页显式转换目标点，避免二次缩放或重复旋转。

## 本机重建

在项目根目录 PowerShell 运行，先启动 Blender MCP：

```powershell
$blenderExe = 'C:\Program Files\Blender Foundation\Blender 5.1\blender.exe'
& $blenderExe --online-mode --python scripts/start-blender-mcp.py
```

在另一个终端运行（MCP 服务源码和虚拟环境位于用户 `.codex/tools/blender-mcp-official`）：

```powershell
$mcpPython = Join-Path $env:USERPROFILE '.codex/tools/blender-mcp-official/mcp/.venv/Scripts/python.exe'
$evidence = Join-Path $env:TEMP 'lighting-night-evidence'
& $mcpPython scripts/blender-mcp-client.py --verify --evidence $evidence
& $mcpPython scripts/blender-mcp-client.py --script scripts/build-night-scenes.py --scene fluid --export --render --evidence $evidence
& $mcpPython scripts/blender-mcp-client.py --script scripts/build-night-scenes.py --scene field --export --render --evidence $evidence
npm run night:optimize
npm run night:validate
& $mcpPython scripts/blender-mcp-client.py --validate-scenes --evidence $evidence
npm run build
```

渲染工具会返回 Blender 临时目录中的 PNG 路径。重建会覆盖本目录下对应的生成场景；手工调整版本请先另存为新文件。`start-blender-mcp.py` 启用官方插件并将桥接限制为 `127.0.0.1:9876`。

压缩工具使用已安装的便携 KTX-Software 4.4.2，默认位置为用户 `.codex/tools/ktx/portable/bin`，可通过环境变量 `KTX_BIN` 指定其他目录。项目 npm 锁文件固定网页压缩和加载依赖。`blender-mcp-uv.lock` 保存本次 MCP Python 依赖锁定记录。

官方 MCP 的 CLI 工具会继承本机 Blender 用户插件；本机该路径曾在启动时超时。因此 `--validate-scenes` 明确使用 `--factory-startup` 的独立 Blender 进程做只读回导检查，建模、烘焙、导出和渲染依然经真实 MCP 工具执行。

## 质量与性能取舍

主要轮廓、玻璃大厅、灯具尺度、冷暖配色与湿地反射按参考图重建。人物、树木、背景楼群采用简化几何；建筑不可见部分不按施工图深化。固定参考视角可水平调整约 ±5.7°、竖向约 ±2.6°，缩放范围为参考距离的 92%–108%，复位会清除拖动惯性。

照明使用静态 Cycles 烘焙、PBR 材质、实时发光段和地面反射的组合。动态灯效未烘死进铺地贴图。源工程用于编辑与重新出图；最终画面验收以网页为准。完整交付与验证结果见项目 `docs/blender-night-delivery.md`。
