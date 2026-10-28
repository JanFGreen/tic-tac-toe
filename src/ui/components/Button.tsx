import type { ReactNode } from 'react';
import './components.css';

interface ButtonProps {
  children: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export function Button({ children, onClick, variant = 'primary', disabled = false }: ButtonProps) {
  return (
    <button type="button" className={`button button-${variant}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
