# TJAD 建筑照明所互动作品网站 (TJAD Architectural Lighting Portfolio)

一个以“**建筑化照明**”为核心的作品型品牌网站。依托同济大学建筑设计研究院（TJAD）建筑照明所 2023 年团队画册与代表性实践资料，展示 29 个代表项目、11 个重点精选案例，以及 **LIGHT LAB 光的实验室**（昼夜切换、流光粒子、色彩粒子场、粒子流场，以及建筑光影模拟、图片版测试项两个展示入口）与 3D 视差海报等互动体验。

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

### 3. LIGHT LAB 光的实验室（4 项实验 + 2 项展示）

实验室采用固定顶栏、左侧模块导航和可折叠参数面板。`/lab` 默认进入昼夜切换；旧的实时光场、像素立面和色温工作室入口已移除。

| 模块 | 入口 | 主要能力 |
| --- | --- | --- |
| 01 昼夜切换 / Day / Night | `/lab?mode=day` | 同构日夜图片对比、时间轴、鼠标及键盘调整分割线、PNG 导出 |
| 02 流光粒子 / Fluid Light | `/lab?mode=wave` | WebGPU 粒子模拟、自选颜色、粒子数量和动力学参数、鼠标吸引及推散、可选 MediaPipe 摄像头手势 |
| 03 色彩粒子场 / Chroma Field | `/lab?mode=chroma` | 上传图片生成色彩粒子、鼠标交互、音频响应、参数调节及画面导出 |
| 04 粒子流场 / Particle Field | `/lab?mode=particles` | 漂流、旋涡、极光、星轨、原始五种效果；Canvas 2D 与手动 WebGPU 切换、圆盘交互、共享实时建筑映射 |
| 建筑光影模拟 / Lightform Studio | `/lab?mode=lightform` | 城市穹顶、流线灯幕、光柱广场三套 3D 夜景，默认城市穹顶；穹顶背面镜像、流线灯幕整面拉伸映射；光柱广场独立播放暖白上升呼吸循环（桌面端） |
| 测试项 / Photo Lab | `/lab?mode=photo` | 保留塔楼、弧形展馆、球形展馆的固定图片构图，默认塔楼；以 WebGL2 单平面合成背景与动态素材，保留玻璃大厅、景观和建筑遮挡 |

**粒子流场**

- 首次进入为 Classic 原始 400 粒子与 Canvas 2D；不自动申请 GPU。四种增强效果可切到 WebGPU，失败或设备丢失回退当前效果的 2D 版本。中英文跟随全站；刷新恢复默认参数。
- 圆盘左右控制吸引/排斥，上下控制混沌/平静；方向键步长 0.05，Shift + 方向键 0.15，Home 回中。增强效果支持指针扰动与按住吸引；Classic 使用圆盘控制。
- 工具栏支持暂停、重置、明暗、单色、实验区全屏与隐藏/恢复。聚焦实验区后可用 Space / R / H；GPU 的「响应」入口提供 10–150% 交互速度，默认 45%，Escape 关闭。
- 展示浮窗使用完整交互面板，不再沿用旧视频缩略图高度；矮屏重新排列控件，极矮窗口可内部滚动，避免裁切或遮挡圆盘和预设。
- 城市穹顶、流线灯幕与图片版测试项可直接选「使用粒子流场实时画面」，在实时浮窗完整调节。它们与粒子实验共享参数、模拟时间与同一个运行实例；切换这些显示场景、语言或折叠浮窗不会重播动画。光柱广场使用独立灯效，返回建筑显示场景后保留之前选择的素材。
- 源画布为固定 16:9：桌面逻辑尺寸 1280×720，移动端 768×432；2D 直接采样 Canvas，GPU 经 30fps 视频轨道桥接，映射不包含圆盘和工具栏。离屏、后台或未使用粒子来源时暂停，退出实验室释放资源；减少动态效果默认暂停。
- 城市穹顶、流线灯幕默认旋转视角，可切换「粒子交互」在显示面上操作增强效果；测试项直接通过固定视角显示面交互。光柱广场保留相机操作，不提供粒子映射。来源见 [粒子流场来源与许可](src/experience/particles/PROVENANCE.md)。

**粒子流场映射操作**

1. 进入「04 粒子流场」，选择预设并调整圆盘。原始效果固定使用 2D；先选择漂流、旋涡、极光或星轨，才可启用 GPU。
2. 打开「建筑光影模拟」中的城市穹顶、流线灯幕，或打开「测试项」，在「素材」面板点击「使用粒子流场实时画面」。也可直接从这些展示项启动默认粒子效果。
3. 在实时浮窗中调节预设、播放、颜色、圆盘及渲染模式，建筑会同步更新。折叠浮窗不停止映射；切换穹顶、流线灯幕、图片三景或返回粒子实验会延续同一动画。
4. 需要直接在 3D 建筑表面操作时，切换到「粒子交互」；操作相机时切回「旋转视角」。测试项固定视角，增强效果可直接在显示区扰动；Classic 使用浮窗圆盘。

矮屏会收紧浮窗布局，极矮窗口可在浮窗内滚动查看全部控件。其他实验室模块保留既有手机布局：素材与参数侧栏互斥展开，流光粒子的控制区位于画布下方。本次三维场景替换仅面向桌面端，不新增移动端适配与验收。

**建筑素材与交互**

- 城市穹顶、流线灯幕与图片版共享上传图片、视频、播放意图及进度；支持视频播放、暂停、定位，上传失败时保留上一素材。上传会话在离开实验室时释放。
- 这些显示场景可切换 Chroma 或 Fluid 实时来源，沿用粒子颜色、数量与动力学设置；左键拖动吸引、右键扩散。三维着色器与鼠标拾取使用统一的素材坐标转换，并检查遮挡与有效区域；图片版通过显示区 UV 转换鼠标位置，视角保持固定。
- 各三维场景独立保存显示参数和视角，支持相机预设、恢复默认与 PNG 导出。城市穹顶默认居中、等比完整显示素材，比例不匹配时留暗区，背面呈现正面的左右镜像；流线灯幕将画面拉伸铺满整个有效显示面。两者保留素材偏移调节，玻璃、屋顶和辅助装饰沿用场景材质。
- 光柱广场独立运行暖白灯效：光从柱底缓慢向上点亮，再柔和渐暗，约 9 秒循环。其亮度、柔光与视角独立保存；不显示素材、实时预览及粒子交互控件，不受上传图片、视频、Chroma、Fluid 或粒子流场影响。
- 图片版塔楼连续映射两面灯条直至尖顶，弧形馆覆盖整块上层幕墙，球馆覆盖从球顶到玻璃大厅上沿的完整穹顶，正面无经度接缝。未选择素材时显示原图暖色灯光演示。
- 图片版默认铺满显示区，素材连续采样，灯点仅调制亮度，颗粒感为 0 时保留平滑画面的细节；16 位 UV 解码后插值，静态图片采用 mipmap 与可用的各向异性过滤。图片版 Chroma / Fluid 实时来源输出 1920×1080，粒子流场沿用上述共享固定源尺寸，合成画布支持最高 2 倍屏幕像素密度。

**资源与运行开销**

- 三维场景沿用当前 Three.js 依赖与渲染生命周期，按需生成并缓存几何、材质及城市环境，保留阴影与地面反射；当前三景不请求历史 Blender GLB、HDR 或 ez-tree 模块。点阵立面、六边形灯幕已从可选场景和加载入口移除。
- 图片版默认不请求城市 GLB、HDR 或树木资源；静态画面停止连续绘制，视频按素材帧更新，实时来源仅在选中后初始化。折叠浮窗不停止映射；切到独立光柱场景时卸载实时预览。
- 加载失败提供重试提示，快速切景与加载中退出均处理资源回收；离开三维模块释放几何、材质、贴图、反射目标、后处理、监听器和 WebGL 上下文。WebGL / WebGPU 不可用时显示相应回退提示。

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
  - Vitest 覆盖内容解析、动画步进、状态管理、三维与图片版素材坐标映射、光柱呼吸周期，以及粒子会话初始化、连续性、GPU 回退和资源释放。

---

## 本地运行

需要 Node.js 20.19+（推荐使用 `.nvmrc` 中的 24.19.0）；浏览器端自动化测试使用系统安装的 Google Chrome；如未自动定位，可设置 `PLAYWRIGHT_CHROME_EXECUTABLE` 为 Chrome 可执行文件的绝对路径。

```bash
npm install
npm run content
npm run dev
```

浏览器打开终端打印的本地地址，默认是 `http://127.0.0.1:5173/`；端口占用时 Vite 会选择后续可用端口。建筑光影模拟入口为 `/lab?mode=lightform`，默认城市穹顶；粒子流场入口为 `/lab?mode=particles`。

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

# 本次三维场景与既有实验室桌面回归（串行执行，减少 GPU 资源争用）
npm run test:e2e -- --project=desktop --workers=1 tests/night-scenes.spec.ts tests/lab-imports.spec.ts tests/photo-lab.spec.ts tests/particle-field.spec.ts tests/lab-redesign.spec.ts
```

如已有本地预览占用默认端口，可设置 `PLAYWRIGHT_PORT` 使用其他端口。图片版测试包含穹顶覆盖、细密条纹、显示区遮挡、视频跨模块进度、实时源 Full HD 输出、静态停止绘制及 2 倍像素密度导出。

**2026-10-19 验证记录**

| 检查 | 结果 |
| --- | --- |
| `npm test` | 8 个文件、35 项通过 |
| `npm run build` | 客户端、SSR 构建成功，36 个路由预渲染成功 |
| 上述实验室桌面浏览器回归 | 41 项通过：夜景专项 8 项、既有实验室回归 33 项 |
| 三维场景与映射 | 三个场景入口、穹顶前后镜像、横竖方素材方向、流线灯幕整面覆盖、遮挡与粒子坐标、加载失败重试及退出资源释放 |
| 光柱独立灯效 | 暖白色、自下向上点亮、呼吸渐暗循环；上传素材和共享粒子不改变灯效；返回建筑保留素材选择 |
| 既有功能回归 | 图片三景、素材共享、视频播放与暂停、Chroma / Fluid / 粒子流场、语言切换、参数与视角、PNG 导出 |
| 桌面画面检查 | Chrome 1440×900 与 1600×1000；结合环绕视角和非对称色带检查镜像、方向、覆盖范围与暖白灯柱细节 |

浏览器验证使用系统 Chrome / Playwright。本次三维场景替换仅交付本地可运行版本，未部署；未进行移动端适配，也未进行手机、Safari 或 Firefox 验收。

### 实验室资源维护

- [Night Architecture 来源与集成差异](src/experience/lightform/night/PROVENANCE.md)：当前三维场景基于源仓库提交 `d6b7cf166038332bef29a9f7fa64508b426454b4`；模型生成代码、城市环境及必要规格位于 `src/experience/lightform/night/`，材质纹理位于 `public/assets/light-lab/night/`。未迁入漫游及展品加载。
- 三维与图片场景分别由 `src/experience/lightform/sceneConfig.ts` 配置，渲染器按场景 ID 泛型约束。`mediaMapping.ts` 统一显示面与交互的素材坐标，`columnLighting.ts` 管理独立光柱循环。
- [历史 Blender 导出与 GLB 校验](scripts/README-lightform.md)：保留旧版模型生成流程作为维护参考；当前三维三景不依赖相邻 `blender_anti` 工程。
- [图片版资源与 UV 标定](scripts/README-photo-lab.md)：使用已清理的背景、原图演示层与数值 UV 贴图；运行 `node scripts/build-photo-assets.mjs` 重建映射。该脚本直接读取 TypeScript 标定文件，需要 Node 24。
- [历史三维与图片版资产目录](public/assets/light-lab/README.md)：旧版 GLB、图片资源用途、显示网格名称和素材路径；当前三维来源以 Night Architecture 记录为准。

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
src/experience/     昼夜状态、WebGPU 流光、Chroma、Particle Field、3D Lightform、图片版 Photo Lab
src/pages/          首页、作品、详情、团队、光的实验室、联系及 404
tests/              Playwright E2E 自动化测试与截屏快照
```

---

## 资料与版权说明

- **技术栈**：React 19、TypeScript、Vite、React Router、Three.js / React Three Fiber、GSAP、Playwright、Vitest、Sharp。
- **三维夜景来源**：[threejs-night-architecture](https://github.com/pyw110001/threejs-night-architecture)，基于提交 `d6b7cf166038332bef29a9f7fa64508b426454b4`。源仓库未附 LICENSE；保留来源记录，不据此新增整体开源授权。集成范围和修改详见 [Night Architecture 来源记录](src/experience/lightform/night/PROVENANCE.md)。图片版保留原有三套照片。
- **历史树木生成**：旧版 Blender 场景使用 [@dgreenheck/ez-tree](https://github.com/dgreenheck/ez-tree)；依赖及本地 Draco 解码器的许可文件见各软件包。当前三维夜景使用来源项目的程序化城市环境。
- **粒子流场来源**：本地 Field Studies 项目，Classic 改编自 gabor 的 Particle Drift Field；保留作者与来源，未为无许可原作新增整体开源授权。详见 [来源记录](src/experience/particles/PROVENANCE.md)；Three.js MIT 许可随模块保留。
- **版权声明**：画册原始资料版权归原权利人所有。网站代码与原创交互不自动授予项目图片、角色形象或第三方品牌的再发布权。
