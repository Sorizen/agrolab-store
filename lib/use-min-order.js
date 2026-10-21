'use client';

import { useState, useEffect } from 'react';
import { site } from './site.js';

let cached = null;

export function useMinOrder() {
  const [value, setValue] = useState(cached ?? site.minOrderUah);
  useEffect(() => {
    if (cached !== null) { setValue(cached); return; }
    fetch('/api/settings')
      .then((r) => r.json())
      .then((s) => {
        const n = Number(s.min_order);
        if (Number.isFinite(n)) { cached = n; setValue(n); }
      })
      .catch(() => {});
  }, []);
  return value;
}
