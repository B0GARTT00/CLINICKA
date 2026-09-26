import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  fullScreen?: boolean;
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
  fullScreen = false,
}: ModalProps) {
  const titleId = title ? 'modal-title' : undefined;
  const descriptionId = description ? 'modal-description' : undefined;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={maxWidth}
      fullScreen={fullScreen}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      slotProps={{
        paper: {
          sx: {
            maxHeight: '90vh',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            outline: 'none',
          },
        },
      }}
    >
      {(title || description) && (
        <DialogTitle
          id={titleId}
          component="div"
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            borderBottom: 1,
            borderColor: 'divider',
            px: 3,
            py: 2.25,
          }}
        >
          <div>
            {title && <Typography variant="h6" component="h2" id={titleId}>{title}</Typography>}
            {description && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
                id={descriptionId}
              >
                {description}
              </Typography>
            )}
          </div>
          <IconButton
            onClick={onClose}
            size="small"
            aria-label="Close dialog"
            sx={{ color: 'text.secondary', '&:hover': { backgroundColor: 'action.hover' } }}
          >
            <X size={18} />
          </IconButton>
        </DialogTitle>
      )}
      <DialogContent sx={{ p: 3, overflowY: 'auto' }}>{children}</DialogContent>
    </Dialog>
  );
}