import { useTranslation } from 'react-i18next';
import { Hero } from '../components/home/Hero.jsx';
import { SloganBand, CategoryRail, RoutineFinder, PromoBanner, BrandMarquee, RitualSteps, NewsletterSection } from '../components/home/Sections.jsx';
import { Testimonials } from '../components/home/Testimonials.jsx';
import { ProductCarousel, ProductGrid } from '../components/product/ProductGrid.jsx';
import { SectionHeading } from '../components/ui/Primitives.jsx';
import { Seo } from '../components/ui/Seo.jsx';
import { useProducts, useSettings } from '../hooks/useStore.js';
import { useLocalePath } from '../hooks/useLocalePath.js';

export default function Home() {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const { data: settings } = useSettings();
  const best = useProducts({ sort: 'popular', limit: 10 });
  const fresh = useProducts({ sort: 'newest', limit: 8 });
  const offers = useProducts({ onSale: true, sort: 'popular', limit: 10 });
  const faq = t('faq.items', {
    returnObjects: true,
    casa: settings?.shipping?.casablancaFee ?? 20,
    other: settings?.shipping?.otherFee ?? 35,
    count: settings?.shipping?.freeAboveItems ?? 5,
  });

  return (
    <>
      <Seo
        title={settings?.seo?.title?.replace(/^So Pure Skin \| /, '')}
        description={settings?.seo?.description}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
        }}
      />
      <Hero />
      <BrandMarquee />
      <SloganBand />
      <CategoryRail />

      <section className="container-x pb-16 sm:pb-24">
        <SectionHeading title={t('home.bestSellersTitle')} subtitle={t('home.bestSellersSubtitle')} link={lp('/shop?sort=popular')} linkLabel={t('nav.viewAll')} />
        <ProductCarousel products={best.data?.rows} loading={best.isLoading} />
      </section>

      <RoutineFinder />

      <section className="container-x py-16 sm:py-24">
        <SectionHeading title={t('home.newTitle')} subtitle={t('home.newSubtitle')} link={lp('/shop?sort=newest')} linkLabel={t('nav.viewAll')} />
        <ProductGrid products={fresh.data?.rows ?? []} loading={fresh.isLoading} />
      </section>

      <PromoBanner />

      {(offers.isLoading || offers.data?.rows?.length > 0) && (
        <section className="container-x py-16 sm:py-24">
          <SectionHeading title={t('home.offersTitle')} subtitle={t('home.offersSubtitle')} link={lp('/shop?onSale=true')} linkLabel={t('nav.viewAll')} />
          <ProductCarousel products={offers.data?.rows} loading={offers.isLoading} />
        </section>
      )}

      <RitualSteps />
      <Testimonials />
      <NewsletterSection />
    </>
  );
}
