import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const PARTICLE_COUNT = 23000;
const DESIGN_WIDTH = 1440;
const DESIGN_HEIGHT = 1600;
const EARLY_REVEAL_BOOST = 0.16;

// One continuous gesture: enter the Hero, pass its title, then loop through Selected Work.
const flowPath = 'M -120 150 C 170 175 540 195 715 350 C 940 550 545 748 -120 865 C 175 885 470 905 545 1020 C 655 1180 430 1320 235 1330 C 10 1340 -60 1165 140 1105 C 375 1030 780 1085 1045 1080 C 1210 1078 1350 1140 1500 1265';

const vertexShader = `
  attribute vec2 aPosition;
  attribute vec2 aDirection;
  attribute float aProgress;
  attribute float aSize;
  attribute float aSeed;
  attribute float aOpacity;
  uniform float uProgress;
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vOpacity;
  varying float vTone;

  void main() {
    float flow = (fract(uTime * (0.11 + aSeed * 0.05) + aSeed) - 0.5) * 18.0;
    vec2 position = aPosition + aDirection * flow;
    gl_Position = vec4(position.x * 2.0 - 1.0, 1.0 - position.y * 2.0, 0.0, 1.0);

    float reveal = 1.0 - smoothstep(uProgress - 0.022, uProgress + 0.005, aProgress);
    float head = exp(-pow((aProgress - uProgress) * 54.0, 2.0));
    float shimmer = 0.77 + 0.23 * sin(uTime * (2.0 + aSeed * 2.0) + aSeed * 32.0);
    vOpacity = aOpacity * reveal * shimmer * (1.0 + head * 1.15);
    vTone = aSeed;
    gl_PointSize = aSize * uPixelRatio * (1.0 + head * 0.35);
  }
`;

const fragmentShader = `
  precision mediump float;
  varying float vOpacity;
  varying float vTone;

  void main() {
    float radius = length(gl_PointCoord - vec2(0.5)) * 2.0;
    float core = 1.0 - smoothstep(0.12, 0.68, radius);
    float halo = (1.0 - smoothstep(0.0, 1.0, radius)) * 0.38;
    float alpha = vOpacity * (core * 0.92 + halo);
    if (alpha < 0.01) discard;
    vec3 gold = mix(vec3(0.54, 0.37, 0.15), vec3(1.0, 0.9, 0.65), vTone);
    gl_FragColor = vec4(gold, alpha);
  }
`;

function createProgram(gl: WebGLRenderingContext) {
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    gl.deleteShader(shader);
    return null;
  };
  const vertex = compile(gl.VERTEX_SHADER, vertexShader);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentShader);
  if (!vertex || !fragment) {
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    return null;
  }
  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    return null;
  }
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
  gl.deleteProgram(program);
  return null;
}

function makeParticles(path: SVGPathElement) {
  const data = new Float32Array(PARTICLE_COUNT * 8);
  const length = path.getTotalLength();
  const samples = Array.from({ length: 900 }, (_, index) =>
    path.getPointAtLength((index / 899) * length)
  );
  let seed = 89241;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);

  for (let index = 0; index < PARTICLE_COUNT; index++) {
    const progress = (index + random()) / PARTICLE_COUNT;
    const sampleIndex = progress * 899;
    const lowerIndex = Math.floor(sampleIndex);
    const blend = sampleIndex - lowerIndex;
    const lower = samples[lowerIndex];
    const upper = samples[Math.min(899, lowerIndex + 1)];
    const point = {
      x: lower.x + (upper.x - lower.x) * blend,
      y: lower.y + (upper.y - lower.y) * blend
    };
    const before = samples[Math.max(0, lowerIndex - 1)];
    const after = samples[Math.min(899, lowerIndex + 1)];
    const dx = after.x - before.x;
    const dy = after.y - before.y;
    const magnitude = Math.hypot(dx, dy) || 1;
    const tangentX = dx / magnitude;
    const tangentY = dy / magnitude;
    const dust = random() < 0.15;
    const side = dust ? (random() - random()) * 76 : (random() - random()) * 22;
    const size = dust ? 1.6 + random() * 2.8 : random() < 0.1 ? 5.5 + random() * 3.5 : 2.1 + random() * 3;
    const offset = index * 8;

    data[offset] = (point.x - tangentY * side) / DESIGN_WIDTH;
    data[offset + 1] = (point.y + tangentX * side) / DESIGN_HEIGHT;
    data[offset + 2] = tangentX / DESIGN_WIDTH;
    data[offset + 3] = tangentY / DESIGN_HEIGHT;
    data[offset + 4] = progress;
    data[offset + 5] = size;
    data[offset + 6] = random();
    data[offset + 7] = dust ? 0.3 + random() * 0.4 : 0.62 + random() * 0.38;
  }
  return data;
}

export default function GoldParticleFlow() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1101px) and (prefers-reduced-motion: no-preference)');
    const update = () => setEnabled(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const path = pathRef.current;
    const hero = document.querySelector<HTMLElement>('.home-opening .hero');
    const firstProject = document.querySelector<HTMLElement>('.home-opening .home-projects .project-card');
    if (!root || !canvas || !path || !hero || !firstProject) return;

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      powerPreference: 'low-power'
    });
    if (!gl) {
      root.dataset.webgl = 'unavailable';
      return;
    }

    const program = createProgram(gl);
    const buffer = gl.createBuffer();
    if (!program || !buffer) {
      if (program) gl.deleteProgram(program);
      if (buffer) gl.deleteBuffer(buffer);
      root.dataset.webgl = 'unavailable';
      return;
    }

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, makeParticles(path), gl.STATIC_DRAW);
    const attribute = (name: string, size: number, offset: number) => {
      const location = gl.getAttribLocation(program, name);
      if (location < 0) return;
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, 8 * 4, offset * 4);
    };
    attribute('aPosition', 2, 0);
    attribute('aDirection', 2, 2);
    attribute('aProgress', 1, 4);
    attribute('aSize', 1, 5);
    attribute('aSeed', 1, 6);
    attribute('aOpacity', 1, 7);
    const progressUniform = gl.getUniformLocation(program, 'uProgress');
    const timeUniform = gl.getUniformLocation(program, 'uTime');
    const ratioUniform = gl.getUniformLocation(program, 'uPixelRatio');
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    root.dataset.webgl = 'ready';
    root.dataset.progress = '0';

    let frameId = 0;
    let inView = false;
    let disposed = false;
    let contextLost = false;
    let pixelRatio = 1;
    const state = { progress: 0 };
    const shouldAnimate = () => inView && !contextLost && !document.hidden && state.progress > 0.001;
    const render = (time: number) => {
      frameId = 0;
      if (disposed || contextLost) return;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (state.progress > 0.001) {
        gl.uniform1f(progressUniform, state.progress);
        gl.uniform1f(timeUniform, time * 0.001);
        gl.uniform1f(ratioUniform, pixelRatio);
        gl.drawArrays(gl.POINTS, 0, PARTICLE_COUNT);
      }
      if (shouldAnimate()) frameId = requestAnimationFrame(render);
    };
    const syncActivity = () => {
      const active = shouldAnimate();
      root.dataset.rendering = String(active);
      if (active && !frameId) frameId = requestAnimationFrame(render);
      if (!active && frameId) {
        cancelAnimationFrame(frameId);
        frameId = 0;
      }
      if (!active && state.progress <= 0.001) render(performance.now());
    };
    const resize = () => {
      const bounds = root.getBoundingClientRect();
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.25);
      canvas.width = Math.max(1, Math.round(bounds.width * pixelRatio));
      canvas.height = Math.max(1, Math.round(bounds.height * pixelRatio));
      gl.viewport(0, 0, canvas.width, canvas.height);
      syncActivity();
    };
    const observer = new IntersectionObserver(entries => {
      inView = Boolean(entries[0]?.isIntersecting);
      syncActivity();
    });
    observer.observe(root);
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(root);
    document.addEventListener('visibilitychange', syncActivity);
    const onContextLost = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      syncActivity();
      root.dataset.webgl = 'unavailable';
    };
    canvas.addEventListener('webglcontextlost', onContextLost);

    const tween = gsap.to(state, {
      progress: 1,
      // Catch up to the existing Selected Work timing without pre-drawing the Hero.
      ease: (progress: number) => progress + EARLY_REVEAL_BOOST * (1 - progress) * (1 - Math.exp(-progress * 12)),
      onUpdate: () => {
        root.dataset.progress = state.progress.toFixed(3);
        syncActivity();
      },
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        endTrigger: firstProject,
        end: 'top 35%',
        scrub: 0.25,
        invalidateOnRefresh: true
      }
    });

    resize();
    return () => {
      disposed = true;
      tween.scrollTrigger?.kill();
      tween.kill();
      observer.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', syncActivity);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      if (frameId) cancelAnimationFrame(frameId);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      root.dataset.rendering = 'false';
    };
  }, [enabled]);

  return (
    <div ref={rootRef} className="gold-particle-flow" data-rendering="false" aria-hidden="true">
      <canvas ref={canvasRef} />
      <svg className="gold-particle-guide" viewBox={`0 0 ${DESIGN_WIDTH} ${DESIGN_HEIGHT}`} focusable="false">
        <path ref={pathRef} d={flowPath} />
      </svg>
    </div>
  );
}
