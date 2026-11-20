import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { track } from '../../lib/pixel.js';
import { Outlet, ScrollRestoration } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AnnouncementBar } from './AnnouncementBar.jsx';
import { Header } from './Header.jsx';
import { Footer } from './Footer.jsx';
import { CartDrawer } from './CartDrawer.jsx';
import { SearchOverlay } from './SearchOverlay.jsx';
import { MobileMenu, MobileBottomNav } from './MobileNav.jsx';
import { Assistant } from '../chat/Assistant.jsx';
import { FloatingCart } from './FloatingCart.jsx';
import { ServerSeo } from '../ui/ServerSeo.jsx';
import { GoogleMerchantWidget } from '../GoogleCustomerReviews.jsx';

export function StoreLayout({ lang }) {
  const { i18n } = useTranslation();

  useEffect(() => {
    if (i18n.language !== lang) i18n.changeLanguage(lang);
  }, [lang, i18n]);

  // Meta Pixel: PageView on each SPA navigation (the first one is sent by index.html)
  const { pathname } = useLocation();
  const firstView = useRef(true);
  useEffect(() => {
    if (firstView.current) {
      firstView.current = false;
      return;
    }
    track('PageView');
  }, [pathname]);

  // Meta Pixel: any WhatsApp link click counts as a Contact
  useEffect(() => {
    const onClick = (e) => {
      if (e.target.closest?.('a[href*="wa.me"]')) track('Contact', { content_name: 'WhatsApp' });
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return (
    <>
      <ServerSeo />
      <GoogleMerchantWidget />
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
      <FloatingCart />
      <Assistant />
      <ScrollRestoration getKey={(location) => location.pathname} />
    </>
  );
}
