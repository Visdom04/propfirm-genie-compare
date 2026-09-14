'use client';

import { useState } from 'react';
import { platformLogo, platformMark } from '@/lib/platformLogos';

export default function PlatformLogo({ name, size = 26, rounded = 'full', className = '' }) {
  const [failed, setFailed] = useState(false);
  const src = failed ? null : platformLogo(name);
  const mark = platformMark(name);
  const radius = rounded === 'md' ? 'rounded-md' : 'rounded-full';

  if (!src) {
    return (
      <span
        title={name}
        className={`grid place-items-center border border-white/15 text-[0.5rem] font-black text-white ${radius} ${mark.tone} ${className}`.trim()}
        style={{ width: size, height: size }}
      >
        {mark.abbr}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      title={name}
      width={size}
      height={size}
      className={`border border-white/15 bg-white object-contain p-px ${radius} ${className}`.trim()}
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}
