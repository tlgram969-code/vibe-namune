import { Mark } from './Icon';
import { driftStyle } from '../lib/motion';
import { cx } from '../lib/format';
import type { IconName } from '../lib/types';

/**
 * The floating app tile: two glass plates behind a gradient squircle, each on
 * its own Z plane. The parent publishes --px/--py (see useTilt) and every layer
 * reads them at a different strength, which is what sells the depth.
 */
export function IconArt({
  name,
  logo,
  size = 'md',
  seed = 0,
  className,
}: {
  name: IconName;
  logo?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  seed?: number;
  className?: string;
}) {
  return (
    <div className={cx('art', 'drift', `art--${size}`, className)} style={driftStyle(seed, 9)}>
      <span className="art__plate art__plate--far" aria-hidden="true" />
      <span className="art__plate art__plate--near" aria-hidden="true" />
      <span className="art__tile">
        <Mark name={name} logo={logo} />
      </span>
    </div>
  );
}
