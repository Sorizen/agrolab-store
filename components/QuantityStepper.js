'use client';

import { Minus, Plus } from 'lucide-react';

export default function QuantityStepper({ value, onDecrease, onIncrease, decreaseDisabled = false, increaseDisabled = false, size = 'sm', ...rest }) {
    return (
        <div className={`qty-stepper ${size === 'lg' ? 'qty-stepper--lg' : ''}`} role="group" aria-label={`Кількість: ${value}`} {...rest}>
            <button type="button" onClick={onDecrease} disabled={decreaseDisabled} aria-label="Менше" title="Менше"><Minus size={size === 'lg' ? 16 : 14} /></button>
            <span aria-live="polite">{value}</span>
            <button type="button" onClick={onIncrease} disabled={increaseDisabled} aria-label="Більше" title="Більше"><Plus size={size === 'lg' ? 16 : 14} /></button>
        </div>
    );
}
