import { lazy, Suspense, useState } from 'react';
import { NavLink, Route, Routes, useLocation, Link } from 'react-router';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FolderTree,
  Award,
  Settings,
  Users,
  Mail,
  Star,
  LogOut,
  Menu,
  X,
  ExternalLink,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { Logo, LogoMark } from '../components/ui/Logo.jsx';
import { adminApi } from './ui.jsx';
import { cn } from '../lib/format.js';

const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Orders = lazy(() => import('./pages/Orders.jsx'));
const OrderDetail = lazy(() => import('./pages/OrderDetail.jsx'));
const Products = lazy(() => import('./pages/Products.jsx'));
const ProductForm = lazy(() => import('./pages/ProductForm.jsx'));
const Taxonomy = lazy(() => import('./pages/Taxonomy.jsx'));
const SettingsPage = lazy(() => import('./pages/Settings.jsx'));
const ReviewsPage = lazy(() => import('./pages/Reviews.jsx'));
const Team = lazy(() => import('./pages/Team.jsx'));
const Subscribers = lazy(() => import('./pages/Subscribers.jsx'));

function Login() {
  const qc = useQueryClient();
  const [show, setShow] = useState(false);
  const login = useMutation({
    mutationFn: (body) => adminApi('/auth/login', { method: 'POST', body }),
    onSuccess: (admin) => qc.setQueryData(['admin-me'], admin),
    onError: (err) => toast.error(err.body?.error || 'Connexion impossible'),
  });

  const submit = (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    login.mutate({ email: form.get('email'), password: form.get('password') });
  };

  return (
    <div className="grid min-h-screen bg-gradient-to-br from-brand-50 via-white to-sand lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-brand-950 lg:grid lg:place-items-center" style={{ '--logo-bg': 'var(--color-brand-950)' }}>
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 10, repeat: Infinity }} className="absolute -top-20 -left-20 size-96 rounded-full bg-brand-500/30 blur-3xl" />
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1 }}>
          <LogoMark className="size-72 text-white" />
        </motion.div>
      </div>
      <div className="flex items-center justify-center p-6">
        <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={submit} className="w-full max-w-sm space-y-5">
          <Logo className="lg:hidden" />
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Espace administrateur</h1>
            <p className="mt-2 text-sm text-muted">Connectez-vous pour gérer votre boutique.</p>
          </div>
          <label className="block">
            <span className="label">E-mail</span>
            <input name="email" type="email" required autoComplete="username" className="input" />
          </label>
          <label className="block">
            <span className="label">Mot de passe</span>
            <span className="relative block">
              <input name="password" type={show ? 'text' : 'password'} required autoComplete="current-password" className="input pr-12" />
              <button type="button" onClick={() => setShow(!show)} className="absolute top-1/2 right-2 icon-btn size-8 -translate-y-1/2" aria-label="Afficher">
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </span>
          </label>
          <button type="submit" disabled={login.isPending} className="btn-primary w-full py-3.5">
            {login.isPending && <Loader2 className="size-4 animate-spin" />} Se connecter
          </button>
        </motion.form>
      </div>
    </div>
  );
}

const NAV = [
  { to: '/admin', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/admin/orders', label: 'Commandes', icon: ShoppingCart, badge: 'pending' },
  { to: '/admin/products', label: 'Produits', icon: Package },
  { to: '/admin/categories', label: 'Catégories', icon: FolderTree },
  { to: '/admin/brands', label: 'Marques', icon: Award },
  { to: '/admin/reviews', label: 'Avis clients', icon: Star },
  { to: '/admin/subscribers', label: 'Newsletter', icon: Mail },
  { to: '/admin/settings', label: 'Paramètres', icon: Settings },
  { to: '/admin/team', label: 'Équipe', icon: Users },
];

function Sidebar({ me, onNavigate }) {
  const qc = useQueryClient();
  const { data: counts } = useQuery({
    queryKey: ['admin', 'orders', 'counts'],
    queryFn: () => adminApi('/orders', { params: { limit: 1 } }),
    refetchInterval: 60_000,
  });
  const pending = counts?.statusCounts?.pending || 0;

  const logout = async () => {
    await adminApi('/auth/logout', { method: 'POST' });
    qc.clear();
    qc.setQueryData(['admin-me'], null);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="px-6 py-6">
        <Logo />
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV.map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'relative flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition',
                isActive ? 'text-brand-800' : 'text-ink/65 hover:bg-zinc-50 hover:text-ink',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="admin-nav" className="absolute inset-0 rounded-2xl bg-brand-50" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}
                <Icon className="relative size-[18px]" />
                <span className="relative flex-1">{label}</span>
                {badge && pending > 0 && <span className="relative rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">{pending}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-1 border-t border-line p-3">
        <a href="/fr" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm text-ink/65 hover:bg-zinc-50">
          <ExternalLink className="size-[18px]" /> Voir la boutique
        </a>
        <div className="flex items-center gap-3 rounded-2xl px-4 py-3">
          <span className="grid size-9 place-items-center rounded-full bg-brand-500 text-sm font-semibold text-white">{me.name?.[0]?.toUpperCase()}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{me.name}</span>
            <span className="block truncate text-xs text-muted">{me.role === 'owner' ? 'Propriétaire' : 'Administrateur'}</span>
          </span>
          <button type="button" onClick={logout} className="icon-btn size-9 text-muted hover:text-rose-600" aria-label="Déconnexion">
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <Loader2 className="size-6 animate-spin text-brand-500" />
    </div>
  );
}

export default function AdminApp() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { data: me, isLoading } = useQuery({
    queryKey: ['admin-me'],
    queryFn: () => adminApi('/auth/me').catch((err) => (err.status === 401 ? null : Promise.reject(err))),
    staleTime: 5 * 60_000,
  });

  if (isLoading) return <Loading />;

  return (
    <div className="min-h-screen bg-zinc-50/70 font-sans" dir="ltr" lang="fr">
      <title>Administration | So Pure Skin</title>
      <meta name="robots" content="noindex, nofollow" />
      {!me ? (
        <Login />
      ) : (
        <>
          <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-line bg-white lg:block">
            <Sidebar me={me} />
          </aside>
          <AnimatePresence>
            {open && (
              <div className="fixed inset-0 z-50 lg:hidden">
                <motion.div className="absolute inset-0 bg-ink/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
                <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="absolute inset-y-0 left-0 w-72 bg-white">
                  <button type="button" onClick={() => setOpen(false)} className="icon-btn absolute top-5 right-3" aria-label="Fermer">
                    <X className="size-5" />
                  </button>
                  <Sidebar me={me} onNavigate={() => setOpen(false)} />
                </motion.aside>
              </div>
            )}
          </AnimatePresence>
          <div className="lg:pl-72">
            <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-white/85 px-4 backdrop-blur-xl lg:hidden">
              <button type="button" onClick={() => setOpen(true)} className="icon-btn" aria-label="Menu">
                <Menu className="size-5" />
              </button>
              <Link to="/admin">
                <Logo compact />
              </Link>
            </header>
            <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-10">
              <AnimatePresence mode="wait">
                <motion.div key={pathname.split('/').slice(0, 3).join('/')} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <Suspense fallback={<Loading />}>
                    <Routes>
                      <Route index element={<Dashboard />} />
                      <Route path="orders" element={<Orders />} />
                      <Route path="orders/:id" element={<OrderDetail />} />
                      <Route path="products" element={<Products />} />
                      <Route path="products/new" element={<ProductForm />} />
                      <Route path="products/:id" element={<ProductForm />} />
                      <Route path="categories" element={<Taxonomy kind="categories" />} />
                      <Route path="brands" element={<Taxonomy kind="brands" />} />
                      <Route path="reviews" element={<ReviewsPage />} />
                      <Route path="settings" element={<SettingsPage />} />
                      <Route path="team" element={<Team me={me} />} />
                      <Route path="subscribers" element={<Subscribers />} />
                      <Route path="*" element={<Dashboard />} />
                    </Routes>
                  </Suspense>
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
        </>
      )}
    </div>
  );
}
