import { useEffect, useState } from 'react';
import { CategoryCard, ProjectCard } from '../components/Cards';
import { HeroScene } from '../components/HeroScene';
import { Button, Reveal } from '../components/ui';
import { useSeo } from '../lib/seo';
import { useSite } from '../lib/site';
import { api } from '../lib/api';
import { useCountUp } from '../lib/motion';
import { toFa } from '../lib/format';
import type { IconName, Project } from '../lib/types';

function Stat({ value, label }: { value: number; label: string }) {
  const shown = useCountUp(value);
  return (
    <div className="stat">
      <span className="stat__value tnum">{toFa(shown)}</span>
      <span className="stat__label">{label}</span>
    </div>
  );
}

export default function Home() {
  const { categories, text, stats, flag, num } = useSite();
  const featuredCount = Math.min(Math.max(num('featured_count', 3), 1), 9);
  const [featured, setFeatured] = useState<Project[]>([]);

  useSeo({
    description: text('seo_description', text('site_tagline', '')),
    structuredData: {
      '@type': 'ProfilePage',
      name: text('site_name', 'وایب نمونه'),
      description: text('about_body', ''),
    },
  });

  useEffect(() => {
    let stale = false;
    api
      .projects({ featured: true, limit: featuredCount })
      .then((rows) => {
        if (!stale) setFeatured(rows);
      })
      .catch(() => {
        if (!stale) setFeatured([]);
      });
    return () => {
      stale = true;
    };
  }, [featuredCount]);

  const eyebrow = text('hero_eyebrow', 'IDEAS,CODE,REALITY').split(',').map((s) => s.trim()).filter(Boolean);
  const heroIcons = categories.map((c) => c.icon as IconName);

  return (
    <>
      <section className="hero">
        <div className="shell hero__grid">
          <div className="hero__copy">
            <Reveal as="p" className="eyebrow">
              {eyebrow.map((word, i) => (
                <span key={word} className="row" style={{ gap: '0.7rem' }}>
                  {i > 0 && <span className="sep" aria-hidden="true">→</span>}
                  <span>{word}</span>
                </span>
              ))}
            </Reveal>

            <Reveal as="h1" delay={70} className="hero__title">
              <span className="hero__line">{text('hero_title_a', 'نمونه کارهای من')}</span>
              <span className="hero__line gold">{text('hero_title_b', 'با وایب کدینگ')}</span>
            </Reveal>

            <Reveal as="p" delay={140} className="lead hero__lead">
              {text('hero_body')}
            </Reveal>

            <Reveal delay={210} className="hero__cta">
              <Button to="/projects" arrow>{text('hero_cta', 'مشاهده نمونه کارها')}</Button>
              <Button to="/about" variant="ghost">درباره من</Button>
            </Reveal>
          </div>

          <Reveal delay={120} className="hero__art">
            {heroIcons.length > 0 && <HeroScene icons={heroIcons} />}
          </Reveal>
        </div>
      </section>

      <section className="section section--tight">
        <div className="shell">
          <div className="grid grid--2">
            {categories.map((category, i) => (
              <Reveal key={category.slug} delay={i * 80}>
                <CategoryCard category={category} seed={i + 1} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="section">
          <div className="shell">
            <Reveal className="sectionhead">
              <div>
                <p className="eyebrow"><span>SELECTED WORK</span></p>
                <h2>{text('featured_title', 'چند نمونه‌ی منتخب')}</h2>
                <p className="lead">{text('featured_note')}</p>
              </div>
              <Button to="/projects" variant="outline" size="sm" arrow>همه‌ی نمونه‌کارها</Button>
            </Reveal>

            <div className="grid grid--3">
              {featured.map((project, i) => (
                <Reveal key={project.id} delay={i * 80}>
                  <ProjectCard project={project} seed={i + 11} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section section--tight">
        <div className="shell">
          <Reveal className="band">
            <div className="band__copy">
              <p className="eyebrow"><span>{'LET’S BUILD'}</span></p>
              <h2>{text('about_title', 'ایده، کد، واقعیت')}</h2>
              <p className="lead">{text('contact_note')}</p>
              <Button to="/contact" arrow>شروع یک گفت‌وگو</Button>
            </div>

            {flag('show_stats') && (
              <div className="band__stats">
                <Stat value={stats.projects} label="پروژه" />
                <Stat value={stats.categories} label="دسته‌بندی" />
                <Stat value={num('stat_years', 4)} label="سال تجربه" />
              </div>
            )}
          </Reveal>
        </div>
      </section>
    </>
  );
}
