import { useEffect } from 'react';
import { Navigate, Outlet, ScrollRestoration, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AnnouncementBar } from './AnnouncementBar.jsx';
import { Header } from './Header.jsx';
import { Footer } from './Footer.jsx';
import { CartDrawer } from './CartDrawer.jsx';
import { SearchOverlay } from './SearchOverlay.jsx';
import { MobileMenu, MobileBottomNav } from './MobileNav.jsx';
import { isLocale } from '../../i18n/index.js';
import { Assistant } from '../chat/Assistant.jsx';

export function StoreLayout() {
  const { lang } = useParams();
  const { i18n } = useTranslation();

  useEffect(() => {
    if (isLocale(lang) && i18n.language !== lang) i18n.changeLanguage(lang);
  }, [lang, i18n]);

  if (!isLocale(lang)) return <Navigate to={`/${i18n.language}`} replace />;

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-full focus:bg-white focus:px-4 focus:py-2">
        Skip to content
      </a>
      <AnnouncementBar />
      <Header />
      <main id="main" className="min-h-[60vh]">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
      <SearchOverlay />
      <MobileMenu />
      <MobileBottomNav />
      <Assistant />
      <ScrollRestoration getKey={(location) => location.pathname} />
    </>
  );
}
