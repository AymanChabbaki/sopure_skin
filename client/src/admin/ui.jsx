import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, Reorder } from 'motion/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Loader2, X, GripVertical, AlertTriangle, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api.js';
import { cn } from '../lib/format.js';
import { broadcastChange } from '../lib/live.js';

/* --------------------------------- Data --------------------------------- */

export const adminApi = (path, options) => api(`/admin${path}`, options);

/** Admin data stays live: refetched every 15 s while the tab is visible and whenever it regains focus. */
export const LIVE_INTERVAL = 15_000;

/** For edit forms: never refetch in the background, it would overwrite what the admin is typing. */
export const EDITING = { refetchInterval: false, refetchOnWindowFocus: false };

export function useAdminQuery(key, path, params, options) {
  return useQuery({
    queryKey: ['admin', ...key, params],
    queryFn: () => adminApi(path, { params }),
    refetchInterval: LIVE_INTERVAL,
    refetchOnWindowFocus: true,
    ...options,
  });
}

/**
 * Patches every cached admin query whose key starts with `prefix` (e.g. ['admin', 'products'])
 * and returns a function that restores the previous values.
 */
export function patchCache(qc, prefix, updater) {
  const snapshots = qc.getQueriesData({ queryKey: prefix });
  snapshots.forEach(([key, data]) => data !== undefined && qc.setQueryData(key, updater(data)));
  return () => snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
}

/**
 * Mutation that toasts, refreshes every view (this tab and the other open tabs) on success.
 * `optimistic(queryClient, variables)` may update the screen immediately and return a rollback function.
 */
export function useAdminMutation(fn, { success = 'Enregistré', invalidate = [['admin']], onSuccess, optimistic } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onMutate: async (vars) => {
      if (!optimistic) return undefined;
      await qc.cancelQueries({ queryKey: ['admin'] });
      return { rollback: optimistic(qc, vars) };
    },
    onSuccess: (data, vars) => {
      if (success) toast.success(success);
      onSuccess?.(data, vars);
    },
    onError: (err, _vars, context) => {
      context?.rollback?.();
      const details = err.body?.details;
      toast.error(err.body?.error || 'Erreur', {
        description: Array.isArray(details) ? details.map((d) => `${d.path}: ${d.message}`).join('\n') : undefined,
      });
    },
    onSettled: () => {
      invalidate.forEach((queryKey) => qc.invalidateQueries({ queryKey }));
      // Storefront caches too, so changes show up immediately
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'admin' });
      broadcastChange();
    },
  });
}

/* ------------------------------ Status badge ----------------------------- */

export const ORDER_STATUSES = {
  pending: { label: 'En attente', cls: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
  confirmed: { label: 'Confirmée', cls: 'bg-sky-50 text-sky-700 ring-sky-200', dot: 'bg-sky-500' },
  shipped: { label: 'Expédiée', cls: 'bg-violet-50 text-violet-700 ring-violet-200', dot: 'bg-violet-500' },
  delivered: { label: 'Livrée', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  cancelled: { label: 'Annulée', cls: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' },
  returned: { label: 'Retournée', cls: 'bg-zinc-100 text-zinc-700 ring-zinc-200', dot: 'bg-zinc-500' },
};

export function StatusBadge({ status }) {
  const s = ORDER_STATUSES[status] || ORDER_STATUSES.pending;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset', s.cls)}>
      <span className={cn('size-1.5 rounded-full', s.dot)} />
      {s.label}
    </span>
  );
}

/* --------------------------------- Inputs -------------------------------- */

export function Switch({ checked, onChange, label, description }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', checked ? 'bg-brand-500' : 'bg-zinc-200')}
      >
        <motion.span layout transition={{ type: 'spring', stiffness: 700, damping: 30 }} className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow', checked ? 'left-[22px]' : 'left-0.5')} />
      </button>
    </label>
  );
}

const LANGS = [
  ['fr', 'FR'],
  ['en', 'EN'],
  ['ar', 'AR'],
];

/** Edits a {fr, en, ar} object with language tabs. Shows which translations are filled. */
export function I18nInput({ label, value = {}, onChange, multiline = false, rows = 4, required = false, placeholder }) {
  const [lang, setLang] = useState('fr');
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="label mb-0">
          {label} {required && <span className="text-rose-500">*</span>}
        </span>
        <div className="flex gap-1 rounded-full bg-zinc-100 p-0.5">
          {LANGS.map(([code, short]) => (
            <button
              key={code}
              type="button"
              onClick={() => setLang(code)}
              className={cn('relative rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition', lang === code ? 'bg-white text-ink shadow-sm' : 'text-muted')}
            >
              {short}
              {!value[code]?.trim() && code !== 'fr' && <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-amber-400" title="Non traduit" />}
            </button>
          ))}
        </div>
      </div>
      <Tag
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
        rows={multiline ? rows : undefined}
        value={value[lang] || ''}
        placeholder={lang !== 'fr' && value.fr ? `${value.fr.slice(0, 80)}…` : placeholder}
        onChange={(e) => onChange({ ...value, [lang]: e.target.value })}
        className={cn('input', multiline && 'resize-y')}
      />
    </div>
  );
}

export function Field({ label, children, hint, className }) {
  return (
    <div className={className}>
      {label && <span className="label">{label}</span>}
      {children}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Rechercher…', className }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  useEffect(() => {
    const id = setTimeout(() => local !== value && onChange(local), 300);
    return () => clearTimeout(id);
  }, [local]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
      <input value={local} onChange={(e) => setLocal(e.target.value)} placeholder={placeholder} className="input py-2.5 pl-10" type="search" />
    </div>
  );
}

/* ----------------------------- Image uploader ---------------------------- */

const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

/**
 * Serverless hosts cap request bodies (4.5 MB on Vercel): big photos are downscaled
 * in the browser first. The server converts everything to WebP anyway.
 */
async function shrink(file) {
  if (file.size <= MAX_UPLOAD_BYTES || !file.type.startsWith('image/') || file.type === 'image/gif') return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.9));
  return new File([blob], file.name.replace(/\.\w+$/, '.webp'), { type: 'image/webp' });
}

export async function uploadFiles(files, folder = 'products') {
  const ready = await Promise.all([...files].map(shrink));
  // One request per file keeps every body under the serverless limit
  const results = [];
  for (const file of ready) {
    const form = new FormData();
    form.append('files', file);
    results.push(...(await adminApi(`/uploads?folder=${folder}`, { method: 'POST', body: form })));
  }
  return results;
}

/** Drag & drop multi-upload with drag-to-reorder. First image = main image. */
export function ImageUploader({ images, onChange, folder = 'products', multiple = true }) {
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const input = useRef(null);

  const handle = async (files) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const uploaded = await uploadFiles(files, folder);
      onChange(multiple ? [...images, ...uploaded] : uploaded.slice(0, 1));
    } catch (err) {
      toast.error(err.body?.error || 'Échec du téléversement');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <Reorder.Group axis="x" values={images} onReorder={onChange} className="flex flex-wrap gap-3">
          {images.map((img, i) => (
            <Reorder.Item key={img.url} value={img} className="group relative size-28 cursor-grab overflow-hidden rounded-2xl border border-line bg-sand active:cursor-grabbing">
              <img src={img.thumbUrl || img.url} alt="" className="pointer-events-none size-full object-cover" />
              {i === 0 && multiple && <span className="absolute bottom-1.5 left-1.5 rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-medium text-white">Principale</span>}
              <GripVertical className="absolute top-1.5 left-1.5 size-4 text-white opacity-0 drop-shadow transition group-hover:opacity-100" />
              <button
                type="button"
                onClick={() => onChange(images.filter((x) => x.url !== img.url))}
                className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-white/90 text-rose-600 opacity-0 shadow transition group-hover:opacity-100"
                aria-label="Retirer"
              >
                <X className="size-4" />
              </button>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}
      {(multiple || images.length === 0) && (
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            handle(e.dataTransfer.files);
          }}
          className={cn(
            'flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-sm transition',
            over ? 'border-brand-500 bg-brand-50' : 'border-line hover:border-brand-300 hover:bg-brand-50/40',
          )}
        >
          {busy ? <Loader2 className="size-6 animate-spin text-brand-500" /> : <ImagePlus className="size-6 text-brand-500" />}
          <span className="font-medium text-ink">{busy ? 'Téléversement…' : 'Glissez vos images ici ou cliquez'}</span>
          <span className="text-xs text-muted">JPG, PNG, WebP · converties en WebP optimisé · 10 Mo max</span>
        </button>
      )}
      <input ref={input} type="file" accept="image/*" multiple={multiple} hidden onChange={(e) => handle(e.target.files)} />
    </div>
  );
}

/* --------------------------------- Modals -------------------------------- */

export function Modal({ open, onClose, title, children, footer, size = 'max-w-2xl' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
          <motion.div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.98 }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className={cn('relative flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl', size)}
          >
            <header className="flex items-center justify-between border-b border-line px-6 py-4">
              <h2 className="text-lg font-semibold">{title}</h2>
              <button type="button" onClick={onClose} className="icon-btn" aria-label="Fermer">
                <X className="size-5" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto p-6">{children}</div>
            {footer && <footer className="flex justify-end gap-2 border-t border-line px-6 py-4">{footer}</footer>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title = 'Confirmer la suppression', message, confirmLabel = 'Supprimer', loading }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="max-w-md"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="btn bg-rose-600 text-white hover:bg-rose-700" onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />} {confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-600">
          <AlertTriangle className="size-5" />
        </span>
        <p className="text-sm text-muted">{message}</p>
      </div>
    </Modal>
  );
}

/* ------------------------------- Pagination ------------------------------ */

export function Pagination({ page, pages, total, onChange }) {
  if (pages <= 1) return <p className="px-2 py-4 text-xs text-muted">{total} élément(s)</p>;
  return (
    <div className="flex items-center justify-between px-2 py-4 text-sm">
      <p className="text-xs text-muted">
        Page {page} / {pages} · {total} élément(s)
      </p>
      <div className="flex gap-1">
        <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} className="icon-btn size-9 border border-line disabled:opacity-30" aria-label="Précédent">
          <ChevronLeft className="size-4" />
        </button>
        <button type="button" disabled={page >= pages} onClick={() => onChange(page + 1)} className="icon-btn size-9 border border-line disabled:opacity-30" aria-label="Suivant">
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function PageTitle({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export const Card = ({ className, children }) => <div className={cn('rounded-3xl border border-line bg-white', className)}>{children}</div>;

export const money = (v) => `${new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(Number(v) || 0)} DH`;
export const dateTime = (v) => new Intl.DateTimeFormat('fr-MA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));
