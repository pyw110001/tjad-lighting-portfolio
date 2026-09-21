import fs from 'node:fs/promises';
import path from 'node:path';
import { render } from '../.ssr/entry-server.js';
const projects=JSON.parse(await fs.readFile('src/content/projects.json','utf8'));
const template=await fs.readFile('dist/index.html','utf8');
const routes=['/','/work','/about','/lab','/contact','/404',...projects.map(p=>`/work/${p.slug}`)];
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
for(const url of routes){const project=projects.find(p=>url===`/work/${p.slug}`);const title=(project?.name||({'/':'Light, as Architecture.','/work':'作品档案','/about':'专业与团队','/lab':'光的实验室','/contact':'联系','/404':'页面未找到'})[url])+' — TJAD 建筑照明所';let html=template.replace('<!--app-html-->',render(url)).replace(/<title>.*?<\/title>/,`<title>${escape(title)}</title>`);if(project)html=html.replace(/<meta name="description"[^>]*>/,`<meta name="description" content="${escape(`${project.name} · ${project.city} · ${project.english}。TJAD 建筑照明所项目档案。`)}"/>`);if(url==='/')html=html.replace('</head>','<link rel="preload" as="image" href="/assets/brand/hero.webp"/></head>');const target=url==='/404'?'dist/404.html':path.join('dist',url,'index.html');await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,html);}
await fs.writeFile('dist/_redirects','/* /index.html 200\n');
console.log(`Prerendered ${routes.length} routes. Deep URLs contain real HTML.`);
