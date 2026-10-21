'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CopyCode({ code }) {
    const [copied, setCopied] = useState(false);

    async function copy() {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {}
    }

    return (
        <button type="button" className="pd-code" onClick={copy} title="Скопіювати код">
            <span className="pd-code-label">Код</span>
            <span className="pd-code-value">{code}</span>
            {copied ? <Check size={15} /> : <Copy size={15} />}
        </button>
    );
}
