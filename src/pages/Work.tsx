import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { categories, filterProjects } from '../content';
import { ProjectCard } from '../components/ui';

export default function Work() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const featured = params.get('featured') === '1';

  const [inputValue, setInputValue] = useState(q);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true, preventScrollReset: true });
  };

  useEffect(() => {
    setInputValue(q);
  }, [q]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (inputValue.trim() !== q.trim()) {
        set('q', inputValue.trim());
      }
    }, 250);
    return () => clearTimeout(t);
  }, [inputValue]);

  const result = filterProjects(q, category, featured);
  const allCount = filterProjects(q, category, false).length;
  const featuredCount = filterProjects(q, category, true).length;

  return (
    <section className="section page work-page">
      <div className="page-heading">
        <h1>
          WORK<span>作品档案</span>
        </h1>
        <p>
          光的作品，空间的叙事。
          <br />
          <span className="muted">2023 年画册 · 29 个代表项目</span>
        </p>
      </div>
      <div className="work-toolbar">
        <div className="tabs" aria-label="作品范围">
          <button aria-pressed={!featured} onClick={() => set('featured', '')}>
            全部作品 <small>{allCount}</small>
          </button>
          <button aria-pressed={featured} onClick={() => set('featured', '1')}>
            精选作品 <small>{featuredCount}</small>
          </button>
        </div>
        <label className="search">
          <span className="sr-only">搜索项目</span>
          <input
            type="search"
            placeholder="搜索项目、城市、类型…"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
          />
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <circle cx="10" cy="10" r="6" />
            <path d="m15 15 6 6" />
          </svg>
        </label>
      </div>
      <div className="filters" aria-label="项目分类">
        <button aria-pressed={!category} onClick={() => set('category', '')}>
          全部类型
        </button>
        {categories.map(c => (
          <button
            key={c}
            aria-pressed={category === c}
            onClick={() => set('category', c)}
          >
            {c}
          </button>
        ))}
      </div>
      <p className="result-count" aria-live="polite">
        {result.length} 个项目{category ? ` / ${category}` : ''}
      </p>
      {result.length ? (
        <div className="archive-grid">
          {result.map((p, i) => (
            <ProjectCard key={p.slug} project={p} index={i} />
          ))}
        </div>
      ) : (
        <div className="empty">
          <h2>暂未找到匹配的作品。</h2>
          <p>试试其他名称，或清除筛选条件。</p>
          <button
            className="outline-button"
            onClick={() => {
              setInputValue('');
              setParams({}, { replace: true });
            }}
          >
            清除筛选
          </button>
        </div>
      )}
    </section>
  );
}
