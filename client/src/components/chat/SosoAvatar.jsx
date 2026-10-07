import { motion } from 'motion/react';

/**
 * Soso, the So Pure Skin assistant: a small teal water drop with a sprout,
 * big sparkling eyes and rosy cheeks. Floats, blinks; looks up when thinking.
 */
export function SosoAvatar({ size = 56, thinking = false, animated = true, className }) {
  const eyeY = thinking ? -2.5 : 0;
  return (
    <motion.svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Soso"
      animate={animated ? { y: [0, -3, 0] } : undefined}
      transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <defs>
        <radialGradient id="soso-body" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#bfeaf2" />
          <stop offset="45%" stopColor="#4fbcd1" />
          <stop offset="100%" stopColor="#1f7f95" />
        </radialGradient>
        <linearGradient id="soso-leaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#9be7b5" />
          <stop offset="100%" stopColor="#3fae74" />
        </linearGradient>
      </defs>

      {/* soft shadow */}
      <ellipse cx="60" cy="112" rx="26" ry="4" fill="#0f2e38" opacity="0.12" />

      {/* sprout */}
      <motion.g
        style={{ originX: '60px', originY: '30px' }}
        animate={animated ? { rotate: [-6, 6, -6] } : undefined}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path d="M60 31 C60 24 60 20 60 16" stroke="#3fae74" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M60 19 C52 10 42 12 40 17 C47 22 55 22 60 19Z" fill="url(#soso-leaf)" />
        <path d="M60 17 C67 7 78 9 80 14 C73 20 65 20 60 17Z" fill="url(#soso-leaf)" />
      </motion.g>

      {/* drop body */}
      <path d="M60 26 C76 44 96 60 96 80 C96 99 80 110 60 110 C40 110 24 99 24 80 C24 60 44 44 60 26Z" fill="url(#soso-body)" />
      {/* glossy highlights */}
      <path d="M40 60 C44 50 50 44 54 40" stroke="#fff" strokeOpacity="0.75" strokeWidth="5" strokeLinecap="round" fill="none" />
      <circle cx="38" cy="70" r="3" fill="#fff" fillOpacity="0.7" />

      {/* cheeks */}
      <ellipse cx="40" cy="88" rx="7" ry="4.2" fill="#ff9fb2" opacity="0.75" />
      <ellipse cx="80" cy="88" rx="7" ry="4.2" fill="#ff9fb2" opacity="0.75" />

      {/* eyes (blink by squashing vertically) */}
      <motion.g
        style={{ originY: '78px' }}
        animate={animated ? { scaleY: [1, 1, 0.1, 1, 1] } : undefined}
        transition={{ duration: 4.2, repeat: Infinity, times: [0, 0.9, 0.93, 0.96, 1] }}
      >
        <motion.g animate={{ y: eyeY }} transition={{ type: 'spring', stiffness: 200, damping: 14 }}>
          <ellipse cx="47" cy="78" rx="6.2" ry="7.4" fill="#10262d" />
          <ellipse cx="73" cy="78" rx="6.2" ry="7.4" fill="#10262d" />
          <circle cx="49.2" cy="75" r="2.4" fill="#fff" />
          <circle cx="75.2" cy="75" r="2.4" fill="#fff" />
          <circle cx="45.5" cy="81" r="1.1" fill="#fff" fillOpacity="0.8" />
          <circle cx="71.5" cy="81" r="1.1" fill="#fff" fillOpacity="0.8" />
        </motion.g>
      </motion.g>

      {/* mouth */}
      {thinking ? (
        <ellipse cx="60" cy="94" rx="3" ry="2.4" fill="#10262d" />
      ) : (
        <path d="M53 91 Q60 98 67 91" stroke="#10262d" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      )}

      {/* sparkle */}
      <motion.path
        d="M94 36 L96 42 L102 44 L96 46 L94 52 L92 46 L86 44 L92 42Z"
        fill="#ffd36e"
        animate={animated ? { scale: [0.6, 1.1, 0.6], opacity: [0.4, 1, 0.4] } : undefined}
        style={{ originX: '94px', originY: '44px' }}
        transition={{ duration: 2.2, repeat: Infinity }}
      />
    </motion.svg>
  );
}
