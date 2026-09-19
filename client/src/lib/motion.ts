import { useCallback, useEffect, useRef, useState } from 'react';

/* ─────────────────────────────────────────────────────────────────────────────
   Pointer-driven motion. Every hook here writes CSS custom properties and lets
   CSS do the animating, so nothing re-renders React on mouse move.
   ───────────────────────────────────────────────────────────────────────────── */

const canHover = () =>
  typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface TiltOptions {
  /** Maximum rotation in degrees at the edges of the element. */
  max?: number;
  /** Pull the element toward the pointer by this many pixels. */
  shift?: number;
}

/**
 * Tracks the pointer across an element and publishes:
 *   --px, --py   normalised offset from the centre, -1 … 1
 *   --rx, --ry   ready-made rotation values in deg
 *   --mx, --my   pointer position in %, for spotlight gradients
 *   --lift       0 while idle, 1 while hovered
 */
export function useTilt<T extends HTMLElement = HTMLDivElement>({ max = 9, shift = 0 }: TiltOptions = {}) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !canHover() || reducedMotion()) return;

    let frame = 0;
    let px = 0;
    let py = 0;

    const paint = () => {
      frame = 0;
      el.style.setProperty('--px', px.toFixed(3));
      el.style.setProperty('--py', py.toFixed(3));
      el.style.setProperty('--ry', `${(px * max).toFixed(2)}deg`);
      el.style.setProperty('--rx', `${(-py * max).toFixed(2)}deg`);
      if (shift) {
        el.style.setProperty('--sx', `${(px * shift).toFixed(2)}px`);
        el.style.setProperty('--sy', `${(py * shift).toFixed(2)}px`);
      }
    };

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      px = Math.min(Math.max(x * 2 - 1, -1), 1);
      py = Math.min(Math.max(y * 2 - 1, -1), 1);
      el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
      el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
      if (!frame) frame = requestAnimationFrame(paint);
    };

    const onEnter = () => el.style.setProperty('--lift', '1');

    const onLeave = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      px = 0;
      py = 0;
      el.style.setProperty('--lift', '0');
      for (const prop of ['--px', '--py', '--rx', '--ry', '--sx', '--sy']) {
        el.style.setProperty(prop, prop === '--rx' || prop === '--ry' ? '0deg' : prop === '--sx' || prop === '--sy' ? '0px' : '0');
      }
      el.style.setProperty('--mx', '50%');
      el.style.setProperty('--my', '50%');
    };

    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [max, shift]);

  return ref;
}

/** Buttons that lean a few pixels toward the cursor. */
export function useMagnetic<T extends HTMLElement = HTMLButtonElement>(strength = 5) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !canHover() || reducedMotion()) return;

    let frame = 0;
    let dx = 0;
    let dy = 0;

    const paint = () => {
      frame = 0;
      el.style.setProperty('--sx', `${dx.toFixed(2)}px`);
      el.style.setProperty('--sy', `${dy.toFixed(2)}px`);
    };

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      dx = ((e.clientX - r.left) / r.width - 0.5) * 2 * strength;
      dy = ((e.clientY - r.top) / r.height - 0.5) * 2 * strength;
      if (!frame) frame = requestAnimationFrame(paint);
    };

    const onLeave = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      el.style.setProperty('--sx', '0px');
      el.style.setProperty('--sy', '0px');
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [strength]);

  return ref;
}

/** Publishes pointer position for a whole section, for wide parallax scenes. */
export function useScenePointer<T extends HTMLElement = HTMLDivElement>(strength = 1) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !canHover() || reducedMotion()) return;

    let frame = 0;
    let px = 0;
    let py = 0;

    const paint = () => {
      frame = 0;
      el.style.setProperty('--px', px.toFixed(3));
      el.style.setProperty('--py', py.toFixed(3));
    };

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      px = Math.min(Math.max(((e.clientX - r.left) / r.width - 0.5) * 2 * strength, -1), 1);
      py = Math.min(Math.max(((e.clientY - r.top) / r.height - 0.5) * 2 * strength, -1), 1);
      if (!frame) frame = requestAnimationFrame(paint);
    };

    const onLeave = () => {
      px = 0;
      py = 0;
      if (!frame) frame = requestAnimationFrame(paint);
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [strength]);

  return ref;
}

/* ── Scroll reveal ───────────────────────────────────────────────────────────
   One shared observer for every revealable node on the page. */

let observer: IntersectionObserver | null = null;

function sharedObserver() {
  if (!observer && typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            observer?.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
  }
  return observer;
}

export function useRevealRef<T extends HTMLElement = HTMLDivElement>() {
  return useCallback((node: T | null) => {
    if (!node) return;
    if (reducedMotion() || !sharedObserver()) {
      node.classList.add('in');
      return;
    }
    sharedObserver()!.observe(node);
  }, []);
}

/** Counts up to `value` once, used for dashboard and stat tiles. */
export function useCountUp(value: number, duration = 900) {
  const [shown, setShown] = useState(() => (reducedMotion() ? value : 0));

  useEffect(() => {
    if (reducedMotion()) {
      setShown(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const from = 0;

    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(from + (value - from) * eased));
      if (t < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return shown;
}

/** True once the page has been scrolled past `offset`. */
export function useScrolled(offset = 12) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > offset);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [offset]);

  return scrolled;
}

/** Deterministic pseudo-random in 0…1 — keeps idle drift varied but stable. */
export function jitter(seed: number) {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

/** Per-element idle-drift timing so nothing moves in lockstep. */
export function driftStyle(seed: number, base = 8) {
  return {
    '--drift-dur': `${(base + jitter(seed) * 4).toFixed(2)}s`,
    '--drift-delay': `${(-jitter(seed + 7) * 6).toFixed(2)}s`,
  } as React.CSSProperties;
}
