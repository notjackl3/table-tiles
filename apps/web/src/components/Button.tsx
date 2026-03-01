/**
 * Button component with click sound
 */

import React from 'react';
import { playClickSound } from '../utils/clickSound';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  disableClickSound?: boolean;
}

export function Button({ children, onClick, disableClickSound, style, ...props }: ButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Play click sound unless disabled
    if (!disableClickSound && !props.disabled) {
      playClickSound();
    }

    // Call original onClick handler
    if (onClick) {
      onClick(e);
    }
  };

  const [isHovered, setIsHovered] = React.useState(false);

  const combinedStyle: React.CSSProperties = {
    ...style,
    transition: 'all 0.2s ease',
    boxShadow: isHovered && !props.disabled
      ? '0 0 15px 3px rgba(255, 255, 255, 0.6), 0 0 25px 5px rgba(255, 255, 255, 0.3)'
      : style?.boxShadow || 'none',
    outline: isHovered && !props.disabled
      ? '2px solid rgba(255, 255, 255, 0.8)'
      : 'none',
    outlineOffset: '2px',
  };

  return (
    <button
      {...props}
      style={combinedStyle}
      onClick={handleClick}
      onMouseEnter={(e) => {
        setIsHovered(true);
        if (props.onMouseEnter) props.onMouseEnter(e);
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        if (props.onMouseLeave) props.onMouseLeave(e);
      }}
    >
      {children}
    </button>
  );
}
