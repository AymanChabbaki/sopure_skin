import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Wallet, ShoppingCart, Package, Receipt, Ban, CalendarClock, Trophy, ArrowUpDown, Download, CalendarRange } from 'lucide-react';
import { Card, PageTitle, SearchInput, useAdminQuery, money } from '../ui.jsx';
import { Skeleton } from '../../components/ui/Primitives.jsx';
import { cn } from '../../lib/format.js';

/* ------------------------------- Date ranges ------------------------------- */

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return iso(d);
};

const PRESETS = [
  { id: 'today', label: "Aujourd'hui", range: () => ({ from: daysAgo(0), to: daysAgo(0) }) },
  { id: 'yesterday', label: 'Hier', range: () => ({ from: daysAgo(1), to: daysAgo(1) }) },
  { id: '7d', label: '7 jours', range: () => ({ from: daysAgo(6), to: daysAgo(0) }) },
  { id: '30d', label: '30 jours', range: () => ({ from: daysAgo(29), to: daysAgo(0) }) },
  { id: 'custom', label: 'Personnalisé' },
  { id: 'all', label: 'Depuis le début', range: () => ({}) },
];

const fmtDay = (v, unit) =>
  unit === 'month'
    ? new Date(`${v}-01`).toLocaleDateString('fr-MA', { month: 'short', year: '2-digit' })
    : new Date(v).toLocaleDateString('fr-MA', { day: 'numeric', month: 'short' });

const fmtRange = (from, to) => {
  const f = (v) => new Date(v).toLocaleDateString('fr-MA', { day: 'numeric', month: 'long', year: 'numeric' });
  return from === to ? f(from) : `du ${f(from)} au ${f(to)}`;
};

/* ------------------------------- Expiry helper ------------------------------ */

const today = () => new Date(new Date().toDateString());
function expiry(expiresAt) {
  if (!expiresAt) return null;
  const days = Math.ceil((new Date(expiresAt) - today()) / 86400000);
  const level = days < 0 ? 'expired' : days <= 90 ? 'soon' : 'ok';
  return { days, level };
}
const EXPIRY_STYLE = {
  expired: 'bg-rose-50 text-rose-700 ring-rose-200',
  soon: 'bg-amber-50 text-amber-800 ring-amber-200',
  ok: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
};

function ExpiryBadge({ expiresAt }) {
  const e = expiry(expiresAt);
  if (!e) return <span className="text-xs text-muted">—</span>;
  const label = e.level === 'expired' ? `Expiré (${-e.days} j)` : e.days === 0 ? "Aujourd'hui" : `${e.days} j`;
  return (
    <span className={cn('inline-flex flex-col rounded-xl px-2 py-1 text-xs ring-1', EXPIRY_STYLE[e.level])}>
      <span className="font-medium">{new Date(expiresAt).toLocaleDateString('fr-MA', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
      <span className="text-[10px] opacity-80">{label}</span>
    </span>
  );
}

/* --------------------------------- Pieces ---------------------------------- */

function Kpi({ icon: Icon, label, value, sub, delay, tone = 'brand' }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Card className="h-full p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">{label}</span>
          <span className={cn('grid size-9 place-items-center rounded-xl', tone === 'rose' ? 'bg-rose-50 text-rose-600' : 'bg-brand-50 text-brand-600')}>
            <Icon className="size-4" />
          </span>
        </div>
        <p className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{value}</p>
        {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
      </Card>
    </motion.div>
  );
}

function ChartTip({ active, payload, label, metric, unit }) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-soft">
      <p className="text-muted">{fmtDay(label, unit)}</p>
      <p className="mt-0.5 text-sm font-semibold text-ink">{metric === 'revenue' ? money(v) : `${v} ${metric === 'units' ? 'produit(s)' : 'commande(s)'}`}</p>
    </div>
  );
}

function Empty({ children = 'Aucune vente sur la période.' }) {
  return <p className="py-10 text-center text-sm text-muted">{children}</p>;
}

const COLORS = ['#1f8aa0', '#269fb7', '#47b3c8', '#6cc4d5', '#93d5e2', '#b4e2ec', '#cdeef4', '#dff4f8', '#e9f8fb', '#f1fbfd'];

/* ------------------------------ Products table ------------------------------ */

const FILTERS = [
  ['all', 'Tous'],
  ['sold', 'Vendus'],
  ['unsold', 'Non vendus'],
  ['soon', 'Expiration ≤ 90 j'],
  ['expired', 'Expirés'],
  ['out', 'Rupture'],
];

const SORTS = {
  units: (p) => p.units,
  revenue: (p) => p.revenue,
  orders: (p) => p.orders,
  stock: (p) => p.stock,
  lifetimeUnits: (p) => p.lifetimeUnits,
  expiresAt: (p) => (p.expiresAt ? new Date(p.expiresAt).getTime() : Infinity),
  name: (p) => p.name,
};

function ProductsTable({ products, from, to }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState({ key: 'units', dir: -1 });
  const [shown, setShown] = useState(25);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = products.filter((p) => {
      if (term && !`${p.name} ${p.brand || ''}`.toLowerCase().includes(term)) return false;
      const e = expiry(p.expiresAt);
      if (filter === 'sold') return p.units > 0;
      if (filter === 'unsold') return p.units === 0;
      if (filter === 'soon') return e?.level === 'soon';
      if (filter === 'expired') return e?.level === 'expired';
      if (filter === 'out') return p.stock === 0;
      return true;
    });
    const get = SORTS[sort.key];
    return list.sort((a, b) => {
      const x = get(a);
      const y = get(b);
      return (typeof x === 'string' ? x.localeCompare(y) : x - y) * sort.dir;
    });
  }, [products, q, filter, sort]);

  const counts = useMemo(
    () => ({
      soon: products.filter((p) => expiry(p.expiresAt)?.level === 'soon').length,
      expired: products.filter((p) => expiry(p.expiresAt)?.level === 'expired').length,
      out: products.filter((p) => p.stock === 0).length,
    }),
    [products],
  );

  const exportCsv = () => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = ['Produit', 'Marque', 'Prix', 'Stock', 'Vendus (période)', 'CA (période)', 'Commandes (période)', 'Vendus (total)', 'Expiration'];
    const body = rows.map((p) => [p.name, p.brand, p.price, p.stock, p.units, p.revenue, p.orders, p.lifetimeUnits, p.expiresAt].map(esc).join(','));
    const blob = new Blob([`﻿${head.join(',')}\n${body.join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `statistiques-produits-${from}-${to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const Th = ({ k, children, className }) => (
    <th className={cn('px-3 py-3 font-medium', className)}>
      <button
        type="button"
        onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? -s.dir : k === 'name' || k === 'expiresAt' ? 1 : -1 }))}
        className={cn('inline-flex items-center gap-1 whitespace-nowrap hover:text-ink', sort.key === k && 'text-ink')}
      >
        {children} <ArrowUpDown className="size-3" />
      </button>
    </th>
  );

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-semibold">Tous les produits</h2>
          <p className="text-xs text-muted">Ventes sur la période · stock et expiration actuels</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={q} onChange={setQ} placeholder="Produit ou marque…" className="w-56" />
          <button type="button" onClick={exportCsv} className="btn-outline px-4 py-2.5 text-sm">
            <Download className="size-4" /> CSV
          </button>
        </div>
      </div>
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto border-b border-line px-5 py-3">
        {FILTERS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setFilter(id);
              setShown(25);
            }}
            className={cn('shrink-0 rounded-full px-3.5 py-1.5 text-xs transition', filter === id ? 'bg-ink text-white' : 'bg-zinc-100 text-ink/70 hover:bg-zinc-200')}
          >
            {label}
            {counts[id] > 0 && <span className={cn('ms-1.5 rounded-full px-1.5 text-[10px]', filter === id ? 'bg-white/20' : id === 'expired' || id === 'out' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800')}>{counts[id]}</span>}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-zinc-50 text-start text-xs text-muted">
            <tr className="[&>th]:text-start">
              <Th k="name">Produit</Th>
              <Th k="stock">Stock</Th>
              <Th k="units">Vendus</Th>
              <Th k="revenue">CA</Th>
              <Th k="orders">Commandes</Th>
              <Th k="lifetimeUnits">Total vendu</Th>
              <Th k="expiresAt">Expiration</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.slice(0, shown).map((p) => (
              <tr key={p.id} className={cn('transition hover:bg-brand-50/40', !p.isActive && 'opacity-60')}>
                <td className="px-3 py-2.5">
                  <Link to={`/admin/products/${p.id}`} className="flex items-center gap-3">
                    <span className="size-10 shrink-0 overflow-hidden rounded-xl bg-sand">{p.image && <img src={p.image} alt="" className="size-full object-contain p-0.5 mix-blend-multiply" loading="lazy" />}</span>
                    <span className="min-w-0">
                      <span className="line-clamp-1 font-medium text-ink hover:text-brand-700">{p.name}</span>
                      <span className="text-xs text-muted">
                        {p.brand || 'Sans marque'} · {money(p.price)}
                        {!p.isActive && ' · masqué'}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-2.5 tabular-nums">
                  <span className={cn(p.stock === 0 && 'font-medium text-rose-700')}>{p.stock}</span>
                  {p.hasSizes && (
                    <span className="mt-0.5 block text-[10px] text-muted">
                      {p.sizes
                        .filter((z) => z.enabled)
                        .map((z) => `${z.label}: ${z.stock}`)
                        .join(' · ')}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 font-medium tabular-nums">{p.units || <span className="text-muted">0</span>}</td>
                <td className="px-3 py-2.5 tabular-nums">{p.revenue ? money(p.revenue) : <span className="text-muted">—</span>}</td>
                <td className="px-3 py-2.5 tabular-nums">{p.orders || <span className="text-muted">0</span>}</td>
                <td className="px-3 py-2.5 tabular-nums text-muted">{p.lifetimeUnits}</td>
                <td className="px-3 py-2.5">
                  <ExpiryBadge expiresAt={p.expiresAt} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <Empty>Aucun produit ne correspond.</Empty>}
      </div>
      {rows.length > shown && (
        <div className="border-t border-line p-4 text-center">
          <button type="button" onClick={() => setShown((n) => n + 50)} className="btn-outline px-5 py-2 text-sm">
            Afficher plus ({rows.length - shown} restants)
          </button>
        </div>
      )}
    </Card>
  );
}

/* ---------------------------------- Page ----------------------------------- */

export default function Statistics() {
  const [preset, setPreset] = useState('30d');
  const [custom, setCustom] = useState({ from: daysAgo(29), to: daysAgo(0) });
  const [metric, setMetric] = useState('revenue');

  const params = preset === 'custom' ? custom : PRESETS.find((p) => p.id === preset).range();
  const valid = preset !== 'custom' || (custom.from && custom.to && custom.from <= custom.to);
  const { data, isLoading } = useAdminQuery(['stats'], '/stats', params, { enabled: Boolean(valid), placeholderData: (prev) => prev });
  const s = data?.summary;

  const expiring = useMemo(
    () =>
      (data?.products || [])
        .map((p) => ({ ...p, exp: expiry(p.expiresAt) }))
        .filter((p) => p.exp && p.exp.level !== 'ok')
        .sort((a, b) => a.exp.days - b.exp.days),
    [data],
  );
  const maxUnits = Math.max(...(data?.topProducts || []).map((p) => p.units), 1);

  return (
    <>
      <PageTitle title="Statistiques" subtitle={data ? `Période : ${fmtRange(data.from, data.to)}` : 'Ventes, produits et expirations'} />

      {/* Period selector */}
      <Card className="mb-6 flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar flex gap-1 overflow-x-auto" role="group" aria-label="Période">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPreset(p.id)}
              className={cn('relative shrink-0 rounded-full px-4 py-2 text-sm transition', preset === p.id ? 'text-white' : 'text-muted hover:text-ink')}
            >
              {preset === p.id && <motion.span layoutId="stats-range" className="absolute inset-0 rounded-full bg-ink" />}
              <span className="relative">{p.label}</span>
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-sm">
            <CalendarRange className="size-4 text-muted" />
            <input type="date" value={custom.from} max={custom.to || undefined} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} className="input w-auto py-2" aria-label="Du" />
            <span className="text-muted">→</span>
            <input type="date" value={custom.to} min={custom.from || undefined} max={daysAgo(0)} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} className="input w-auto py-2" aria-label="Au" />
          </motion.div>
        )}
      </Card>

      {isLoading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-32 rounded-3xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Kpi icon={Wallet} label="Chiffre d'affaires" value={money(s.revenue)} sub={`Encaissé (livrées) : ${money(s.collected)}`} delay={0} />
            <Kpi icon={ShoppingCart} label="Commandes" value={s.orders} delay={0.05} />
            <Kpi icon={Package} label="Produits vendus" value={s.units} delay={0.1} />
            <Kpi icon={Receipt} label="Panier moyen" value={money(s.avg_order)} delay={0.15} />
            <Kpi icon={Ban} label="Annulées / retournées" value={s.cancelled} tone="rose" delay={0.2} />
          </div>

          {/* Timeline */}
          <Card className="p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">Évolution {data.unit === 'month' ? 'par mois' : 'par jour'}</h2>
              <div className="flex rounded-full bg-zinc-100 p-1 text-xs">
                {[
                  ['revenue', 'CA'],
                  ['orders', 'Commandes'],
                  ['units', 'Produits'],
                ].map(([k, l]) => (
                  <button key={k} type="button" onClick={() => setMetric(k)} className={cn('rounded-full px-3 py-1 transition', metric === k ? 'bg-white shadow-sm' : 'text-muted')}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.timeline} margin={{ left: -10, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="statsFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#269fb7" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#269fb7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f3" />
                  <XAxis dataKey="date" tickFormatter={(v) => fmtDay(v, data.unit)} tick={{ fontSize: 11, fill: '#6b7c80' }} axisLine={false} tickLine={false} minTickGap={24} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7c80' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTip metric={metric} unit={data.unit} />} />
                  <Area type="monotone" dataKey={metric} stroke="#269fb7" strokeWidth={2.5} fill="url(#statsFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid gap-6 xl:grid-cols-5">
            {/* Top products */}
            <Card className="p-5 sm:p-6 xl:col-span-3">
              <h2 className="mb-4 flex items-center gap-2 font-semibold">
                <Trophy className="size-4 text-amber-500" /> Top produits vendus
              </h2>
              {data.topProducts.length === 0 ? (
                <Empty />
              ) : (
                <ol className="space-y-3">
                  {data.topProducts.map((p, i) => (
                    <li key={p.productId ?? p.name} className="flex items-center gap-3">
                      <span className={cn('grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold', i === 0 ? 'bg-amber-100 text-amber-800' : i < 3 ? 'bg-brand-50 text-brand-700' : 'bg-zinc-100 text-muted')}>{i + 1}</span>
                      <span className="size-11 shrink-0 overflow-hidden rounded-xl bg-sand">{p.image && <img src={p.image} alt="" className="size-full object-contain p-0.5 mix-blend-multiply" />}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between gap-3 text-sm">
                          {p.productId ? (
                            <Link to={`/admin/products/${p.productId}`} className="truncate hover:text-brand-700">
                              {p.name}
                            </Link>
                          ) : (
                            <span className="truncate">{p.name}</span>
                          )}
                          <span className="shrink-0 font-semibold tabular-nums">{p.units}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-3">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${(p.units / maxUnits) * 100}%` }} transition={{ duration: 0.7, delay: i * 0.04 }} className="h-full rounded-full bg-brand-500" />
                          </div>
                          <span className="w-20 shrink-0 text-end text-xs text-muted tabular-nums">{money(p.revenue)}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Card>

            {/* Expiry watch */}
            <Card className="p-5 sm:p-6 xl:col-span-2">
              <h2 className="mb-4 flex items-center gap-2 font-semibold">
                <CalendarClock className="size-4 text-rose-500" /> Expirations à surveiller
              </h2>
              {expiring.length === 0 ? (
                <Empty>Aucun produit expiré ou expirant dans les 90 jours. Renseignez les dates dans chaque fiche produit.</Empty>
              ) : (
                <ul className="max-h-[420px] space-y-2 overflow-y-auto pe-1">
                  {expiring.map((p) => (
                    <li key={p.id}>
                      <Link to={`/admin/products/${p.id}`} className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-zinc-50">
                        <span className="size-10 shrink-0 overflow-hidden rounded-xl bg-sand">{p.image && <img src={p.image} alt="" className="size-full object-contain p-0.5 mix-blend-multiply" />}</span>
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-1 text-sm">{p.name}</span>
                          <span className="text-xs text-muted">Stock : {p.stock}</span>
                        </span>
                        <ExpiryBadge expiresAt={p.expiresAt} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            {/* Top categories */}
            <Card className="p-5 sm:p-6">
              <h2 className="mb-4 font-semibold">Top catégories (produits vendus)</h2>
              {data.topCategories.length === 0 ? (
                <Empty />
              ) : (
                <div style={{ height: Math.max(data.topCategories.length * 38, 160) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.topCategories} layout="vertical" margin={{ left: 0, right: 24 }}>
                      <XAxis type="number" hide allowDecimals={false} />
                      <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12, fill: '#33464b' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: '#f2fafc' }}
                        formatter={(v, _n, item) => [`${v} vendu(s) · ${money(item.payload.revenue)}`, '']}
                        separator=""
                        contentStyle={{ borderRadius: 12, border: '1px solid #e5eced', fontSize: 12 }}
                      />
                      <Bar dataKey="units" radius={[0, 8, 8, 0]} barSize={22} label={{ position: 'right', fontSize: 11, fill: '#6b7c80' }}>
                        {data.topCategories.map((c, i) => (
                          <Cell key={c.slug} fill={COLORS[i] || COLORS.at(-1)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            {/* Top brands */}
            <Card className="p-5 sm:p-6">
              <h2 className="mb-4 font-semibold">Top marques</h2>
              {data.topBrands.length === 0 ? (
                <Empty />
              ) : (
                <ul className="space-y-3">
                  {data.topBrands.map((b, i) => (
                    <li key={b.name}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-ink/80">{b.name}</span>
                        <span className="tabular-nums">
                          <span className="font-medium">{b.units}</span> <span className="text-xs text-muted">· {money(b.revenue)}</span>
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${(b.units / data.topBrands[0].units) * 100}%` }} transition={{ duration: 0.7, delay: i * 0.05 }} className="h-full rounded-full bg-brand-400" />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <ProductsTable products={data.products} from={data.from} to={data.to} />
        </div>
      )}
    </>
  );
}
