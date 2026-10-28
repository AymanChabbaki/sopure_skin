import { Link, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react';
import { ProductGrid } from '../components/product/ProductGrid.jsx';
import { PageHeader, Skeleton } from '../components/ui/Primitives.jsx';
import { staggerContainer, staggerItem } from '../components/ui/Reveal.jsx';
import { useArticle, useArticles, useProducts } from '../hooks/useStore.js';
import { useLocalePath } from '../hooks/useLocalePath.js';
import { NotFound } from './InfoPages.jsx';

const LOCALE_TAGS = { fr: 'fr-MA', en: 'en-US', ar: 'ar-MA' };

/**
 * Same plain-text format as the server (server/src/lib/articles.js): blank lines separate paragraphs,
 * "## " / "### " start headings and "- " lines form a list.
 */
function ArticleBody({ text }) {
  const blocks = String(text || '')
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  return (
    <div className="space-y-5 text-lg leading-relaxed text-ink/80">
      {blocks.map((block, i) => {
        const heading = block.match(/^(#{2,3})\s+(.*)$/s);
        if (heading) {
          return heading[1].length === 2 ? (
            <h2 key={i} className="pt-4 font-display text-3xl text-ink">{heading[2]}</h2>
          ) : (
            <h3 key={i} className="pt-2 text-xl font-semibold text-ink">{heading[2]}</h3>
          );
        }
        const lines = block.split('\n');
        if (lines.every((l) => /^[-•]\s+/.test(l))) {
          return (
            <ul key={i} className="list-disc space-y-2 ps-6 marker:text-brand-500">
              {lines.map((l, j) => <li key={j}>{l.replace(/^[-•]\s+/, '')}</li>)}
            </ul>
          );
        }
        return <p key={i} className="whitespace-pre-line">{block}</p>;
      })}
    </div>
  );
}

export function Guides() {
  const { t, i18n } = useTranslation();
  const lp = useLocalePath();
  const { data = [], isLoading } = useArticles();
  const date = (v) => new Intl.DateTimeFormat(LOCALE_TAGS[i18n.language], { dateStyle: 'long' }).format(new Date(v));

  return (
    <>
      <PageHeader title={t('guides.title')} subtitle={t('guides.subtitle')} />
      <div className="container-x pb-24">
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="aspect-[4/3] rounded-3xl" />)}
          </div>
        ) : data.length === 0 ? (
          <p className="py-16 text-center text-muted">{t('guides.empty')}</p>
        ) : (
          <motion.ul variants={staggerContainer} initial="hidden" animate="show" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((a) => (
              <motion.li key={a.slug} variants={staggerItem}>
                <Link to={lp(`/guides/${a.slug}`)} className="group card flex h-full flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-soft">
                  <span className="grid aspect-[16/9] place-items-center overflow-hidden bg-gradient-to-br from-brand-50 to-sand">
                    {a.coverUrl ? (
                      <img src={a.coverUrl} alt="" loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-105" />
                    ) : (
                      <BookOpen className="size-10 text-brand-300" strokeWidth={1.5} />
                    )}
                  </span>
                  <span className="flex flex-1 flex-col p-6">
                    {a.publishedAt && <span className="text-xs text-muted">{date(a.publishedAt)}</span>}
                    <span className="mt-2 font-display text-2xl text-ink">{a.title}</span>
                    {a.excerpt && <span className="mt-2 line-clamp-3 text-sm text-muted">{a.excerpt}</span>}
                    <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-medium text-brand-700">
                      {t('guides.readMore')} <ArrowRight className="size-4 rtl:-scale-x-100" />
                    </span>
                  </span>
                </Link>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </div>
    </>
  );
}

export function Guide() {
  const { slug } = useParams();
  const { t, i18n } = useTranslation();
  const lp = useLocalePath();
  const { data: article, isLoading, error } = useArticle(slug);
  const ids = article?.productIds ?? [];
  const { data: products, isLoading: loadingProducts } = useProducts({ ids: ids.join(','), limit: ids.length || 1 }, { enabled: ids.length > 0 });

  if (error?.status === 404) return <NotFound />;
  if (isLoading || !article) {
    return (
      <div className="container-x max-w-3xl space-y-4 py-16">
        <Skeleton className="h-12 w-3/4 rounded-2xl" />
        <Skeleton className="h-80 rounded-3xl" />
      </div>
    );
  }
  // Keep the order chosen in the admin
  const ordered = ids.map((id) => products?.rows.find((p) => p.id === id)).filter(Boolean);

  return (
    <>
      <PageHeader title={article.title} subtitle={article.excerpt}>
        <p className="mt-4 text-sm text-muted">
          {new Intl.DateTimeFormat(LOCALE_TAGS[i18n.language], { dateStyle: 'long' }).format(new Date(article.publishedAt || article.updatedAt))}
        </p>
      </PageHeader>
      <article className="container-x max-w-3xl pb-16">
        {article.coverUrl && <img src={article.coverUrl} alt={article.title} className="mb-10 aspect-[16/9] w-full rounded-3xl object-cover" />}
        <ArticleBody text={article.body} />
      </article>
      {ids.length > 0 && (
        <section className="container-x pb-16">
          <h2 className="mb-8 font-display text-3xl">{t('guides.products')}</h2>
          <ProductGrid products={ordered} loading={loadingProducts} skeletons={Math.min(ids.length, 4)} />
        </section>
      )}
      <div className="container-x pb-24">
        <Link to={lp('/guides')} className="inline-flex items-center gap-2 text-sm text-muted hover:text-brand-700">
          <ArrowLeft className="size-4 rtl:-scale-x-100" /> {t('guides.back')}
        </Link>
      </div>
    </>
  );
}
