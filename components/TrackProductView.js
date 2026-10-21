'use client';

import { useEffect } from 'react';
import { trackViewItem } from '@/lib/analytics';

export default function TrackProductView({ product }) {
    useEffect(() => { trackViewItem(product); }, [product.id]);
    return null;
}
