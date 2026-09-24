import fs from 'node:fs/promises';
import path from 'node:path';
import { render } from '../.ssr/entry-server.js';
const projects=JSON.parse(await fs.readFile('src/content/projects.json','utf8'));
const template=await fs.readFile('dist/index.html','utf8');
const routes=['/','/work','/about','/lab','/contact','/ui-showcase','/404',...projects.map(p=>`/work/${p.slug}`)];
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
for (const url of routes) {
  const project = projects.find(p => url === `/work/${p.slug}`);
  const title = (project?.name || ({
    '/': 'Light, as Architecture.',
    '/work': '作品档案',
    '/about': '专业与团队',
    '/lab': '光的实验室',
    '/contact': '联系',
    '/ui-showcase': 'UI 组件库与设计系统',
    '/404': '页面未找到'
  })[url]) + ' — TJAD 建筑照明所';

  const appHtml = await render(url);
  let html = template
    .replace('<div id="root"><!--app-html--></div>', `<div id="root" data-prerender-url="${url}">${appHtml}</div>`)
    .replace('<!--app-html-->', appHtml)
    .replace(/<title>.*?<\/title>/, `<title>${escape(title)}</title>`);

  if (project) {
    html = html.replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escape(`${project.name} · ${project.city} · ${project.english}。TJAD 建筑照明所项目档案。`)}"/>`);
  }
  if (url === '/') {
    html = html.replace('</head>', '<link rel="preload" as="image" href="/assets/brand/hero.webp"/></head>');
  }

  if (url === '/') {
    await fs.writeFile(path.join('dist', 'index.html'), html);
  } else if (url === '/404') {
    await fs.writeFile(path.join('dist', '404.html'), html);
  } else {
    // Generate both clean URL file (e.g. dist/work.html) and directory index (dist/work/index.html)
    const cleanPath = url.replace(/^\//, '');
    const directFile = path.join('dist', `${cleanPath}.html`);
    const indexFile = path.join('dist', cleanPath, 'index.html');

    await fs.mkdir(path.dirname(directFile), { recursive: true });
    await fs.writeFile(directFile, html);

    await fs.mkdir(path.dirname(indexFile), { recursive: true });
    await fs.writeFile(indexFile, html);
  }
}
await fs.writeFile('dist/_redirects', '/* /index.html 200\n');
console.log(`Prerendered ${routes.length} routes with dual clean-url & index.html support.`);
