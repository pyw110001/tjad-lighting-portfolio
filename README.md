# TJAD 建筑照明所互动作品网站 (TJAD Architectural Lighting Portfolio)

一个以“**建筑化照明**”为核心的高品质作品型品牌网站。依托同济大学建筑设计研究院（TJAD）建筑照明所 2023 年团队画册与代表性实践资料，展示 29 个代表项目、11 个重点精选案例，以及重构升级的 **LIGHT LAB 光的实验室**（光场、像素立面、昼夜场景、色温工作室、流光粒子）与 3D 视差海报等深度互动体验。

> 当前仓库为独立网站工程，原始资料保存在 `content-source/`，同步脚本不会修改这些文件。仓库默认按私有项目管理；公开发布前请完成图片与品牌授权核验。

---

## 核心特色与完成情况

### 1. 全新 HERO 首屏视觉与动态光感交互
- **建筑光影高清重绘（AI HD Redrawn）**：基于安藤忠雄式清水混凝土光影回廊，呈现高精度对拉螺栓孔、模板肌理、垂直极简光缝（Warm Gold Light Slit）、阶梯漫反射及湿石镜面光泽（`hero-portal.webp`，896×1200，WebP 仅 58KB）。
- **极简双栏海报构图**：左侧现代高对比度排版（`LIGHT GIVES FORM.` + `以光，构筑空间。`），右侧 22px 典雅大圆角建筑光廊卡片。
- **MOVE TO ILLUMINATE 动态交互**：光标在首屏漫游时，暖金光晕（`hero-portal-glare`）在拱廊与地面动态流动，底部呼吸指示灯即时响应。
- **顶部极简双语导航**：金色品牌名 `TJAD / ARCHITECTURAL LIGHTING`，大写导航 `ABOUT` / `WORK` / `LAB` / `CONTACT`，移动端无缝支持中英双语。

### 2. 精选作品 3D 视差海报（3D Parallax Poster）
- **多层深度微视差**：鼠标移动或触控拖拽时，海报前景标签、后景建筑、悬浮角标产生多层景深位移与平滑回弹。
- **动态光斑漫射（Dynamic Glare）**：光标掠过卡片时动态投射光照高光，增强实体画册般的触感。
- **全方位无障碍与降级**：支持键盘方向键精确操控视差、`Escape` 键一键复位，在 `prefers-reduced-motion` 模式下自动平滑降级。

### 3. LIGHT LAB 光的实验室（5 大交互模块）
- **天顶天球日行弧（Celestial Sun Arc Hero）**：顶部 24 小时太阳运动轨迹天球弧，太阳核心光球随时间滑块实时沿轨道漫游并呼吸脉动。
- **01 LIGHT FIELD（光场模拟）**：
  - 支持 24h 日照滑块、方位角罗盘手柄与照度（Lux）动态计算。
  - 支持“自然光 / 人工光”一键切换与参数复位。
- **02 PIXEL FACADE（像素立面）**：
  - 基于 Procedural GPU Fragment Shader 实现建筑外立面 LED 点阵媒体屏。
  - 真实模拟发光二极管（LED Diode）微内核、柔光光晕（Bloom Halo）与发光网格。
  - 内置 5 种动态光影模式：波浪（`wave`）、涟漪（`ripple`）、粒子流（`flow`）、几何格纹（`lattice`）、文本滚动（`TJAD`）。
  - 支持播放/暂停、动态速率调节与动画重置。
- **03 DAY / NIGHT（昼夜场景对比）**：
  - 左右滑动分屏对比滑块（Compare Slider），支持鼠标拖拽与触控。
  - 联动 24 小时昼夜时间轴与典型时段照明策略提示（晨曦、日间、黄昏、深夜节能）。
- **04 COLOR STUDIO（色温工作室）**：
  - 4 种典型空间光色温预设：暖光 3000K、中性光 4000K、冷白光 6000K、彩色氛围光。
  - 实时预览空间材质在不同色温下的情绪氛围与显色效果。
- **05 FLUID LIGHT（流光粒子）**：
  - WebGPU 粒子模拟支持鼠标吸附、推散、色温切换与参数调节；不支持 WebGPU 时显示静态预览。
  - 可选摄像头手势控制，使用 MediaPipe 识别食指与捏合动作。
- **光环境设计指引与一键方案导出（Lighting User Guide & Export）**：
  - 4 步结构化照明设计工作流（自然光评估 → 立面互动 → 昼夜平衡 → 色温定制）。
  - 一键截取当前实验室状态生成照明方案预览卡片。

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
- **29 个完整项目档案**：11 个精选标记、文化艺术/城市景观/商业办公等 7 大分类筛选、实时中英文搜索与 URL 查询参数持久化。
- **高精度项目详情页**：项目图集、画册 OCR 数据清洗修复、图片大图灯箱查看、下一项目平滑导引。
- **团队底蕴与学术研究**：团队设计哲学、业务范围、领军人物、2020—2022 年 IES 等重要团队荣誉。
- **高性能工程化与自动化保障**：
  - 230 张画册原图响应式处理与 WebP 自动压缩。
  - 36 个路由全部通过 Vite SSR 预渲染（Prerender），支持直接 URL 访问与纯静态部署。
  - 42 项 Playwright 桌面与移动端 E2E 自动化测试（通过率 100%）。
  - 14 项单元测试覆盖内容解析、动画步进与状态管理（通过率 100%）。

---

## 本地运行

需要 Node.js 24，或 Node.js 22.12+ 的 22.x 版本；浏览器端自动化测试使用系统安装的 Google Chrome。

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
```

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
src/components/     导航、页脚、图集、3D 视差海报与全站交互
src/content/        TypeScript 类型、结构化内容与筛选逻辑
src/experience/     WebGL 光场、GLSL 像素立面、昼夜对比与色温预览
src/pages/          首页、作品、详情、团队、光的实验室、联系及 404
tests/              Playwright E2E 自动化测试与截屏快照
```

---

## 资料与版权说明

- **技术栈**：React 19、TypeScript、Vite、React Router、Three.js / React Three Fiber、GSAP、Playwright、Vitest、Sharp。
- **版权声明**：画册原始资料版权归原权利人所有。网站代码与原创交互不自动授予项目图片、角色形象或第三方品牌的再发布权。
