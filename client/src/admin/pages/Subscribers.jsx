import { Download, Trash2 } from 'lucide-react';
import { Card, PageTitle, adminApi, useAdminMutation, useAdminQuery, dateTime } from '../ui.jsx';

export default function Subscribers() {
  const { data = [] } = useAdminQuery(['subscribers'], '/subscribers');
  const remove = useAdminMutation((id) => adminApi(`/subscribers/${id}`, { method: 'DELETE' }), { success: 'Abonné retiré' });

  const exportCsv = () => {
    const csv = ['email,langue,date', ...data.map((s) => `${s.email},${s.locale},${s.createdAt}`)].join('\n');
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'newsletter.csv' });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageTitle
        title="Newsletter"
        subtitle={`${data.length} abonné(s)`}
        actions={
          <button type="button" onClick={exportCsv} disabled={!data.length} className="btn-outline py-2.5">
            <Download className="size-4" /> Exporter CSV
          </button>
        }
      />
      <Card className="divide-y divide-line">
        {data.map((s) => (
          <div key={s.id} className="flex items-center gap-4 px-5 py-3.5 text-sm">
            <span className="flex-1 truncate font-medium">{s.email}</span>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs uppercase">{s.locale}</span>
            <span className="hidden text-muted sm:inline">{dateTime(s.createdAt)}</span>
            <button type="button" onClick={() => remove.mutate(s.id)} className="icon-btn size-8 text-muted hover:text-rose-600" aria-label="Retirer">
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        {!data.length && <p className="p-10 text-center text-muted">Aucun abonné pour le moment.</p>}
      </Card>
    </>
  );
}
