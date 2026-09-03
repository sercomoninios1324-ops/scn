import React from 'react';
import scnLogoSrc from '../assets/scn-logo.png';

interface ScnLogoProps {
  className?: string;
  size?: number | string;
}

export const ScnLogo: React.FC<ScnLogoProps> = ({ className = '', size = 40 }) => {
  return (
    <img
      src={scnLogoSrc}
      alt="SCN Logo"
      width={size}
      height={size}
      className={`${className} select-none transition-all duration-300 object-contain`}
      style={{ width: size, height: size }}
    />
  );
};
