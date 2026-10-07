import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Globe } from 'lucide-react';
import { LOCALES, LOCALE_LABELS, LOCALE_SHORT } from '../../i18n/index.js';
import { cn } from '../../lib/format.js';

export function useSwitchLocale() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  return (lng) => {
    const rest = pathname.replace(/^\/(fr|en|ar)(?=\/|$)/, '');
    navigate(`/${lng}${rest}${search}`);
  };
}

export function LanguageSwitcher({ variant = 'dropdown' }) {
  const { t, i18n } = useTranslation();
  const switchTo = useSwitchLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('pointerdown', onClick);
    return () => document.removeEventListener('pointerdown', onClick);
  }, []);

  if (variant === 'pills') {
    return (
      <div className="flex gap-2" role="group" aria-label={t('common.language')}>
        {LOCALES.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => switchTo(l)}
            className={cn(
              'flex-1 rounded-full border px-3 py-2 text-sm transition',
              i18n.language === l ? 'border-brand-500 bg-brand-500 text-white' : 'border-line hover:border-brand-300',
            )}
          >
            {LOCALE_LABELS[l]}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="icon-btn w-auto gap-1.5 px-2.5 text-xs font-semibold"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('common.language')}
      >
        <Globe className="size-[18px]" />
        <span className="hidden sm:inline">{LOCALE_SHORT[i18n.language]}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="absolute end-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-2xl border border-line bg-white p-1.5 shadow-soft"
          >
            {LOCALES.map((l) => (
              <li key={l}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i18n.language === l}
                  onClick={() => {
                    switchTo(l);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm hover:bg-brand-50"
                >
                  <span className={l === 'ar' ? 'font-[family-name:var(--font-arabic)]' : ''}>{LOCALE_LABELS[l]}</span>
                  {i18n.language === l && <Check className="size-4 text-brand-600" />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
