import { Link } from 'react-router-dom';

export interface Crumb {
  label: string;
  to?: string;
}

/** The letter-spaced latin trail from the reference art: HOME → PLUGINS. */
export function Crumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="eyebrow crumbs" aria-label="مسیر صفحه">
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="crumbs__item">
          {i > 0 && <span className="sep" aria-hidden="true">→</span>}
          {item.to ? (
            <Link to={item.to}>{item.label}</Link>
          ) : (
            <span aria-current="page">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
