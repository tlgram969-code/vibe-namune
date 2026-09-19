import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProjectCard } from '../components/Cards';
import { Crumbs } from '../components/Crumbs';
import { HeroScene } from '../components/HeroScene';
import { EmptyState, Reveal, SearchIcon, Spinner } from '../components/ui';
import { useSeo } from '../lib/seo';
import { useSite } from '../lib/site';
import { api } from '../lib/api';
import { cx, toFa } from '../lib/format';
import type { IconName, Project } from '../lib/types';

const ALL = '__all__';

export default function Projects() {
  const { categories } = useSite();
  const [params, setParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [query, setQuery] = useState('');

  const active = params.get('c') ?? ALL;
  useSeo({
    title: 'همه‌ی نمونه‌کارها',
    description: 'فهرست کامل پروژه‌ها: ربات‌های تلگرام، نرم‌افزارها، پلاگین‌ها و وب‌سایت‌ها.',
  });

  useEffect(() => {
    let stale = false;
    setProjects(null);
    api
      .projects({ limit: 100 })
      .then((rows) => {
        if (!stale) setProjects(rows);
      })
      .catch(() => {
        if (!stale) setProjects([]);
      });
    return () => {
      stale = true;
    };
  }, []);

  const visible = useMemo(() => {
    if (!projects) return [];
    const term = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (active !== ALL && p.category?.slug !== active) return false;
      if (!term) return true;
      return (
        p.title.toLowerCase().includes(term) ||
        p.subtitle.toLowerCase().includes(term) ||
        p.summary.toLowerCase().includes(term) ||
        p.tags.some((t) => t.toLowerCase().includes(term))
      );
    });
  }, [projects, active, query]);

  const pick = (slug: string) => {
    const next = new URLSearchParams(params);
    if (slug === ALL) next.delete('c');
    else next.set('c', slug);
    setParams(next, { replace: true });
  };

  const sceneIcons = categories.map((c) => c.icon as IconName);

  return (
    <>
      <section className="hero hero--page">
        <div className="shell hero__grid">
          <div className="hero__copy">
            <Reveal>
              <Crumbs items={[{ label: 'HOME', to: '/' }, { label: 'WORK' }]} />
            </Reveal>
            <Reveal as="h1" delay={70} className="hero__title">
              <span className="hero__line">همه‌ی نمونه‌کارها</span>
              <span className="hero__line gold">در یک صفحه</span>
            </Reveal>
            <Reveal as="p" delay={140} className="lead hero__lead">
              هر پروژه صفحه‌ی خودش را دارد؛ با توضیح کوتاه از مشکلی که حل کرده و کاری که انجام می‌دهد.
            </Reveal>
          </div>
          <Reveal delay={120} className="hero__art">
            {sceneIcons.length > 0 && <HeroScene icons={sceneIcons} />}
          </Reveal>
        </div>
      </section>

      <section className="section section--tight">
        <div className="shell">
          <Reveal className="toolbar">
            <div className="chips" role="tablist" aria-label="فیلتر دسته‌بندی">
              <button
                type="button" role="tab" aria-selected={active === ALL}
                className={cx('chip', active === ALL && 'is-on')} onClick={() => pick(ALL)}
              >
                همه
              </button>
              {categories.map((c) => (
                <button
                  key={c.slug} type="button" role="tab" aria-selected={active === c.slug}
                  className={cx('chip', active === c.slug && 'is-on')} onClick={() => pick(c.slug)}
                >
                  {c.title}
                </button>
              ))}
            </div>

            <label className="searchbox">
              <SearchIcon size={16} />
              <input
                type="search" value={query} placeholder="جست‌وجو در نمونه‌کارها…"
                onChange={(e) => setQuery(e.target.value)} aria-label="جست‌وجو در نمونه‌کارها"
              />
            </label>
          </Reveal>

          {!projects ? (
            <Spinner />
          ) : visible.length === 0 ? (
            <EmptyState title="نتیجه‌ای پیدا نشد." note="فیلتر یا عبارت جست‌وجو را تغییر دهید." />
          ) : (
            <>
              <p className="resultcount muted">
                <span className="tnum">{toFa(visible.length)}</span> پروژه
              </p>
              <div className="grid grid--3">
                {visible.map((project, i) => (
                  <Reveal key={project.id} delay={Math.min(i, 8) * 55}>
                    <ProjectCard project={project} seed={i + 5} />
                  </Reveal>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
      <div style={{ height: '2rem' }} />
    </>
  );
}
