import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useSettings } from '../../hooks/useStore.js';
import { useLocalePath } from '../../hooks/useLocalePath.js';
import { Skeleton } from '../ui/Primitives.jsx';
import { cn } from '../../lib/format.js';

const ease = [0.22, 1, 0.36, 1];
const DURATION = 6500;

const textVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.25 } },
};
const line = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease } },
};

function SlideText({ slide, index, className }) {
  const lp = useLocalePath();
  return (
    <motion.div key={index} variants={textVariants} initial="hidden" animate="show" exit="exit" className={className}>
      {slide.eyebrow && (
        <motion.p variants={line} className="eyebrow inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 shadow-sm backdrop-blur">
          <Sparkles className="size-3.5" /> {slide.eyebrow}
        </motion.p>
      )}
      <motion.h2 variants={line} className="mt-5 font-display text-4xl leading-[1.05] text-ink sm:text-5xl lg:text-6xl xl:text-7xl">
        {slide.title}
      </motion.h2>
      {slide.subtitle && (
        <motion.p variants={line} className="mt-4 max-w-md text-base leading-relaxed text-ink/70 sm:text-lg">
          {slide.subtitle}
        </motion.p>
      )}
      {slide.cta && (
        <motion.div variants={line} className="mt-8">
          <Link to={lp(slide.link || '/shop')} className="btn-primary group px-8 py-4">
            {slide.cta}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
          </Link>
        </motion.div>
      )}
    </motion.div>
  );
}

export function Hero() {
  const { t } = useTranslation();
  const { data: settings, isLoading } = useSettings();
  const slides = (settings?.hero ?? []).filter((s) => s.image);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;
  const slide = slides[index % Math.max(count, 1)];

  const go = useCallback((dir) => setIndex((i) => (i + dir + count) % count), [count]);

  useEffect(() => {
    if (count < 2 || paused) return undefined;
    const id = setTimeout(() => go(1), DURATION);
    return () => clearTimeout(id);
  }, [index, paused, count, go]);

  if (isLoading) return <Skeleton className="h-[560px] w-full rounded-none md:h-[clamp(480px,42vw,760px)]" />;
  if (!slide) return null;

  const onDragEnd = (_e, info) => {
    if (Math.abs(info.offset.x) > 60) go(info.offset.x < 0 ? 1 : -1);
  };

  return (
    <section
      className="relative overflow-hidden bg-brand-50"
      aria-roledescription="carousel"
      aria-label="So Pure Skin"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <h1 className="sr-only">So Pure Skin, {t('meta.tagline')}</h1>

      {/* Image layer: cross-fade + slow zoom. Drag to swipe on touch screens. */}
      <motion.div
        className="relative h-[min(82svh,640px)] cursor-grab touch-pan-y active:cursor-grabbing sm:h-[560px] md:h-[clamp(480px,42vw,760px)]"
        drag={count > 1 ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.12}
        onDragEnd={onDragEnd}
      >
        <AnimatePresence initial={false}>
          <motion.picture
            key={index}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: 'easeInOut' }}
          >
            <source media="(max-width: 767px)" srcSet={slide.imageSm || slide.image} />
            <motion.img
              src={slide.image}
              alt={slide.title}
              draggable={false}
              fetchPriority={index === 0 ? 'high' : 'auto'}
              decoding="async"
              width="1916"
              height="821"
              className="size-full object-cover [object-position:var(--focus)] md:object-center"
              style={{ '--focus': slide.focus }}
              initial={{ scale: 1.08 }}
              animate={{ scale: 1 }}
              transition={{ duration: DURATION / 1000 + 1.5, ease: 'linear' }}
            />
          </motion.picture>
        </AnimatePresence>

        {/* Legibility wash: from the bottom on phones, from the text side (physical side of the photo) on desktop */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[68%] bg-gradient-to-t from-white via-white/85 to-transparent md:hidden" />
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-0 hidden from-white/75 via-white/25 to-transparent md:block',
            slide.side === 'right' ? 'bg-gradient-to-l' : 'bg-gradient-to-r',
          )}
        />

        {/* Text overlay: bottom of the photo on phones, empty side of the photo on desktop */}
        <div className="absolute inset-0">
          <div
            className={cn(
              'container-x flex h-full items-end pb-14 md:items-center md:pb-0',
              slide.side === 'right' ? 'md:justify-end' : 'md:justify-start',
            )}
          >
            <AnimatePresence mode="wait">
              <SlideText slide={slide} index={index} className="max-w-xl" />
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {count > 1 && (
        <>
          <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2" dir="ltr">
            {slides.map((s, i) => (
              <button
                key={s.image}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`${i + 1} / ${count}`}
                aria-current={i === index}
                className="relative h-1.5 overflow-hidden rounded-full bg-ink/15 transition-all"
                style={{ width: i === index ? 48 : 12 }}
              >
                {i === index && (
                  <motion.span
                    key={`${index}-${paused}`}
                    className="absolute inset-y-0 left-0 rounded-full bg-brand-500"
                    initial={{ width: paused ? '100%' : '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: paused ? 0 : DURATION / 1000, ease: 'linear' }}
                  />
                )}
              </button>
            ))}
          </div>
          {[
            ['prev', -1, ChevronLeft, 'left-4 xl:left-8'],
            ['next', 1, ChevronRight, 'right-4 xl:right-8'],
          ].map(([label, dir, Icon, pos]) => (
            <motion.button
              key={label}
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => go(dir)}
              aria-label={label}
              className={cn(
                'absolute top-1/2 z-10 hidden size-12 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-ink shadow-soft backdrop-blur transition hover:bg-brand-500 hover:text-white md:grid',
                pos,
              )}
            >
              <Icon className="size-5" />
            </motion.button>
          ))}
        </>
      )}
    </section>
  );
}
