import MuiCard from '@mui/material/Card';
import type { ReactNode } from 'react';

export function Card({ title, description, action, children, className = '' }: { title?: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <MuiCard className={className} sx={{ borderRadius: 2 }}><div className="flex items-start justify-between border-b border-medical-100 px-5 py-4"><div>{title && <h2 className="text-[11px] font-semibold uppercase tracking-widest text-medical-600">{title}</h2>}{description && <p className="mt-1 text-[13px] text-medical-500">{description}</p>}</div>{action}</div><div>{children}</div></MuiCard>;
}
