import { DEFAULT_SETTINGS, type DisplaySettings, type SceneId, type StoredMedia, type StudioPointer } from '../lightform/studioTypes';
import { mapPhotoSurface, mediaCoordinates, PANEL_ASPECT, PHOTO_WIDTH, PHOTO_HEIGHT } from './mapping';

const vertex = `#version 300 es
in vec2 aPosition;
out vec2 vScreen;
void main() { vScreen = vec2((aPosition.x + 1.0) * .5, (1.0 - aPosition.y) * .5); gl_Position = vec4(aPosition, 0., 1.); }`;
const fragment = `#version 300 es
precision highp float;
in vec2 vScreen;
out vec4 outColor;
uniform sampler2D uBackground, uHigh, uLow, uDemo, uMedia;
uniform vec4 uRect;
uniform vec2 uViewport, uOffset;
uniform float uAspect, uPanelAspect, uBrightness, uPixel, uGap, uGlow;
uniform vec2 uOriginalControls;
uniform int uScene, uHasMedia;
vec4 decodeSurface(ivec2 at) {
  vec4 hi=texelFetch(uHigh,at,0),lo=texelFetch(uLow,at,0);
  vec2 uv=(round(hi.rg*255.)*256.+round(lo.rg*255.))/65535.;
  return vec4(uv,lo.b,hi.b);
}
vec4 surfaceAt(vec2 p) {
  // Decode packed bytes before interpolation: filtering the two byte planes
  // directly corrupts UVs at low-byte carries. Ignore neighbours off-screen.
  ivec2 size=textureSize(uHigh,0),last=size-ivec2(1);
  vec2 at=clamp(p*vec2(size)-.5,vec2(0.),vec2(last));
  ivec2 origin=ivec2(floor(at)); vec2 f=fract(at);
  vec4 a=decodeSurface(origin),b=decodeSurface(min(origin+ivec2(1,0),last));
  vec4 c=decodeSurface(min(origin+ivec2(0,1),last)),d=decodeSurface(min(origin+ivec2(1),last));
  vec4 weights=vec4((1.-f.x)*(1.-f.y),f.x*(1.-f.y),(1.-f.x)*f.y,f.x*f.y)*vec4(a.a,b.a,c.a,d.a);
  float coverage=dot(weights,vec4(1.));
  return vec4((a.rgb*weights.x+b.rgb*weights.y+c.rgb*weights.z+d.rgb*weights.w)/max(coverage,.00001),coverage);
}
void main() {
  vec2 p = (vScreen * uViewport - uRect.xy) / uRect.zw;
  if (any(lessThan(p, vec2(0.))) || any(greaterThan(p, vec2(1.)))) { outColor = vec4(.0196,.0314,.051,1.); return; }
  vec3 base = texture(uBackground, p).rgb;
  if (texture(uHigh,p).b < .001) { outColor = vec4(base,1.); return; }
  vec4 surface=surfaceAt(p);
  float mask=surface.a;
  vec2 uv=surface.rg;
  if (uHasMedia == 0) {
    vec3 original = texture(uDemo, p).rgb;
    float sizeDelta = (uScene == 0 ? uOriginalControls.x-uGap : uPixel-uOriginalControls.x)*2.;
    vec2 stepUv=vec2(abs(sizeDelta)*1.8/1672.,abs(sizeDelta)*1.8/941.);
    vec3 nearA=texture(uDemo,p+vec2(stepUv.x,0.)).rgb;
    vec3 nearB=texture(uDemo,p-vec2(stepUv.x,0.)).rgb;
    vec3 nearC=texture(uDemo,p+vec2(0.,stepUv.y)).rgb;
    vec3 nearD=texture(uDemo,p-vec2(0.,stepUv.y)).rgb;
    vec3 sized=sizeDelta>0. ? max(original,max(max(nearA,nearB),max(nearC,nearD))) : min(original,min(min(nearA,nearB),min(nearC,nearD)));
    float glowDelta=uGlow-uOriginalControls.y;
    vec3 halo=(texture(uDemo,p+vec2(3./1672.,0.)).rgb+texture(uDemo,p-vec2(3./1672.,0.)).rgb+texture(uDemo,p+vec2(0.,3./941.)).rgb+texture(uDemo,p-vec2(0.,3./941.)).rgb)*.25;
    vec3 signal=max(sized-base,vec3(0.));
    vec3 display=base+signal*(1.+min(0.,glowDelta)*.35)+max(halo-base,vec3(0.))*max(0.,glowDelta)*.6;
    outColor = vec4(mix(base, display * uBrightness, mask), 1.); return;
  }
  // Crop to fill the authored panel, preserving source aspect ratio.
  vec2 scale = vec2(min(1.,uPanelAspect/uAspect), min(1.,uAspect/uPanelAspect));
  vec2 sampleUv = (uv - .5) * scale + .5 + uOffset;
  sampleUv = vec2(fract(sampleUv.x), clamp(sampleUv.y, .001, .999));
  vec3 media = texture(uMedia, sampleUv).rgb;
  float diode, halo;
  if (uScene == 0) {
    float d = abs(fract(uv.x * 96.) - .5);
    float width = mix(.49,.075,uGap);
    float aa=max(.012,fwidth(uv.x*96.)*.5);
    diode = 1. - smoothstep(width-aa,width+aa,d);
    halo = exp(-d*d*16.);
  } else {
    vec2 grid = uScene == 1 ? vec2(360.,160.) : vec2(360.,200.);
    vec2 cell = fract(uv * grid) - .5;
    float d = length(cell);
    float radius = mix(.16,.44,uPixel);
    float aa=max(.02,length(fwidth(uv*grid))*.35);
    diode = 1.-smoothstep(radius-aa,radius+aa,d);
    halo = exp(-d*d*12.);
    // LEDs modulate the continuous full-resolution signal. Grain=0 must
    // never quantize an uploaded image/video or a live particle source.
  }
  float fill = uScene == 0 ? diode : mix(1.,diode,uGap);
  float glowGrain=uScene==0 ? 1. : uGap;
  vec3 light = media * uBrightness * surface.b * (fill*.9 + halo*uGlow*.2*glowGrain);
  vec3 cladding = base * mix(1.,.72,fill);
  outColor = vec4(mix(base,clamp(cladding+light,0.,1.),mask),1.);
}`;
type Plate = { images: HTMLImageElement[]; textures: WebGLTexture[] };
type Source = HTMLImageElement | HTMLVideoElement | HTMLCanvasElement;
const photoPath = (id: SceneId, suffix: string) => `/assets/light-lab/photo/${id}-${suffix}${suffix.endsWith('.png') ? '?v=2-full-dome' : ''}`;

/** One flat compositor. No scene graph, camera controls, city model, lights,
 * environment map, continuous static RAF, or per-frame CPU pixel copy. */
export class PhotoStudio {
  readonly canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private buffer: WebGLBuffer;
  private mediaTexture: WebGLTexture;
  private uniforms = new Map<string, WebGLUniformLocation>();
  private plates = new Map<SceneId, Promise<Plate>>();
  private loaded: Plate[] = [];
  private plate: Plate | null = null;
  private active: SceneId = 'collins';
  private settings: Record<SceneId, DisplaySettings> = structuredClone(DEFAULT_SETTINGS);
  private stored: StoredMedia | null = null;
  private liveCanvas: HTMLCanvasElement | null = null;
  private fluidVideo: HTMLVideoElement | null = null;
  private sourceMode: 'stored' | 'chroma' | 'fluid' = 'stored';
  private source: Source | null = null;
  private sourceDirty = true;
  private sourceAspect = 16 / 9;
  private rect = [0, 0, 1, 1];
  private disposed = false;
  private frame = 0;
  private videoFrame = 0;
  private frameVideo: HTMLVideoElement | null = null;
  private detachSource: (() => void) | null = null;
  private lastUpload = 0;
  private renderCount = 0;
  private sceneVersion = 0;
  private observer: ResizeObserver;

  constructor(private host: HTMLElement, ready: () => void, private error: (message: string) => void,
    private pointer?: (point: StudioPointer | null) => void) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'photo-compositor';
    this.canvas.setAttribute('aria-label', 'Fixed view architectural media canvas');
    const gl = this.canvas.getContext('webgl2', { alpha: false, antialias: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error('WebGL2 unavailable');
    this.gl = gl;
    const shader = (type: number, code: string) => {
      const value = gl.createShader(type)!;
      gl.shaderSource(value, code); gl.compileShader(value);
      if (!gl.getShaderParameter(value, gl.COMPILE_STATUS)) { const message = gl.getShaderInfoLog(value); gl.deleteShader(value); throw new Error(message ?? 'Shader compilation failed'); }
      return value;
    };
    const vs = shader(gl.VERTEX_SHADER, vertex), fs = shader(gl.FRAGMENT_SHADER, fragment);
    this.program = gl.createProgram()!;
    gl.attachShader(this.program, vs); gl.attachShader(this.program, fs); gl.linkProgram(this.program);
    gl.deleteShader(vs); gl.deleteShader(fs);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) throw new Error('Photo shader link failed');
    gl.useProgram(this.program);
    for (const name of ['uBackground','uHigh','uLow','uDemo','uMedia','uRect','uViewport','uOffset','uAspect','uPanelAspect','uBrightness','uPixel','uGap','uGlow','uOriginalControls','uScene','uHasMedia']) this.uniforms.set(name, gl.getUniformLocation(this.program, name)!);
    this.vao = gl.createVertexArray()!; this.buffer = gl.createBuffer()!;
    gl.bindVertexArray(this.vao); gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const location = gl.getAttribLocation(this.program, 'aPosition');
    gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
    ['uBackground','uHigh','uLow','uDemo','uMedia'].forEach((name, index) => gl.uniform1i(this.uniforms.get(name)!, index));
    this.mediaTexture = this.texture();
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));
    host.appendChild(this.canvas);
    host.dataset.renderer = 'photo'; host.dataset.drawCalls = '1';
    this.canvas.addEventListener('pointerdown', this.down);
    this.canvas.addEventListener('pointermove', this.move);
    this.canvas.addEventListener('pointerup', this.up);
    this.canvas.addEventListener('pointercancel', this.up);
    this.canvas.addEventListener('pointerleave', this.leave);
    this.canvas.addEventListener('contextmenu', this.contextMenu);
    this.canvas.addEventListener('webglcontextlost', this.contextLost);
    document.addEventListener('visibilitychange', this.visibility);
    window.addEventListener('blur', this.leave);
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(host);
    this.resize();
    void this.setScene('collins').then(() => { if (!this.disposed) ready(); }).catch(() => { if (!this.disposed) error('图片场景加载失败，请重试。'); });
  }
  private texture(image?: HTMLImageElement, nearest = false) {
    const gl = this.gl, texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,nearest ? gl.NEAREST : gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,nearest ? gl.NEAREST : gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
    if (image) gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
    return texture;
  }
  private ensurePlate(id: SceneId) {
    let promise = this.plates.get(id);
    if (!promise) {
      promise = Promise.all(['background.webp','uv-high.png','uv-low.png','demo.webp'].map(suffix => new Promise<HTMLImageElement>((resolve,reject) => {
        const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('图片场景加载失败，请重试。')); image.src = photoPath(id,suffix);
      }))).then(images => {
        if (this.disposed) throw new Error('Renderer disposed');
        const plate = { images, textures: images.map((image,index) => this.texture(image,index === 1 || index === 2)) };
        this.loaded.push(plate); return plate;
      }).catch(error => { this.plates.delete(id); throw error; });
      this.plates.set(id,promise);
    }
    return promise;
  }
  async setScene(id: SceneId) {
    const version = ++this.sceneVersion;
    const plate = await this.ensurePlate(id);
    if (this.disposed || version !== this.sceneVersion) return;
    this.plate = plate; this.active = id; this.host.dataset.scene = id;
    this.render();
  }
  setStoredMedia(media: StoredMedia | null) { this.stored = media; this.applySource(); }
  setLiveCanvas(canvas: HTMLCanvasElement | null) { this.liveCanvas = canvas; this.applySource(); }
  setFluidVideo(video: HTMLVideoElement | null) { this.fluidVideo = video; this.applySource(); }
  setLiveSource(source: 'chroma' | 'fluid' | null) { this.sourceMode = source ?? 'stored'; this.applySource(); }
  private stopFrames() {
    cancelAnimationFrame(this.frame); this.frame = 0;
    if (this.videoFrame && this.frameVideo) this.frameVideo.cancelVideoFrameCallback(this.videoFrame);
    this.videoFrame = 0; this.frameVideo = null;
    this.host.dataset.animating = 'false';
  }
  private applySource() {
    const source = this.sourceMode === 'chroma' && this.liveCanvas ? this.liveCanvas : this.sourceMode === 'fluid' && this.fluidVideo ? this.fluidVideo : this.stored?.element ?? null;
    this.host.dataset.source = this.sourceMode === 'stored' ? this.stored?.info.kind ?? 'demo' : this.sourceMode;
    if (source === this.source) { this.render(); return; }
    this.stopFrames(); this.detachSource?.(); this.detachSource = null;
    this.source = source; this.sourceDirty = true;
    if (source instanceof HTMLVideoElement) {
      const redraw = () => { this.render(); this.schedule(); };
      const pause = () => { this.stopFrames(); this.render(); };
      for (const event of ['play','loadeddata','seeked','resize']) source.addEventListener(event,redraw);
      source.addEventListener('pause',pause);
      this.detachSource = () => { for (const event of ['play','loadeddata','seeked','resize']) source.removeEventListener(event,redraw); source.removeEventListener('pause',pause); };
    }
    this.render(); this.schedule();
  }
  private schedule() {
    if (this.disposed || document.hidden || this.frame || this.videoFrame) return;
    const source = this.source;
    if (source instanceof HTMLVideoElement && !source.paused) {
      this.frameVideo = source;
      this.videoFrame = source.requestVideoFrameCallback(() => { this.videoFrame = 0; this.render(); this.schedule(); });
    } else if (source instanceof HTMLCanvasElement) {
      this.frame = requestAnimationFrame(time => {
        this.frame = 0;
        if (time - this.lastUpload >= 1000 / 30) { this.lastUpload = time; this.render(); }
        this.schedule();
      });
    }
    this.host.dataset.animating = String(!!(this.frame || this.videoFrame));
  }
  private resize() {
    const ratio = Math.min(window.devicePixelRatio || 1,2);
    this.canvas.width = Math.max(1,Math.round(this.host.clientWidth * ratio));
    this.canvas.height = Math.max(1,Math.round(this.host.clientHeight * ratio));
    const width = this.canvas.width, height = this.canvas.height;
    const top = 74 * ratio, bottom = 38 * ratio;
    const scale = Math.min(width/PHOTO_WIDTH,Math.max(1,height-top-bottom)/PHOTO_HEIGHT);
    this.rect = [(width-PHOTO_WIDTH*scale)/2,top+(height-top-bottom-PHOTO_HEIGHT*scale)/2,PHOTO_WIDTH*scale,PHOTO_HEIGHT*scale];
    this.render();
  }
  private render() {
    if (this.disposed || !this.plate || this.gl.isContextLost()) return;
    const gl = this.gl, source = this.source, settings = this.settings[this.active];
    gl.useProgram(this.program); gl.bindVertexArray(this.vao);
    this.plate.textures.forEach((texture,index) => { gl.activeTexture(gl.TEXTURE0+index); gl.bindTexture(gl.TEXTURE_2D,texture); });
    gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D,this.mediaTexture);
    if (source && (!(source instanceof HTMLVideoElement) || source.readyState >= 2) &&
      (!(source instanceof HTMLImageElement) || this.sourceDirty)) {
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
      if (source instanceof HTMLImageElement) {
        // Preserve fine text/grid detail when a large upload is reduced onto
        // an oblique facade. Generate the prefiltered levels once per image.
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
        const anisotropy=gl.getExtension('EXT_texture_filter_anisotropic');
        if (anisotropy) gl.texParameterf(gl.TEXTURE_2D,anisotropy.TEXTURE_MAX_ANISOTROPY_EXT,
          Math.min(8,gl.getParameter(anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
      } else gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      this.sourceAspect = source instanceof HTMLVideoElement ? source.videoWidth/source.videoHeight : source instanceof HTMLImageElement ? source.naturalWidth/source.naturalHeight : source.width/source.height;
      this.sourceDirty = false;
    }
    gl.viewport(0,0,this.canvas.width,this.canvas.height);
    gl.uniform4fv(this.uniforms.get('uRect')!,this.rect);
    gl.uniform2f(this.uniforms.get('uViewport')!,this.canvas.width,this.canvas.height);
    gl.uniform2f(this.uniforms.get('uOffset')!,settings.offset/100,settings.vertical/100);
    gl.uniform1f(this.uniforms.get('uAspect')!,this.sourceAspect);
    gl.uniform1f(this.uniforms.get('uPanelAspect')!,PANEL_ASPECT[this.active]);
    gl.uniform1f(this.uniforms.get('uBrightness')!,settings.brightness/58);
    gl.uniform1f(this.uniforms.get('uPixel')!,settings.pixel/100);
    gl.uniform1f(this.uniforms.get('uGap')!,this.active === 'collins' ? settings.dotGap/100 : this.active === 'sphere' ? settings.pixel/100 : settings.ledTexture/100);
    gl.uniform1f(this.uniforms.get('uGlow')!,settings.glow/100);
    gl.uniform2f(this.uniforms.get('uOriginalControls')!,this.active==='collins'?DEFAULT_SETTINGS.collins.dotGap/100:DEFAULT_SETTINGS[this.active].pixel/100,DEFAULT_SETTINGS[this.active].glow/100);
    gl.uniform1i(this.uniforms.get('uScene')!,this.active === 'collins' ? 0 : this.active === 'facade' ? 1 : 2);
    gl.uniform1i(this.uniforms.get('uHasMedia')!,source ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES,0,6);
    this.host.dataset.renderCount = String(++this.renderCount);
  }
  setDisplay(id: SceneId, settings: DisplaySettings) { this.settings[id] = { ...settings }; if (id === this.active) this.render(); }
  setView() { /* Fixed calibrated reference camera. */ }
  resetView() { this.resize(); }
  private move = (event: PointerEvent) => {
    const bounds = this.canvas.getBoundingClientRect();
    const x = ((event.clientX-bounds.left)*this.canvas.width/bounds.width-this.rect[0])/this.rect[2]*PHOTO_WIDTH;
    const y = ((event.clientY-bounds.top)*this.canvas.height/bounds.height-this.rect[1])/this.rect[3]*PHOTO_HEIGHT;
    const point = mapPhotoSurface(this.active,x,y);
    if (!point) { this.leave(); return; }
    const settings = this.settings[this.active];
    const uv = mediaCoordinates(point,this.active,this.sourceAspect,settings.offset,settings.vertical);
    this.host.dataset.pointerUv = `${uv.u.toFixed(3)},${uv.v.toFixed(3)}`;
    this.pointer?.({ ...uv, held: event.buttons !== 0, scatter: !!(event.buttons & 2) });
  };
  private down = (event: PointerEvent) => { this.canvas.setPointerCapture(event.pointerId); this.move(event); };
  private up = (event: PointerEvent) => { if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId); this.leave(); };
  private leave = () => { delete this.host.dataset.pointerUv; this.pointer?.(null); };
  private contextMenu = (event: Event) => event.preventDefault();
  private contextLost = (event: Event) => { event.preventDefault(); this.stopFrames(); this.error('图片渲染已中断，请重新打开测试项。'); };
  private visibility = () => { if (document.hidden) { this.stopFrames(); this.leave(); } else { this.render(); this.schedule(); } };
  exportPng() {
    this.render();
    const link = document.createElement('a'); link.href = this.canvas.toDataURL('image/png');
    link.download = `${this.active}-photo-lab.png`; link.click();
  }
  dispose() {
    this.disposed = true; ++this.sceneVersion; this.stopFrames(); this.detachSource?.(); this.observer.disconnect(); this.leave();
    document.removeEventListener('visibilitychange',this.visibility); window.removeEventListener('blur',this.leave);
    this.canvas.removeEventListener('pointerdown',this.down); this.canvas.removeEventListener('pointermove',this.move);
    this.canvas.removeEventListener('pointerup',this.up); this.canvas.removeEventListener('pointercancel',this.up);
    this.canvas.removeEventListener('pointerleave',this.leave); this.canvas.removeEventListener('contextmenu',this.contextMenu);
    this.canvas.removeEventListener('webglcontextlost',this.contextLost);
    for (const plate of this.loaded) for (const texture of plate.textures) this.gl.deleteTexture(texture);
    this.gl.deleteTexture(this.mediaTexture); this.gl.deleteBuffer(this.buffer); this.gl.deleteVertexArray(this.vao); this.gl.deleteProgram(this.program);
    this.gl.getExtension('WEBGL_lose_context')?.loseContext(); this.canvas.remove();
    this.loaded = []; this.plates.clear(); this.source = null; this.stored = null; this.liveCanvas = null; this.fluidVideo = null;
  }
}
