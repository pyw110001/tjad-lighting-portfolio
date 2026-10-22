import { DEFAULT_SETTINGS, type StudioConfig, type SceneId, type NightSceneId, type MediaInfo } from './studioTypes';

const demo = (name: string, previewUrl: string | null = null): MediaInfo => ({ name, kind: 'demo', width: 0, height: 0, duration: 0, previewUrl });
export const PHOTO_CONFIG: StudioConfig<SceneId> = {
  initial: 'collins', scenes: [
    { id: 'collins', name: '888 Collins', label: '888 COLLINS STREET', media: demo('街区塔楼灯带演示'), settings: DEFAULT_SETTINGS.collins,
      controls: 'strips', caption: '让建筑随光流动。', note: '画面沿塔楼竖向灯带连续显示' },
    { id: 'facade', name: '弧形点阵展馆', label: 'CURVED PAVILION', media: demo('弧形展馆点阵演示'), settings: DEFAULT_SETTINGS.facade,
      controls: 'dots', caption: '让每个光点呼吸。', note: '画面按圆形光点位置采样' },
    { id: 'sphere', name: '球形展馆', label: 'DOME PAVILION', media: demo('球形展馆地球夜景'), settings: DEFAULT_SETTINGS.sphere,
      controls: 'sphere', caption: '让影像点亮整座城市。', note: '图片已映射到球形展馆' },
  ],
};
export const NIGHT_CONFIG: StudioConfig<NightSceneId> = {
  initial: 'dome', scenes: [
    { id: 'dome', name: '城市穹顶', label: 'CITY DOME', controls: 'dots', caption: '让影像点亮整座城市。', note: '正面完整显示 · 背面左右镜像' },
    { id: 'fluid', name: '流线灯幕', label: 'FLUID PIXELS', controls: 'dots', caption: '让建筑随光流动。', note: '画面拉伸铺满整幅流线灯幕', referenceView: true },
    { id: 'field', name: '光柱广场', label: 'LUMEN FIELD', controls: 'columns', caption: '走进流动的光场。', note: '紫青灯光缓慢流动，也可切换为暖白向上呼吸循环。', independent: true, referenceView: true },
  ].map(scene => ({ ...scene, id: scene.id as NightSceneId, controls: scene.controls as 'dots' | 'columns',
    media: demo(scene.independent ? '紫青光场 · 循环' : `${scene.name}原生灯光演示`), settings: { ...DEFAULT_SETTINGS.facade } })),
};
