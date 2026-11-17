import { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { RoutinePacks } from '../components/product/Packs.jsx';
import { RoutineFinder, RitualSteps } from '../components/home/Sections.jsx';
import { PageHeader, SectionHeading, Skeleton } from '../components/ui/Primitives.jsx';
import { staggerContainer, staggerItem } from '../components/ui/Reveal.jsx';
import { useCategories } from '../hooks/useStore.js';
import { useLocalePath } from '../hooks/useLocalePath.js';

/** Routine card: skin-type routine with its product count. */
function RoutineCard({ routine }) {
  const { t } = useTranslation();
  const lp = useLocalePath();
  return (
    <motion.li variants={staggerItem}>
      <Link
        to={lp(`/category/${routine.slug}`)}
        className="group flex h-full items-center gap-4 rounded-3xl border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-soft"
      >
        <span className="size-16 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-50 to-sand">
          {routine.image && <img src={routine.image} alt="" loading="lazy" className="size-full object-contain p-1.5 mix-blend-multiply" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-ink group-hover:text-brand-700">{routine.name}</span>
          <span className="text-xs text-muted">{t('common.products', { count: routine.productCount })}</span>
        </span>
        <ArrowRight className="size-4 shrink-0 text-brand-500 transition group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
      </Link>
    </motion.li>
  );
}

function RoutineResult({ routines }) {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const name = routines.length === 1 ? routines[0].name : t('packs.title');
  return (
    <div className="pb-10">
      <RoutinePacks categories={routines.map((r) => r.slug)} title={name} subtitle={t('packs.routineSubtitle')} emptyMessage={t('packs.none', { routine: name })} />
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {routines.map((routine) => (
          <Link key={routine.slug} to={lp(`/category/${routine.slug}`)} className="btn-outline group">
            {t('packs.allProducts', { routine: routine.name })} <ArrowRight className="size-4 transition group-hover:translate-x-1 rtl:-scale-x-100" />
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function RoutineBuilder() {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const { data: categories = [], isLoading } = useCategories();
  const { state } = useLocation();
  const [selection, setSelection] = useState(null);
  const chosen = selection ?? state;
  const resultRef = useRef(null);
  const chosenRoutines = (chosen?.matches || []).map((slug) => categories.find((c) => c.slug === slug)).filter(Boolean);
  const choose = (result) => {
    setSelection(result);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
  };
  const routines = categories.filter((c) => c.kind === 'routine' && c.productCount > 0);
  // "routine-mixte" = general routine for a skin type; "routine-mixte-acne" = targeted routine
  const general = routines.filter((r) => r.slug.split('-').length === 2);
  const targeted = routines.filter((r) => r.slug.split('-').length > 2);

  return (
    <>
      <PageHeader eyebrow={t('routinePage.eyebrow')} title={t('routinePage.title')} subtitle={t('routinePage.subtitle')} />

      <RoutineFinder onChoose={choose} />

      {/* Result of the finder: the packs of the matching routine */}
      {chosen && (
        <div ref={resultRef} className="container-x scroll-mt-28 pt-8">
          {isLoading ? <Skeleton className="h-40 rounded-3xl" /> : chosenRoutines.length ? (
            <>
              {chosen.partial && <p className="mb-6 rounded-2xl bg-brand-50 p-4 text-center">{t('packs.partialMatch')}</p>}
              <RoutineResult routines={chosenRoutines} />
            </>
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-3xl bg-brand-50 p-8 text-center">
              <p>{t('packs.noRoutine')}</p>
              <Link to={lp('/shop')} className="btn-primary">
                {t('nav.allProducts')}
              </Link>
            </div>
          )}
          {!isLoading && chosen.eyeCategory && (
            <div className="mt-5 flex justify-center">
              <Link to={lp('/category/contour-des-yeux')} className="btn-outline">
                {t('home.browseEyeCare')} <ArrowRight className="size-4 rtl:-scale-x-100" />
              </Link>
            </div>
          )}
        </div>
      )}

      <section className="container-x py-16 sm:py-20">
        <SectionHeading title={t('routinePage.orChoose')} subtitle={t('routinePage.orChooseText')} />
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-24 rounded-3xl" />
            ))}
          </div>
        ) : (
          [
            [t('routinePage.general'), general],
            [t('routinePage.targeted'), targeted],
          ]
            .filter(([, list]) => list.length)
            .map(([label, list]) => (
              <div key={label} className="mb-10 last:mb-0">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold tracking-wide text-brand-700 uppercase rtl:tracking-normal">
                  <Sparkles className="size-4" /> {label}
                </h3>
                <motion.ul variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {list.map((r) => (
                    <RoutineCard key={r.id} routine={r} />
                  ))}
                </motion.ul>
              </div>
            ))
        )}
      </section>

      <RitualSteps />
    </>
  );
}
