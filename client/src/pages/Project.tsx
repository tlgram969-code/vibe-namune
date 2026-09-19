import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ProjectCard } from '../components/Cards';
import { Comments } from '../components/Comments';
import { Crumbs } from '../components/Crumbs';
import { Gallery } from '../components/Gallery';
import { IconArt } from '../components/IconArt';
import { Button, EmptyState, Reveal, Spinner } from '../components/ui';
import { useSeo } from '../lib/seo';
import { api } from '../lib/api';
import { useSite } from '../lib/site';
import { faDate, parseRichText, toFa } from '../lib/format';
import { useTilt } from '../lib/motion';
import type { Comment, Media, Project } from '../lib/types';

function RichText({ source }: { source: string }) {
  const blocks = parseRichText(source);
  if (!blocks.length) return null;

  return (
    <div className="prose">
      {blocks.map((block, i) => {
        if (block.kind === 'heading') return <h2 key={i}>{block.text}</h2>;
        if (block.kind === 'list') {
          return (
            <ul key={i}>
              {block.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{block.text}</p>;
      })}
    </div>
  );
}

interface Loaded {
  project: Project;
  media: Media[];
  comments: Comment[];
  related: Project[];
}

export default function ProjectPage() {
  const { slug = '' } = useParams();
  const { flag } = useSite();
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const artRef = useTilt<HTMLDivElement>({ max: 11 });

  // The share card prefers a real screenshot, then the project's own logo.
  const shareImage =
    data?.media?.find((m) => m.kind === 'image')?.url || data?.project.logoUrl || undefined;

  useSeo({
    title: data?.project.title,
    description: data?.project.summary,
    image: shareImage,
    type: 'article',
    structuredData: useMemo(
      () =>
        data
          ? {
              '@type': 'CreativeWork',
              name: data.project.title,
              headline: data.project.title,
              description: data.project.summary,
              dateCreated: data.project.createdAt,
              dateModified: data.project.updatedAt,
              keywords: data.project.tags.join(', '),
              genre: data.project.category?.title,
            }
          : null,
      [data],
    ),
  });

  useEffect(() => {
    let stale = false;
    setData(null);
    setError(null);

    api
      .project(slug)
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

  if (error) {
    return (
      <section className="section">
        <div className="shell">
          <EmptyState title={error} action={<Button to="/projects" arrow>بازگشت به نمونه‌کارها</Button>} />
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

  const { project, media, comments, related } = data;
  // Each category names its own action, so a plugin says "buy" and a bot says "order".
  const ctaLabel = project.category?.ctaLabel || 'سفارش پروژه‌ی مشابه';

  return (
    <>
      <section className="section section--tight">
        <div className="shell">
          <Reveal>
            <Crumbs
              items={[
                { label: 'HOME', to: '/' },
                ...(project.category ? [{ label: project.category.slug.toUpperCase(), to: `/c/${project.category.slug}` }] : []),
                { label: project.slug.toUpperCase() },
              ]}
            />
          </Reveal>

          <div className="detail" data-accent={project.accent}>
            <Reveal className="detail__head" delay={60}>
              <div className="detail__art" ref={artRef}>
                <IconArt name={project.icon} logo={project.logoUrl} size="xl" seed={9} />
              </div>
              <div className="detail__intro">
                <h1 className="detail__title">{project.title}</h1>
                <p className="detail__sub gold">{project.subtitle}</p>
                <p className="lead detail__summary">{project.summary}</p>
                {project.tags.length > 0 && (
                  <ul className="taglist">
                    {project.tags.map((tag) => (
                      <li key={tag} className="tag">{tag}</li>
                    ))}
                  </ul>
                )}
              </div>
            </Reveal>

            <div className="detail__grid">
              <div className="detail__body">
                <Reveal as="article" delay={100}>
                  <RichText source={project.body} />
                </Reveal>

                {media.length > 0 && (
                  <Reveal delay={120}>
                    <Gallery items={media} />
                  </Reveal>
                )}

                <Reveal delay={140}>
                  <Comments slug={project.slug} initial={comments} />
                </Reveal>
              </div>

              <Reveal as="aside" delay={160} className="detail__aside">
                <div className="factbox">
                  <h3>درباره‌ی این پروژه</h3>
                  <dl>
                    {project.category && (
                      <>
                        <dt>دسته‌بندی</dt>
                        <dd><Button to={`/c/${project.category.slug}`} variant="ghost" size="sm">{project.category.title}</Button></dd>
                      </>
                    )}
                    {flag('show_view_counts') && (
                      <>
                        <dt>بازدید</dt>
                        <dd className="tnum">{toFa(project.views)}</dd>
                      </>
                    )}
                    <dt>ثبت شده در</dt>
                    <dd>{faDate(project.createdAt)}</dd>
                  </dl>
                  {project.linkUrl && (
                    <Button href={project.linkUrl} variant="outline" size="sm" arrow>مشاهده‌ی پروژه</Button>
                  )}
                  <Button to="/contact" size="sm" arrow>{ctaLabel}</Button>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="section section--tight">
          <div className="shell">
            <Reveal className="sectionhead">
              <div>
                <p className="eyebrow"><span>NEXT UP</span></p>
                <h2>پروژه‌های مرتبط</h2>
              </div>
            </Reveal>
            <div className="grid grid--3">
              {related.map((item, i) => (
                <Reveal key={item.id} delay={i * 70}>
                  <ProjectCard project={item} seed={i + 21} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}
      <div style={{ height: '2rem' }} />
    </>
  );
}
