import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';
import { StoreLayout } from './components/layout/StoreLayout.jsx';
import i18n, { LOCALES } from './i18n/index.js';
import { useLiveSync } from './lib/live.js';

const Home = lazy(() => import('./pages/Home.jsx'));
const Shop = lazy(() => import('./pages/Shop.jsx'));
const Product = lazy(() => import('./pages/Product.jsx'));
const Cart = lazy(() => import('./pages/Cart.jsx'));
const Checkout = lazy(() => import('./pages/Checkout.jsx'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess.jsx'));
const info = (name) => lazy(() => import('./pages/InfoPages.jsx').then((m) => ({ default: m[name] })));
const Wishlist = info('Wishlist');
const Brands = info('Brands');
const About = info('About');
const Faq = info('Faq');
const Contact = info('Contact');
const ShippingInfo = info('ShippingInfo');
const NotFound = info('NotFound');
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));

function PageFallback() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <span className="size-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500" />
    </div>
  );
}

const page = (Component) => (
  <Suspense fallback={<PageFallback />}>
    <Component />
  </Suspense>
);

// Store pages, mounted once per language under a STATIC prefix (/fr, /en, /ar).
// A dynamic "/:lang" segment would also match /admin/brands (lang = "admin") and outrank /admin/*.
const storeRoutes = [
  { index: true, element: page(Home) },
  { path: 'shop', element: page(Shop) },
  { path: 'category/:slug', element: page(Shop) },
  { path: 'brand/:brandSlug', element: page(Shop) },
  { path: 'product/:slug', element: page(Product) },
  { path: 'cart', element: page(Cart) },
  { path: 'checkout', element: page(Checkout) },
  { path: 'order/success', element: page(OrderSuccess) },
  { path: 'wishlist', element: page(Wishlist) },
  { path: 'brands', element: page(Brands) },
  { path: 'about', element: page(About) },
  { path: 'faq', element: page(Faq) },
  { path: 'contact', element: page(Contact) },
  { path: 'shipping', element: page(ShippingInfo) },
  { path: '*', element: page(NotFound) },
];

const router = createBrowserRouter([
  { path: '/', element: <Navigate to={`/${i18n.language}`} replace /> },
  { path: '/admin/*', element: page(AdminApp) },
  ...LOCALES.map((lang) => ({ path: `/${lang}`, element: <StoreLayout lang={lang} />, children: storeRoutes })),
  // Unknown first segment (old links, typos): back to the store in the current language
  { path: '*', element: <Navigate to={`/${i18n.language}`} replace /> },
]);

export default function App() {
  useLiveSync();
  return <RouterProvider router={router} />;
}
