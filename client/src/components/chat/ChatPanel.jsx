import { Fragment, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUp, RotateCcw, X, Plus, Check } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa6';
import { toast } from 'sonner';
import { SosoAvatar } from './SosoAvatar.jsx';
import { useCart } from '../../store/cart.js';
import { useSettings } from '../../hooks/useStore.js';
import { useLocalePath } from '../../hooks/useLocalePath.js';
import { api } from '../../lib/api.js';
import { cn, formatPrice } from '../../lib/format.js';

const STORAGE_KEY = 'sps-chat';

function load() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

/** Minimal formatting: **bold**, "- " / "1. " lists, line breaks. Model output is rendered as text, never HTML. */
function RichText({ text }) {
  const inline = (s) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')}</Fragment>,
    );
  const blocks = [];
  text.split('\n').forEach((line) => {
    const item = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)/);
    if (item) {
      const last = blocks[blocks.length - 1];
      if (last?.type === 'list') last.items.push(item[1]);
      else blocks.push({ type: 'list', items: [item[1]] });
    } else if (line.trim()) blocks.push({ type: 'p', text: line.replace(/^#+\s*/, '') });
  });
  return (
    <div className="space-y-2">
      {blocks.map((b, i) =>
        b.type === 'list' ? (
          <ul key={i} className="space-y-1 ps-4">
            {b.items.map((it, j) => (
              <li key={j} className="list-disc marker:text-brand-400">
                {inline(it)}
              </li>
            ))}
          </ul>
        ) : (
          <p key={i}>{inline(b.text)}</p>
        ),
      )}
    </div>
  );
}

function ProductStrip({ products, onNavigate }) {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const add = useCart((s) => s.add);
  const [added, setAdded] = useState({});
  return (
    <div className="no-scrollbar -mx-1 flex gap-2.5 overflow-x-auto px-1 pt-2 pb-1">
      {products.map((p) => (
        <div key={p.id} className="w-40 shrink-0 overflow-hidden rounded-2xl border border-line bg-white">
          <Link to={lp(`/product/${p.slug}`)} onClick={onNavigate} className="block aspect-square bg-sand">
            {p.images?.[0] && <img src={p.images[0].thumbUrl} alt={p.name} className="size-full object-contain p-2 mix-blend-multiply" loading="lazy" />}
          </Link>
          <div className="p-2.5">
            <p className="text-[10px] tracking-wider text-brand-600 uppercase">{p.brand?.name}</p>
            <Link to={lp(`/product/${p.slug}`)} onClick={onNavigate} className="line-clamp-2 text-xs leading-snug text-ink hover:text-brand-700">
              {p.name}
            </Link>
            <div className="mt-2 flex items-center justify-between gap-1">
              <span className="text-xs font-semibold">{formatPrice(p.price)}</span>
              {p.inStock && (
                <button
                  type="button"
                  onClick={() => {
                    add(p);
                    useCart.setState({ isOpen: false });
                    setAdded((a) => ({ ...a, [p.id]: true }));
                    toast.success(t('assistant.addedToCart'), { description: p.name });
                  }}
                  className={cn('grid size-7 place-items-center rounded-full transition', added[p.id] ? 'bg-emerald-500 text-white' : 'bg-brand-500 text-white hover:bg-brand-600')}
                  aria-label={t('common.addToCart')}
                >
                  {added[p.id] ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ChatPanel({ onClose }) {
  const { t, i18n } = useTranslation();
  const lp = useLocalePath();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { data: settings } = useSettings();
  const add = useCart((s) => s.add);
  const openCart = useCart((s) => s.open);
  const [messages, setMessages] = useState(load);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches;

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    } catch {
      /* storage unavailable */
    }
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  useEffect(() => {
    if (!isMobile) inputRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, isMobile]);

  const runActions = (actions = []) => {
    for (const a of actions) {
      if (a.type === 'add_to_cart') {
        add(a.product, a.quantity);
        useCart.setState({ isOpen: false });
        toast.success(t('assistant.addedToCart'), { description: a.product.name });
      } else if (a.type === 'navigate') {
        navigate(lp(a.path));
        if (isMobile) onClose();
      } else if (a.type === 'open_cart') {
        onClose();
        openCart();
      }
    }
  };

  const send = async (text) => {
    const content = text.trim();
    if (!content || busy) return;
    const next = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const res = await api('/chat', {
        method: 'POST',
        body: {
          locale: i18n.language,
          path: pathname.replace(/^\/(fr|en|ar)/, '') || '/',
          messages: next.map(({ role, content: c }) => ({ role, content: c })).filter((m) => m.content),
        },
      });
      setMessages((m) => [...m, { role: 'assistant', content: res.reply || '…', products: res.products }]);
      runActions(res.actions);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: t('assistant.error'), error: true }]);
    } finally {
      setBusy(false);
    }
  };

  const wa = settings?.contact?.whatsapp;
  const suggestions = t('assistant.suggestions', { returnObjects: true });

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.96 }}
      transition={{ type: 'spring', damping: 26, stiffness: 320 }}
      style={{ transformOrigin: 'bottom left' }}
      className="fixed inset-0 z-[95] flex flex-col overflow-hidden bg-white sm:inset-auto sm:start-6 sm:bottom-6 sm:h-[min(680px,calc(100vh-3rem))] sm:w-[400px] sm:rounded-[2rem] sm:border sm:border-line sm:shadow-2xl"
      role="dialog"
      aria-label={t('assistant.name')}
    >
      {/* Header */}
      <header className="relative overflow-hidden bg-gradient-to-br from-brand-500 to-brand-700 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4 text-white">
        <div aria-hidden className="absolute -end-10 -top-10 size-40 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-full bg-white/95 shadow-inner">
            <SosoAvatar size={44} thinking={busy} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{t('assistant.name')}</p>
            <p className="flex items-center gap-1.5 text-xs text-white/80">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-300" />
              {busy ? t('assistant.thinking') : `${t('assistant.role')} · ${t('assistant.online')}`}
            </p>
          </div>
          {messages.length > 0 && (
            <button type="button" onClick={() => setMessages([])} className="grid size-9 place-items-center rounded-full hover:bg-white/15" aria-label={t('assistant.reset')} title={t('assistant.reset')}>
              <RotateCcw className="size-4" />
            </button>
          )}
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-full hover:bg-white/15" aria-label={t('nav.close')}>
            <X className="size-5" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-brand-50/60 to-white px-4 py-5" aria-live="polite">
        <div className="flex items-end gap-2">
          <SosoAvatar size={30} animated={false} className="shrink-0" />
          <div className="max-w-[85%] rounded-2xl rounded-es-md bg-white px-4 py-3 text-sm leading-relaxed text-ink shadow-sm">{t('assistant.greeting')}</div>
        </div>

        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 ps-9">
            {suggestions.map((s, i) => (
              <motion.button
                key={s}
                type="button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.07 }}
                onClick={() => send(s)}
                className="rounded-full border border-brand-200 bg-white px-3.5 py-2 text-start text-xs text-brand-800 transition hover:border-brand-400 hover:bg-brand-50"
              >
                {s}
              </motion.button>
            ))}
          </div>
        )}

        {messages.map((m, i) =>
          m.role === 'user' ? (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-ee-md bg-brand-500 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-white" dir="auto">
                {m.content}
              </div>
            </motion.div>
          ) : (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2">
              <SosoAvatar size={30} animated={false} className="mt-1 shrink-0" />
              <div className="min-w-0 max-w-[85%]">
                <div className={cn('rounded-2xl rounded-es-md px-4 py-3 text-sm leading-relaxed shadow-sm', m.error ? 'bg-rose-50 text-rose-800' : 'bg-white text-ink')} dir="auto">
                  <RichText text={m.content} />
                </div>
                {m.products?.length > 0 && <ProductStrip products={m.products} onNavigate={() => isMobile && onClose()} />}
                {m.error && wa && (
                  <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#128C7E]">
                    <FaWhatsapp className="size-4" /> {t('assistant.human')}
                  </a>
                )}
              </div>
            </motion.div>
          ),
        )}

        <AnimatePresence>
          {busy && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-end gap-2">
              <SosoAvatar size={30} thinking className="shrink-0" />
              <div className="flex gap-1 rounded-2xl rounded-es-md bg-white px-4 py-3.5 shadow-sm">
                {[0, 1, 2].map((d) => (
                  <motion.span key={d} className="size-2 rounded-full bg-brand-400" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.7, repeat: Infinity, delay: d * 0.15 }} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="border-t border-line bg-white px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-end gap-2 rounded-3xl border border-line bg-zinc-50 p-1.5 ps-4 transition focus-within:border-brand-300 focus-within:bg-white">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            maxLength={1500}
            placeholder={t('assistant.placeholder')}
            className="max-h-28 flex-1 resize-none bg-transparent py-2 text-sm outline-none placeholder:text-muted/70"
            dir="auto"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            type="submit"
            disabled={!input.trim() || busy}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-500 text-white transition hover:bg-brand-600 disabled:bg-zinc-200 disabled:text-zinc-400"
            aria-label={t('assistant.send')}
          >
            <ArrowUp className="size-5" />
          </motion.button>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 px-1 text-[10px] text-muted">
          <span>{t('assistant.disclaimer')}</span>
          {wa && (
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="flex shrink-0 items-center gap-1 font-medium text-[#128C7E] hover:underline">
              <FaWhatsapp className="size-3.5" /> {t('assistant.human')}
            </a>
          )}
        </div>
      </form>
    </motion.div>
  );
}
