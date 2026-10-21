import Image from 'next/image';
import { isOptimizable } from '@/lib/images';

export default function Photo({ src, alt = '', sizes, priority = false, width = 640, height = 640, fill = false, className, style, onError }) {
    if (!isOptimizable(src)) {

        return <img src={src} alt={alt} className={className} style={style} onError={onError} loading={priority ? 'eager' : 'lazy'} decoding="async" />;
    }
    const sizing = fill ? { fill: true } : { width, height };
    return <Image src={src} alt={alt} sizes={sizes} priority={priority} className={className} style={style} onError={onError} {...sizing} />;
}
