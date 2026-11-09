import type { FC } from 'react';
import scnLogoSmall from '../assets/scn-logo-192.webp';

interface ScnLogoProps {
  className?: string;
  size?: number | string;
}

/** Logo limpio con fondo transparente pre-generado (sin procesar en el navegador). */
export const ScnLogo: FC<ScnLogoProps> = ({ className = '', size = 40 }) => {
  const px = typeof size === 'number' ? size : Number.parseInt(String(size), 10) || 40;

  return (
    <img
      src={scnLogoSmall}
      alt="SCN"
      width={px}
      height={px}
      decoding="async"
      className={`select-none object-contain ${className}`}
      style={{ width: px, height: px }}
      draggable={false}
    />
  );
};
