import type { ReactNode } from 'react';
import Chip from '@mui/material/Chip';

const variants = {
  success: { color: '#047857', borderColor: '#a7f3d0', backgroundColor: '#ecfdf5' },
  warning: { color: '#b45309', borderColor: '#fde68a', backgroundColor: '#fffbeb' },
  danger: { color: '#be123c', borderColor: '#fecdd3', backgroundColor: '#fff1f2' },
  neutral: { color: '#52615b', borderColor: '#e2e8e6', backgroundColor: '#f6f9fb' },
  info: { color: '#0369a1', borderColor: '#bae6fd', backgroundColor: '#f0f9ff' },
};

export function Badge({ children, variant = 'neutral' }: { children: ReactNode; variant?: keyof typeof variants }) {
  return <Chip label={children} size="small" variant="outlined" sx={{ height: 25, fontSize: 11, fontWeight: 650, ...variants[variant], '& .MuiChip-label': { display: 'flex', alignItems: 'center', gap: 0.5, px: 1 } }} />;
}
