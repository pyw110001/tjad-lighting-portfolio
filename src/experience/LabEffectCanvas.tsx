import { useEffect, useRef } from 'react';
import { Color, Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, Vector2, WebGLRenderer } from 'three';
import type { FullLabState } from './labState';

type Mode = 'field' | 'pixel' | 'color';

interface Props {
  mode: Mode;
  state: FullLabState;
  active: boolean;
  reduced: boolean;
  pointer: [number, number];
  onLost: () => void;
}

const fragment = `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform float uMode;
uniform float uIntensity;
uniform float uSpeed;
uniform float uBrightness;
uniform float uPattern;
uniform float uKelvin;
uniform float uAngle;
uniform float uDayTime;
uniform float uSourceType;
uniform vec2 uPointer;
uniform vec3 uTint;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
void main() {
  vec2 uv = vUv;
  vec3 color = uTint;
  float alpha = 0.0;
  if (uMode < 0.5) {
    vec2 source = vec2(0.67 + uAngle * 0.16 + (uDayTime - 12.0) * 0.012, 0.45 + sin((uDayTime - 6.0) / 12.0 * 3.14159) * 0.15);
    float broad = exp(-length((uv-source) * vec2(1.35, 1.0)) * 4.2);
    float beam = exp(-abs((uv.x - source.x) - (uv.y - source.y) * (0.25 + uAngle * 0.3)) * 24.0) * smoothstep(0.34, 0.64, uv.x);
    float pointerGlow = exp(-distance(uv, uPointer) * 12.0) * smoothstep(0.39, 0.55, uv.x);
    if (uSourceType < 0.5) alpha = broad * 0.22 + beam * 0.12 + pointerGlow * 0.18;
    else if (uSourceType < 1.5) alpha = beam * 0.40 + pointerGlow * 0.24;
    else if (uSourceType < 2.5) alpha = broad * 0.30 + pointerGlow * 0.12;
    else alpha = pointerGlow * 0.65 + beam * 0.18;
    alpha *= uIntensity;
  } else if (uMode < 1.5) {
    // Dots move within the photographed facade; the photograph remains the architectural anchor.
    vec2 grid = vec2(118.0, 58.0);
    vec2 cell = floor(uv * grid);
    vec2 local = fract(uv * grid) - 0.5;
    float dot = 1.0 - smoothstep(0.08, 0.30, length(local));
    float n = hash(cell);
    float phase = uv.x * 16.0 + uv.y * 9.0 - uTime * uSpeed;
    float signal = sin(phase);
    if (uPattern > 0.5 && uPattern < 1.5) signal = sin(length(uv - vec2(0.77, 0.58)) * 42.0 - uTime * uSpeed * 2.0);
    if (uPattern > 1.5 && uPattern < 2.5) signal = sin(uv.x * 35.0 - uTime * uSpeed * 2.6 + sin(uv.y * 12.0));
    if (uPattern > 2.5 && uPattern < 3.5) signal = sin(cell.x * 0.3) * sin(cell.y * 0.3);
    if (uPattern > 3.5) signal = sin(uv.x * 18.0 + uTime * uSpeed) * sin(uv.y * 9.0);
    float facade = smoothstep(0.45, 0.60, uv.x) * smoothstep(0.39, 0.53, uv.y) * (1.0 - smoothstep(0.87, 0.99, uv.y));
    alpha = facade * dot * (0.18 + 0.38 * smoothstep(-0.3, 0.9, signal + n * 0.3)) * uBrightness;
  } else {
    float planes = exp(-abs(uv.x - 0.46) * 18.0) + exp(-abs(uv.x - 0.64) * 19.0) + exp(-abs(uv.x - 0.84) * 17.0);
    float floorLight = exp(-abs(uv.y - 0.32) * 14.0) * smoothstep(0.36, 0.70, uv.x);
    alpha = (planes * 0.25 + floorLight * 0.18) * uIntensity;
  }
  gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.72));
}`;

export default function LabEffectCanvas({ mode, state, active, reduced, pointer, onLost }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const materialRef = useRef<ShaderMaterial | null>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const frameRef = useRef(0);
  const renderRef = useRef<((time: number) => void) | null>(null);
  const onLostRef = useRef(onLost);
  onLostRef.current = onLost;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power', preserveDrawingBuffer: true });
    } catch {
      onLostRef.current();
      return;
    }
    rendererRef.current = renderer;
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    const scene = new Scene();
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 2);
    camera.position.z = 1;
    const geometry = new PlaneGeometry(2, 2);
    const material = new ShaderMaterial({
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
      fragmentShader: fragment,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 }, uMode: { value: 0 }, uIntensity: { value: 1 },
        uSpeed: { value: 1 }, uBrightness: { value: 1 }, uPattern: { value: 0 },
        uKelvin: { value: 4000 }, uAngle: { value: 0 }, uDayTime: { value: 10.5 }, uSourceType: { value: 0 },
        uPointer: { value: new Vector2(-10, -10) }, uTint: { value: new Color('#edc987') }
      }
    });
    materialRef.current = material;
    scene.add(new Mesh(geometry, material));
    const resize = () => {
      const parent = canvas.parentElement;
      if (parent && parent.clientWidth && parent.clientHeight) renderer.setSize(parent.clientWidth, parent.clientHeight, false);
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (canvas.parentElement) observer.observe(canvas.parentElement);
    const lost = (event: Event) => { event.preventDefault(); onLostRef.current(); };
    canvas.addEventListener('webglcontextlost', lost);
    renderRef.current = (time: number) => {
      material.uniforms.uTime.value = time * 0.001;
      renderer.render(scene, camera);
    };
    renderRef.current(0);
    return () => {
      cancelAnimationFrame(frameRef.current);
      canvas.removeEventListener('webglcontextlost', lost);
      observer.disconnect();
      geometry.dispose(); material.dispose(); renderer.dispose();
      materialRef.current = null; rendererRef.current = null; renderRef.current = null;
    };
  }, []);

  useEffect(() => {
    const material = materialRef.current;
    if (!material) return;
    const u = material.uniforms;
    u.uMode.value = mode === 'field' ? 0 : mode === 'pixel' ? 1 : 2;
    u.uIntensity.value = mode === 'field' ? state.lightField.intensity / 100 : state.colorStudio.intensity / 100;
    u.uSpeed.value = state.pixelFacade.speed / 35;
    u.uBrightness.value = state.pixelFacade.brightness / 100;
    u.uPattern.value = ['wave', 'ripple', 'flow', 'pattern', 'text'].indexOf(state.pixelFacade.pattern);
    u.uKelvin.value = state.lightField.tempKelvin;
    u.uAngle.value = state.lightField.angle[0];
    u.uDayTime.value = state.lightField.time;
    u.uSourceType.value = ['sun', 'artificial', 'ambient', 'model'].indexOf(state.lightField.lightType);
    u.uPointer.value.set(pointer[0], 1 - pointer[1]);
    const tint = mode === 'pixel' ? state.pixelFacade.color : mode === 'color'
      ? ({ warm3000: '#ffb86b', neutral4000: '#fff0ce', cool6000: '#d7e9ff', rgb: state.colorStudio.customColor })[state.colorStudio.preset]
      : state.lightField.tempKelvin < 3800 ? '#ffc67b' : state.lightField.tempKelvin > 5200 ? '#d6e9ff' : '#ffe0ad';
    u.uTint.value.set(tint);
    renderRef.current?.(performance.now());
  }, [mode, state, pointer]);

  // The component is mounted only for the selected stage. Pausing also stops its RAF.
  useEffect(() => {
    cancelAnimationFrame(frameRef.current);
    if (!active || reduced || mode !== 'pixel' || state.pixelFacade.paused) return;
    const tick = (time: number) => {
      renderRef.current?.(time);
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [active, reduced, mode, state.pixelFacade.paused]);

  return <canvas ref={canvasRef} className="lab-effect-canvas" aria-hidden="true" />;
}
