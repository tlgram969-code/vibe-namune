import { Icon } from './Icon';
import { useScenePointer, driftStyle } from '../lib/motion';
import type { IconName } from '../lib/types';

interface Slot {
  x: number;
  y: number;
  scale: number;
  depth: number;
}

/** Hand-placed arrangements — an even spread that still looks scattered. */
const LAYOUTS: Record<number, Slot[]> = {
  1: [{ x: 50, y: 34, scale: 1.5, depth: 90 }],
  2: [
    { x: 36, y: 26, scale: 1.2, depth: 70 },
    { x: 63, y: 46, scale: 1.05, depth: 30 },
  ],
  3: [
    { x: 30, y: 34, scale: 0.95, depth: 20 },
    { x: 52, y: 18, scale: 1.25, depth: 80 },
    { x: 72, y: 44, scale: 1, depth: 40 },
  ],
  4: [
    { x: 26, y: 40, scale: 0.9, depth: 16 },
    { x: 44, y: 17, scale: 1.05, depth: 56 },
    { x: 66, y: 30, scale: 1.24, depth: 92 },
    { x: 76, y: 56, scale: 0.86, depth: 26 },
  ],
  5: [
    { x: 22, y: 38, scale: 0.86, depth: 14 },
    { x: 40, y: 18, scale: 1.02, depth: 54 },
    { x: 58, y: 36, scale: 1.2, depth: 92 },
    { x: 74, y: 18, scale: 0.9, depth: 34 },
    { x: 78, y: 56, scale: 0.82, depth: 20 },
  ],
  6: [
    { x: 21, y: 42, scale: 0.84, depth: 14 },
    { x: 37, y: 20, scale: 1, depth: 52 },
    { x: 54, y: 13, scale: 0.92, depth: 30 },
    { x: 50, y: 44, scale: 1.16, depth: 94 },
    { x: 71, y: 22, scale: 0.96, depth: 44 },
    { x: 74, y: 52, scale: 0.86, depth: 22 },
  ],
};

/**
 * The hero artwork: a lit dome, a navy sphere, a gold orbit, a reflective
 * platform and a cluster of floating tiles. The whole scene leans toward the
 * pointer; each layer leans by a different amount.
 */
export function HeroScene({ icons }: { icons: IconName[] }) {
  const list = icons.slice(0, 6);
  const slots = LAYOUTS[list.length] ?? LAYOUTS[4];
  const ref = useScenePointer<HTMLDivElement>(1);

  return (
    <div className="scene" ref={ref} aria-hidden="true">
      <span className="scene__dome" />
      <span className="scene__sphere" />
      <span className="scene__orbit" />
      <span className="scene__platform" />

      <div className="scene__stage">
        {list.map((name, i) => {
          const slot = slots[i] ?? slots[slots.length - 1];
          return (
            <span
              key={`${name}-${i}`}
              className="scene__tile"
              style={{
                ...driftStyle(i * 3 + 1, 7.5),
                left: `${slot.x}%`,
                top: `${slot.y}%`,
                '--scale': slot.scale,
                '--depth': `${slot.depth}px`,
                '--pull': slot.depth / 90,
              } as React.CSSProperties}
            >
              <span className="scene__tile-inner drift">
                <Icon name={name} />
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
