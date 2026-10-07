import { useState } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Wallet, ShoppingCart, Receipt, Clock, Package, Mail, TrendingUp, TrendingDown, AlertTriangle, ArrowRight } from 'lucide-react';
import { Card, PageTitle, StatusBadge, ORDER_STATUSES, useAdminQuery, money, dateTime } from '../ui.jsx';
import { Skeleton } from '../../components/ui/Primitives.jsx';
import { cn } from '../../lib/format.js';

const RANGES = [
  [7, '7 j'],
  [30, '30 j'],
  [90, '90 j'],
  [365, '1 an'],
];

function Delta({ current, previous }) {
  if (!previous) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  const up = pct >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium', up ? 'text-emerald-700' : 'text-rose-700')}>
      <Icon className="size-3.5" /> {up ? '+' : ''}
      {pct}% vs période préc.
    </span>
  );
}

function Stat({ icon: Icon, label, value, sub, delay }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Card className="h-full p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">{label}</span>
          <span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-600">
            <Icon className="size-4" />
          </span>
        </div>
        <p className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{value}</p>
        <div className="mt-1 min-h-4">{sub}</div>
      </Card>
    </motion.div>
  );
}

function ChartTooltip({ active, payload, label, metric }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-soft">
      <p className="text-muted">{new Date(label).toLocaleDateString('fr-MA', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
      <p className="mt-0.5 text-sm font-semibold text-ink">{metric === 'revenue' ? money(payload[0].value) : `${payload[0].value} commande(s)`}</p>
    </div>
  );
}

function BarList({ rows, max, colorFor }) {
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-ink/80">{r.label}</span>
            <span className="font-medium tabular-nums">{r.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${max ? (r.value / max) * 100 : 0}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={cn('h-full rounded-full', colorFor?.(r) || 'bg-brand-500')}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function Dashboard() {
  const [days, setDays] = useState(30);
  const [metric, setMetric] = useState('revenue');
  const { data, isLoading } = useAdminQuery(['dashboard'], '/dashboard', { days });
  const tot = data?.totals;

  const statusRows = Object.keys(ORDER_STATUSES).map((s) => ({
    key: s,
    label: ORDER_STATUSES[s].label,
    value: data?.statuses.find((x) => x.status === s)?.count || 0,
  }));
  const cityRows = (data?.cities || []).map((c) => ({ label: c.city, value: c.orders }));

  return (
    <>
      <PageTitle
        title="Tableau de bord"
        subtitle="Vue d'ensemble de votre boutique"
        actions={
          <div className="flex rounded-full bg-white p-1 ring-1 ring-line" role="group" aria-label="Période">
            {RANGES.map(([d, label]) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={cn('relative rounded-full px-4 py-1.5 text-sm transition', days === d ? 'text-white' : 'text-muted hover:text-ink')}
              >
                {days === d && <motion.span layoutId="range" className="absolute inset-0 rounded-full bg-ink" />}
                <span className="relative">{label}</span>
              </button>
            ))}
          </div>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-36 rounded-3xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat icon={Wallet} label="Chiffre d'affaires" value={money(tot.revenue)} sub={<Delta current={tot.revenue} previous={tot.prev_revenue} />} delay={0} />
            <Stat icon={ShoppingCart} label="Commandes" value={tot.orders} sub={<Delta current={tot.orders} previous={tot.prev_orders} />} delay={0.05} />
            <Stat icon={Receipt} label="Panier moyen" value={money(tot.avg_order)} sub={<span className="text-xs text-muted">Encaissé (livrées) : {money(tot.collected)}</span>} delay={0.1} />
            <Stat
              icon={Clock}
              label="À confirmer"
              value={tot.pending}
              sub={
                tot.pending > 0 && (
                  <Link to="/admin/orders?status=pending" className="text-xs font-medium text-brand-700 hover:underline">
                    Traiter maintenant
                  </Link>
                )
              }
              delay={0.15}
            />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <Card className="p-5 sm:p-6 xl:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold">{metric === 'revenue' ? "Chiffre d'affaires par jour" : 'Commandes par jour'}</h2>
                <div className="flex gap-1 rounded-full bg-zinc-100 p-0.5 text-xs">
                  {[
                    ['revenue', 'CA'],
                    ['orders', 'Commandes'],
                  ].map(([k, l]) => (
                    <button key={k} type="button" onClick={() => setMetric(k)} className={cn('rounded-full px-3 py-1 transition', metric === k ? 'bg-white shadow-sm' : 'text-muted')}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.daily} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#269fb7" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#269fb7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#eef2f3" />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: '#5b6f75' }}
                      tickFormatter={(d) => new Date(d).toLocaleDateString('fr-MA', { day: 'numeric', month: 'short' })}
                      minTickGap={28}
                    />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#5b6f75' }} allowDecimals={false} width={56} />
                    <Tooltip content={<ChartTooltip metric={metric} />} cursor={{ stroke: '#7bcfdf', strokeWidth: 1 }} />
                    <Area type="monotone" dataKey={metric} stroke="#1f7f95" strokeWidth={2} fill="url(#fill)" activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-5 sm:p-6">
              <h2 className="mb-5 font-semibold">Statut des commandes</h2>
              <BarList rows={statusRows} max={Math.max(...statusRows.map((r) => r.value), 1)} colorFor={(r) => ORDER_STATUSES[r.key].dot} />
            </Card>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <Card className="overflow-hidden xl:col-span-2">
              <div className="flex items-center justify-between p-5 sm:p-6">
                <h2 className="font-semibold">Dernières commandes</h2>
                <Link to="/admin/orders" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700">
                  Tout voir <ArrowRight className="size-4" />
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-line">
                    {data.recentOrders.map((o) => (
                      <tr key={o.id} className="transition hover:bg-zinc-50">
                        <td className="px-5 py-3 sm:px-6">
                          <Link to={`/admin/orders/${o.id}`} className="font-medium text-ink hover:text-brand-700">
                            {o.number}
                          </Link>
                          <p className="text-xs text-muted">{dateTime(o.created_at)}</p>
                        </td>
                        <td className="px-3 py-3">
                          {o.customer_name}
                          <p className="text-xs text-muted">{o.city}</p>
                        </td>
                        <td className="px-3 py-3 font-medium whitespace-nowrap">{money(o.total)}</td>
                        <td className="px-5 py-3 text-right sm:px-6">
                          <StatusBadge status={o.status} />
                        </td>
                      </tr>
                    ))}
                    {!data.recentOrders.length && (
                      <tr>
                        <td className="px-6 py-10 text-center text-muted">Aucune commande pour le moment.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="p-5 sm:p-6">
                <h2 className="mb-4 font-semibold">Meilleures ventes</h2>
                <ul className="space-y-3">
                  {data.topProducts.map((p, i) => (
                    <li key={p.product_id ?? i} className="flex items-center gap-3">
                      <span className="w-4 text-xs text-muted">{i + 1}</span>
                      <span className="size-10 shrink-0 overflow-hidden rounded-xl bg-sand">{p.image && <img src={p.image} alt="" className="size-full object-cover" />}</span>
                      <span className="line-clamp-1 flex-1 text-sm">{p.name}</span>
                      <span className="text-xs font-medium text-muted">×{p.quantity}</span>
                    </li>
                  ))}
                  {!data.topProducts.length && <li className="text-sm text-muted">Pas encore de ventes sur la période.</li>}
                </ul>
              </Card>

              <Card className="p-5 sm:p-6">
                <h2 className="mb-4 font-semibold">Villes</h2>
                {cityRows.length ? <BarList rows={cityRows} max={Math.max(...cityRows.map((r) => r.value))} /> : <p className="text-sm text-muted">Aucune donnée.</p>}
              </Card>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Card className="p-5 sm:p-6 lg:col-span-2">
              <h2 className="mb-4 flex items-center gap-2 font-semibold">
                <AlertTriangle className="size-4 text-amber-500" /> Stock faible
              </h2>
              {data.lowStock.length ? (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {data.lowStock.map((p) => (
                    <li key={p.id}>
                      <Link to={`/admin/products/${p.id}`} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-zinc-50">
                        <span className="size-10 shrink-0 overflow-hidden rounded-xl bg-sand">{p.image && <img src={p.image} alt="" className="size-full object-cover" />}</span>
                        <span className="line-clamp-1 flex-1 text-sm">{p.name}</span>
                        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', p.stock === 0 ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700')}>{p.stock}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Tous les produits sont bien approvisionnés.</p>
              )}
            </Card>
            <div className="grid gap-4">
              <Stat icon={Package} label="Produits actifs" value={tot.products} />
              <Stat icon={Mail} label="Abonnés newsletter" value={tot.subscribers} />
            </div>
          </div>
        </>
      )}
    </>
  );
}
