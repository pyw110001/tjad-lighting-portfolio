import React, { useState } from 'react';
import { useLanguage } from '../language';
import {
  LightButton,
  OutlineLightButton,
  TextLightButton,
  GlowIconButton,
  LightSegmentedControl,
  LightSlider,
  TemperatureSlider,
  LightPresetCard,
  LightSwitch,
  LightNavbar,
  FullscreenMenu,
  LightProjectCard,
} from '../design-system';

export default function UIShowcase() {
  const { pick } = useLanguage();
  // State for interactive controls
  const [segmentedValue, setSegmentedValue] = useState('field');
  const [sliderValue, setSliderValue] = useState(65);
  const [tempValue, setTempValue] = useState(3800);
  const [activePreset, setActivePreset] = useState('preset-1');
  const [switchOn, setSwitchOn] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loadingBtn, setLoadingBtn] = useState(false);

  return (
    <div className="ui-showcase-page" style={{ padding: '140px var(--gutter) 100px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '60px', borderBottom: '1px solid var(--lis-border-subtle)', paddingBottom: '30px' }}>
        <span style={{ fontFamily: 'var(--lis-font-mono)', fontSize: '12px', color: 'var(--lis-accent-warm)', letterSpacing: '0.2em' }}>
          {pick('光界面系统 · 组件验证', 'LIGHT INTERFACE SYSTEM · VERIFICATION SUITE')}
        </span>
        <h1 style={{ fontSize: 'clamp(36px, 4.5vw, 64px)', fontWeight: 300, margin: '12px 0 16px', color: 'var(--lis-text-primary)' }}>
          {pick('设计系统与组件展示', 'Design System & Component Showcase')}
        </h1>
        <p style={{ color: 'var(--lis-text-muted)', maxWidth: '640px', fontSize: '15px', lineHeight: 1.8 }}>
          {pick('在「光即界面」的设计语言下，验证界面组件、光学状态、磁吸交互与照明设计变量。', 'Comprehensive visual verification laboratory for all UI components, optical states, magnetic behaviors, and lighting tokens under the LIGHT IS THE INTERFACE design language.')}
        </p>
      </div>

      {/* 01 Optical Tokens & Palette */}
      <section style={{ marginBottom: '70px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 400, color: 'var(--lis-accent-warm)', marginBottom: '24px', letterSpacing: '0.1em' }}>
          {pick('01 / 光学变量与色板', '01 / OPTICAL TOKENS & PALETTE')}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          {[
            { name: pick('曜石黑', 'Obsidian Void'), hex: '#080A0E', role: pick('基础画布', 'Base Canvas') },
            { name: pick('炭黑', 'Charcoal Dark'), hex: '#15191F', role: pick('卡片 / 面板', 'Card / Panel') },
            { name: pick('板岩灰', 'Surface Slate'), hex: '#20252C', role: pick('活动表面', 'Active Surface') },
            { name: pick('暖琥珀金', 'Warm Amber Gold'), hex: '#C6B58B', role: pick('主光线', 'Primary Ray') },
            { name: pick('青色光束', 'Cyan Beam'), hex: '#84A9B8', role: pick('冷色辅助光', 'Accent Cold Ray') },
            { name: pick('星光白', 'Starlight White'), hex: '#ECEAE4', role: pick('主要文字', 'Text Primary') },
          ].map((c) => (
            <div
              key={c.name}
              style={{
                background: c.hex,
                padding: '20px',
                borderRadius: '8px',
                border: '1px solid var(--lis-border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '110px',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 600, color: c.hex === '#ECEAE4' ? '#080a0e' : '#ffffff' }}>
                {c.name}
              </div>
              <div>
                <code style={{ fontSize: '11px', color: c.hex === '#ECEAE4' ? '#333' : 'var(--lis-text-muted)' }}>{c.hex}</code>
                <div style={{ fontSize: '10px', color: c.hex === '#ECEAE4' ? '#555' : 'var(--lis-text-muted)' }}>{c.role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 02 Buttons Suite */}
      <section style={{ marginBottom: '70px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 400, color: 'var(--lis-accent-warm)', marginBottom: '24px', letterSpacing: '0.1em' }}>
          {pick('02 / 光感按钮（所有状态）', '02 / LIGHT BUTTONS (ALL STATES)')}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', background: 'var(--lis-bg-card)', padding: '36px', borderRadius: '12px', border: '1px solid var(--lis-border-subtle)' }}>
          {/* Variants */}
          <div>
            <h3 style={{ fontSize: '13px', color: 'var(--lis-text-muted)', marginBottom: '16px', letterSpacing: '0.1em' }}>
              {pick('样式与磁吸光束', 'VARIANTS & MAGNETIC BEAM')}
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px', alignItems: 'center' }}>
              <LightButton variant="primary">{pick('主胶囊按钮', 'Primary Capsule')}</LightButton>
              <LightButton variant="secondary">{pick('深色次级按钮', 'Secondary Dark')}</LightButton>
              <LightButton variant="ghost">{pick('幽灵描边', 'Ghost Outline')}</LightButton>
              <OutlineLightButton>{pick('边缘流光', 'Edge Traveling Beam')}</OutlineLightButton>
              <TextLightButton to="/work">{pick('文字光束链接', 'Text Beam Link')}</TextLightButton>
            </div>
          </div>

          {/* Interactive States */}
          <div>
            <h3 style={{ fontSize: '13px', color: 'var(--lis-text-muted)', marginBottom: '16px', letterSpacing: '0.1em' }}>
              {pick('交互状态（默认 / 按下 / 加载 / 禁用）', 'INTERACTIVE STATES (DEFAULT / PRESSED / LOADING / DISABLED)')}
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px', alignItems: 'center' }}>
              <LightButton variant="primary">{pick('默认状态', 'Default State')}</LightButton>
              <LightButton
                variant="primary"
                loading={loadingBtn}
                onClick={() => {
                  setLoadingBtn(true);
                  setTimeout(() => setLoadingBtn(false), 2000);
                }}
              >
                {loadingBtn ? pick('加载中…', 'Loading...') : pick('点击加载（2秒）', 'Click To Load (2s)')}
              </LightButton>
              <LightButton variant="primary" disabled>{pick('禁用状态', 'Disabled State')}</LightButton>
              <OutlineLightButton disabled>{pick('描边禁用', 'Outline Disabled')}</OutlineLightButton>
            </div>
          </div>

          {/* Sizes & Icon Buttons */}
          <div>
            <h3 style={{ fontSize: '13px', color: 'var(--lis-text-muted)', marginBottom: '16px', letterSpacing: '0.1em' }}>
              {pick('尺寸与发光图标按钮', 'SIZES & GLOW ICON BUTTONS')}
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
              <LightButton size="sm">{pick('小号 40px', 'Small 40px')}</LightButton>
              <LightButton size="md">{pick('中号 50px', 'Medium 50px')}</LightButton>
              <LightButton size="lg">{pick('大号 58px', 'Large 58px')}</LightButton>

              <div style={{ width: '1px', height: '36px', background: 'var(--lis-border-subtle)' }} />

              <GlowIconButton ariaLabel={pick('搜索图标', 'Search icon')}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </GlowIconButton>

              <GlowIconButton ariaLabel={pick('菜单开关', 'Menu toggle')} active>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </GlowIconButton>

              <GlowIconButton ariaLabel={pick('禁用图标', 'Disabled icon')} disabled>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                </svg>
              </GlowIconButton>
            </div>
          </div>
        </div>
      </section>

      {/* 03 Controls Suite */}
      <section style={{ marginBottom: '70px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 400, color: 'var(--lis-accent-warm)', marginBottom: '24px', letterSpacing: '0.1em' }}>
          {pick('03 / 实验室控件与交互调节', '03 / LAB CONTROLS & INTERACTIVE ADJUSTERS')}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '28px' }}>
          {/* Segmented Control & Switch */}
          <div style={{ background: 'var(--lis-bg-card)', padding: '30px', borderRadius: '12px', border: '1px solid var(--lis-border-subtle)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h3 style={{ fontSize: '14px', color: 'var(--lis-text-secondary)', margin: 0 }}>
              {pick('分段控件与开关', 'Segmented Control & Toggle Switch')}
            </h3>
            <LightSegmentedControl
              options={[
                { value: 'field', label: pick('光场演变', 'Light Field') },
                { value: 'pixel', label: pick('像素立面', 'Pixel Facade') },
                { value: 'day', label: pick('昼夜变幻', 'Day / Night') },
              ]}
              value={segmentedValue}
              onChange={setSegmentedValue}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid var(--lis-border-subtle)' }}>
              <div>
                <div style={{ fontSize: '13px', color: 'var(--lis-text-primary)' }}>{pick('光学反馈', 'Optical Feedback')}</div>
                <div style={{ fontSize: '11px', color: 'var(--lis-text-muted)' }}>{pick('切换光学高光', 'Toggle optical highlights')}</div>
              </div>
              <LightSwitch checked={switchOn} onChange={setSwitchOn} label={pick('反馈状态开关', 'Optical feedback toggle')} />
            </div>
          </div>

          {/* Sliders */}
          <div style={{ background: 'var(--lis-bg-card)', padding: '30px', borderRadius: '12px', border: '1px solid var(--lis-border-subtle)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h3 style={{ fontSize: '14px', color: 'var(--lis-text-secondary)', margin: 0 }}>
              {pick('滑块（强度与相关色温）', 'Sliders (Intensity & Color Temperature CCT)')}
            </h3>
            <LightSlider
              label={pick('光束强度', 'Beam Intensity')}
              value={sliderValue}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={setSliderValue}
            />

            <TemperatureSlider
              label={pick('相关色温（CCT）', 'Correlated Color Temperature (CCT)')}
              value={tempValue}
              min={2700}
              max={6500}
              step={50}
              onChange={setTempValue}
            />
          </div>
        </div>

        {/* Preset Cards */}
        <div style={{ marginTop: '28px', background: 'var(--lis-bg-card)', padding: '30px', borderRadius: '12px', border: '1px solid var(--lis-border-subtle)' }}>
          <h3 style={{ fontSize: '14px', color: 'var(--lis-text-secondary)', marginBottom: '18px' }}>
            {pick('灯光预设卡片（光束方向预览）', 'Light Preset Cards (Beam Direction Preview)')}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {[
              { id: 'preset-1', title: pick('01 晨曦照度', '01 Dawn light'), subtitle: pick('4000K · 泛光柔和', '4000K · Soft wash'), beamAngle: 45 },
              { id: 'preset-2', title: pick('02 正午穿透', '02 Midday beam'), subtitle: pick('6000K · 高垂直照度', '6000K · High vertical illuminance'), beamAngle: 90 },
              { id: 'preset-3', title: pick('03 暮光漫射', '03 Dusk diffusion'), subtitle: pick('2700K · 琥珀暖色', '2700K · Warm amber'), beamAngle: 135 },
              { id: 'preset-4', title: pick('04 深夜重点', '04 Night accents'), subtitle: pick('3000K · 聚光建筑柱', '3000K · Column spotlight'), beamAngle: 180 },
            ].map((p) => (
              <LightPresetCard
                key={p.id}
                title={p.title}
                subtitle={p.subtitle}
                beamAngle={p.beamAngle}
                selected={activePreset === p.id}
                onClick={() => setActivePreset(p.id)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 04 Navigation & Fullscreen Menu */}
      <section style={{ marginBottom: '70px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 400, color: 'var(--lis-accent-warm)', marginBottom: '24px', letterSpacing: '0.1em' }}>
          {pick('04 / 导航与全屏光幕', '04 / NAVIGATION & FULLSCREEN LIGHT CURTAIN')}
        </h2>
        <div style={{ background: 'var(--lis-bg-card)', padding: '30px', borderRadius: '12px', border: '1px solid var(--lis-border-subtle)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <LightNavbar />
            <LightButton variant="secondary" onClick={() => setIsMenuOpen(true)}>
              {pick('打开全屏光幕菜单', 'Open Fullscreen Light Curtain Menu')}
            </LightButton>
          </div>
          <FullscreenMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        </div>
      </section>

      {/* 05 Project Card */}
      <section style={{ marginBottom: '70px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 400, color: 'var(--lis-accent-warm)', marginBottom: '24px', letterSpacing: '0.1em' }}>
          {pick('05 / 光感项目卡片（扫光与查看标识）', '05 / LIGHT PROJECT CARDS (BEAM SWEEP & VIEW BADGE)')}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px' }}>
          <LightProjectCard
            name={pick('外滩·中央', 'The Bund')}
            slug="the-bund"
            categories={[pick('建筑照明', 'Architectural Lighting'), pick('历史保护', 'Heritage')]}
            city={pick('上海市', 'Shanghai')}
            kind={pick('建成实景', 'Built view')}
            coverImage="/assets/projects/the-bund/01_图-1159.webp"
            badge="TJAD · 01"
            index={0}
          />
          <LightProjectCard
            name={pick('浦东美术馆', 'Museum of Art Pudong')}
            slug="museum-of-art-pudong"
            categories={[pick('文化艺术', 'Culture & Art'), pick('空间光环境', 'Spatial lighting')]}
            city={pick('上海市', 'Shanghai')}
            kind={pick('方案效果图', 'Design visualization')}
            coverImage="/assets/projects/museum-of-art-pudong/01_图-767.webp"
            badge="TJAD · 02"
            index={1}
          />
        </div>
      </section>
    </div>
  );
}
