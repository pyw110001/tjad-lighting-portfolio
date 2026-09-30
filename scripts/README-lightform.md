# Lightform Blender 场景导出

源工程位于相邻的 `blender_anti` 文件夹。`export-lightform-scenes.py` 只读取当前打开的 `.blend`，不保存或改写源工程。它保留 Blender 优化后的城市、街道和树木，重新导入原版的三个交互主体：`collins_light_house.glb`、`curved_dot_facade.glb` 和 `sphere_studio.glb`。原主体文件必须与输出文件同目录。888 的屋顶轮廓与竖向灯带、球体完整的地上显示表面、弧形馆比例和玻璃大厅都由这些原模型提供。

导出时移除月亮，将无法直接导出的程序化广场石材转换为 PBR 材质，为大厅补充墙面和灯具，并携带少量原场景实用灯光的位置。塔楼移除露到楼外的发光面片，由浏览器局部灯光照亮大厅。弧形馆树池改成开放的石材围边，土壤低于围边 4 cm，避免原石材顶盖与土壤重面。浏览器使用夜景 HDR 环境反射、树木与道路照明，不依赖发光网格照亮整个环境。球体媒体 UV 只覆盖地上可见表面，主体绕竖轴旋转 180° 将 UV 接缝置于默认镜头背面，保持三角形内部 UV 插值连续。街区与球形展馆的轻量树网格会在浏览器里被按需生成的 ez-tree 树替换；若生成失败，轻量树仍可显示。弧形展馆近景主树保留 Blender 树干与枝条，并叠加 ez-tree 叶冠。

塔楼 6 组树池也改成开放石材边框，土壤降低 4 cm。车辆前后灯片缩小至原宽度的 36%、高度的 17%，沿车头/车尾移出车身 3 cm，并使用独立的低强度发光材质。石材与道路反射分开校准，广场使用非金属粗糙表面和较低的环境反射，避免大片发白。校验器会检查这些几何修复标记。

在本项目根目录的 PowerShell 中运行：

```powershell
$blenderExe = 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe'
$sourceDir = Resolve-Path '..\blender_anti'
$modelDir = Join-Path (Get-Location) 'public\assets\light-lab\lightform\models'
$exporter = Join-Path (Get-Location) 'scripts\export-lightform-scenes.py'
New-Item -ItemType Directory -Force -Path $modelDir | Out-Null
& $blenderExe --factory-startup -b (Join-Path $sourceDir 'scene1_collins_street.blend') --python $exporter -- --scene collins --output (Join-Path $modelDir 'collins_street_web.glb')
& $blenderExe --factory-startup -b (Join-Path $sourceDir 'scene2_curved_facade.blend') --python $exporter -- --scene facade --output (Join-Path $modelDir 'curved_pavilion_web.glb')
& $blenderExe --factory-startup -b (Join-Path $sourceDir 'scene3_dome_pavilion.blend') --python $exporter -- --scene sphere --output (Join-Path $modelDir 'dome_pavilion_web.glb')
python scripts\validate-lightform-models.py
```

使用 `--factory-startup` 避免本机第三方 Blender 插件影响批量导出。夜景环境图 `public/assets/light-lab/lightform/environment/night-city.hdr` 来自源工程的 `assets/hdri/modern_buildings_night_1k.hdr`。

校验器检查每景低于 25 MiB、GLB 内绘制三角形低于 150 万、显示网格存在、UV 完整、贴图已嵌入、无月亮、塔楼无露出的发光面片、树池已开口，以及球体显示表面位于地面以上且接缝位于背面。浏览器生成的 ez-tree 树不计入 GLB 三角形数。生成后运行 `npm run build` 和桌面 Playwright 测试。主体几何以原 GLB 为参考；城市环境以 Blender 预览图为参考。浏览器测试包括球体三色分区完整显示与主视角接缝检查。
