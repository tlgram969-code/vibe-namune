import { Link } from 'react-router-dom';
import { IconArt } from './IconArt';
import { ArrowIcon } from './ui';
import { useTilt } from '../lib/motion';
import { toFa } from '../lib/format';
import type { Category, Project } from '../lib/types';

/** Big tinted tile from the home grid. */
export function CategoryCard({ category, seed = 0 }: { category: Category; seed?: number }) {
  const ref = useTilt<HTMLAnchorElement>({ max: 7 });

  return (
    <Link ref={ref} to={`/c/${category.slug}`} className="card card--category" data-accent={category.accent}>
      <span className="card__glow" aria-hidden="true" />
      <span className="card__inner">
        <IconArt name={category.icon} size="lg" seed={seed} className="card__art" />
        <span className="card__body">
          <span className="card__heads">
            <h3 className="card__title">{category.title}</h3>
            {category.subtitle && <span className="card__sub">{category.subtitle}</span>}
          </span>
          <p className="card__text">{category.description}</p>
          {category.projectCount !== undefined && (
            <span className="card__count">{toFa(category.projectCount)} پروژه</span>
          )}
        </span>
        <span className="card__go" aria-hidden="true">
          <ArrowIcon size={16} />
        </span>
      </span>
    </Link>
  );
}

/** Compact project tile used in the category grids and the home highlights. */
export function ProjectCard({ project, seed = 0 }: { project: Project; seed?: number }) {
  const ref = useTilt<HTMLAnchorElement>({ max: 6 });

  return (
    <Link ref={ref} to={`/p/${project.slug}`} className="card card--project" data-accent={project.accent}>
      <span className="card__glow" aria-hidden="true" />
      <span className="card__inner">
        <span className="card__head">
          <IconArt name={project.icon} logo={project.logoUrl} size="sm" seed={seed} className="card__art" />
          <span className="card__heads">
            <h3 className="card__title">{project.title}</h3>
            <span className="card__sub">{project.subtitle}</span>
          </span>
        </span>
        <p className="card__text">{project.summary}</p>
        <span className="card__foot">
          <span className="card__go" aria-hidden="true">
            <ArrowIcon size={15} />
          </span>
          <span className="card__marks">
            {project.featured && <span className="card__flag">منتخب</span>}
            {project.tags.length > 0 && <span className="card__tag">{project.tags[0]}</span>}
          </span>
        </span>
      </span>
    </Link>
  );
}
