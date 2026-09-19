import { IconArt } from '../components/IconArt';
import { Button, Reveal } from '../components/ui';
import { useTitle } from '../components/Layout';
import { useTilt } from '../lib/motion';

export default function NotFound() {
  const artRef = useTilt<HTMLDivElement>({ max: 14 });
  useTitle('صفحه پیدا نشد');

  return (
    <section className="section">
      <div className="shell">
        <div className="notfound">
          <Reveal className="notfound__copy">
            <p className="eyebrow"><span>404</span></p>
            <h1 className="hero__title">
              <span className="hero__line">این صفحه پیدا نشد</span>
              <span className="hero__line gold">اما بقیه سر جایشان هستند</span>
            </h1>
            <p className="lead">ممکن است نشانی را اشتباه وارد کرده باشید یا این صفحه جابه‌جا شده باشد.</p>
            <div className="hero__cta">
              <Button to="/" arrow>بازگشت به خانه</Button>
              <Button to="/projects" variant="ghost">دیدن نمونه‌کارها</Button>
            </div>
          </Reveal>

          <Reveal className="notfound__art" delay={120}>
            <div ref={artRef}>
              <IconArt name="globe" size="xl" seed={17} />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
