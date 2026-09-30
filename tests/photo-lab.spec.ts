import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';

const art = readFileSync('public/assets/light-lab/chroma/demo-portrait-v2.png');
const ready = async (page: import('@playwright/test').Page) => {
  await expect(page.locator('.photo-studio .scene-loading')).toBeHidden({ timeout: 15000 });
  await expect(page.locator('.photo-compositor')).toBeVisible();
};

test('Photo Lab loads three fixed views without city assets and stops rendering stills', async ({ page }, testInfo) => {
  const requests: string[] = [], errors: string[] = [];
  page.on('request', request => requests.push(request.url()));
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/lab?mode=photo'); await ready(page);
  await expect(page.locator('.lab-rail-label')).toHaveText(['昼夜切换','流光粒子','色彩粒子场','建筑光影模拟','测试项']);
  const host = page.locator('.photo-studio .canvas-host');
  for (const [id,name] of [['collins','888 Collins'],['facade','弧形点阵展馆'],['sphere','球形展馆']]) {
    await page.getByRole('tab', { name }).click();
    await expect(host).toHaveAttribute('data-scene',id);
    await expect(page.locator('.scene-switch-mask')).not.toHaveClass(/active/);
    await page.screenshot({ path: testInfo.outputPath(`photo-${id}.png`) });
  }
  const frames = await host.getAttribute('data-render-count');
  await page.waitForTimeout(500);
  await expect(host).toHaveAttribute('data-render-count',frames!);
  await expect(host).toHaveAttribute('data-draw-calls','1');
  expect(requests.filter(url => /\.glb|\.hdr|draco|ez-tree/.test(url))).toEqual([]);
  expect(await page.locator('vite-error-overlay').count()).toBe(0);
  expect(errors).toEqual([]);
  await page.getByRole('button', { name: '切换为英文' }).first().click();
  await expect(page.locator('.lab-rail-label').last()).toHaveText('Photo Lab');
  await page.getByRole('button', { name: 'Show settings panel' }).click();
  await expect(page.getByRole('slider', { name: 'Brightness', exact: true })).toBeVisible();
  await expect(page.locator('.view-section')).toHaveCount(0);
});

test('Photo media covers all displays, respects the lobby mask, and exports its composed frame', async ({ page }, testInfo) => {
  const svg = '<svg width="1600" height="500" xmlns="http://www.w3.org/2000/svg"><path fill="#ff1111" d="M0 0h1600v166H0z"/><path fill="#11ff22" d="M0 166h1600v167H0z"/><path fill="#1144ff" d="M0 333h1600v167H0z"/></svg>';
  const bands = await sharp(Buffer.from(svg)).png().toBuffer();
  await page.goto('/lab?mode=photo'); await ready(page);
  const canvas = page.locator('.photo-compositor');
  // Read the actual GPU buffer, also used by PNG export. Browser screenshots
  // may still contain the preceding compositor frame after a scene switch.
  const readFrame = async () => sharp(Buffer.from((await canvas.evaluate(node => (node as HTMLCanvasElement).toDataURL('image/png'))).split(',')[1], 'base64')).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const lobbyFrames = new Map<string, number[]>();
  const lobbyPixels = (data: Buffer, info: { width: number; height: number; channels: number }, id: string) => {
    const scale=Math.min(info.width/1672,(info.height-112)/941),left=(info.width-1672*scale)/2,top=74+(info.height-112-941*scale)/2;
    const point=id==='collins'?[960,690]:id==='facade'?[1100,710]:[959,680];
    const x=Math.round(left+point[0]*scale),y=Math.round(top+point[1]*scale),pixels:number[]=[];
    for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
      const i=((y+dy)*info.width+x+dx)*info.channels;pixels.push(data[i],data[i+1],data[i+2]);
    }
    return pixels;
  };
  for(const [id,name] of [['collins','888 Collins'],['facade','弧形点阵展馆'],['sphere','球形展馆']]){
    await page.getByRole('tab',{name}).click();
    await expect(page.locator('.photo-studio .canvas-host')).toHaveAttribute('data-scene',id);
    await expect(page.locator('.scene-switch-mask')).not.toHaveClass(/active/);
    const {data,info}=await readFrame();lobbyFrames.set(id,lobbyPixels(data,info,id));
  }
  await page.locator('.photo-studio input[type=file]').setInputFiles({ name: 'bands.png', mimeType: 'image/png', buffer: bands });
  await expect(page.locator('.media-meta strong')).toHaveText('bands.png');
  await page.getByRole('button', { name: '隐藏素材面板' }).click();
  for (const [id,name] of [['collins','888 Collins'],['facade','弧形点阵展馆'],['sphere','球形展馆']]) {
    await page.getByRole('tab', { name }).click();
    await expect(page.locator('.photo-studio .canvas-host')).toHaveAttribute('data-scene',id);
    await expect(page.locator('.scene-switch-mask')).not.toHaveClass(/active/);
    const { data, info } = await readFrame();
    await page.screenshot({ path: testInfo.outputPath(`photo-${id}-bands.png`) });
    let red=0,green=0,blue=0,redY=0,blueY=0;
    for (let y=0;y<info.height;y++) for (let x=0;x<info.width;x++) {
      const scale=Math.min(info.width/1672,(info.height-112)/941),left=(info.width-1672*scale)/2,top=74+(info.height-112-941*scale)/2;
      const refX=(x-left)/scale,refY=(y-top)/scale;
      const region=id==='collins'?[857,36,1201,665]:id==='facade'?[609,110,1540,629]:[660,263,1258,644];
      if(refX<region[0]||refX>region[2]||refY<region[1]||refY>region[3])continue;
      const i=(y*info.width+x)*3, r=data[i],g=data[i+1],b=data[i+2];
      if(r>100&&r>g+60&&r>b+60){red++;redY+=y;}
      if(g>100&&g>r+60&&g>b+60)green++;
      if(b>100&&b>r+60&&b>g+60){blue++;blueY+=y;}
    }
    expect(red,`${id} top band`).toBeGreaterThan(100); expect(green,`${id} middle band`).toBeGreaterThan(100); expect(blue,`${id} bottom band`).toBeGreaterThan(100);
    expect(redY/red).toBeLessThan(blueY/blue);
    expect(lobbyPixels(data,info,id),`${id} glass lobby remains unchanged`).toEqual(lobbyFrames.get(id));
  }
  await page.getByRole('button', { name: '显示参数面板' }).click();
  const before=await canvas.evaluate(node=>(node as HTMLCanvasElement).toDataURL());
  await page.getByRole('slider', { name:'整体亮度' }).fill('25');
  expect(await canvas.evaluate(node=>(node as HTMLCanvasElement).toDataURL())).not.toBe(before);
  await page.getByRole('button', { name: '隐藏参数面板' }).click();
  const downloadPromise=page.waitForEvent('download'); await page.locator('.photo-studio .export-button').click();
  const download=await downloadPromise; expect(download.suggestedFilename()).toBe('sphere-photo-lab.png');
  await download.saveAs(testInfo.outputPath('composed-sphere.png'));
  await page.locator('.photo-studio input[type=file]').setInputFiles({name:'broken.png',mimeType:'image/png',buffer:Buffer.from('invalid image')});
  await expect(page.locator('.error-banner')).toContainText('媒体加载失败');
  await expect(page.locator('.media-meta strong')).toHaveText('bands.png');
});

test('a shared video keeps its paused frame and position between photo and 3D modules', async ({ page }) => {
  await page.goto('/lab?mode=photo'); await ready(page);
  await page.evaluate(async()=>{
    const canvas=document.createElement('canvas'); canvas.width=320;canvas.height=180;
    const ctx=canvas.getContext('2d')!,stream=canvas.captureStream(12);
    const recorder=new MediaRecorder(stream,{mimeType:'video/webm'}), chunks:BlobPart[]=[];
    recorder.ondataavailable=e=>chunks.push(e.data);
    const done=new Promise<void>(resolve=>{recorder.onstop=()=>resolve();});recorder.start();
    for(let i=0;i<18;i++){ctx.fillStyle=i%2?'#fc344c':'#247cff';ctx.fillRect(0,0,320,180);await new Promise(resolve=>setTimeout(resolve,90));}
    recorder.stop();await done;stream.getTracks().forEach(track=>track.stop());
    const transfer=new DataTransfer();transfer.items.add(new File(chunks,'shared-motion.webm',{type:'video/webm'}));
    const input=document.querySelector<HTMLInputElement>('.photo-studio input[type=file]')!;input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await expect(page.locator('.media-meta strong')).toHaveText('shared-motion.webm');
  await expect(page.getByRole('button',{name:'暂停视频'})).toBeVisible();
  await page.getByRole('button',{name:'暂停视频'}).click();
  await page.getByRole('slider',{name:'视频进度'}).fill('0.5');
  await page.waitForTimeout(100);
  const paused=Number(await page.getByRole('slider',{name:'视频进度'}).inputValue());
  expect(paused).toBeCloseTo(.5,2);
  await page.locator('[data-module=lightform]').click();
  await expect(page.locator('.scene-loading')).toBeHidden({timeout:20000});
  await page.getByRole('button',{name:'显示素材面板'}).click();
  await expect(page.locator('.media-meta strong')).toHaveText('shared-motion.webm');
  await expect(page.getByRole('button',{name:'播放视频'})).toBeVisible();
  expect(Number(await page.getByRole('slider',{name:'视频进度'}).inputValue())).toBeCloseTo(paused,2);
  const cityDraws=Number(await page.locator('.canvas-host').getAttribute('data-draw-calls'));
  expect(cityDraws).toBeGreaterThan(1);
  await page.locator('[data-module=photo]').click();await ready(page);
  await page.getByRole('button',{name:'显示素材面板'}).click();
  await expect(page.getByRole('button',{name:'播放视频'})).toBeVisible();
  expect(Number(await page.getByRole('slider',{name:'视频进度'}).inputValue())).toBeCloseTo(paused,2);
  const host=page.locator('.canvas-host'),count=await host.getAttribute('data-render-count');await page.waitForTimeout(400);
  await expect(host).toHaveAttribute('data-render-count',count!);
  await page.getByRole('button',{name:'播放视频'}).click();
  await expect.poll(()=>host.getAttribute('data-render-count')).not.toBe(count);
});

test('Chroma controls and direct facade interaction survive photo scene switching',async({page},testInfo)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/lab?mode=chroma');
  await page.locator('.chroma-field input[type=file][accept="image/jpeg,image/png,image/webp"]').setInputFiles({name:'photo-art.png',mimeType:'image/png',buffer:art});
  await expect(page.locator('.current-image img')).toHaveAttribute('alt','photo-art.png');
  await page.getByRole('button',{name:'暂停动画',exact:true}).click();
  await page.locator('[data-module=photo]').click();await ready(page);
  await page.getByRole('button',{name:'显示素材面板'}).click();
  await page.getByRole('button',{name:'使用 Chroma 实时画面'}).click();
  const preview=page.locator('.chroma-preview-host canvas');await expect(preview).toBeVisible();
  expect(await preview.evaluate(node=>[(node as HTMLCanvasElement).width,(node as HTMLCanvasElement).height])).toEqual([1920,1080]);
  await preview.evaluate(node=>{node.dataset.qaInstance='same-engine';});
  await page.getByRole('button',{name:'隐藏 Chroma 预览'}).click();
  const unchanged = await preview.evaluate(node => (node as HTMLCanvasElement).toDataURL());
  const host=page.locator('.photo-studio .canvas-host'),box=(await host.boundingBox())!;
  await page.mouse.move(box.x+box.width*.61,box.y+box.height*.55);await page.mouse.down();
  await page.mouse.move(box.x+box.width*.64,box.y+box.height*.5,{steps:10});
  await expect(host).toHaveAttribute('data-pointer-uv',/\d\.\d+,\d\.\d+/);
  await expect.poll(()=>preview.evaluate(node=>(node as HTMLCanvasElement).toDataURL())).not.toBe(unchanged);
  await page.mouse.up();
  await page.getByRole('tab',{name:'弧形点阵展馆'}).click();
  await expect(page.locator('.scene-switch-mask')).not.toHaveClass(/active/);
  await expect(preview).toHaveAttribute('data-qa-instance','same-engine');
  await page.getByRole('tab',{name:'球形展馆'}).click();
  await expect(page.locator('.scene-switch-mask')).not.toHaveClass(/active/);
  await expect(preview).toHaveAttribute('data-qa-instance','same-engine');
  await page.screenshot({path:testInfo.outputPath('photo-sphere-chroma.png')});
  expect(errors).toEqual([]);
});

test('Fluid custom colour/count settings reach Photo Lab and its direct pointer',async({page},testInfo)=>{
  await page.goto('/lab?mode=wave');
  await expect(page.locator('.fluid-webgpu-canvas')).toBeVisible();
  await page.getByRole('button',{name:'自定义渐变',exact:true}).click();
  await page.getByRole('slider',{name:'粒子数量'}).fill('6000');
  await page.locator('[data-module=photo]').click();await ready(page);
  await page.getByRole('button',{name:'显示素材面板'}).click();
  const button=page.getByRole('button',{name:'使用 Fluid 实时画面'});
  test.skip(await button.isDisabled(),'This desktop has no WebGPU adapter');await button.click();
  await expect(page.locator('.live-preview p')).toHaveText('拖动吸引 · 右键推散',{timeout:15000});
  await expect(page.locator('.fluid-live-canvas')).toHaveAttribute('data-particle-count','6000');
  expect(await page.locator('.fluid-live-canvas').evaluate(node=>[(node as HTMLCanvasElement).width,(node as HTMLCanvasElement).height])).toEqual([1920,1080]);
  await page.getByRole('button',{name:'隐藏 Fluid 预览'}).click();
  const host=page.locator('.photo-studio .canvas-host'),box=(await host.boundingBox())!;
  await page.mouse.move(box.x+box.width*.61,box.y+box.height*.5);await page.mouse.down({button:'right'});
  await page.mouse.move(box.x+box.width*.62,box.y+box.height*.46,{steps:8});
  await expect(host).toHaveAttribute('data-pointer-uv',/\d\.\d+,\d\.\d+/);await page.mouse.up({button:'right'});
  await page.getByRole('tab',{name:'弧形点阵展馆'}).click();
  await expect(page.locator('.scene-switch-mask')).not.toHaveClass(/active/);
  await page.screenshot({path:testInfo.outputPath('photo-facade-fluid.png')});
});

test('smooth photo mapping preserves sub-diode image detail in every scene and covers the sphere crown',async({page},testInfo)=>{
  await page.goto('/lab?mode=photo');await ready(page);
  await page.addStyleTag({content:'.lis-cursor{display:none!important}'});
  const canvas=page.locator('.photo-compositor'),host=page.locator('.photo-studio .canvas-host');
  const width=2048,height=1152,raw=Buffer.alloc(width*height*3);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*3;raw[i]=32+Math.round(192*(y%64)/63);raw[i+1]=32;raw[i+2]=64;
  }
  const pattern=await sharp(raw,{raw:{width,height,channels:3}}).png().toBuffer();
  const black=await sharp({create:{width,height,channels:3,background:'#000000'}}).png().toBuffer();
  const readFrame=async()=>sharp(Buffer.from((await canvas.evaluate(node=>(node as HTMLCanvasElement).toDataURL())).split(',')[1],'base64')).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const upload=async(name:string,buffer:Buffer)=>{
    const previous=await host.getAttribute('data-render-count');
    await page.locator('.photo-studio input[type=file]').setInputFiles({name,mimeType:'image/png',buffer});
    await expect(page.locator('.media-meta strong')).toHaveText(name);
    await expect.poll(()=>host.getAttribute('data-render-count')).not.toBe(previous);
    await page.getByRole('button',{name:'隐藏素材面板'}).click();
  };
  for(const [id,name] of [['collins','888 Collins'],['facade','弧形点阵展馆'],['sphere','球形展馆']]){
    await page.getByRole('tab',{name}).click();await expect(host).toHaveAttribute('data-scene',id);
    await expect(page.locator('.scene-switch-mask')).not.toHaveClass(/active/);
    await page.getByRole('button',{name:'显示参数面板'}).click();
    await page.getByRole('slider',{name:id==='collins'?'灯带间隙':'灯珠颗粒感',exact:true}).fill('0');
    await page.getByRole('slider',{name:id==='collins'?'灯带柔光':'点阵柔光',exact:true}).fill('0');
    await page.getByRole('button',{name:'隐藏参数面板'}).click();
    await upload('black.png',black);const baseline=await readFrame();
    await upload('detail.png',pattern);const rendered=await readFrame(),info=rendered.info;
    const scale=Math.min(info.width/1672,(info.height-112)/941),left=(info.width-1672*scale)/2,top=74+(info.height-112-941*scale)/2;
    const [refX,y0,y1]=id==='collins'?[1110,420,590]:id==='facade'?[1100,300,480]:[959,500,620];
    const x=Math.round(left+refX*scale);let last:number|null=null,changes=0,samples=0;
    for(let y=Math.ceil(top+y0*scale);y<top+y1*scale;y++){
      const i=(y*info.width+x)*3,value=rendered.data[i]-baseline.data[i];
      if(last!==null){samples++;if(Math.abs(value-last)>1)changes++;}last=value;
    }
    expect(changes/samples,`${id} full-resolution signal instead of coarse held cells`).toBeGreaterThan(.7);
    if(id==='sphere'){
      const cx=Math.round(left+959*scale),cy=Math.round(top+310*scale),index=(cy*info.width+cx)*3;
      expect(rendered.data[index]-baseline.data[index],'upper dome receives uploaded media').toBeGreaterThan(20);
      const bounds=(await canvas.boundingBox())!;
      await page.mouse.move(bounds.x+cx,bounds.y+cy);await page.mouse.down();
      await expect(host).toHaveAttribute('data-pointer-uv',/0\.\d+,0\.\d+/);await page.mouse.up();
    }
    await page.screenshot({path:testInfo.outputPath(`photo-${id}-fine-detail.png`)});
  }
});

test.describe('Photo output at desktop device pixel ratio 2',()=>{
  test.use({deviceScaleFactor:2});
  test('renders and exports at the full screen pixel density',async({page},testInfo)=>{
    await page.goto('/lab?mode=photo');await ready(page);
    const size=await page.locator('.photo-compositor').evaluate(node=>{
      const canvas=node as HTMLCanvasElement;return{width:canvas.width,height:canvas.height,cssWidth:canvas.clientWidth,cssHeight:canvas.clientHeight};
    });
    expect(size.width).toBe(size.cssWidth*2);expect(size.height).toBe(size.cssHeight*2);
    const downloadPromise=page.waitForEvent('download');await page.locator('.export-button').click();
    const download=await downloadPromise,target=testInfo.outputPath('photo-retina.png');await download.saveAs(target);
    const exported=await sharp(target).metadata();expect(exported.width).toBe(size.width);expect(exported.height).toBe(size.height);
  });
});
