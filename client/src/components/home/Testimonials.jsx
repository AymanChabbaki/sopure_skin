import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Expand, MessageCircleHeart, X } from 'lucide-react';
import { useSettings } from '../../hooks/useStore.js';
import { SectionHeading } from '../ui/Primitives.jsx';

const TILTS = [-3, 2, -1.5, 3, -2.5, 1.5, -1, 2.5];

function useLockScroll(active) {
  useEffect(() => {
    if (!active) return undefined;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [active]);
}

/** Full-screen viewer: arrows, swipe, keyboard. */
function Lightbox({ items, index, onIndex, onClose }) {
  const { t } = useTranslation();
  const go = useCallback((dir) => onIndex((index + dir + items.length) % items.length), [index, items.length, onIndex]);
  useLockScroll(true);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  return (
    <motion.div className="fixed inset-0 z-[110] flex items-center justify-center bg-ink/90 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" dir="ltr">
      <button type="button" onClick={onClose} className="absolute top-4 right-4 z-10 grid size-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label={t('testimonials.close')}>
        <X className="size-5" />
      </button>
      <p className="absolute top-6 left-1/2 -translate-x-1/2 text-sm text-white/70 tabular-nums">
        {index + 1} / {items.length}
      </p>
      <AnimatePresence mode="wait" initial={false}>
        <motion.img
          key={items[index].url}
          src={items[index].url}
          alt=""
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={(_e, info) => Math.abs(info.offset.x) > 60 && go(info.offset.x < 0 ? 1 : -1)}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{ duration: 0.25 }}
          className="max-h-[86vh] max-w-[92vw] cursor-grab rounded-3xl shadow-2xl active:cursor-grabbing"
          draggable={false}
        />
      </AnimatePresence>
      {[
        [-1, ChevronLeft, 'left-3 sm:left-8'],
        [1, ChevronRight, 'right-3 sm:right-8'],
      ].map(([dir, Icon, pos]) => (
        <button key={dir} type="button" onClick={() => go(dir)} className={`absolute top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/25 ${pos}`} aria-label={dir < 0 ? 'prev' : 'next'}>
          <Icon className="size-6" />
        </button>
      ))}
    </motion.div>
  );
}

/** Modal with every screenshot in a masonry grid. */
function AllModal({ items, onOpen, onClose }) {
  const { t } = useTranslation();
  useLockScroll(true);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div className="fixed inset-0 z-[100] flex flex-col bg-white" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} role="dialog" aria-modal="true" aria-label={t('testimonials.title')}>
      <header className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="font-display text-2xl sm:text-3xl">{t('testimonials.title')}</h2>
        <button type="button" onClick={onClose} className="icon-btn" aria-label={t('testimonials.close')}>
          <X className="size-5" />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="mx-auto max-w-6xl columns-2 gap-4 sm:columns-3 lg:columns-4">
          {items.map((item, i) => (
            <motion.button
              key={item.url}
              type="button"
              onClick={() => onOpen(i)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.5) }}
              className="group relative mb-4 block w-full break-inside-avoid overflow-hidden rounded-2xl border border-line bg-zinc-900"
            >
              <img src={item.thumbUrl || item.url} alt="" loading="lazy" className="w-full transition duration-500 group-hover:scale-[1.03]" />
              <span className="absolute inset-0 grid place-items-center bg-ink/0 text-white opacity-0 transition group-hover:bg-ink/30 group-hover:opacity-100">
                <Expand className="size-6" />
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function Testimonials() {
  const { t } = useTranslation();
  const { data } = useSettings();
  const items = data?.testimonials ?? [];
  const [showAll, setShowAll] = useState(false);
  const [viewing, setViewing] = useState(null);
  if (!items.length) return null;
  const preview = items.slice(0, 8);

  return (
    <section className="overflow-hidden bg-gradient-to-b from-white via-brand-50/50 to-white py-16 sm:py-24">
      <div className="container-x">
        <SectionHeading eyebrow={t('testimonials.eyebrow')} title={t('testimonials.title')} subtitle={t('testimonials.subtitle')} align="center" />
      </div>

      {/* Phone-style cards, slightly tilted, straighten on hover */}
      <div className="no-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto px-6 pt-4 pb-10 sm:justify-center sm:px-8 lg:flex-wrap lg:overflow-visible">
        {preview.map((item, i) => (
          <motion.button
            key={item.url}
            type="button"
            onClick={() => setViewing(i)}
            initial={{ opacity: 0, y: 40, rotate: 0 }}
            whileInView={{ opacity: 1, y: 0, rotate: TILTS[i % TILTS.length] }}
            whileHover={{ rotate: 0, y: -10, scale: 1.04, zIndex: 10 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: i * 0.05 }}
            className="relative w-44 shrink-0 snap-center overflow-hidden rounded-[1.75rem] border-[5px] border-ink bg-ink shadow-lift sm:w-48 lg:w-52"
            aria-label={`${t('testimonials.title')} ${i + 1}`}
          >
            <span className="absolute top-1.5 left-1/2 z-10 h-1.5 w-12 -translate-x-1/2 rounded-full bg-ink" aria-hidden />
            <img src={item.thumbUrl || item.url} alt="" loading="lazy" className="aspect-[9/17] w-full object-cover object-top" draggable={false} />
          </motion.button>
        ))}
      </div>

      <div className="flex justify-center">
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} type="button" onClick={() => setShowAll(true)} className="btn-dark px-7 py-3.5">
          <MessageCircleHeart className="size-4" /> {t('testimonials.seeAll', { count: items.length })}
        </motion.button>
      </div>

      <AnimatePresence>{showAll && <AllModal items={items} onOpen={setViewing} onClose={() => setShowAll(false)} />}</AnimatePresence>
      <AnimatePresence>{viewing !== null && <Lightbox items={items} index={viewing} onIndex={setViewing} onClose={() => setViewing(null)} />}</AnimatePresence>
    </section>
  );
}
