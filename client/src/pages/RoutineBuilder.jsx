import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { ArrowRight, Sparkles } from 'lucide-react';
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

export default function RoutineBuilder() {
  const { t } = useTranslation();
  const { data: categories = [], isLoading } = useCategories();
  const routines = categories.filter((c) => c.kind === 'routine' && c.productCount > 0);
  // "routine-mixte" = general routine for a skin type; "routine-mixte-acne" = targeted routine
  const general = routines.filter((r) => r.slug.split('-').length === 2);
  const targeted = routines.filter((r) => r.slug.split('-').length > 2);

  return (
    <>
      <PageHeader eyebrow={t('routinePage.eyebrow')} title={t('routinePage.title')} subtitle={t('routinePage.subtitle')} />

      <RoutineFinder />

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
