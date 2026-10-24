import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Scroll-reveal for [data-reveal] elements and [data-stagger] groups inside the returned ref.
 * Uses IntersectionObserver to decide *when* (robust to async content & layout shifts)
 * and GSAP to decide *how*. Respects prefers-reduced-motion.
 */
export function useReveal(deps = []) {
  const scope = useRef(null);
  useGSAP(
    () => {
      const root = scope.current;
      if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

      const singles = gsap.utils.toArray(root.querySelectorAll('[data-reveal]:not([data-revealed])'));
      const groups = gsap.utils.toArray(root.querySelectorAll('[data-stagger]:not([data-revealed])')).filter((g) => g.children.length);

      singles.forEach((el) => {
        const dir = el.dataset.reveal;
        gsap.set(el, { opacity: 0, y: dir === 'left' || dir === 'right' ? 0 : 36, x: dir === 'left' ? -40 : dir === 'right' ? 40 : 0 });
      });
      groups.forEach((g) => gsap.set(g.children, { opacity: 0, y: 30 }));

      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            io.unobserve(el);
            el.setAttribute('data-revealed', '');
            if (el.hasAttribute('data-stagger')) gsap.to(el.children, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08 });
            else gsap.to(el, { opacity: 1, x: 0, y: 0, duration: 0.9, ease: 'power3.out', delay: Number(el.dataset.delay || 0) });
          });
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.01 }
      );
      [...singles, ...groups].forEach((el) => io.observe(el));
      return () => io.disconnect();
    },
    { scope, dependencies: deps }
  );
  return scope;
}

export { gsap, ScrollTrigger, useGSAP };
