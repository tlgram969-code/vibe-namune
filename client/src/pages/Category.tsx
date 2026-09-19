import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ProjectCard } from '../components/Cards';
import { Crumbs } from '../components/Crumbs';
import { HeroScene } from '../components/HeroScene';
import { IconArt } from '../components/IconArt';
import { Button, EmptyState, Reveal, Spinner } from '../components/ui';
import { useSeo } from '../lib/seo';
import { api } from '../lib/api';
import { cx } from '../lib/format';
import type { Category as CategoryType, IconName, Project } from '../lib/types';

const ALL = '__all__';

export default function CategoryPage() {
  const { slug = '' } = useParams();
  const [data, setData] = useState<{ category: CategoryType; projects: Project[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState(ALL);

  useSeo({
    title: data?.category.title,
    description: data?.category.description,
  });

  useEffect(() => {
    let stale = false;
    setData(null);
    setError(null);
    setFilter(ALL);

    api
      .category(slug)
      .then((res) => {
        if (!stale) setData(res);
      })
      .catch((err) => {
        if (!stale) setError(err instanceof Error ? err.message : 'بارگذاری ناموفق بود.');
      });

    return () => {
      stale = true;
    };
  }, [slug]);

  // Filter chips come from the tags actually present on this category's projects.
  const tags = useMemo(() => {
    if (!data) return [];
    const seen = new Map<string, number>();
    for (const p of data.projects) for (const t of p.tags) seen.set(t, (seen.get(t) ?? 0) + 1);
    return [...seen.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([t]) => t);
  }, [data]);

  const visible = useMemo(() => {
    if (!data) return [];
    return filter === ALL ? data.projects : data.projects.filter((p) => p.tags.includes(filter));
  }, [data, filter]);

  if (error) {
    return (
      <section className="section">
        <div className="shell">
          <EmptyState title={error} note="شاید نشانی صفحه تغییر کرده باشد." action={<Button to="/" arrow>بازگشت به خانه</Button>} />
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="section">
        <div className="shell"><Spinner /></div>
      </section>
    );
  }

  const { category, projects } = data;
  const sceneIcons: IconName[] = (() => {
    const fromProjects = [...new Set(projects.map((p) => p.icon))].slice(0, 6);
    return fromProjects.length >= 3 ? fromProjects : [category.icon, ...fromProjects].slice(0, 4);
  })();

  return (
    <>
      <section className="hero hero--page">
        <div className="shell hero__grid">
          <div className="hero__copy">
            <Reveal>
              <Crumbs items={[{ label: 'HOME', to: '/' }, { label: category.slug.toUpperCase() }]} />
            </Reveal>

            <Reveal as="h1" delay={70} className="hero__title">
              <span className="hero__line">{category.title}</span>
              {category.subtitle && <span className="hero__line gold">{category.subtitle}</span>}
            </Reveal>

            <Reveal as="p" delay={140} className="lead hero__lead">{category.description}</Reveal>

            <Reveal delay={210} className="hero__cta">
              <Button to="/projects" variant="outline" arrow>همه‌ی نمونه‌کارها</Button>
            </Reveal>
          </div>

          <Reveal delay={120} className="hero__art">
            <HeroScene icons={sceneIcons} />
          </Reveal>
        </div>
      </section>

      <section className="section section--tight">
        <div className="shell">
          {tags.length > 1 && (
            <Reveal className="chips" role="tablist" aria-label="فیلتر بر اساس فناوری">
              <button
                type="button" role="tab" aria-selected={filter === ALL}
                className={cx('chip', filter === ALL && 'is-on')}
                onClick={() => setFilter(ALL)}
              >
                همه
              </button>
              {tags.map((tag) => (
                <button
                  key={tag} type="button" role="tab" aria-selected={filter === tag}
                  className={cx('chip', filter === tag && 'is-on')}
                  onClick={() => setFilter(tag)}
                >
                  {tag}
                </button>
              ))}
            </Reveal>
          )}

          {visible.length === 0 ? (
            <EmptyState title="هنوز پروژه‌ای در این بخش ثبت نشده." />
          ) : (
            <div className="grid grid--3">
              {visible.map((project, i) => (
                <Reveal key={project.id} delay={i * 60}>
                  <ProjectCard project={project} seed={i + 3} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {category.introTitle && (
        <section className="section section--tight">
          <div className="shell">
            <Reveal className="band band--intro" data-accent={category.accent}>
              <div className="band__copy">
                <p className="eyebrow"><span>WHAT IS IT?</span></p>
                <h2>{category.introTitle}</h2>
                <p className="lead band__lead">{category.introBody}</p>
                <Button to="/contact" arrow>{category.ctaLabel || 'سفارش یک پروژه‌ی مشابه'}</Button>
              </div>
              <div className="band__art">
                <IconArt name={category.icon} size="xl" seed={42} />
              </div>
            </Reveal>
          </div>
        </section>
      )}

      <div style={{ height: '1.5rem' }} />
    </>
  );
}
