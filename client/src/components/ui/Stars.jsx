import { useState } from 'react';
import { motion } from 'motion/react';
import { Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/format.js';

/** Read-only rating with fractional fill (4.6 -> four and a half stars, roughly). */
export function Stars({ value = 0, size = 14, className }) {
  const { t } = useTranslation();
  const rounded = Math.round(Number(value) * 10) / 10;
  return (
    <span className={cn('relative inline-flex', className)} role="img" aria-label={t('reviews.stars', { value: rounded })} dir="ltr">
      <span className="flex text-zinc-200">
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} style={{ width: size, height: size }} className="fill-current" strokeWidth={0} />
        ))}
      </span>
      <span className="absolute inset-y-0 left-0 flex overflow-hidden text-amber-400" style={{ width: `${(rounded / 5) * 100}%` }}>
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} style={{ width: size, height: size }} className="shrink-0 fill-current" strokeWidth={0} />
        ))}
      </span>
    </span>
  );
}

/** Interactive picker used in the review form. */
export function StarPicker({ value, onChange, size = 30 }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex gap-1" dir="ltr" onMouseLeave={() => setHover(0)} role="radiogroup">
      {[1, 2, 3, 4, 5].map((n) => (
        <motion.button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n}/5`}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.85 }}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          className={cn('transition-colors', n <= shown ? 'text-amber-400' : 'text-zinc-200')}
        >
          <Star style={{ width: size, height: size }} className="fill-current" strokeWidth={0} />
        </motion.button>
      ))}
    </div>
  );
}
