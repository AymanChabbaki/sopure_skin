import { cn } from '../../lib/format.js';

/** Vector recreation of the So Pure Skin monogram: S | O split by a hairline, "PURE SKIN" across. */
export function LogoMark({ className, title = 'So Pure Skin' }) {
  return (
    <svg viewBox="0 0 140 140" role="img" aria-label={title} className={cn('text-ink', className)}>
      <line x1="70" y1="8" x2="70" y2="132" stroke="currentColor" strokeWidth="1.2" />
      <text x="67" y="101" textAnchor="end" fontFamily="Cormorant Garamond, serif" fontSize="88" fill="currentColor">
        S
      </text>
      <text x="73" y="101" fontFamily="Cormorant Garamond, serif" fontSize="88" fill="currentColor">
        O
      </text>
      <rect x="16" y="60" width="108" height="18" fill="var(--logo-bg, #fff)" />
      <text
        x="70"
        y="73.5"
        textAnchor="middle"
        fontFamily="Jost Variable, Jost, sans-serif"
        fontSize="11"
        letterSpacing="4.2"
        fill="currentColor"
      >
        PURE SKIN
      </text>
    </svg>
  );
}

/** Horizontal lockup for the header: monogram + wordmark. */
export function Logo({ className, compact = false }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)} dir="ltr">
      <svg viewBox="0 0 76 64" aria-hidden="true" className="h-9 w-auto text-ink sm:h-10">
        <line x1="36" y1="3" x2="36" y2="61" stroke="currentColor" strokeWidth="1" />
        <text x="34" y="47" textAnchor="end" fontFamily="Cormorant Garamond, serif" fontSize="46" fill="currentColor">
          S
        </text>
        <text x="38.5" y="47" fontFamily="Cormorant Garamond, serif" fontSize="46" fill="currentColor">
          O
        </text>
      </svg>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-sans text-[13px] font-medium tracking-[0.42em] text-ink sm:text-sm">PURE SKIN</span>
          <span className="mt-1 font-sans text-[9px] tracking-[0.3em] text-brand-600 uppercase">K-beauty · Maroc</span>
        </span>
      )}
      <span className="sr-only">So Pure Skin</span>
    </span>
  );
}
