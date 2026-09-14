'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export default function TableScrollSlider({ getMidPanes, masterRef }) {
  const trackRef = useRef(null);
  const dragging = useRef(false);
  const [metrics, setMetrics] = useState({ thumbPct: 40, leftPct: 0, needed: false });

  const measure = useCallback(() => {
    const el = masterRef.current;
    if (!el) return;
    const { scrollWidth, clientWidth, scrollLeft } = el;
    const needed = scrollWidth > clientWidth + 2;
    const thumbPct = needed ? Math.max(12, (clientWidth / scrollWidth) * 100) : 100;
    const maxScroll = Math.max(1, scrollWidth - clientWidth);
    const leftPct = needed ? (scrollLeft / maxScroll) * (100 - thumbPct) : 0;
    setMetrics({ thumbPct, leftPct, needed });
  }, [masterRef]);

  useEffect(() => {
    const el = masterRef.current;
    if (!el) return undefined;
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    window.addEventListener('resize', measure);
    return () => {
      el.removeEventListener('scroll', measure);
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [masterRef, measure]);

  const setAllScroll = useCallback(
    left => {
      getMidPanes().forEach(pane => {
        if (pane) pane.scrollLeft = left;
      });
      measure();
    },
    [getMidPanes, measure]
  );

  const scrollFromClientX = useCallback(
    clientX => {
      const el = masterRef.current;
      const track = trackRef.current;
      if (!el || !track) return;
      const rect = track.getBoundingClientRect();
      const thumbW = (metrics.thumbPct / 100) * rect.width;
      const usable = Math.max(1, rect.width - thumbW);
      const x = Math.min(Math.max(clientX - rect.left - thumbW / 2, 0), usable);
      const ratio = x / usable;
      const maxScroll = el.scrollWidth - el.clientWidth;
      setAllScroll(ratio * maxScroll);
    },
    [masterRef, metrics.thumbPct, setAllScroll]
  );

  useEffect(() => {
    const onMove = e => {
      if (!dragging.current) return;
      scrollFromClientX(e.clientX);
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [scrollFromClientX]);

  if (!metrics.needed) {
    return (
      <div className="relative h-2 min-w-0 flex-1" aria-hidden>
        <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-white/10" />
        <div className="absolute inset-x-[8%] top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-linear-to-r from-transparent via-[#3FB185] to-transparent shadow-[0_0_12px_rgba(63,177,133,0.45)]" />
      </div>
    );
  }

  return (
    <div
      className="relative h-2 min-w-0 flex-1 cursor-pointer"
      ref={trackRef}
      role="scrollbar"
      aria-orientation="horizontal"
      aria-controls="cmp-mid-scroller"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(metrics.leftPct)}
      onPointerDown={e => {
        dragging.current = true;
        scrollFromClientX(e.clientX);
      }}
    >
      <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-white/10" aria-hidden />
      <div
        className="absolute top-1/2 h-[6px] -translate-y-1/2 rounded-full bg-gradient-to-r from-[#1B4B38] via-[#3FB185] to-[#3FB185]/70 shadow-[0_0_12px_rgba(63,177,133,0.35)]"
        style={{ width: `${metrics.thumbPct}%`, left: `${metrics.leftPct}%` }}
      />
    </div>
  );
}
