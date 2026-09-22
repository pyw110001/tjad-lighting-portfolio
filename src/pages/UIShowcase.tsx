import React, { useState } from 'react';
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
          LIGHT INTERFACE SYSTEM · VERIFICATION SUITE
        </span>
        <h1 style={{ fontSize: 'clamp(36px, 4.5vw, 64px)', fontWeight: 300, margin: '12px 0 16px', color: 'var(--lis-text-primary)' }}>
          Design System & Component Showcase
        </h1>
        <p style={{ color: 'var(--lis-text-muted)', maxWidth: '640px', fontSize: '15px', lineHeight: 1.8 }}>
          Comprehensive visual verification laboratory for all UI components, optical states, magnetic behaviors, and lighting tokens under the LIGHT IS THE INTERFACE design language.
        </p>
      </div>

      {/* 01 Optical Tokens & Palette */}
      <section style={{ marginBottom: '70px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 400, color: 'var(--lis-accent-warm)', marginBottom: '24px', letterSpacing: '0.1em' }}>
          01 / OPTICAL TOKENS & PALETTE
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          {[
            { name: 'Obsidian Void', hex: '#080A0E', role: 'Base Canvas' },
            { name: 'Charcoal Dark', hex: '#15191F', role: 'Card / Panel' },
            { name: 'Surface Slate', hex: '#20252C', role: 'Active Surface' },
            { name: 'Warm Amber Gold', hex: '#C6B58B', role: 'Primary Ray' },
            { name: 'Cyan Beam', hex: '#84A9B8', role: 'Accent Cold Ray' },
            { name: 'Starlight White', hex: '#ECEAE4', role: 'Text Primary' },
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
          02 / LIGHT BUTTONS (ALL STATES)
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', background: 'var(--lis-bg-card)', padding: '36px', borderRadius: '12px', border: '1px solid var(--lis-border-subtle)' }}>
          {/* Variants */}
          <div>
            <h3 style={{ fontSize: '13px', color: 'var(--lis-text-muted)', marginBottom: '16px', letterSpacing: '0.1em' }}>
              VARIANTS & MAGNETIC BEAM
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px', alignItems: 'center' }}>
              <LightButton variant="primary">Primary Capsule</LightButton>
              <LightButton variant="secondary">Secondary Dark</LightButton>
              <LightButton variant="ghost">Ghost Outline</LightButton>
              <OutlineLightButton>Edge Traveling Beam</OutlineLightButton>
              <TextLightButton to="/work">Text Beam Link</TextLightButton>
            </div>
          </div>

          {/* Interactive States */}
          <div>
            <h3 style={{ fontSize: '13px', color: 'var(--lis-text-muted)', marginBottom: '16px', letterSpacing: '0.1em' }}>
              INTERACTIVE STATES (DEFAULT / PRESSED / LOADING / DISABLED)
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px', alignItems: 'center' }}>
              <LightButton variant="primary">Default State</LightButton>
              <LightButton
                variant="primary"
                loading={loadingBtn}
                onClick={() => {
                  setLoadingBtn(true);
                  setTimeout(() => setLoadingBtn(false), 2000);
                }}
              >
                {loadingBtn ? 'Loading...' : 'Click To Load (2s)'}
              </LightButton>
              <LightButton variant="primary" disabled>Disabled State</LightButton>
              <OutlineLightButton disabled>Outline Disabled</OutlineLightButton>
            </div>
          </div>

          {/* Sizes & Icon Buttons */}
          <div>
            <h3 style={{ fontSize: '13px', color: 'var(--lis-text-muted)', marginBottom: '16px', letterSpacing: '0.1em' }}>
              SIZES & GLOW ICON BUTTONS
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
              <LightButton size="sm">Small 40px</LightButton>
              <LightButton size="md">Medium 50px</LightButton>
              <LightButton size="lg">Large 58px</LightButton>

              <div style={{ width: '1px', height: '36px', background: 'var(--lis-border-subtle)' }} />

              <GlowIconButton ariaLabel="Search icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </GlowIconButton>

              <GlowIconButton ariaLabel="Menu toggle" active>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </GlowIconButton>

              <GlowIconButton ariaLabel="Disabled icon" disabled>
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
          03 / LAB CONTROLS & INTERACTIVE ADJUSTERS
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '28px' }}>
          {/* Segmented Control & Switch */}
          <div style={{ background: 'var(--lis-bg-card)', padding: '30px', borderRadius: '12px', border: '1px solid var(--lis-border-subtle)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h3 style={{ fontSize: '14px', color: 'var(--lis-text-secondary)', margin: 0 }}>
              Segmented Control & Toggle Switch
            </h3>
            <LightSegmentedControl
              options={[
                { value: 'field', label: '光场演变' },
                { value: 'pixel', label: '像素立面' },
                { value: 'day', label: '昼夜变幻' },
              ]}
              value={segmentedValue}
              onChange={setSegmentedValue}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid var(--lis-border-subtle)' }}>
              <div>
                <div style={{ fontSize: '13px', color: 'var(--lis-text-primary)' }}>Optical Feedback</div>
                <div style={{ fontSize: '11px', color: 'var(--lis-text-muted)' }}>Toggle optical highlights</div>
              </div>
              <LightSwitch checked={switchOn} onChange={setSwitchOn} label="反馈状态开关" />
            </div>
          </div>

          {/* Sliders */}
          <div style={{ background: 'var(--lis-bg-card)', padding: '30px', borderRadius: '12px', border: '1px solid var(--lis-border-subtle)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h3 style={{ fontSize: '14px', color: 'var(--lis-text-secondary)', margin: 0 }}>
              Sliders (Intensity & Color Temperature CCT)
            </h3>
            <LightSlider
              label="Beam Intensity"
              value={sliderValue}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={setSliderValue}
            />

            <TemperatureSlider
              label="Correlated Color Temperature (CCT)"
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
            Light Preset Cards (Beam Direction Preview)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {[
              { id: 'preset-1', title: '01 晨曦照度', subtitle: '4000K · 泛光柔和', beamAngle: 45 },
              { id: 'preset-2', title: '02 正午穿透', subtitle: '6000K · 高垂直照度', beamAngle: 90 },
              { id: 'preset-3', title: '03 暮光漫射', subtitle: '2700K · 琥珀暖色', beamAngle: 135 },
              { id: 'preset-4', title: '04 深夜重点', subtitle: '3000K · 聚光建筑柱', beamAngle: 180 },
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
          04 / NAVIGATION & FULLSCREEN LIGHT CURTAIN
        </h2>
        <div style={{ background: 'var(--lis-bg-card)', padding: '30px', borderRadius: '12px', border: '1px solid var(--lis-border-subtle)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <LightNavbar />
            <LightButton variant="secondary" onClick={() => setIsMenuOpen(true)}>
              Open Fullscreen Light Curtain Menu
            </LightButton>
          </div>
          <FullscreenMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        </div>
      </section>

      {/* 05 Project Card */}
      <section style={{ marginBottom: '70px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 400, color: 'var(--lis-accent-warm)', marginBottom: '24px', letterSpacing: '0.1em' }}>
          05 / LIGHT PROJECT CARDS (BEAM SWEEP & VIEW BADGE)
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px' }}>
          <LightProjectCard
            name="外滩·中央"
            slug="the-bund"
            categories={['建筑照明', '历史保护']}
            city="上海市"
            kind="建成实景"
            coverImage="/assets/projects/the-bund/01_图-1159.webp"
            badge="TJAD · 01"
            index={0}
          />
          <LightProjectCard
            name="浦东美术馆"
            slug="museum-of-art-pudong"
            categories={['文化艺术', '空间光环境']}
            city="上海市"
            kind="方案效果图"
            coverImage="/assets/projects/museum-of-art-pudong/01_图-767.webp"
            badge="TJAD · 02"
            index={1}
          />
        </div>
      </section>
    </div>
  );
}
