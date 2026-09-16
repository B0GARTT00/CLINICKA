import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

export function LoadingState({ label = 'Loading records...' }: { label?: string }) { return <Box sx={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.25, color: 'text.secondary' }}><CircularProgress size={20} /> <Typography variant="body2">{label}</Typography></Box>; }
export function EmptyState({ title, description }: { title: string; description: string }) { return <Box sx={{ minHeight: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', px: 3, textAlign: 'center' }}><Typography variant="body2" sx={{ fontWeight: 700 }}>{title}</Typography><Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, maxWidth: 420 }}>{description}</Typography></Box>; }
export function ErrorState({ message = 'Unable to load records.' }: { message?: string }) { return <Box sx={{ minHeight: 160, display: 'grid', placeItems: 'center', px: 3 }}><Alert severity="error" variant="outlined">{message}</Alert></Box>; }
