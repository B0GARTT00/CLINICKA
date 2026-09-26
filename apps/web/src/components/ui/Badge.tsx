import { Chip, useTheme } from '@mui/material';
import type { ReactNode } from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

export function Badge({ children, variant = 'neutral' }: { children: ReactNode; variant?: BadgeVariant }) {
  const theme = useTheme();

  const variants: Record<BadgeVariant, { color: string; borderColor: string; backgroundColor: string }> = {
    success: {
      color: theme.palette.success.dark,
      borderColor: theme.palette.success.light,
      backgroundColor: alpha(theme.palette.success.main, 0.12),
    },
    warning: {
      color: theme.palette.warning.dark,
      borderColor: theme.palette.warning.light,
      backgroundColor: alpha(theme.palette.warning.main, 0.12),
    },
    danger: {
      color: theme.palette.error.main,
      borderColor: theme.palette.error.light,
      backgroundColor: alpha(theme.palette.error.main, 0.12),
    },
    neutral: {
      color: theme.palette.text.secondary,
      borderColor: theme.palette.divider,
      backgroundColor: theme.palette.background.default,
    },
    info: {
      color: theme.palette.info.main,
      borderColor: theme.palette.info.light,
      backgroundColor: alpha(theme.palette.info.main, 0.12),
    },
  };

  const config = variants[variant];

  return (
    <Chip
      label={children}
      size="small"
      variant="outlined"
      sx={{
        height: 25,
        fontSize: 11,
        fontWeight: 650,
        color: config.color,
        borderColor: config.borderColor,
        backgroundColor: config.backgroundColor,
        '& .MuiChip-label': { display: 'flex', alignItems: 'center', gap: 0.5, px: 1 },
      }}
    />
  );
}

import { alpha } from '@mui/material/styles';