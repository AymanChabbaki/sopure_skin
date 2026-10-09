import { cn } from '../../lib/format.js';

/**
 * Official So Pure Skin logo (S | O monogram with "PURE SKIN"), transparent WebP.
 * tone="dark" for light backgrounds, tone="light" for dark ones (footer, admin login).
 */
const SOURCES = {
  dark: { sm: '/brand/logo-dark-sm.webp', lg: '/brand/logo-dark.webp' },
  light: { sm: '/brand/logo-light-sm.webp', lg: '/brand/logo-light.webp' },
};

export function LogoMark({ className, tone = 'dark', eager = false }) {
  const src = SOURCES[tone] || SOURCES.dark;
  return (
    <img
      src={src.lg}
      srcSet={`${src.sm} 143w, ${src.lg} 286w`}
      sizes="(max-width: 640px) 143px, 286px"
      alt="So Pure Skin"
      width="286"
      height="240"
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      className={cn('h-auto select-none', className)}
    />
  );
}

/** Header / navigation logo: same artwork, sized for a toolbar. */
export function Logo({ className, compact = false, tone = 'dark' }) {
  const src = SOURCES[tone] || SOURCES.dark;
  return (
    <img
      src={src.sm}
      srcSet={`${src.sm} 1x, ${src.lg} 2x`}
      alt="So Pure Skin"
      width="143"
      height="120"
      fetchPriority="high"
      decoding="async"
      draggable={false}
      className={cn('w-auto select-none', compact ? 'h-10' : 'h-12 sm:h-14 lg:h-16', className)}
    />
  );
}
