import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { Play, ShoppingBag, X } from 'lucide-react';
import { useVideos } from '../../hooks/useStore.js';
import { useLocalePath } from '../../hooks/useLocalePath.js';
import { SectionHeading } from '../ui/Primitives.jsx';
import { formatPrice } from '../../lib/format.js';

/** Muted preview that only plays while visible (saves data on phones). */
function VideoCard({ video, index, onOpen }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([entry]) => (entry.isIntersecting ? el.play().catch(() => null) : el.pause()), { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <motion.button
      type="button"
      onClick={() => onOpen(video)}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: Math.min(index * 0.06, 0.4) }}
      className="group relative aspect-[9/16] w-52 shrink-0 snap-center overflow-hidden rounded-[1.75rem] bg-ink text-start shadow-lift sm:w-60"
      aria-label={video.title || 'Vidéo'}
    >
      <video ref={ref} src={video.url} poster={video.posterUrl || undefined} muted loop playsInline preload="metadata" className="size-full object-cover" />
      <span className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" aria-hidden />
      <span className="absolute start-3 top-3 grid size-9 place-items-center rounded-full bg-white/90 text-ink opacity-0 transition group-hover:opacity-100" aria-hidden>
        <Play className="size-4 fill-current" />
      </span>
      {(video.title || video.product) && (
        <span className="absolute inset-x-3 bottom-3 text-white">
          {video.title && <span className="line-clamp-2 text-sm font-medium">{video.title}</span>}
          {video.product && <span className="mt-1 block truncate text-xs text-white/80">{video.product.name}</span>}
        </span>
      )}
    </motion.button>
  );
}

function VideoViewer({ video, onClose }) {
  const { t } = useTranslation();
  const lp = useLocalePath();
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <motion.div className="fixed inset-0 z-[110] flex items-center justify-center bg-ink/90 p-4 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} role="dialog" aria-modal="true">
      <button type="button" onClick={onClose} className="absolute end-4 top-4 grid size-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label={t('nav.close')}>
        <X className="size-5" />
      </button>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="relative flex max-h-full flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
        <video src={video.url} poster={video.posterUrl || undefined} controls autoPlay playsInline className="max-h-[78vh] max-w-[92vw] rounded-3xl bg-black shadow-2xl" />
        {video.product && (
          <Link to={lp(`/product/${video.product.slug}`)} onClick={onClose} className="btn bg-white px-6 py-3 text-ink hover:bg-brand-50">
            <ShoppingBag className="size-4" /> {t('videos.shop')} · {formatPrice(video.product.price)}
          </Link>
        )}
      </motion.div>
    </motion.div>
  );
}

/** Home page section with the videos uploaded in the admin (hidden when there is none). */
export function VideoSection() {
  const { t } = useTranslation();
  const { data: videos = [] } = useVideos();
  const [open, setOpen] = useState(null);
  if (!videos.length) return null;

  return (
    <section className="overflow-hidden py-16 sm:py-24">
      <div className="container-x">
        <SectionHeading eyebrow={t('videos.eyebrow')} title={t('videos.title')} subtitle={t('videos.subtitle')} align="center" />
      </div>
      <div className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-4 sm:justify-center sm:px-8">
        {videos.map((v, i) => (
          <VideoCard key={v.id} video={v} index={i} onOpen={setOpen} />
        ))}
      </div>
      <AnimatePresence>{open && <VideoViewer video={open} onClose={() => setOpen(null)} />}</AnimatePresence>
    </section>
  );
}
