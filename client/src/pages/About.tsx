import { Crumbs } from '../components/Crumbs';
import { HeroScene } from '../components/HeroScene';
import { Button, Reveal } from '../components/ui';
import { useSeo } from '../lib/seo';
import { useSite } from '../lib/site';
import { useCountUp } from '../lib/motion';
import { toFa } from '../lib/format';
import type { IconName } from '../lib/types';

const STEPS = [
  { title: 'فهمیدن نیاز', body: 'اول دقیقاً مشخص می‌کنیم چه چیزی قرار است حل شود و موفقیت یعنی چه.' },
  { title: 'ساخت نسخه‌ی کوچک', body: 'کوچک‌ترین نسخه‌ای که واقعاً کار کند، تا زودتر بتوان درباره‌اش قضاوت کرد.' },
  { title: 'صیقل دادن', body: 'سرعت، جزئیات ظاهری و حالت‌های خطا؛ چیزهایی که تفاوت ابزار خوب و بد را می‌سازند.' },
];

function Stat({ value, label }: { value: number; label: string }) {
  const shown = useCountUp(value);
  return (
    <div className="stat">
      <span className="stat__value tnum">{toFa(shown)}</span>
      <span className="stat__label">{label}</span>
    </div>
  );
}

export default function About() {
  const { text, stats, categories, num } = useSite();
  useSeo({ title: 'درباره من', description: text('about_body', '') });

  const sceneIcons = categories.map((c) => c.icon as IconName);

  return (
    <>
      <section className="hero hero--page">
        <div className="shell hero__grid">
          <div className="hero__copy">
            <Reveal>
              <Crumbs items={[{ label: 'HOME', to: '/' }, { label: 'ABOUT' }]} />
            </Reveal>
            <Reveal as="h1" delay={70} className="hero__title">
              <span className="hero__line">{text('about_title', 'ایده، کد، واقعیت')}</span>
              <span className="hero__line gold">{text('about_subtitle', 'مسیر همیشه یکی است')}</span>
            </Reveal>
            <Reveal as="p" delay={140} className="lead hero__lead">{text('about_body')}</Reveal>
            <Reveal delay={210} className="hero__cta">
              <Button to="/projects" arrow>دیدن نمونه‌کارها</Button>
              <Button to="/contact" variant="ghost">تماس با من</Button>
            </Reveal>
          </div>
          <Reveal delay={120} className="hero__art">
            {sceneIcons.length > 0 && <HeroScene icons={sceneIcons} />}
          </Reveal>
        </div>
      </section>

      <section className="section section--tight">
        <div className="shell">
          <div className="grid grid--3">
            {STEPS.map((step, i) => (
              <Reveal key={step.title} delay={i * 90}>
                <article className="step">
                  <span className="step__num tnum">{toFa(i + 1)}</span>
                  <h3>{step.title}</h3>
                  <p className="muted">{step.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--tight">
        <div className="shell">
          <Reveal className="band">
            <div className="band__copy">
              <p className="eyebrow"><span>BY THE NUMBERS</span></p>
              <h2>کارنامه‌ی کوتاه</h2>
              <p className="lead">هر عدد یک پروژه‌ی واقعی است که تحویل داده شده و استفاده می‌شود.</p>
            </div>
            <div className="band__stats">
              <Stat value={stats.projects} label="پروژه" />
              <Stat value={stats.categories} label="دسته‌بندی" />
              <Stat value={num('stat_years', 4)} label="سال تجربه" />
            </div>
          </Reveal>
        </div>
      </section>

      <div style={{ height: '1.5rem' }} />
    </>
  );
}
