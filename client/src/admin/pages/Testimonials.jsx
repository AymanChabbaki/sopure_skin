import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ExternalLink, Expand, ImagePlus, Loader2, Trash2, X, Home } from 'lucide-react';
import { toast } from 'sonner';
import { Card, ConfirmDialog, EDITING, PageTitle, adminApi, uploadFiles, useAdminMutation, useAdminQuery } from '../ui.jsx';
import { Skeleton } from '../../components/ui/Primitives.jsx';
import { cn } from '../../lib/format.js';

/** Number of screenshots visible directly on the home page (the rest are in "Voir tous"). */
const HOME_VISIBLE = 8;

export default function Testimonials() {
  const { data, isLoading } = useAdminQuery(['settings'], '/settings', undefined, EDITING);
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [preview, setPreview] = useState(null);
  const input = useRef(null);

  useEffect(() => {
    if (data) setItems(data.testimonials || []);
  }, [data]);

  const save = useAdminMutation((list) => adminApi('/settings/testimonials', { method: 'PUT', body: list }), { success: null });

  // Every change is saved right away (order, additions, deletions)
  const commit = (next, message) => {
    setItems(next);
    save.mutate(
      next.map(({ url, thumbUrl, key, source }) => ({ url, thumbUrl, key, source })),
      { onSuccess: () => message && toast.success(message) },
    );
  };

  const handleFiles = async (files) => {
    const list = [...(files || [])].filter((f) => f.type.startsWith('image/'));
    if (!list.length) return;
    setBusy(true);
    try {
      const uploaded = await uploadFiles(list, 'testimonials', 'temoignage-client-whatsapp');
      commit([...uploaded.map((u, i) => ({ ...u, source: list[i]?.name })), ...items], `${uploaded.length} témoignage(s) ajouté(s)`);
    } catch (err) {
      toast.error(err.body?.error || 'Échec du téléversement');
    } finally {
      setBusy(false);
    }
  };

  const move = (from, to) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    commit(next);
  };

  return (
    <>
      <PageTitle
        title="Témoignages"
        subtitle={`${items.length} capture(s) WhatsApp · les ${HOME_VISIBLE} premières sont affichées directement sur l'accueil`}
        actions={
          <>
            <a href="/fr#temoignages" target="_blank" rel="noreferrer" className="btn-outline py-2.5">
              <ExternalLink className="size-4" /> Voir sur le site
            </a>
            <button type="button" onClick={() => input.current?.click()} disabled={busy} className="btn-primary py-2.5">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />} Ajouter des captures
            </button>
          </>
        }
      />
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => handleFiles(e.target.files)} />

      {/* Drop zone */}
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
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          'mb-6 flex w-full flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed px-6 py-8 text-sm transition',
          over ? 'border-brand-500 bg-brand-50' : 'border-line bg-white hover:border-brand-300 hover:bg-brand-50/40',
        )}
      >
        {busy ? <Loader2 className="size-7 animate-spin text-brand-500" /> : <ImagePlus className="size-7 text-brand-500" />}
        <span className="font-medium text-ink">{busy ? 'Téléversement…' : 'Glissez ici les captures WhatsApp de vos clientes, ou cliquez'}</span>
        <span className="text-xs text-muted">Plusieurs fichiers à la fois · JPG, PNG, WebP · les nouvelles captures arrivent en premier</span>
      </button>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="aspect-[9/17] rounded-3xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center text-muted">Aucun témoignage pour le moment. Ajoutez vos premières captures ci-dessus.</Card>
      ) : (
        <motion.ul layout className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <AnimatePresence initial={false}>
            {items.map((item, i) => (
              <motion.li
                key={item.url}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                className={cn('group relative overflow-hidden rounded-3xl border-4 bg-ink', i < HOME_VISIBLE ? 'border-brand-500' : 'border-ink')}
              >
                <button type="button" onClick={() => setPreview(item)} className="block w-full" aria-label={`Agrandir le témoignage ${i + 1}`}>
                  <img src={item.thumbUrl || item.url} alt={`Témoignage ${i + 1}`} loading="lazy" className="aspect-[9/17] w-full object-cover object-top" />
                </button>
                <span className="absolute top-2 left-2 grid size-7 place-items-center rounded-full bg-white text-xs font-bold text-ink shadow">{i + 1}</span>
                {i < HOME_VISIBLE && (
                  <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-brand-500 px-2 py-1 text-[10px] font-semibold text-white">
                    <Home className="size-3" /> Accueil
                  </span>
                )}
                {/* Controls */}
                <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-1 rounded-2xl bg-white/95 p-1 shadow-soft backdrop-blur sm:opacity-0 sm:transition sm:group-hover:opacity-100">
                  <div className="flex">
                    <button type="button" onClick={() => move(i, 0)} disabled={i === 0} className="icon-btn size-8 disabled:opacity-30" aria-label="Mettre en premier" title="Mettre en premier">
                      <ChevronsLeft className="size-4" />
                    </button>
                    <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} className="icon-btn size-8 disabled:opacity-30" aria-label="Avancer" title="Avancer">
                      <ChevronLeft className="size-4" />
                    </button>
                    <button type="button" onClick={() => move(i, i + 1)} disabled={i === items.length - 1} className="icon-btn size-8 disabled:opacity-30" aria-label="Reculer" title="Reculer">
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                  <div className="flex">
                    <button type="button" onClick={() => setPreview(item)} className="icon-btn size-8" aria-label="Agrandir" title="Agrandir">
                      <Expand className="size-4" />
                    </button>
                    <button type="button" onClick={() => setDeleting(item)} className="icon-btn size-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700" aria-label="Supprimer" title="Supprimer">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}

      {save.isPending && (
        <p className="mt-4 flex items-center gap-2 text-xs text-muted">
          <Loader2 className="size-3.5 animate-spin" /> Enregistrement…
        </p>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          commit(items.filter((t) => t.url !== deleting.url), 'Témoignage supprimé');
          setDeleting(null);
        }}
        title="Supprimer ce témoignage"
        message="La capture sera retirée de la page d'accueil et supprimée du stockage."
      />

      <AnimatePresence>
        {preview && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/85 p-4 backdrop-blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreview(null)}
          >
            <button type="button" className="absolute top-4 right-4 grid size-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Fermer">
              <X className="size-5" />
            </button>
            <motion.img initial={{ scale: 0.95 }} animate={{ scale: 1 }} src={preview.url} alt="" className="max-h-[90vh] max-w-full rounded-3xl shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
