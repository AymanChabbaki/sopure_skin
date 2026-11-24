import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { PageHeader } from '../components/ui/Primitives.jsx';
import { AllPacks } from '../components/product/Packs.jsx';
import { useLocalePath } from '../hooks/useLocalePath.js';

/** Every ready-made routine pack: buy the whole pack or untick what you already have. */
export default function Packs() {
  const { t } = useTranslation();
  const lp = useLocalePath();
  return (
    <>
      <PageHeader eyebrow={t('packs.sectionEyebrow')} title={t('packs.pageTitle')} subtitle={t('packs.subtitle')}>
        <Link to={lp('/routine')} className="btn-outline mt-6">
          <Sparkles className="size-4" /> {t('packs.findMine')}
        </Link>
      </PageHeader>
      <AllPacks className="container-x pb-20" />
    </>
  );
}
