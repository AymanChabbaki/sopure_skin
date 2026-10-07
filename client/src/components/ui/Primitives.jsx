import { Link } from 'react-router';
import { ArrowRight, Minus, Plus } from 'lucide-react';
import { Reveal } from './Reveal.jsx';
import { cn, formatPrice } from '../../lib/format.js';

export function Price({ price, compareAt, className, size = 'md' }) {
  const onSale = compareAt && compareAt > price;
  const sizes = { sm: 'text-sm', md: 'text-base', lg: 'text-2xl sm:text-3xl' };
  return (
    <span className={cn('inline-flex flex-wrap items-baseline gap-x-2', className)}>
      <span className={cn('font-semibold', sizes[size], onSale ? 'text-brand-700' : 'text-ink')}>{formatPrice(price)}</span>
      {onSale && <s className={cn('text-muted', size === 'lg' ? 'text-lg' : 'text-xs sm:text-sm')}>{formatPrice(compareAt)}</s>}
    </span>
  );
}

export const Skeleton = ({ className }) => <div className={cn('skeleton', className)} />;

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="aspect-[4/5] w-full rounded-3xl" />
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-1/4" />
    </div>
  );
}

export function SectionHeading({ eyebrow, title, subtitle, link, linkLabel, align = 'start', className }) {
  return (
    <Reveal
      className={cn(
        'mb-8 flex flex-col gap-4 sm:mb-10',
        align === 'center' ? 'items-center text-center' : 'sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className={cn('max-w-2xl', align === 'center' && 'mx-auto')}>
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h2 className="font-display text-3xl leading-tight text-ink sm:text-4xl lg:text-5xl">{title}</h2>
        {subtitle && <p className="mt-3 text-muted">{subtitle}</p>}
      </div>
      {link && (
        <Link
          to={link}
          className="group inline-flex shrink-0 items-center gap-2 text-sm font-medium text-brand-700 hover:text-brand-900"
        >
          {linkLabel}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
        </Link>
      )}
    </Reveal>
  );
}

export function QuantityInput({ value, onChange, min = 1, max = 50, size = 'md', className }) {
  const btn = size === 'sm' ? 'size-8' : 'size-11';
  return (
    <div className={cn('inline-flex items-center rounded-full border border-line bg-white', className)}>
      <button
        type="button"
        aria-label="-"
        className={cn(btn, 'grid place-items-center rounded-full text-ink hover:bg-brand-50 disabled:opacity-30')}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        <Minus className="size-3.5" />
      </button>
      <span className={cn('min-w-8 text-center font-medium tabular-nums', size === 'sm' && 'text-sm')} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        aria-label="+"
        className={cn(btn, 'grid place-items-center rounded-full text-ink hover:bg-brand-50 disabled:opacity-30')}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, children }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-white">
      <div className="pointer-events-none absolute -top-24 end-[-10%] size-80 rounded-full bg-brand-200/40 blur-3xl" />
      <div className="container-x relative py-12 sm:py-16">
        <Reveal>
          {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
          <h1 className="font-display text-4xl text-ink sm:text-5xl lg:text-6xl">{title}</h1>
          {subtitle && <p className="mt-4 max-w-2xl text-muted">{subtitle}</p>}
          {children}
        </Reveal>
      </div>
    </section>
  );
}
