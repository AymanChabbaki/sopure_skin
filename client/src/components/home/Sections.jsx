import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import {
  BadgeCheck,
  HandCoins,
  Truck,
  MessagesSquare,
  ArrowRight,
  Droplets,
  Sun,
  Flame,
  Leaf,
  Gift,
  Check,
  FlaskConical,
  ShieldCheck,
} from 'lucide-react';
import { useBrands, useCategories, useSettings } from '../../hooks/useStore.js';
import { useLocalePath } from '../../hooks/useLocalePath.js';
import { Reveal, staggerContainer, staggerItem } from '../ui/Reveal.jsx';
import { SectionHeading, Skeleton } from '../ui/Primitives.jsx';
import { NewsletterForm } from '../layout/Footer.jsx';
import { BrandLogo } from '../ui/BrandLogo.jsx';
import { SLOGAN } from '../../lib/brand.js';
import { cn } from '../../lib/format.js';

/* ------------------------------- Benefits ------------------------------- */

export function Benefits() {
  const { t } = useTranslation();
  const { data } = useSettings();
  const s = data?.shipping;
  const items = [
    [BadgeCheck, t('benefits.authentic.title'), t('benefits.authentic.text')],
    [HandCoins, t('benefits.cod.title'), t('benefits.cod.text')],
    [Truck, t('benefits.delivery.title'), t('product.deliveryInfo', { casa: s?.casablancaFee ?? 20, other: s?.otherFee ?? 35 })],
    [MessagesSquare, t('benefits.support.title'), t('benefits.support.text')],
  ];
  return (
    <section className="border-y border-line bg-white">
      <motion.ul
        variants={staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="container-x grid grid-cols-2 gap-6 py-8 lg:grid-cols-4"
      >
        {items.map(([Icon, title, text]) => (
          <motion.li key={title} variants={staggerItem} className="flex items-start gap-3 sm:items-center">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <Icon className="size-5" strokeWidth={1.75} />
            </span>
            <span>
              <span className="block text-sm font-medium text-ink">{title}</span>
              <span className="block text-xs text-muted">{text}</span>
            </span>
          </motion.li>
        ))}
      </motion.ul>
    </section>
  );
}

/* -------------------------------- Slogan -------------------------------- */

/** "Filter Snap kimshi, walakin skin care kib9a": words rise in one by one, the punchline is highlighted. */
export function SloganBand() {
  const lead = SLOGAN.lead.split(' ');
  const punch = SLOGAN.punch.split(' ');
  const word = {
    hidden: { opacity: 0, y: '60%', filter: 'blur(6px)' },
    show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
  };
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white to-brand-50/60 py-16 sm:py-24" dir="ltr" lang="ar-MA">
      <motion.div aria-hidden className="pointer-events-none absolute -top-20 left-1/2 size-[28rem] -translate-x-1/2 rounded-full bg-brand-100/60 blur-3xl" animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 8, repeat: Infinity }} />
      <motion.p
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09 } } }}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
        className="container-x relative text-center font-serif text-4xl leading-tight text-ink sm:text-6xl lg:text-7xl"
        aria-label={SLOGAN.full}
      >
        {lead.map((w, i) => (
          <motion.span key={`l${i}`} variants={word} className="me-[0.25em] inline-block" aria-hidden>
            {w}
          </motion.span>
        ))}
        <br className="hidden sm:block" />
        {punch.map((w, i) => (
          <motion.span key={`p${i}`} variants={word} className={cn('me-[0.25em] inline-block', i === punch.length - 1 ? 'relative text-brand-600 italic' : 'text-brand-800')} aria-hidden>
            {w}
            {i === punch.length - 1 && (
              <motion.svg viewBox="0 0 200 20" className="absolute -bottom-2 left-0 h-3 w-full text-brand-300" preserveAspectRatio="none" aria-hidden>
                <motion.path
                  d="M2 14 C 50 4, 120 4, 198 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, delay: 0.9, ease: 'easeInOut' }}
                />
              </motion.svg>
            )}
          </motion.span>
        ))}
      </motion.p>
    </section>
  );
}

/* ------------------------------ Categories ------------------------------ */

export function CategoryRail() {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const { data = [], isLoading } = useCategories();
  const types = data.filter((c) => c.kind === 'type' && c.productCount > 0);

  return (
    <section className="container-x py-16 sm:py-24">
      <SectionHeading title={t('home.categoriesTitle')} subtitle={t('home.categoriesSubtitle')} link={lp('/shop')} linkLabel={t('nav.viewAll')} />
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-40px' }}
        className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 lg:grid-cols-6"
      >
        {isLoading
          ? Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="aspect-[3/4] w-36 shrink-0 rounded-3xl sm:w-auto" />)
          : types.map((c) => (
              <motion.div key={c.id} variants={staggerItem} className="w-36 shrink-0 snap-start sm:w-auto">
                <Link to={lp(`/category/${c.slug}`)} className="group block">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-gradient-to-b from-brand-50 to-sand">
                    {c.image && (
                      <img
                        src={c.image}
                        alt={c.name}
                        loading="lazy"
                        className="absolute inset-0 size-full object-contain p-5 mix-blend-multiply transition duration-700 group-hover:scale-110"
                      />
                    )}
                    <div className="absolute inset-x-2 bottom-2 rounded-2xl bg-white/85 px-3 py-2.5 text-center backdrop-blur transition group-hover:bg-brand-500 group-hover:text-white">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <p className="text-[11px] opacity-70">{t('common.products', { count: c.productCount })}</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
      </motion.div>
    </section>
  );
}

/* ---------------------------- Routine finder ---------------------------- */

const SKINS = [
  ['mixte', Droplets],
  ['normale', Leaf],
  ['seche', Sun],
  ['grasse', Flame],
];
const CONCERNS = ['none', 'acne', 'taches', 'points-noirs', 'rougeurs'];

export function RoutineFinder() {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const navigate = useNavigate();
  const { data: categories = [] } = useCategories();
  const [skin, setSkin] = useState('mixte');
  const [concern, setConcern] = useState('none');
  const slugs = useMemo(() => new Set(categories.map((c) => c.slug)), [categories]);

  const go = () => {
    // Most specific routine that exists, then the general skin routine, then the whole shop
    const candidates = [concern !== 'none' && `routine-${skin}-${concern}`, `routine-${skin}`].filter(Boolean);
    const match = candidates.find((s) => slugs.has(s));
    navigate(match ? lp(`/category/${match}`) : lp('/shop'));
  };

  const chip = (active) =>
    cn(
      'relative flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm transition',
      active ? 'border-transparent text-white' : 'border-white/25 text-white/85 hover:border-white/60',
    );

  return (
    <section className="container-x py-8">
      <Reveal className="relative overflow-hidden rounded-[2.5rem] bg-brand-900 px-6 py-12 text-white sm:px-12 lg:px-16 lg:py-16">
        <div aria-hidden className="pointer-events-none absolute -end-20 -top-20 size-96 rounded-full bg-brand-500/40 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -start-10 bottom-0 size-72 rounded-full bg-brand-300/20 blur-3xl" />
        <div className="relative grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="eyebrow text-brand-200">{t('home.routineEyebrow')}</p>
            <h2 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">{t('home.routineTitle')}</h2>
            <p className="mt-4 max-w-md text-white/70">{t('home.routineSubtitle')}</p>
          </div>
          <div className="space-y-7">
            <fieldset>
              <legend className="mb-3 text-xs font-medium tracking-widest text-brand-200 uppercase rtl:tracking-normal">{t('home.routineSkin')}</legend>
              <div className="flex flex-wrap gap-2">
                {SKINS.map(([key, Icon]) => (
                  <button key={key} type="button" onClick={() => setSkin(key)} className={chip(skin === key)} aria-pressed={skin === key}>
                    {skin === key && <motion.span layoutId="skin-pill" className="absolute inset-0 rounded-full bg-brand-500" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
                    <Icon className="relative size-4" />
                    <span className="relative">{t(`home.skin.${key}`)}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-3 text-xs font-medium tracking-widest text-brand-200 uppercase rtl:tracking-normal">{t('home.routineConcern')}</legend>
              <div className="flex flex-wrap gap-2">
                {CONCERNS.map((key) => (
                  <button key={key} type="button" onClick={() => setConcern(key)} className={chip(concern === key)} aria-pressed={concern === key}>
                    {concern === key && <motion.span layoutId="concern-pill" className="absolute inset-0 rounded-full bg-brand-500" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
                    <AnimatePresence>{concern === key && <Check className="relative size-4" />}</AnimatePresence>
                    <span className="relative">{t(`home.concern.${key}`)}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" onClick={go} className="btn group bg-white px-8 py-4 text-brand-900 hover:bg-brand-50">
              {t('home.routineCta')}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100" />
            </motion.button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ------------------------- Free delivery banner ------------------------- */

export function PromoBanner() {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const { data } = useSettings();
  const n = data?.shipping?.freeAboveItems ?? 5;

  return (
    <section className="container-x py-8">
      <Reveal className="relative grid overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-sand to-brand-50 md:grid-cols-5">
        <div className="relative z-10 p-8 sm:p-12 md:col-span-3">
          <p className="eyebrow">{t('home.promoEyebrow')}</p>
          <h2 className="mt-3 font-display text-4xl leading-tight text-ink sm:text-5xl">{t('home.promoTitle', { count: n })}</h2>
          <p className="mt-4 max-w-lg text-muted">{t('home.promoText')}</p>
          <Link to={lp('/shop')} className="btn-dark group mt-8 px-8 py-4">
            {t('common.discover')} <ArrowRight className="size-4 transition group-hover:translate-x-1 rtl:-scale-x-100" />
          </Link>
        </div>
        <div className="relative flex min-h-56 items-center justify-center md:col-span-2">
          <motion.div
            animate={{ rotate: [0, -6, 6, 0], y: [0, -8, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className="relative grid size-44 place-items-center rounded-full bg-white shadow-lift sm:size-52"
          >
            <Gift className="size-16 text-brand-500" strokeWidth={1.25} />
            <span className="absolute -top-2 -end-2 grid size-16 place-items-center rounded-full bg-brand-500 text-center text-xs leading-tight font-semibold text-white">
              {n + 1}+
            </span>
          </motion.div>
          {Array.from({ length: n + 1 }, (_, i) => (
            <motion.span
              key={i}
              aria-hidden
              className="absolute size-3 rounded-full bg-brand-300"
              style={{ top: `${20 + ((i * 37) % 60)}%`, left: `${10 + ((i * 53) % 80)}%` }}
              animate={{ opacity: [0.2, 1, 0.2], scale: [0.6, 1, 0.6] }}
              transition={{ duration: 3, delay: i * 0.4, repeat: Infinity }}
            />
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/* ----------------------------- Brand marquee ----------------------------- */

export function BrandMarquee() {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const { data = [] } = useBrands();
  if (!data.length) return null;
  const row = (hidden) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {data.map((b) => (
        <li key={b.id}>
          <Link
            to={lp(`/brand/${b.slug}`)}
            tabIndex={hidden ? -1 : undefined}
            className="group/logo flex h-20 items-center px-7 text-ink/35 transition hover:text-brand-600 sm:px-10"
            aria-label={b.name}
          >
            <BrandLogo brand={b} area={3000} className="opacity-40 group-hover/logo:scale-105 group-hover/logo:opacity-100" />
          </Link>
        </li>
      ))}
    </ul>
  );
  return (
    <section className="overflow-hidden py-16 sm:py-20">
      <Reveal>
        <p className="eyebrow mb-8 text-center">{t('home.brandsTitle')}</p>
      </Reveal>
      <div className="group relative" dir="ltr">
        <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused]" style={{ '--marquee-duration': `${data.length * 3}s` }}>
          {row(false)}
          {row(true)}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white" />
      </div>
    </section>
  );
}

/* --------------------------- Korean ritual steps -------------------------- */

const STEP_ICONS = [Droplets, FlaskConical, Leaf, ShieldCheck];

export function RitualSteps() {
  const { t } = useTranslation();
  const steps = t('home.steps', { returnObjects: true });
  return (
    <section className="bg-sand/60 py-16 sm:py-24">
      <div className="container-x">
        <SectionHeading eyebrow={t('home.stepsEyebrow')} title={t('home.stepsTitle')} align="center" />
        <motion.ol
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {steps.map((step, i) => {
            const Icon = STEP_ICONS[i];
            return (
              <motion.li key={step.title} variants={staggerItem} whileHover={{ y: -6 }} className="card relative p-7 transition-shadow hover:shadow-soft">
                <span className="absolute end-6 top-5 font-display text-6xl text-brand-100">0{i + 1}</span>
                <span className="relative grid size-12 place-items-center rounded-2xl bg-brand-500 text-white">
                  <Icon className="size-5" />
                </span>
                <h3 className="relative mt-6 font-display text-2xl text-ink">{step.title}</h3>
                <p className="relative mt-2 text-sm leading-relaxed text-muted">{step.text}</p>
              </motion.li>
            );
          })}
        </motion.ol>
      </div>
    </section>
  );
}

/* ------------------------------- Newsletter ------------------------------- */

export function NewsletterSection() {
  const { t } = useTranslation();
  return (
    <section className="container-x pb-16 sm:pb-24">
      <Reveal className="flex flex-col items-center rounded-[2.5rem] bg-gradient-to-br from-brand-50 to-brand-100/60 px-6 py-14 text-center">
        <h2 className="font-display text-4xl text-ink sm:text-5xl">{t('home.newsletterTitle')}</h2>
        <p className="mt-3 mb-8 max-w-md text-muted">{t('home.newsletterText')}</p>
        <NewsletterForm />
      </Reveal>
    </section>
  );
}
