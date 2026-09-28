import { useEffect,useRef } from 'react';
import { useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
gsap.registerPlugin(ScrollTrigger,useGSAP);
export function PageEffects() {
  const { pathname } = useLocation();
  const shutters = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  useGSAP(
    () => {
      // Ensure scroll is at 0 before computing ScrollTrigger positions
      window.scrollTo({ top: 0, behavior: 'instant' });
      const main = document.getElementById('main');
      main?.focus({ preventScroll: true });

      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        document.querySelectorAll('[data-reveal]').forEach(el => {
          gsap.from(el, {
            y: 24,
            opacity: 0,
            duration: 0.8,
            ease: 'power2.out',
            scrollTrigger: { trigger: el, start: 'top 95%', once: true }
          });
        });
        document.querySelectorAll('[data-line-reveal]').forEach(el => {
          gsap.from(el.querySelectorAll('.title-mask-content'), {
            yPercent: 110,
            duration: 0.9,
            stagger: 0.09,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 90%', once: true }
          });
        });
        if (!first.current && shutters.current) {
          gsap.fromTo(
            shutters.current.children,
            { scaleY: 1 },
            { scaleY: 0, stagger: 0.025, duration: 0.5, ease: 'power3.inOut', transformOrigin: 'top' }
          );
        }
      });
      first.current = false;
      ScrollTrigger.refresh();
      return () => media.revert();
    },
    { dependencies: [pathname], revertOnUpdate: true }
  );

  return (
    <div className="shutters" ref={shutters} aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <i key={i} />
      ))}
    </div>
  );
}

export function MagneticCursor() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!matchMedia('(pointer:fine) and (prefers-reduced-motion:no-preference)').matches) return;
    let x = -100,
      y = -100,
      px = -100,
      py = -100,
      raf = 0;
    let target: HTMLElement | null = null;
    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      const hit = (e.target as HTMLElement).closest<HTMLElement>('[data-magnetic], [data-cursor]');
      if (target && target !== hit) target.style.translate = '';
      target = hit;
      if (ref.current) {
        ref.current.textContent = hit?.dataset.cursor || '';
        ref.current.classList.toggle('large', !!hit?.dataset.cursor);
        ref.current.classList.add('visible');
      }
      if (hit?.hasAttribute('data-magnetic')) {
        const r = hit.getBoundingClientRect();
        hit.style.translate = `${(x - r.left - r.width / 2) * 0.09}px ${(y - r.top - r.height / 2) * 0.1}px`;
      }
    };
    const leave = () => ref.current?.classList.remove('visible');
    const frame = () => {
      px += (x - px) * 0.18;
      py += (y - py) * 0.18;
      if (ref.current) ref.current.style.transform = `translate3d(${px}px,${py}px,0)`;
      raf = requestAnimationFrame(frame);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerleave', leave);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerleave', leave);
      if (target) target.style.translate = '';
    };
  }, []);
  return <div className="cursor" ref={ref} aria-hidden="true" />;
}
