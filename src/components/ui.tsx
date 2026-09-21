import { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Project, ProjectMedia } from '../content/types';
import { springStep, useMotionLoop, type Spring } from './motion';

export function Arrow({ down = false }: { down?: boolean }) {
  return (
    <svg
      className={`arrow ${down ? 'down' : ''}`}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path d="M5 19 19 5M5 5h14v14" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function TextLink({
  to,
  children,
  className = ''
}: {
  to: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link className={`text-link ${className}`} to={to} data-magnetic>
      {children}
      <Arrow />
    </Link>
  );
}

export function SectionTitle({
  english,
  chinese,
  children
}: {
  english: string;
  chinese: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-title">
      <h2 data-reveal>
        {english}
        <span>{chinese}</span>
      </h2>
      {children}
    </div>
  );
}

export function Media({
  media,
  priority = false,
  className = ''
}: {
  media: ProjectMedia;
  priority?: boolean;
  className?: string;
}) {
  const [error, setError] = useState(false);
  return error ? (
    <div className="media-error">
      {media.alt}
      <span>图片暂时无法加载</span>
      <button onClick={() => setError(false)}>重试</button>
    </div>
  ) : (
    <img
      className={className}
      src={media.src}
      srcSet={media.srcSet}
      sizes="(max-width: 700px) calc(100vw - 44px), (max-width: 1100px) 60vw, 850px"
      width={media.width}
      height={media.height}
      alt={media.alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      onError={() => setError(true)}
    />
  );
}

export function ParallaxPoster({
  project,
  index = 0,
  priority = false
}: {
  project: Project;
  index?: number;
  priority?: boolean;
}) {
  const poster = useRef<HTMLAnchorElement>(null);
  const p = useRef<Spring>({ x: 0, y: 0, vx: 0, vy: 0 });
  const target = useRef({ x: 0, y: 0 });
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const { host, wake } = useMotionLoop(
    () => {
      springStep(
        p.current,
        reduced ? 0 : target.current.x,
        reduced ? 0 : target.current.y,
        110,
        16
      );
      if (!poster.current) return;
      poster.current.style.transform = `perspective(900px) rotateX(${-p.current.y * 8}deg) rotateY(${p.current.x * 10}deg)`;
      poster.current.style.setProperty('--shift-x', `${p.current.x * 20}px`);
      poster.current.style.setProperty('--shift-y', `${p.current.y * 16}px`);
    },
    false,
    reduced
  );

  return (
    <div
      ref={host}
      className="project-poster-wrap"
      onPointerMove={e => {
        if (reduced) return;
        const r = e.currentTarget.getBoundingClientRect();
        target.current = {
          x: ((e.clientX - r.left) / r.width) * 2 - 1,
          y: ((e.clientY - r.top) / r.height) * 2 - 1
        };
        wake(120);
      }}
      onPointerLeave={() => {
        target.current = { x: 0, y: 0 };
        wake(120);
      }}
      onPointerUp={() => {
        target.current = { x: 0, y: 0 };
        wake(120);
      }}
      onPointerCancel={() => {
        target.current = { x: 0, y: 0 };
        wake(120);
      }}
    >
      <Link
        to={`/work/${project.slug}`}
        ref={poster}
        className="project-poster"
        aria-label={`查看${project.name}，方向键倾斜，Escape回正`}
        data-cursor="探索作品"
        onKeyDown={e => {
          if (reduced) return;
          if (e.key.startsWith('Arrow')) {
            e.preventDefault();
            if (e.key === 'ArrowLeft') target.current.x = -1;
            else if (e.key === 'ArrowRight') target.current.x = 1;
            if (e.key === 'ArrowUp') target.current.y = -1;
            else if (e.key === 'ArrowDown') target.current.y = 1;
            wake(120);
          }
          if (e.key === 'Escape') {
            target.current = { x: 0, y: 0 };
            wake(120);
          }
        }}
      >
        <div className="poster-layer poster-bg">
          <Media media={project.cover} priority={priority} />
          <div className="poster-grain" aria-hidden="true" />
        </div>
        <div className="poster-layer poster-glare" aria-hidden="true" />
        <div className="poster-layer poster-tag" aria-hidden="true">
          <span>TJAD · 0{index + 1}</span>
        </div>
        <div className="poster-layer poster-kind" aria-hidden="true">
          <span>{project.cover.kind}</span>
        </div>
        <div className="poster-layer poster-action" aria-hidden="true">
          <span className="project-open">
            <Arrow />
          </span>
        </div>
      </Link>
    </div>
  );
}

export function ProjectCard({
  project,
  index = 0,
  parallax = false
}: {
  project: Project;
  index?: number;
  parallax?: boolean;
}) {
  return (
    <article className="project-card" data-reveal>
      <div className="project-index">
        {String(index + 1).padStart(2, '0')}
        <span />
      </div>
      {parallax ? (
        <ParallaxPoster project={project} index={index} priority={index < 2} />
      ) : (
        <Link
          to={`/work/${project.slug}`}
          className="project-image"
          aria-label={`查看${project.name}`}
          data-cursor="探索作品"
        >
          <Media media={project.cover} />
          <span className="project-open">
            <Arrow />
          </span>
        </Link>
      )}
      <div className="project-caption">
        <Link to={`/work/${project.slug}`}>
          <h3>{project.name}</h3>
        </Link>
        <p>
          {project.categories.join(' · ')}
          <span> / </span>
          {project.city}
        </p>
        <small>{project.cover.kind}</small>
      </div>
    </article>
  );
}

export function Gallery({ items }: { items: ProjectMedia[] }) {
  const [active, setActive] = useState<number | null>(null);
  const ref = useRef<HTMLDialogElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (active === null) return;
    lastFocus.current = document.activeElement as HTMLElement;
    ref.current?.showModal();

    const key = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setActive(v => (v === null ? null : (v + 1) % items.length));
      if (e.key === 'ArrowLeft') setActive(v => (v === null ? null : (v - 1 + items.length) % items.length));
    };

    document.addEventListener('keydown', key);
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', key);
      document.body.style.overflow = before;
      lastFocus.current?.focus();
    };
  }, [active === null, items.length]);

  const close = () => {
    ref.current?.close();
    setActive(null);
  };

  return (
    <>
      <div className="gallery">
        {items.map((m, i) => (
          <figure key={m.id} data-reveal>
            <button
              className="gallery-image"
              onClick={() => setActive(i)}
              aria-label={`放大图片 ${i + 1}：${m.alt}`}
            >
              <Media media={m} />
              <span>
                <Arrow />
              </span>
            </button>
            <figcaption>
              {String(i + 1).padStart(2, '0')} / {m.kind}
            </figcaption>
          </figure>
        ))}
      </div>
      <dialog
        ref={ref}
        className="lightbox"
        aria-label="项目图片查看器"
        onCancel={close}
        onClick={e => {
          if (e.target === e.currentTarget) close();
        }}
      >
        {active !== null && (
          <>
            <button className="lightbox-close" onClick={close} autoFocus>
              关闭 ×
            </button>
            <img
              src={items[active].src}
              width={items[active].width}
              height={items[active].height}
              alt={items[active].alt}
            />
            <div className="lightbox-controls">
              <button onClick={() => setActive((active - 1 + items.length) % items.length)}>
                上一张
              </button>
              <span aria-live="polite">
                {active + 1} / {items.length} · {items[active].kind}
              </span>
              <button onClick={() => setActive((active + 1) % items.length)}>
                下一张
              </button>
            </div>
          </>
        )}
      </dialog>
    </>
  );
}
