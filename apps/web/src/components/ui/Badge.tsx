import type { ReactNode } from 'react';
import Chip from '@mui/material/Chip';

const variants = {
  success: { color: 'success.dark', borderColor: 'success.light', backgroundColor: '#ECFDF5' },
  warning: { color: '#B76E00', borderColor: '#FDE68A', backgroundColor: '#FFFBEB' },
  danger: { color: 'error.main', borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  neutral: { color: 'text.secondary', borderColor: 'divider', backgroundColor: 'background.default' },
  info: { color: 'info.main', borderColor: '#BFDBFE', backgroundColor: '#EFF6FF' },
};

export function Badge({ children, variant = 'neutral' }: { children: ReactNode; variant?: keyof typeof variants }) {
  return <Chip label={children} size="small" variant="outlined" sx={{ fontSize: 11, ...variants[variant], '& .MuiChip-label': { display: 'flex', alignItems: 'center', gap: 0.5, px: 1 } }} />;
}
