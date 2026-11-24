import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { AllPacks } from '../components/product/Packs.jsx';
import { useLocalePath } from '../hooks/useLocalePath.js';

/** Every ready-made routine pack: buy the whole pack or untick what you already have. */
export default function Packs() {
  const { t } = useTranslation();
  const lp = useLocalePath();
  return (
    <>
      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="container-x pt-8 pb-6 sm:pt-12 sm:pb-8">
          <p className="eyebrow mb-2">{t('packs.sectionEyebrow')}</p>
          <h1 className="font-display text-3xl text-ink sm:text-5xl">{t('packs.pageTitle')}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted sm:text-base">{t('packs.subtitle')}</p>
          <Link to={lp('/routine')} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline">
            <Sparkles className="size-4" /> {t('packs.findMine')}
          </Link>
        </div>
      </section>
      <AllPacks className="container-x pb-20" />
    </>
  );
}
