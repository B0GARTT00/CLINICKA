import MuiCard from '@mui/material/Card';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

export function Card({ title, description, action, children, className = '' }: { title?: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <MuiCard className={className}><Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, px: 2.5, py: 2, borderBottom: 1, borderColor: 'divider' }}><Box>{title && <Typography component="h2" sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'primary.main' }}>{title}</Typography>}{description && <Typography variant="body2" color="text.secondary" sx={{ mt: .5, fontSize: 13 }}>{description}</Typography>}</Box>{action}</Box><div>{children}</div></MuiCard>;
}
