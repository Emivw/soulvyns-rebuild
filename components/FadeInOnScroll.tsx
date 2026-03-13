'use client';

import { PropsWithChildren, useEffect, useRef, useState } from 'react';

type FadeInOnScrollProps = PropsWithChildren<{
  /** Extra classes applied to the outer wrapper */
  className?: string;
  /** Delay in ms before playing the animation once the element intersects */
  delayMs?: number;
}>;

/**
 * Simple intersection-observer based wrapper that fades / slides content in
 * the first time it scrolls into view. Useful for "lazy" UI animations
 * without changing data fetching behaviour.
 */
export function FadeInOnScroll({ children, className = '', delayMs = 0 }: FadeInOnScrollProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!ref.current || isVisible) return;

    const node = ref.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (delayMs > 0) {
              setTimeout(() => setIsVisible(true), delayMs);
            } else {
              setIsVisible(true);
            }
            observer.disconnect();
          }
        });
      },
      {
        root: null,
        rootMargin: '0px 0px -10% 0px',
        threshold: 0.15,
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [delayMs, isVisible]);

  return (
    <div
      ref={ref}
      className={[
        'transition-all duration-500 ease-out will-change-transform will-change-opacity',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}

