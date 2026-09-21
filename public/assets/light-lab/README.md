# LIGHT LAB 资产接入规范与热插拔指引

本项目现已部署双轨架构：默认启用高拟真程序化 3D 建筑场景；如需接入由 Blender / Rhino / SketchUp 制作的工程级资产，只需将对应文件放置于本目录下对应文件夹，系统即可自动热加载。

## 目录结构

```text
public/assets/light-lab/
├── models/
│   ├── light-field.glb       # 01 实时光场建筑模型（含展厅/柱廊/地面）
│   ├── pixel-facade.glb      # 02 像素立面建筑幕墙模型
│   └── day-night.glb         # 03 昼夜切换建筑外观模型
├── materials/
│   ├── concrete/             # 混凝土 PBR 贴图（color.webp, normal.webp, rough.webp）
│   ├── stone/                # 石材 PBR 贴图
│   └── metal/                # 金属构件贴图
├── environment/
│   ├── studio.hdr            # 室内光环境反射图
│   ├── daytime.hdr           # 日间天空 HDR
│   └── night.hdr             # 夜间环境 HDR
├── pixel-facade/
│   └── pixel-positions.json  # 异形幕墙像素点阵坐标定义
└── comparisons/
    ├── project-day.webp      # 昼夜对比日景工程照片 (1600px+)
    └── project-night.webp    # 昼夜对比夜景工程照片 (1600px+)
```

## 建模与导出规范
- **格式**：GLB（嵌入材质与纹理）
- **坐标系**：Y-Up，单位为米（m）
- **命名规范**：主采光面命名为 `Wall_Main`，柱子命名为 `Pillar_*`，地面命名为 `Floor`，天花命名为 `Ceiling`
- **材质槽**：独立材质槽，PBR 标准金属度/粗糙度工作流
