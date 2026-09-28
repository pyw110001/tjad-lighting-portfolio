import { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Project, ProjectMedia } from '../content/types';
import { springStep, useMotionLoop, type Spring } from './motion';
import { useLanguage } from '../language';
import { localizeProject } from '../content/project-en';

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
  children,
  masked = false
}: {
  english: string;
  chinese: string;
  children?: ReactNode;
  masked?: boolean;
}) {
  const { language } = useLanguage();
  return (
    <div className="section-title">
      <h2 data-reveal={masked ? undefined : ''} data-line-reveal={masked ? '' : undefined}>
        {masked ? (
          <>
            <span className="title-mask-line"><span className="title-mask-content">{english}</span></span>
            {language === 'zh' && <span className="title-mask-line title-mask-zh"><span className="title-mask-content">{chinese}</span></span>}
          </>
        ) : (
          <>{english}{language === 'zh' && <span>{chinese}</span>}</>
        )}
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
  const { pick } = useLanguage();
  const [error, setError] = useState(false);
  return error ? (
    <div className="media-error">
      {media.alt}
      <span>{pick('图片暂时无法加载', 'Image unavailable')}</span>
      <button onClick={() => setError(false)}>{pick('重试', 'Retry')}</button>
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
  const { pick } = useLanguage();
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
        aria-label={pick(`查看${project.name}，方向键倾斜，Escape回正`, `View ${project.name}; use arrow keys to tilt, Escape to reset`)}
        data-cursor={pick('探索作品', 'View project')}
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
  const { language, pick } = useLanguage();
  const displayProject = localizeProject(project, language);
  return (
    <article className="project-card" data-reveal>
      <div className="project-index">
        {String(index + 1).padStart(2, '0')}
        <span />
      </div>
      {parallax ? (
        <ParallaxPoster project={displayProject} index={index} priority={index < 2} />
      ) : (
        <Link
          to={`/work/${project.slug}`}
          className="project-image"
          aria-label={pick(`查看${displayProject.name}`, `View ${displayProject.name}`)}
          data-cursor={pick('探索作品', 'View project')}
        >
          <Media media={displayProject.cover} />
          <span className="project-open">
            <Arrow />
          </span>
        </Link>
      )}
      <div className="project-caption">
        <p>
          {displayProject.categories.join(' · ')}
          <span> / </span>
          {displayProject.city}
        </p>
        <Link to={`/work/${project.slug}`} className="project-title-link">
          <span className="project-title-arrow" aria-hidden="true">
            <svg viewBox="0 0 44 24" fill="none" focusable="false">
              <path d="M1 12H41M30 1L41 12L30 23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <h3 aria-label={displayProject.name}>
            {parallax ? (
              <span className="project-title-letters" aria-hidden="true">
                {Array.from(displayProject.name).map((letter, letterIndex) => (
                  <span className="project-title-letter" key={`${letterIndex}-${letter}`}>
                    <span className="project-title-letter-track" style={{ transitionDelay: `${letterIndex * 24}ms` }}>
                      <span>{letter === ' ' ? '\u00a0' : letter}</span>
                      <span>{letter === ' ' ? '\u00a0' : letter}</span>
                    </span>
                  </span>
                ))}
              </span>
            ) : displayProject.name}
          </h3>
        </Link>
        <small>{displayProject.cover.kind}</small>
      </div>
    </article>
  );
}

export function Gallery({ items }: { items: ProjectMedia[] }) {
  const { pick } = useLanguage();
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
              aria-label={pick(`放大图片 ${i + 1}：${m.alt}`, `Enlarge image ${i + 1}: ${m.alt}`)}
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
        aria-label={pick('项目图片查看器', 'Project image viewer')}
        onCancel={close}
        onClick={e => {
          if (e.target === e.currentTarget) close();
        }}
      >
        {active !== null && (
          <>
            <button className="lightbox-close" onClick={close} autoFocus>
              {pick('关闭', 'Close')} ×
            </button>
            <img
              src={items[active].src}
              width={items[active].width}
              height={items[active].height}
              alt={items[active].alt}
            />
            <div className="lightbox-controls">
              <button onClick={() => setActive((active - 1 + items.length) % items.length)}>
                {pick('上一张', 'Previous')}
              </button>
              <span aria-live="polite">
                {active + 1} / {items.length} · {items[active].kind}
              </span>
              <button onClick={() => setActive((active + 1) % items.length)}>
                {pick('下一张', 'Next')}
              </button>
            </div>
          </>
        )}
      </dialog>
    </>
  );
}
