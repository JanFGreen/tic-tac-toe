import type { ReactNode } from 'react';
import './components.css';

interface PanelProps {
  title?: string;
  children: ReactNode;
}

export function Panel({ title, children }: PanelProps) {
  return (
    <section className="panel">
      {title === undefined ? null : <h2 className="panel-title">{title}</h2>}
      {children}
    </section>
  );
}
