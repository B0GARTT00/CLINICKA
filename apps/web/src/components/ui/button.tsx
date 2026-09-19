import MuiButton from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import type { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; variant?: 'primary' | 'secondary' | 'danger' };

export function Button({ loading = false, variant = 'primary', className = '', children, disabled, ...props }: Props) {
  return <MuiButton {...props} className={className} disabled={loading || disabled} variant={variant === 'secondary' ? 'outlined' : 'contained'} color={variant === 'danger' ? 'error' : 'primary'} size="small" startIcon={loading ? <CircularProgress size={15} color="inherit" /> : undefined}>{children}</MuiButton>;
}
