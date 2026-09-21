# TJAD 建筑照明所互动作品网站

一个以“建筑化照明”为核心的作品型品牌网站。它使用 2023 年团队画册资料，展示 29 个代表项目、11 个互动／媒体／体验方向精选案例，以及光场、像素立面、昼夜场景三个概念交互实验。

> 当前仓库为独立网站工程，原始资料保存在 `content-source/`，同步脚本不会修改这些文件。仓库默认按私有项目管理；公开发布前请完成图片与品牌授权核验。

## 当前完成情况

- 深色建筑光廊首页、6 个重点项目与响应式移动布局
- 29 个项目档案、11 个精选标记、分类筛选、名称搜索和 URL 状态
- 项目详情、项目图集、图片放大查看、下一项目导航
- 团队理念、设计／咨询／研究、负责人、2020—2022 年荣誉
- Light Lab：实时光场、像素立面、真实画册图片的昼夜状态切换
- 首次会话粒子开场、文字与图片揭示、磁吸光标、页面光幕转场
- WebGL、触控设备和 `prefers-reduced-motion` 降级
- 230 张图片的内容映射、响应式 WebP 生成与来源哈希
- 35 个路由预渲染，详情页可直接访问；生产构建包含 SPA fallback
- 内容单元测试和桌面／移动端 Playwright 核心流程测试

## 本地运行

需要 Node.js 20 或更高版本；浏览器端自动化测试使用本机安装的 Google Chrome。

```bash
npm install
npm run content
npm run dev
```

浏览器打开 `http://127.0.0.1:5173/`。

生产构建与预览：

```bash
npm run build
npm run preview
```

测试：

```bash
npm test
npm run test:e2e
```

## 内容维护

1. 在 `content-source/文字/` 修改或补充 Markdown，在 `content-source/图片/` 放入项目图片。
2. 保持 `图片/02_案例/{编号_项目名}/` 与项目编号一致。
3. 执行 `npm run content`。脚本会生成：
   - `src/content/projects.json`：项目结构化数据
   - `src/content/team.json`：团队内容
   - `src/content/media.json`：图片性质、尺寸、来源与网页路径
   - `public/assets/`：响应式 WebP
   - `public/sources/`：可查看的文字资料副本
   - `docs/source-hashes.json`：源资料校验哈希
4. 检查 `docs/content-audit.md` 和 `docs/asset-manifest.md`，然后运行测试与构建。

内容规则：画册事实与编辑分析分别保存；“施工中”“设计中”均标为 2023 年画册历史状态；方案效果图不会标成竣工项目影像；明显的 OCR 冲突保留在 `rawFacts`，不直接展示为确定事实。

## 项目结构

```text
content-source/     2023 年画册拆解的原始文字与图片
docs/               内容审计、素材清单、设计参考与 QA 截图
public/assets/      生成后的品牌与项目媒体资源
scripts/            内容同步、图片处理与预渲染脚本
src/components/     导航、页脚、图集和全站效果
src/content/        类型、结构化内容与筛选逻辑
src/experience/     WebGL 光场、像素立面和昼夜切换
src/pages/          首页、作品、详情、团队、实验室、联系及 404
tests/              浏览器端核心流程
```

## 尚未完成／上线前事项

- [ ] 由团队确认 2023 年以后项目状态、奖项、负责人履历及联系方式是否仍有效。
- [ ] 核验全部项目图片、吉卜力相关影像、TJAD 名称和品牌元素的公开发布授权；补充摄影师及版权署名。
- [ ] 用团队提供的高分辨率原片替换宽度不足 1200px 的关键首屏／项目图片。
- [ ] 复核画册 OCR 中存在疑点的字段，尤其科大讯飞项目面积和 IFF 地址文本。
- [ ] 在真实桌面与移动设备上完成长时间 GPU、帧率、触控和发热测试；目前仅完成浏览器模拟与功能验证。
- [ ] 在 Safari、Firefox 和低端 Android 设备执行跨浏览器回归。
- [ ] 部署到正式域名后运行 Lighthouse／Web Vitals 实测；LCP、CLS、INP 与帧率是目标，不在本地构建阶段宣称达标。
- [ ] 配置正式托管平台的 SPA fallback、缓存策略、安全响应头和自定义域名。
- [ ] 如需收集客户线索，另行接入经过隐私审核的后端表单；首版联系页仅提供邮件与电话。
- [ ] 如需非开发人员长期维护，评估接入 CMS；当前以 Markdown／TypeScript 数据构建。

## 已知限制

- 源资料没有视频和 3D 模型，首屏建筑光廊是原创品牌视觉，Light Lab 是独立概念模型。
- 像素立面与光场用于解释设计概念，不代表某个项目的真实灯控系统或照度计算结果。
- 低分辨率图片以原始尺寸呈现，页面不会强制放大全屏。
- 联系信息来自 2023 年画册，仓库不包含联系表单或服务端。

## 资料与技术

技术栈：React、TypeScript、Vite、React Router、Three.js／React Three Fiber、GSAP、Vitest、Playwright、Sharp。

画册原始资料的权利归原权利人所有。网站代码与原创交互不自动授予项目图片、角色形象或第三方品牌的再发布权。
