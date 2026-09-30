# TJAD 建筑照明所互动作品网站 (TJAD Architectural Lighting Portfolio)

一个以“**建筑化照明**”为核心的作品型品牌网站。依托同济大学建筑设计研究院（TJAD）建筑照明所 2023 年团队画册与代表性实践资料，展示 29 个代表项目、11 个重点精选案例，以及 **LIGHT LAB 光的实验室**（昼夜切换、流光粒子、色彩粒子场、建筑光影模拟、图片版测试项）与 3D 视差海报等互动体验。

> 当前仓库为独立网站工程，原始资料保存在 `content-source/`，同步脚本不会修改这些文件。画册、品牌和第三方素材的权利说明见文末。

---

## 核心特色与完成情况

### 1. 全新 HERO 首屏视觉与动态光感交互
- **建筑光影高清重绘（AI HD Redrawn）**：基于安藤忠雄式清水混凝土光影回廊，呈现高精度对拉螺栓孔、模板肌理、垂直极简光缝（Warm Gold Light Slit）、阶梯漫反射及湿石镜面光泽（`hero-portal.webp`，896×1200，WebP 仅 58KB）。
- **极简双栏海报构图**：左侧现代高对比度排版（`LIGHT GIVES FORM.` + `以光，构筑空间。`），右侧 22px 典雅大圆角建筑光廊卡片。
- **MOVE TO ILLUMINATE 动态交互**：光标在首屏漫游时，暖金光晕（`hero-portal-glare`）在拱廊与地面动态流动，底部呼吸指示灯即时响应。
- **Hero → Selected Work 金色粒子轨迹**：桌面端使用轻量 WebGL 粒子与 GSAP ScrollTrigger。从页面顶部开始向下滚动时，粒子自左上角渐次出现，穿过 Hero 并在「精选作品」标题后方回环延伸；向上滚动时反向收回，回到顶部后完全消失。离屏或切换后台时暂停绘制，减少动态效果设置下隐藏该装饰。
- **直接进入首页**：移除首次访问时的粒子开场动画，页面加载后立即呈现 Hero；滚动粒子轨迹保留。
- **独立中英文切换**：右上角导航旁的暖金胶囊控件切换全站页面、29 个项目档案及 Light Lab 控件文案；选择保存在浏览器中，并同步更新页面语言和标题。

### 2. 精选作品 3D 视差海报（3D Parallax Poster）
- **多层深度微视差**：鼠标移动或触控拖拽时，海报前景标签、后景建筑、悬浮角标产生多层景深位移与平滑回弹。
- **动态光斑漫射（Dynamic Glare）**：光标掠过卡片时动态投射光照高光，增强实体画册般的触感。
- **项目标题交互**：悬停或键盘聚焦作品入口时，暖金箭头展开，标题字母逐个翻动；精选作品与部分章节标题采用逐行遮罩显现。
- **全方位无障碍与降级**：支持键盘方向键精确操控视差、`Escape` 键一键复位，在 `prefers-reduced-motion` 模式下自动平滑降级。

### 3. LIGHT LAB 光的实验室（5 大交互模块）

实验室采用固定顶栏、左侧模块导航和可折叠参数面板。`/lab` 默认进入昼夜切换；旧的实时光场、像素立面和色温工作室入口已移除。

| 模块 | 入口 | 主要能力 |
| --- | --- | --- |
| 01 昼夜切换 / Day / Night | `/lab?mode=day` | 同构日夜图片对比、时间轴、鼠标及键盘调整分割线、PNG 导出 |
| 02 流光粒子 / Fluid Light | `/lab?mode=wave` | WebGPU 粒子模拟、自选颜色、粒子数量和动力学参数、鼠标吸引及推散、可选 MediaPipe 摄像头手势 |
| 03 色彩粒子场 / Chroma Field | `/lab?mode=chroma` | 上传图片生成色彩粒子、鼠标交互、音频响应、参数调节及画面导出 |
| 04 建筑光影模拟 / Lightform Studio | `/lab?mode=lightform` | 888 Collins、弧形馆、球形馆三套 3D 夜景，默认塔楼；支持图片、视频和实时粒子映射、视角操作及 PNG 导出 |
| 05 测试项 / Photo Lab | `/lab?mode=photo` | 同三景的固定图片构图，默认塔楼；以 WebGL2 单平面合成背景与动态素材，保留玻璃大厅、景观和建筑遮挡 |

**建筑素材与交互**

- 3D 与图片版共享上传图片、视频、播放意图及进度；支持视频播放、暂停、定位，上传失败时保留上一素材。上传会话在离开实验室时释放。
- 可切换 Chroma 或 Fluid 实时来源，沿用粒子颜色、数量与动力学设置；左键拖动吸引、右键扩散。图片版通过显示区 UV 将鼠标位置转换到粒子坐标，视角保持固定。
- 支持亮度、灯点大小、颗粒感、柔光及画面水平／垂直位置调节；上传素材默认铺满显示区。
- 图片版塔楼连续映射两面灯条直至尖顶，弧形馆覆盖整块上层幕墙，球馆覆盖从球顶到玻璃大厅上沿的完整穹顶，正面无经度接缝。未选择素材时显示原图暖色灯光演示。
- 素材连续采样，灯点仅调制亮度，颗粒感为 0 时保留平滑画面的细节；16 位 UV 解码后插值，静态图片采用 mipmap 与可用的各向异性过滤。图片版实时来源输出 1920×1080，合成画布支持最高 2 倍屏幕像素密度。

**资源与运行开销**

- 3D 城市模型按需加载并缓存；Blender 导出移除月亮、重建开放树池、降低土壤面、修复车辆灯片共面并校准夜景地面反射。使用 ez-tree 生成轻量树木，保留加载失败时的树网格回退。
- 图片版默认不请求城市 GLB、HDR 或树木资源；静态画面停止连续绘制，视频按素材帧更新，实时来源仅在选中后初始化。场景切换与浮窗折叠不重建实时来源引擎。
- WebGL / WebGPU 不可用时显示相应回退提示；离开模块释放渲染器资源。新增三景的画质与性能验收以桌面 Chrome 1440×900 为目标。

### 4. LIGHT INTERFACE SYSTEM 设计系统与全站交互重构
- **核心理念**：*LIGHT IS THE INTERFACE. 让光成为交互语言。* 沉淀于 `src/design-system/`，为全站提供统一的设计工程规范与微交互动效体系。
- **四大光学语义元素**：
  - **LIGHT POINT（光点）**：6-8px 琥珀光晕游标核心与导航指示光点，引导视线焦点。
  - **LIGHT BEAM（光束）**：胶囊按钮斜向微米扫光、卡片掠光扫描与边缘流光遍历（Edge Traveling Beam）。
  - **LIGHT CURTAIN（光幕）**：全屏幕布垂直跌落转场与半透遮罩，层叠展示中英大写项目与动态画册缩略图。
  - **LIGHT FIELD（光场）**：环境微光、暗色奢侈基底（`#080A0E`、`#15191F`、`#20252C`）与冷暖双色温光晕（`#C6B58B` / `#84A9B8`）。
- **完整组件套件**：
  - `LightButton`、`OutlineLightButton`、`TextLightButton`、`GlowIconButton`
  - `LightSegmentedControl`（平滑滑块药丸）、`LightSlider`（发光轨道与发光游标）
  - `TemperatureSlider`（基于普朗克黑体辐射轨迹的 2700K–6500K CCT 实时计算滑块）
  - `LightPresetCard`（光束角度模拟）、`LightSwitch`（光学状态切换）
  - `LightNavbar`（桌面极简滑动光点导航）、`FullscreenMenu`（光幕移动端抽屉）
  - `LightProjectCard`（掠光投影与卡片微交互）、`UnifiedMagneticCursor`（多态磁吸光学游标）
- **独立验证展厅（`/ui-showcase`）**：全量展示组件所有状态（Default, Hover, Pressed, Active, Disabled, Loading），支持屏幕阅读器与纯键盘无障碍操控。

### 5. 项目档案与全站体验
- **29 个完整项目档案**：11 个精选标记、文化艺术/城市景观/商业办公等 7 大分类筛选、实时中英文搜索与 URL 查询参数持久化。英文项目名称、简介、档案字段和照明解读位于 `src/content/project-en.ts`；同步原始内容后需同步校对英文版本。
- **高精度项目详情页**：项目图集、画册 OCR 数据清洗修复、图片大图灯箱查看、下一项目平滑导引。
- **团队底蕴与学术研究**：团队设计哲学、业务范围、领军人物、2020—2022 年 IES 等重要团队荣誉。
- **高性能工程化与自动化保障**：
  - 230 张画册原图响应式处理与 WebP 自动压缩。
  - 36 个路由全部通过 Vite SSR 预渲染（Prerender），支持直接 URL 访问与纯静态部署。
  - Playwright 覆盖站点导航、语言切换、实验室交互、媒体会话、资源加载、映射与导出；提供桌面与移动端测试项目。
  - Vitest 覆盖内容解析、动画步进、状态管理和图片版 UV 映射。

---

## 本地运行

需要 Node.js 20.19+（推荐使用 `.nvmrc` 中的 24.19.0）；浏览器端自动化测试使用系统安装的 Google Chrome。

```bash
npm install
npm run content
npm run dev
```

浏览器打开 `http://127.0.0.1:5173/`。

### 生产构建与本地预览

```bash
npm run build
npm run preview
```

### 运行自动化测试

```bash
# 运行单元测试
npm test

# 运行全量端到端测试（桌面端与移动端）
npm run test:e2e

# 实验室桌面回归（1440×900，系统 Chrome）
npm run test:e2e -- --project=desktop tests/photo-lab.spec.ts tests/lab-imports.spec.ts tests/lab-redesign.spec.ts tests/fluid-light.spec.ts
```

如已有本地预览占用默认端口，可设置 `PLAYWRIGHT_PORT` 使用其他端口。图片版测试包含穹顶覆盖、细密条纹、显示区遮挡、视频跨模块进度、实时源 Full HD 输出、静态停止绘制及 2 倍像素密度导出。

### 实验室资源维护

- [Blender 导出与 GLB 校验](scripts/README-lightform.md)：读取相邻 `blender_anti` 源工程，重建浏览器模型，原始 `.blend` 保持只读；每景目标低于 25 MiB、150 万三角形。
- [图片版资源与 UV 标定](scripts/README-photo-lab.md)：使用已清理的背景、原图演示层与数值 UV 贴图；运行 `node scripts/build-photo-assets.mjs` 重建映射。该脚本直接读取 TypeScript 标定文件，需要 Node 24。
- [实验室资产目录](public/assets/light-lab/README.md)：资源用途、显示网格名称和素材路径。

---

## 内容维护工作流

1. 在 `content-source/文字/` 修改或补充 Markdown，在 `content-source/图片/` 放入项目图片。
2. 保持 `图片/02_案例/{编号_项目名}/` 与项目编号一致。
3. 执行 `npm run content`。脚本会自动完成：
   - `src/content/projects.json`：项目结构化数据生成
   - `src/content/team.json`：团队内容提取
   - `src/content/media.json`：图片性质、尺寸、来源与网页路径索引
   - `public/assets/`：响应式 WebP 生成与哈希校验
   - `public/sources/`：文字资料可查副本
   - `docs/source-hashes.json`：源资料校验哈希
4. 执行 `npm run build` 和 `npm run test:e2e` 验证预渲染与全站功能。

---

## 项目架构

```text
content-source/     2023 年画册拆解的原始文字与图片
docs/               内容审计、素材清单、设计参考与 QA 截图
public/assets/      生成后的品牌与项目媒体资源（WebP 格式）
scripts/            内容同步、图片处理与预渲染脚本
src/components/     导航、页脚、图集、首页 WebGL 粒子与全站交互
src/content/        TypeScript 类型、结构化内容与筛选逻辑
src/experience/     昼夜状态、WebGPU 流光、Chroma、3D Lightform、图片版 Photo Lab
src/pages/          首页、作品、详情、团队、光的实验室、联系及 404
tests/              Playwright E2E 自动化测试与截屏快照
```

---

## 资料与版权说明

- **技术栈**：React 19、TypeScript、Vite、React Router、Three.js / React Three Fiber、GSAP、Playwright、Vitest、Sharp。
- **树木生成**：[@dgreenheck/ez-tree](https://github.com/dgreenheck/ez-tree)；依赖及本地 Draco 解码器的许可文件见各软件包。
- **版权声明**：画册原始资料版权归原权利人所有。网站代码与原创交互不自动授予项目图片、角色形象或第三方品牌的再发布权。
