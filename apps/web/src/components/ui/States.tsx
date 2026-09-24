import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { Button } from './button';

export function LoadingState({ label = 'Loading records...' }: { label?: string }) { return <Box role="status" aria-live="polite" sx={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.25, color: 'text.secondary' }}><CircularProgress size={20} aria-hidden="true" /> <Typography variant="body2">{label}</Typography></Box>; }
export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) { return <Box sx={{ minHeight: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', px: 3, py: 3, textAlign: 'center' }}><Typography variant="body2" sx={{ fontWeight: 700 }}>{title}</Typography><Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, maxWidth: 420 }}>{description}</Typography>{action && <Box sx={{ mt: 2 }}>{action}</Box>}</Box>; }
export function ErrorState({ message = 'Unable to load records.', onRetry, retrying = false }: { message?: string; onRetry?: () => void; retrying?: boolean }) { return <Box sx={{ minHeight: 160, display: 'grid', placeItems: 'center', px: 3 }}><Alert severity="error" variant="outlined" action={onRetry ? <Button variant="secondary" loading={retrying} onClick={onRetry}>Retry</Button> : undefined}>{message}</Alert></Box>; }

export function MutationFeedback({ open, message, severity = 'success', onClose }: { open: boolean; message: string; severity?: 'success' | 'error' | 'info' | 'warning'; onClose: () => void }) {
  return <Snackbar open={open} autoHideDuration={5000} onClose={onClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}><Alert severity={severity} variant="filled" onClose={onClose} role={severity === 'error' ? 'alert' : 'status'} sx={{ width: '100%' }}>{message}</Alert></Snackbar>;
}
