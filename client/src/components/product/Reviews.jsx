import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { Loader2, PenLine, X, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { Stars, StarPicker } from '../ui/Stars.jsx';
import { api } from '../../lib/api.js';
import { cn } from '../../lib/format.js';

const LOCALE_TAGS = { fr: 'fr-MA', en: 'en-US', ar: 'ar-MA' };

function ReviewForm({ slug, onClose }) {
  const { t, i18n } = useTranslation();
  const [rating, setRating] = useState(5);
  const send = useMutation({
    mutationFn: (body) => api(`/products/${encodeURIComponent(slug)}/reviews`, { method: 'POST', body }),
    onSuccess: () => {
      toast.success(t('reviews.thanks'));
      onClose();
    },
    onError: (err) => toast.error(err.status === 429 ? t('common.error') : err.body?.error || t('common.error')),
  });

  const submit = (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    send.mutate({ author: f.get('author'), city: f.get('city'), body: f.get('body'), rating, locale: i18n.language });
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={t('reviews.formTitle')}>
      <motion.div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.form
        onSubmit={submit}
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="relative w-full max-w-lg space-y-5 rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-8"
      >
        <button type="button" onClick={onClose} className="icon-btn absolute end-4 top-4" aria-label={t('nav.close')}>
          <X className="size-5" />
        </button>
        <h3 className="font-display text-3xl">{t('reviews.formTitle')}</h3>
        <div>
          <p className="label">{t('reviews.yourRating')}</p>
          <StarPicker value={rating} onChange={setRating} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="label">{t('reviews.name')}</span>
            <input name="author" required minLength={2} maxLength={60} className="input" />
          </label>
          <label>
            <span className="label">{t('reviews.city')}</span>
            <input name="city" maxLength={60} className="input" />
          </label>
        </div>
        <label className="block">
          <span className="label">{t('reviews.body')}</span>
          <textarea name="body" required minLength={5} maxLength={1000} rows={4} placeholder={t('reviews.bodyPlaceholder')} className="input resize-none" />
        </label>
        <button type="submit" disabled={send.isPending} className="btn-primary w-full py-3.5">
          {send.isPending && <Loader2 className="size-4 animate-spin" />} {t('reviews.submit')}
        </button>
      </motion.form>
    </div>
  );
}

export function Reviews({ slug }) {
  const { t, i18n } = useTranslation();
  const [writing, setWriting] = useState(false);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['reviews', slug],
    queryFn: ({ pageParam }) => api(`/products/${encodeURIComponent(slug)}/reviews`, { params: { page: pageParam } }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
  });
  const first = data?.pages[0];
  const rows = data?.pages.flatMap((p) => p.rows) ?? [];
  const date = (v) => new Intl.DateTimeFormat(LOCALE_TAGS[i18n.language], { dateStyle: 'medium' }).format(new Date(v));

  return (
    <section id="reviews" className="scroll-mt-28 border-t border-line pt-16">
      <div className="grid gap-10 lg:grid-cols-[320px_1fr]">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2 className="font-display text-4xl">{t('reviews.title')}</h2>
          {first?.count > 0 ? (
            <div className="mt-6">
              <div className="flex items-end gap-3">
                <span className="font-display text-6xl leading-none text-ink">{Number(first.average).toFixed(1)}</span>
                <div className="pb-1">
                  <Stars value={first.average} size={18} />
                  <p className="mt-1 text-xs text-muted">{t('reviews.basedOn', { count: first.count })}</p>
                </div>
              </div>
              <ul className="mt-6 space-y-2">
                {[5, 4, 3, 2, 1].map((n) => {
                  const c = first.distribution[n] || 0;
                  return (
                    <li key={n} className="flex items-center gap-3 text-xs text-muted" dir="ltr">
                      <span className="w-3 tabular-nums">{n}</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                        <motion.span
                          className="block h-full rounded-full bg-amber-400"
                          initial={{ width: 0 }}
                          whileInView={{ width: `${(c / first.count) * 100}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.9, ease: 'easeOut' }}
                        />
                      </span>
                      <span className="w-6 text-end tabular-nums">{c}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">{t('reviews.empty')}</p>
          )}
          <button type="button" onClick={() => setWriting(true)} className="btn-outline mt-8 w-full">
            <PenLine className="size-4" /> {t('reviews.write')}
          </button>
        </div>

        <div>
          <ul className="grid gap-4 sm:grid-cols-2">
            <AnimatePresence initial={false}>
              {rows.map((r, i) => (
                <motion.li
                  key={r.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (i % 6) * 0.05 }}
                  className="card flex flex-col p-6"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Stars value={r.rating} />
                    <span className="text-xs text-muted">{date(r.createdAt)}</span>
                  </div>
                  <p className="mt-4 flex-1 leading-relaxed text-ink/85" dir="auto">
                    {r.body}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span className="grid size-8 place-items-center rounded-full bg-brand-50 font-semibold text-brand-700">{r.author[0]}</span>
                    <span className="font-medium text-ink">{r.author}</span>
                    {r.city && (
                      <span className="flex items-center gap-1 text-muted">
                        <MapPin className="size-3" /> {r.city}
                      </span>
                    )}
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          {hasNextPage && (
            <button type="button" onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className={cn('btn-outline mt-6 w-full')}>
              {isFetchingNextPage && <Loader2 className="size-4 animate-spin" />} {t('reviews.more')}
            </button>
          )}
        </div>
      </div>
      <AnimatePresence>{writing && <ReviewForm slug={slug} onClose={() => setWriting(false)} />}</AnimatePresence>
    </section>
  );
}
