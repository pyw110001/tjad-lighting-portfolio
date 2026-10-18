# 固定视角图片光影测试

入口为 `/lab?mode=photo`。三套参考图片对应 collins、facade、sphere。原始图片仅作为遮罩内部的暖色灯光演示层；界面背景使用已清理月亮、标语和原灯点的独立底图。所有项目引用的图片、UV 和遮罩数据均保存在 `public/assets/light-lab/photo/`。

## 资源与映射

`src/experience/photo/mapping.ts` 以 1672×941 原图像素为标定坐标，定义塔楼连续两面、弧形幕墙分段曲面和球体正面半球映射。背景按完整构图缩放置于顶栏与底栏之间，不裁切主体。球馆显示区覆盖从球顶到玻璃大厅上沿的完整地上穹顶，UV 纵向按球面纬度展开，正面没有经度接缝；大厅和前景景观保持原图。塔楼、弧形馆的独立屋顶保留。

`*-uv-high.png` 的 R/G 为 UV 高字节，B 为显示区覆盖率；`*-uv-low.png` 的 R/G 为低字节，B 为曲面明暗。两张图 alpha 全为 255，避免浏览器透明预乘损坏数值。WebGL 逐个读取邻近像素、解码为 16 位 UV 后再按遮罩权重双线性插值，避免低字节进位造成错误，也避免放大时出现参考图片像素的阶梯。鼠标使用同一标定函数并应用素材铺满、位移参数，和画面采样一致。修改映射后更新 PhotoStudio 中的 UV 资源版本参数，刷新预览以加载新版本。

素材颜色始终从原始上传图片、视频帧或实时画面连续采样，灯珠仅调制亮度，不能将素材强制降采样到灯珠网格。颗粒感设为 0 时输出平滑信号，柔光也随颗粒感消退；灯点使用导数抗锯齿。合成画布按屏幕像素密度渲染，上限为 2 倍。静态上传图片只在更换素材时上传 GPU，并建立 mipmap；可用时启用最高 8 倍各向异性过滤，减少斜面上细线与文字的闪烁。视频及实时画面使用逐帧线性过滤。

修改标定后，在 Node 24 环境下运行 `node scripts/build-photo-assets.mjs` 重建 UV/遮罩。重新编码图片时运行 `node scripts/build-photo-assets.mjs --plates 清理后PNG目录 --sources 原参考PNG目录`，两个目录都包含 collins.png、facade.png、sphere.png。PNG 必须保持 1672×941。该脚本只进行编码和数值贴图烘焙，不修改源图片。

## 图片清理

使用内置图像编辑工具，分别引用用户提供的三张原图。共同提示词：精确对象编辑；保持原始完整画幅、相机、建筑轮廓、街道、树木、玻璃大厅照明和环境反射；删除月亮、左下英文标语和青色竖线，补回天空与路面；仅移除主体 LED 金色灯点及其直接辉光，恢复深色金属表皮和曲面明暗；不裁切、不缩放、不添加对象和文字。塔楼额外要求保留两面转角及全部上升灯条到尖顶；球馆额外要求保留不透明上盖及玻璃大厅顶边。最终输出分别编码为 `collins-background.webp`、`facade-background.webp`、`sphere-background.webp`。

## 生命周期

Light Lab 的 `LabMediaSession` 独占上传文件的 URL 和解码元素。图片与 3D 渲染器只借用元素并释放各自 GPU 贴图。离开某个模块不会撤销上传 URL；离开实验室、重置或成功替换素材才撤销。切换实时来源会暂停上传视频，返回时保留用户此前的播放意图和时间；进入其他实验模块时暂停视频。

图片合成每帧只绘制两个三角形。静态时无连续绘制，视频使用 requestVideoFrameCallback，Chroma 以 30 fps 更新源纹理，Fluid 使用现有 24 fps canvas 视频桥。图片版两种实时来源均独立输出 1920×1080，清晰度不再取决于浮窗预览大小；场景切换或浮窗折叠不重新创建来源引擎。只有选择相应实时来源才加载粒子引擎。WebGPU 不可用时禁用 Fluid；源加载失败保留已有素材。

验证：`npm run build`、`npm test`、`npm run test:e2e -- --project=desktop tests/photo-lab.spec.ts tests/lab-imports.spec.ts tests/lab-redesign.spec.ts tests/fluid-light.spec.ts`。截图输出到工作区外的 QA 目录。桌面端为本次验收范围。
