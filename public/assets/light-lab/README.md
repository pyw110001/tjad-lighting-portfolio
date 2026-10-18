# LIGHT LAB 资产目录

当前入口为昼夜切换、流光粒子、Chroma、Lightform Studio 和 Photo Lab。资产须与代码中的路径、显示网格名称和 UV 标定一致；放入任意模型不会自动完成交互接入。

## 当前资源

```text
public/assets/light-lab/
├── scenes/                     # 昼夜图片与工作台场景图片
├── chroma/demo-portrait-v2.png  # Chroma 演示与映射测试素材
├── lightform/
│   ├── draco/                  # 本地 Draco 解码器
│   ├── environment/night-city.hdr
│   ├── media/                  # 三套 3D 场景的默认素材
│   └── models/                 # 城市模型及原版交互主体
└── photo/
    ├── {scene}-background.webp # 无月亮、无标语的干净背景
    ├── {scene}-demo.webp       # 原图暖色灯光演示层
    ├── {scene}-uv-high.png     # UV 高字节及显示区覆盖率
    └── {scene}-uv-low.png      # UV 低字节及曲面明暗
```

`{scene}` 为 `collins`、`facade` 或 `sphere`。图片及 UV 标定尺寸为 1672×941。旧目录如 `comparisons/` 可保留供历史模块使用，当前昼夜模块读取 `scenes/day.webp` 与 `scenes/night.webp`。

## 3D 显示表面

| 场景 | 浏览器 GLB | 显示网格 |
| --- | --- | --- |
| 888 Collins | `collins_street_web.glb` | `LED_TOWER_STRIPS` |
| 弧形展馆 | `curved_pavilion_web.glb` | `LED_CURVED_DOTS` |
| 球形展馆 | `dome_pavilion_web.glb` | `LED_DOME_SCREEN` |

模型使用 Y-Up、米制坐标，贴图嵌入 GLB，显示表面保留媒体 UV。原版主体 `collins_light_house.glb`、`curved_dot_facade.glb`、`sphere_studio.glb` 是导出脚本的输入，也应保留。源 `.blend` 位于相邻的 `blender_anti`，不纳入本仓库。

导出步骤见 [Blender 场景导出说明](../../../scripts/README-lightform.md)。生成后执行 `python scripts/validate-lightform-models.py` 校验资源体量、UV、显示网格及几何修复标记。

## 图片版显示表面

塔楼覆盖两面灯条至尖顶，弧形馆覆盖整块上层幕墙，球馆覆盖完整穹顶至玻璃大厅上沿。屋顶（塔楼及弧形馆）、大厅、树木和前景遮挡由背景保留。

UV 贴图为不透明数值数据，禁止进行有损压缩或透明预乘处理。修改 `src/experience/photo/mapping.ts` 后，用 Node 24 运行 `node scripts/build-photo-assets.mjs`，并更新 `PhotoStudio.ts` 的资源版本参数，避免浏览器缓存旧映射。

资源编码、鼠标映射及渲染生命周期见 [图片版说明](../../../scripts/README-photo-lab.md)。图片版默认不加载城市 GLB、HDR 或树木；实时粒子引擎仅在选中后初始化。
