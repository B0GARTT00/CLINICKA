import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

type ModalProps = { open: boolean; onClose: () => void; title?: string; description?: string; children: ReactNode; className?: string };

export function Modal({ open, onClose, title, description, children, className }: ModalProps) {
  return <Dialog open={open} onClose={onClose} fullWidth maxWidth={false} slotProps={{ paper: { className: `w-full max-w-2xl ${className || ''}`, sx: { maxHeight: '90vh', m: 2 } } }}>
    {(title || description) && <DialogTitle component="div" sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider', px: 3, py: 2.25 }}><div>{title && <Typography variant="h6" component="h2">{title}</Typography>}{description && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{description}</Typography>}</div><IconButton onClick={onClose} size="small" aria-label="Close"><X size={18} /></IconButton></DialogTitle>}
    <DialogContent sx={{ p: 0, overflowY: 'auto' }}>{children}</DialogContent>
  </Dialog>;
}
