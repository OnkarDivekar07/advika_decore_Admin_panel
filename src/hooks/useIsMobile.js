// src/hooks/useIsMobile.js
//
// Drives DataTable's table-vs-card layout switch. Deliberately based on
// window.innerWidth + a resize listener rather than a CSS-only
// hidden/md:block pair: rendering both the table AND the card list at
// once (and letting a stylesheet hide one) would mean every row's content
// exists twice in the DOM at all times — wasted work on every render, and
// indistinguishable to anything (assistive tech's accessibility tree,
// tests) that isn't also evaluating CSS media queries the way a browser
// paints them. Rendering exactly one of the two keeps the DOM (and what a
// screen reader announces) matching what's actually on screen.
import { useEffect, useState } from 'react';

// Matches Tailwind's default `md` breakpoint, which is what the rest of
// the admin panel's responsive column-hiding (`sm:table-cell` etc.) is
// already built around.
const MOBILE_BREAKPOINT = 768;

const getIsMobile = (breakpoint) =>
  typeof window !== 'undefined' && typeof window.innerWidth === 'number'
    ? window.innerWidth < breakpoint
    : false;

const useIsMobile = (breakpoint = MOBILE_BREAKPOINT) => {
  const [isMobile, setIsMobile] = useState(() => getIsMobile(breakpoint));

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
      return undefined;
    }
    const handleResize = () => setIsMobile(getIsMobile(breakpoint));
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isMobile;
};

export default useIsMobile;
