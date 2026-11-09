import type { ImgHTMLAttributes, SyntheticEvent } from 'react';
import { displayImage } from '../lib/displayImage';

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'width'> & {
  src: string;
  width: number;
  srcSetWidths?: number[];
  sizes?: string;
};

/** Foto de catálogo. Si el proxy falla, muestra el archivo original. */
export default function CatalogImage({ src, width, srcSetWidths, sizes, onError, ...rest }: Props) {
  const fallback = (event: SyntheticEvent<HTMLImageElement>) => {
    const el = event.currentTarget;
    onError?.(event);
    if (!src || el.dataset.fallback === '1' || el.src === src) return;
    el.dataset.fallback = '1';
    el.removeAttribute('srcset');
    el.src = src;
  };

  return (
    <img
      {...rest}
      src={displayImage(src, width)}
      srcSet={srcSetWidths?.map((w) => `${displayImage(src, w)} ${w}w`).join(', ')}
      sizes={sizes}
      onError={fallback}
    />
  );
}
