import { motion } from 'motion/react';

const variants = {
  hidden: (y) => ({ opacity: 0, y }),
  show: { opacity: 1, y: 0 },
};

/** Fades + lifts children in when they scroll into view. */
export function Reveal({ children, delay = 0, y = 24, className, as = 'div', once = true }) {
  const Component = motion[as];
  return (
    <Component
      className={className}
      custom={y}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: '-60px' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Component>
  );
}

export const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};
