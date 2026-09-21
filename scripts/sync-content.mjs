import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
const app=process.cwd();
const bundledRoot=path.join(app,'content-source');
const parentRoot=path.resolve(app,'..');
const root=await fs.access(path.join(bundledRoot,'文字')).then(()=>bundledRoot).catch(()=>parentRoot);
const source=path.join(root,'文字');
const catalog=[
['the-bund','外滩历史建筑群照明提升','历史保护','Heritage Lighting'],
['museum-of-art-pudong','浦东美术馆','文化艺术','Architecture · Landscape · Interior'],
['shanghai-concert-hall','上海音乐厅修缮','文化艺术','Performance & Interior'],
['wanping-theatre','宛平剧院','文化艺术','Performing Arts Lighting'],
['yangzhou-grand-theatre','扬州运河新大剧院','文化艺术','Performing Arts Lighting'],
['yada-theatre','宜兴雅达阳羡溪山剧院','文化艺术','Architecture & Landscape'],
['wang-zengqi-memorial','汪曾祺纪念馆','文化艺术','Cultural Lighting'],
['china-silk-museum','中国丝绸博物馆','文化艺术','Museum Lighting'],
['tibet-art-museum','西藏美术馆','文化艺术','Museum Lighting'],
['quanzhou-cultural-center','泉州市公共文化中心','文化艺术','Cultural Architecture'],
['hefei-art-museum','合肥美术馆','文化艺术','Architecture · Interior'],
['nantong-cultural-center','南通开发区公共文化中心','文化艺术','Cultural Architecture'],
['maozhou-river','深圳茅洲河碧道改造','城市景观','Urban & Landscape'],
['yihe-quarter','南京颐和历史街区11片区','历史保护','Heritage & Commercial'],
['century-square','南京东路世纪广场','城市景观','Urban Light Environment'],
['alibaba-nanjing','阿里巴巴南京总部','商业办公','Workplace & Commercial'],
['ningbo-cultural-port','宁波文创港启动区','商业办公','Workplace & Landscape'],
['china-mobile-nanjing','中国移动南京科创中心','商业办公','Campus Lighting'],
['iflytek-campus','科大讯飞研发生产基地','商业办公','Campus Lighting'],
['tongkun-headquarters','桐昆集团总部大楼','商业办公','Workplace & Landscape'],
['cnnc-shanghai','中核集团上海总部','商业办公','Workplace Lighting'],
['bytedance-xiamen','字节跳动厦门办公楼','商业办公','Workplace & Media Lighting'],
['roche','罗氏制药','商业办公','Interior Lighting'],
['qianshao-hotel','前哨农场精品酒店','商业办公','Hospitality Lighting'],
['iff-nansha','南沙国际金融论坛 IFF 会址','商业办公','Conference & Hospitality'],
['taizhou-airport','台州路桥机场','交通教育','Transport Lighting'],
['fuliang-sports-center','景德镇浮梁体育中心','体育建筑','Sports Architecture'],
['ustc','中国科学技术大学','交通教育','Education & Landscape'],
['ghibli-world','吉卜力的艺术世界','沉浸体验','Immersive Spatial Lighting']
];
const featuredIds=[29,15,2,22,14,10,27,4,11,16,20];
const homeIds=[15,2,10,29,4,22];
const renderAll=[9,11,15,16,17,18,19,21,22,25,26];
const special={ '2-1':'方案效果图','2-5':'方案效果图','2-7':'分析图','8-5':'获奖证书','9-4':'分析图','9-6':'分析图','15-3':'分析图','15-5':'分析图','20-1':'方案效果图','20-2':'方案效果图','20-3':'方案效果图','24-2':'方案效果图','24-4':'方案效果图','24-5':'方案效果图','28-1':'方案效果图','28-7':'方案效果图','28-8':'方案效果图','29-4':'画册插图' };
const clean=s=>s.replace(/\*\*/g,'').replace(/`/g,'').trim();
const mkdir=async p=>fs.mkdir(p,{recursive:true});
const allFiles=async dir=>(await Promise.all((await fs.readdir(dir,{withFileTypes:true})).map(e=>e.isDirectory()?allFiles(path.join(dir,e.name)):path.join(dir,e.name)))).flat();
await mkdir(path.join(app,'src/content'));await mkdir(path.join(app,'docs'));await mkdir(path.join(app,'public/sources'));
const inputFiles=[...await allFiles(source),...await allFiles(path.join(root,'图片')),path.join(root,'00_总索引.md')];
const hashes={};for(const file of inputFiles)hashes[path.relative(root,file).replaceAll('\\','/')]=crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');
await fs.writeFile(path.join(app,'docs/source-hashes.json'),JSON.stringify(hashes,null,2));
const manifest=[];
for(const file of await allFiles(path.join(root,'图片'))){
 const relative=path.relative(root,file).replaceAll('\\','/');const parts=relative.split('/');
 const project=parts[1]==='02_案例';const id=parseInt(parts[2]);const n=parseInt(path.basename(file));const isPage=n===0;
 const key=project?catalog[id-1][0]:`team-${id}`;
 let kind=isPage?'画册版面':project?(special[`${id}-${n}`]||(renderAll.includes(id)?'方案效果图':'项目影像')):(id===2?'获奖证书':id===3&&n>=5?'业务图表':id===6&&[4,5].includes(n)?'集团标识':'团队资料图');
 const meta=await sharp(file).metadata();
 const widths=[...new Set([Math.min(480,meta.width),Math.min(960,meta.width),Math.min(1600,meta.width)])].sort((a,b)=>a-b);
 const base=`/assets/${project?'projects':'team'}/${key}/${path.basename(file,path.extname(file))}`;
 await mkdir(path.join(app,'public',path.dirname(base)));
 for(const w of widths){const target=path.join(app,'public',`${base}-${w}.webp`);try {await fs.access(target);}catch {await sharp(file).resize({width:w,withoutEnlargement:true}).webp({quality:85}).toFile(target);}}
 manifest.push({id:`${key}-${path.basename(file,path.extname(file))}`,projectId:project?id:null,source:relative,width:meta.width,height:meta.height,kind,use:isPage?'reference':kind==='获奖证书'?'recognition':'gallery',src:`${base}-${widths.at(-1)}.webp`,srcSet:widths.map(w=>`${base}-${w}.webp ${w}w`).join(', '),alt:`${project?catalog[id-1][1]:parts[2].slice(3)} · ${kind} ${n}`,imageNumber:n});
}
const projectFiles=(await fs.readdir(path.join(source,'03_全部案例'))).filter(x=>x.endsWith('.md')).sort();
const selectedFiles=(await fs.readdir(path.join(source,'02_精选案例_互动与媒体灯光'))).filter(x=>!x.startsWith('00_')).sort();
const projects=[];
for(let i=0;i<catalog.length;i++){
 const id=i+1;const [slug,name,category,english]=catalog[i];const file=projectFiles[i];const md=await fs.readFile(path.join(source,'03_全部案例',file),'utf8');
 const facts={};for(const line of md.split('\n')){const cells=line.split('|').map(clean);if(cells.length===4&&cells[1]&&!['字段','---'].includes(cells[1]))facts[cells[1]]=cells[2];}
 const section=(body,heading)=>clean(body.match(new RegExp(`## [^\\n]*${heading}[^\\n]*\\n([\\s\\S]*?)(?=\\n## |\\n---|$)`))?.[1]||'');
 const selectedIndex=featuredIds.indexOf(id);let analysis=[];let extraSource=null;
 if(selectedIndex>=0){const selectedFile=selectedFiles[selectedIndex];const more=await fs.readFile(path.join(source,'02_精选案例_互动与媒体灯光',selectedFile),'utf8');analysis=section(more,'照明策略与创新点').split('\n').filter(x=>/^\d+\./.test(x)).map(x=>clean(x.replace(/^\d+\.\s*/,'')));extraSource=`/sources/featured-${id}.md`;await fs.writeFile(path.join(app,'public',extraSource),more);}
 const media=manifest.filter(m=>m.projectId===id);const gallery=media.filter(m=>!['画册版面','获奖证书','画册插图'].includes(m.kind));
 const coverNumber=id===29?3:id===10?3:1;const cover=gallery.find(m=>m.imageNumber===coverNumber)||gallery[0];
 const note=id===8?'画册 OCR 中城市字段混入了荣誉获奖文字，已清洗为“杭州市”；原文保留。':id===19?'画册 OCR 中项目规模的总面积与地上面积存在矛盾，该字段暂不用于展示，原文可查。':id===25?'城市字段中的“会议”为 OCR 串行内容，展示为广州市；原文保留。':'';
 const displayFacts={...facts};
 if(id===8){
  displayFacts['所在城市']='杭州市';
  if(displayFacts['荣誉获奖']&&!displayFacts['项目获奖']){
   displayFacts['项目获奖']=displayFacts['荣誉获奖'];
  }
 }
 if(id===19)delete displayFacts['项目规模'];
 if(id===25)displayFacts['所在城市']='广州市';
 const sourceUrl=`/sources/project-${id}.md`;await fs.writeFile(path.join(app,'public',sourceUrl),md);
 const summary=id===8?section(md,'项目简介').replace('杭州市荣誉获奖：2017IESAWARD','杭州市'):section(md,'项目简介');
 projects.push({id,slug,name,fullName:clean(md.split('\n')[0].replace(/^#\s*\d+\.\s*/,'')),english,categories:category==='历史保护'&&id===14?[category,'商业办公']:[category],featured:selectedIndex>=0,homeOrder:homeIds.indexOf(id),city:displayFacts['所在城市']||'地点未记载',year:displayFacts['设计时间']||displayFacts['竣工时间']||displayFacts['完成时间']||'年份未记载',facts:displayFacts,rawFacts:facts,summary,analysis,source:`文字/03_全部案例/${file}`,sourceUrl,extraSource,sourceYear:2023,note,cover,gallery,reference:media.find(m=>m.kind==='画册版面'),lab:id===29?'day':([10,27,16,20,14].includes(id)?'pixel':null)});
}
const teamFiles=(await fs.readdir(path.join(source,'01_团队介绍'))).sort();const teamSources=[];for(let i=0;i<teamFiles.length;i++){const text=await fs.readFile(path.join(source,'01_团队介绍',teamFiles[i]),'utf8');const url=`/sources/team-${i+1}.md`;await fs.writeFile(path.join(app,'public',url),text);teamSources.push({name:teamFiles[i],url});}
const team={name:'TJAD 建筑照明所',fullName:'同济大学建筑设计研究院（集团）有限公司',department:'专项技术事业部 · 建筑照明所',philosophy:'以建筑空间为最重要的表达对象，以使用者的视觉与心理为导向。',intro:'依托同济大学与同济设计集团，为建筑师、业主及集团内部提供高品质、专业化的照明顾问服务。以项目定位与需求为出发点，通过光塑造场所的空间体验。',director:'杨秀',directorRole:'博士 · 建筑照明所所长',directorBio:'国家一级注册照明设计师、国家一级注册建筑师。曾任飞利浦中国研究院科学家，从事视觉艺术与视觉功效、光健康、建筑照明及城市光环境研究与工程实践。',email:'52yx@tjad.cn',phone:'+86 21 35357553',sourceYear:2023,sources:teamSources,awards:[{year:2020,count:3},{year:2021,count:15},{year:2022,count:15}],awardNames:['IALD','IES','IDA',"A’ Design Award",'MUSE','中照照明奖','上海白玉兰照明设计奖'],services:[{title:'设计',items:['城市照明规划与设计','建筑照明设计','景观照明设计','室内照明设计','灯具设计']},{title:'咨询',items:['照明应用与产品咨询','照明策划咨询','室内外照明后评估咨询','自然采光分析咨询','夜间光污染评估咨询']},{title:'研究',items:['照明专题应用研究','材料对照明的影响','照明与空间体验','光健康研究','照明对情绪调节的研究']}]};
await fs.writeFile(path.join(app,'src/content/projects.json'),JSON.stringify(projects));
await fs.writeFile(path.join(app,'src/content/team.json'),JSON.stringify(team));
await fs.writeFile(path.join(app,'src/content/media.json'),JSON.stringify(manifest));
await fs.writeFile(path.join(app,'docs/asset-manifest.md'),'# 素材清单\n\n全部 230 张图片按目录关联并目视检查缩略图；图像性质为编辑分类，不作为竣工证明。原图不修改、不生成虚构项目照片。\n\n| 来源 | 性质 | 原始尺寸 | 用途 | 网页资源 |\n|---|---|---|---|---|\n'+manifest.map(m=>`| ${m.source} | ${m.kind} | ${m.width}×${m.height} | ${m.use} | ${m.src} |`).join('\n'));
await fs.writeFile(path.join(app,'docs/content-audit.md'),'# 内容审计\n\n29 个项目，11 个精选，6 个首页作品；6 篇团队资料。资料版本：2023 年画册。\n\n原始事实与编辑解读分别存储。元信息中的日期保留设计/竣工/完成的字段名称；施工中、设计中是历史状态。策略段落均标为整理分析，非已核实灯控或工程能力。\n\n## 已知 OCR 问题\n\n- 中国丝绸博物馆城市字段混入荣誉获奖，已清洗为杭州市，保留 rawFacts；完成时间 2016 年规范化。\n- 科大讯飞面积前后矛盾，保留 rawFacts，不展示争议面积。\n- IFF 城市尾部“会议”为串行文字，城市展示为广州，原文仍可查。\n- 联系信息来自 OCR 末页，未验证当前有效性。\n- 团队负责人目录唯一单图为项目照片，不当作人物肖像。\n- 团队图片中的透明标识、证书、方案分析与版面不作为项目封面。\n\n## 内容来源\n\n'+projects.map(p=>`- ${p.id}. ${p.name} — ${p.source}`).join('\n'));
if(projects.length!==29||projects.filter(p=>p.featured).length!==11||manifest.length!==230)throw Error('内容数量不符合源资料');
console.log(`Synced ${projects.length} projects, ${manifest.length} images, ${teamSources.length} team documents.`);
