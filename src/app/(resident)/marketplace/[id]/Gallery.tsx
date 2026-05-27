'use client';

// Minimal client gallery: 1 main image + clickable thumbnails.
// No lightbox (deferred); using next/image would require remotePatterns
// updates for the Supabase storage host — keep it as a plain <img> until
// /lib/supabase URL host is added in next.config.js.

import { useState } from 'react';

type Props = {
  photos: string[];
  title: string;
};

export default function Gallery({ photos, title }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  if (photos.length === 0) return null;
  const active = photos[activeIdx] ?? photos[0];

  return (
    <div>
      <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={active} alt={title} className="h-full w-full object-cover" />
      </div>
      {photos.length > 1 && (
        <div className="mt-3 flex gap-2">
          {photos.map((url, idx) => (
            <button
              key={url}
              type="button"
              onClick={() => setActiveIdx(idx)}
              aria-label={`Zdjęcie ${idx + 1}`}
              className={`h-16 w-16 overflow-hidden rounded-lg border-2 transition ${
                idx === activeIdx
                  ? 'border-orange-500'
                  : 'border-transparent hover:border-neutral-300 dark:hover:border-neutral-700'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Miniatura ${idx + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
