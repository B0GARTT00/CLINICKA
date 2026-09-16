import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <Box component="header" sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, alignItems: { sm: 'flex-end' }, justifyContent: 'space-between' }}><Box>{eyebrow && <Typography variant="overline" color="primary" sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em' }}>{eyebrow}</Typography>}<Typography component="h1" variant="h5" sx={{ mt: 0.25, fontSize: 22 }}>{title}</Typography>{description && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: 13 }}>{description}</Typography>}</Box>{action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}</Box>;
}
