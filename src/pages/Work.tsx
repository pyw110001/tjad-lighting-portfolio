import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { categories, filterProjects } from '../content';
import { ProjectCard } from '../components/ui';
import { useLanguage } from '../language';
import { categoryEnglish } from '../content/project-en';

export default function Work() {
  const { language, pick } = useLanguage();
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

  const result = filterProjects(q, category, featured, language);
  const allCount = filterProjects(q, category, false, language).length;
  const featuredCount = filterProjects(q, category, true, language).length;

  return (
    <section className="section page work-page">
      <div className="page-heading">
        <h1>
          WORK{language === 'zh' && <span>作品档案</span>}
        </h1>
        <p>
          {pick('光的作品，空间的叙事。', 'Works in light. Stories in space.')}
          <br />
          <span className="muted">{pick('2023 年画册 · 29 个代表项目', '2023 portfolio · 29 selected projects')}</span>
        </p>
      </div>
      <div className="work-toolbar">
        <div className="tabs" aria-label={pick('作品范围', 'Project scope')}>
          <button aria-pressed={!featured} onClick={() => set('featured', '')}>
            {pick('全部作品', 'All work')} <small>{allCount}</small>
          </button>
          <button aria-pressed={featured} onClick={() => set('featured', '1')}>
            {pick('精选作品', 'Selected work')} <small>{featuredCount}</small>
          </button>
        </div>
        <label className="search">
          <span className="sr-only">{pick('搜索项目', 'Search projects')}</span>
          <input
            type="search"
            placeholder={pick('搜索项目、城市、类型…', 'Search projects, cities, types…')}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
          />
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <circle cx="10" cy="10" r="6" />
            <path d="m15 15 6 6" />
          </svg>
        </label>
      </div>
      <div className="filters" aria-label={pick('项目分类', 'Project categories')}>
        <button aria-pressed={!category} onClick={() => set('category', '')}>
          {pick('全部类型', 'All types')}
        </button>
        {categories.map(c => (
          <button
            key={c}
            aria-pressed={category === c}
            onClick={() => set('category', c)}
          >
            {language === 'en' ? categoryEnglish[c] || c : c}
          </button>
        ))}
      </div>
      <p className="result-count" aria-live="polite">
        {result.length} {pick('个项目', 'projects')}{category ? ` / ${language === 'en' ? categoryEnglish[category] || category : category}` : ''}
      </p>
      {result.length ? (
        <div className="archive-grid">
          {result.map((p, i) => (
            <ProjectCard key={p.slug} project={p} index={i} />
          ))}
        </div>
      ) : (
        <div className="empty">
          <h2>{pick('暂未找到匹配的作品。', 'No matching projects found.')}</h2>
          <p>{pick('试试其他名称，或清除筛选条件。', 'Try another term or clear the filters.')}</p>
          <button
            className="outline-button"
            onClick={() => {
              setInputValue('');
              setParams({}, { replace: true });
            }}
          >
            {pick('清除筛选', 'Clear filters')}
          </button>
        </div>
      )}
    </section>
  );
}
