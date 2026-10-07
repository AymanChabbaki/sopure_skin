import { motion } from 'motion/react';
import useEmblaCarousel from 'embla-carousel-react';
import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductCard } from './ProductCard.jsx';
import { ProductCardSkeleton } from '../ui/Primitives.jsx';
import { staggerContainer, staggerItem } from '../ui/Reveal.jsx';
import { cn } from '../../lib/format.js';

export function ProductGrid({ products, loading, skeletons = 8, className }) {
  if (loading) {
    return (
      <div className={cn('grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4', className)}>
        {Array.from({ length: skeletons }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }
  // Animate on mount (not on scroll): the grid is primary content and must never stay hidden
  return (
    <motion.div
      key={products.map((p) => p.id).join('-')}
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className={cn('grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4', className)}
    >
      {products.map((p, i) => (
        <motion.div key={p.id} variants={staggerItem}>
          <ProductCard product={p} priority={i < 4} />
        </motion.div>
      ))}
    </motion.div>
  );
}

/** Swipeable product row (touch, trackpad, arrows). RTL aware. */
export function ProductCarousel({ products = [], loading }) {
  const { i18n } = useTranslation();
  const [emblaRef, embla] = useEmblaCarousel({
    align: 'start',
    dragFree: true,
    direction: i18n.dir(),
    slidesToScroll: 'auto',
  });
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = useCallback((api) => {
    setCanPrev(api.canScrollPrev());
    setCanNext(api.canScrollNext());
  }, []);

  useEffect(() => {
    if (!embla) return undefined;
    update(embla);
    embla.on('select', update).on('reInit', update);
    return () => embla.off('select', update).off('reInit', update);
  }, [embla, update]);

  const items = loading ? Array.from({ length: 5 }, (_, i) => ({ id: `s${i}`, skeleton: true })) : products;

  return (
    <div className="relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="-ms-4 flex touch-pan-y sm:-ms-6">
          {items.map((p, i) => (
            <div key={p.id} className="min-w-0 shrink-0 basis-[62%] ps-4 sm:basis-[40%] sm:ps-6 md:basis-1/3 lg:basis-1/4">
              {p.skeleton ? <ProductCardSkeleton /> : <ProductCard product={p} priority={i < 2} />}
            </div>
          ))}
        </div>
      </div>
      {[
        { dir: 'prev', can: canPrev, onClick: () => embla?.scrollPrev(), Icon: ChevronLeft, pos: '-start-4' },
        { dir: 'next', can: canNext, onClick: () => embla?.scrollNext(), Icon: ChevronRight, pos: '-end-4' },
      ].map(({ dir, can, onClick, Icon, pos }) => (
        <button
          key={dir}
          type="button"
          onClick={onClick}
          aria-label={dir}
          className={cn(
            'absolute top-[38%] z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white text-ink shadow-soft transition hover:bg-brand-500 hover:text-white lg:grid',
            pos,
            !can && 'pointer-events-none opacity-0',
          )}
        >
          <Icon className="size-5 rtl:-scale-x-100" />
        </button>
      ))}
    </div>
  );
}
