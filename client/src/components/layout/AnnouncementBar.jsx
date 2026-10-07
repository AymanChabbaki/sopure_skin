import { Truck, HandCoins, MapPin, BadgeCheck, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../hooks/useStore.js';

const ICONS = [Truck, HandCoins, MapPin, BadgeCheck, Sparkles];

/**
 * Infinite marquee with the admin-managed announcements.
 * The track is rendered twice and translated by -50% for a seamless loop.
 */
export function AnnouncementBar() {
  const { t, i18n } = useTranslation();
  const { data } = useSettings();
  const s = data?.shipping;

  const messages = data?.announcements?.length
    ? data.announcements
    : [
        t('product.freeInfo', { count: s?.freeAboveItems ?? 5 }),
        t('product.codInfo'),
        t('product.deliveryInfo', { casa: s?.casablancaFee ?? 20, other: s?.otherFee ?? 35 }),
      ];

  // Repeat short lists so the track is always wider than the screen
  const base = Array.from({ length: Math.max(2, Math.ceil(6 / messages.length)) }, () => messages).flat();
  const track = (hidden) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {base.map((msg, i) => {
        const Icon = ICONS[i % messages.length % ICONS.length];
        return (
          <li key={i} className="flex items-center gap-2 px-6 whitespace-nowrap sm:px-10" dir={i18n.dir()}>
            <Icon className="size-3.5 shrink-0 text-brand-200" strokeWidth={2} />
            <span>{msg}</span>
            <span className="ms-6 size-1 rounded-full bg-white/40 sm:ms-10" />
          </li>
        );
      })}
    </ul>
  );

  return (
    <div
      className="group relative z-50 overflow-hidden bg-gradient-to-r from-brand-700 via-brand-500 to-brand-700 text-[12px] font-medium tracking-wide text-white sm:text-[13px]"
      role="region"
      aria-label="Announcements"
    >
      <div
        dir="ltr"
        className="flex w-max animate-marquee py-2.5 group-hover:[animation-play-state:paused]"
        style={{ '--marquee-duration': `${base.length * 6}s` }}
      >
        {track(false)}
        {track(true)}
      </div>
      <div className="pointer-events-none absolute inset-y-0 start-0 w-12 bg-gradient-to-r from-brand-700 to-transparent rtl:bg-gradient-to-l" />
      <div className="pointer-events-none absolute inset-y-0 end-0 w-12 bg-gradient-to-l from-brand-700 to-transparent rtl:bg-gradient-to-r" />
    </div>
  );
}
