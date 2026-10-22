/** Desktop rendered evidence; pass a duration in seconds to record a benchmark. */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
const output = process.env.NIGHT_EVIDENCE ?? join(homedir(), '.codex/visualizations/2026/10/22/01a16332-6546-7bd2-899b-cb043db9608d/blender-night');
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const url = process.env.NIGHT_URL ?? 'http://127.0.0.1:4186/lab?mode=lightform';
const report = { url, viewport: '1920x1080', browserPath: 'Browser plugin not available; project Playwright + Chrome', errors, scenes: [] };
try {
  await page.goto(url); await page.locator('.scene-loading').waitFor({ state: 'hidden', timeout: 45000 });
  for (const [kind, name] of [['fluid', '流线灯幕'], ['field', '光柱广场']]) {
    await page.getByRole('tab', { name, exact: true }).click();
    const stage = page.locator('.lightform-studio .canvas-host');
    await page.waitForFunction(id => document.querySelector('.lightform-studio .canvas-host')?.getAttribute('data-scene') === id, kind, { timeout: 45000 });
    await page.locator('.scene-switch-mask.active').waitFor({ state: 'hidden' }).catch(() => {});
    await page.waitForTimeout(1800);
    await page.mouse.move(1910, 1070);
    await page.screenshot({ path: join(output, `${kind}-web-page.png`) });
    await stage.screenshot({ path: join(output, `${kind}-web.png`) });
    const raw = await stage.locator('canvas').evaluate(canvas => canvas.toDataURL('image/png').split(',')[1]);
    writeFileSync(join(output, `${kind}-web-render.png`), Buffer.from(raw, 'base64'));
    const diagnostics = await stage.evaluate(n => ({ ...n.dataset }));
    report.scenes.push({ kind, diagnostics });
    console.log(JSON.stringify({ kind, diagnostics }));
    const seconds = Number(process.argv[2] ?? 0);
    if (seconds > 0) {
      await page.waitForTimeout(4000);
      const stats = await page.evaluate(async ms => {
        const times = []; let previous = performance.now(); const start = previous;
        await new Promise(resolve => {
          const sample = now => { times.push(now - previous); previous = now;
            if (now - start < ms) requestAnimationFrame(sample); else resolve(); };
          requestAnimationFrame(sample);
        });
        const sorted = times.slice(1).sort((a,b) => a-b), average = sorted.reduce((a,b) => a+b,0) / sorted.length;
        const canvas = document.querySelector('.canvas-host canvas'), gl = canvas.getContext('webgl2'), ext = gl.getExtension('WEBGL_debug_renderer_info');
        return { seconds: ms/1000, frames: sorted.length, meanFrameMs: average, meanFps: 1000/average,
          p50FrameMs: sorted[Math.floor(sorted.length*.5)], p95FrameMs: sorted[Math.floor(sorted.length*.95)],
          gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unavailable' };
      }, seconds * 1000);
      report.scenes.at(-1).benchmark = stats; console.log(JSON.stringify({ kind, stats }));
    }
  }
  report.title = await page.title();
  writeFileSync(join(output, Number(process.argv[2] ?? 0) > 0 ? 'desktop-benchmark.json' : 'desktop-review.json'), JSON.stringify(report, null, 2));
  if (errors.length) throw new Error(errors.join('\n'));
} finally { await browser.close(); }
