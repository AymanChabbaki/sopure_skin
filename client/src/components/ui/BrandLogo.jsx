import { useState } from 'react';
import { cn } from '../../lib/format.js';

/**
 * Brand logo with optical sizing: every logo gets roughly the same visual area,
 * so wide wordmarks and compact monograms look balanced side by side.
 * `area` is the target surface in px² (height × width).
 */
export function BrandLogo({ brand, area = 3200, maxHeight = 56, className }) {
  const [size, setSize] = useState(null);

  if (!brand.logo) {
    return <span className={cn('font-display text-2xl whitespace-nowrap', className)}>{brand.name}</span>;
  }

  const onLoad = (e) => {
    const ratio = e.currentTarget.naturalWidth / e.currentTarget.naturalHeight || 3;
    const height = Math.min(Math.sqrt(area / ratio), maxHeight);
    setSize({ height, width: height * ratio });
  };

  return (
    <img
      src={brand.logo}
      alt={brand.name}
      loading="lazy"
      decoding="async"
      draggable={false}
      onLoad={onLoad}
      style={size ? { height: size.height, width: size.width } : { height: 28 }}
      className={cn('max-w-none object-contain transition', !size && 'opacity-0', className)}
    />
  );
}
