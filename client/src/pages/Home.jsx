import { useTranslation } from 'react-i18next';
import { Hero } from '../components/home/Hero.jsx';
import { SloganBand, CategoryRail, RoutineFinder, PromoBanner, BrandMarquee, RitualSteps, NewsletterSection } from '../components/home/Sections.jsx';
import { Testimonials } from '../components/home/Testimonials.jsx';
import { ProductCarousel, ProductGrid } from '../components/product/ProductGrid.jsx';
import { SectionHeading } from '../components/ui/Primitives.jsx';
import { useProducts } from '../hooks/useStore.js';
import { useLocalePath } from '../hooks/useLocalePath.js';

export default function Home() {
  const { t } = useTranslation();
  const lp = useLocalePath();
  // Only products marked « Best-seller » in the admin (same list as the menu link)
  const best = useProducts({ bestSeller: true, sort: 'popular', limit: 10 });
  const fresh = useProducts({ sort: 'newest', limit: 8 });
  const offers = useProducts({ onSale: true, sort: 'popular', limit: 10 });
  return (
    <>
      {/* Metadata and structured data come from the server (ServerSeo) */}
      <Hero />
      <BrandMarquee />
      <SloganBand />
      <CategoryRail />

      {(best.isLoading || best.data?.rows?.length > 0) && (
        <section className="container-x pb-16 sm:pb-24">
          <SectionHeading title={t('home.bestSellersTitle')} subtitle={t('home.bestSellersSubtitle')} link={lp('/shop?bestSeller=true')} linkLabel={t('nav.viewAll')} />
          <ProductCarousel products={best.data?.rows} loading={best.isLoading} />
        </section>
      )}

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
