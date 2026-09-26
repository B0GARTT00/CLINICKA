import { Button } from './button';
import { Modal } from './Modal';

type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'danger';
  isConfirmLoading?: boolean;
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  isConfirmLoading = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description} maxWidth="md">
      <div className="flex items-center justify-end gap-2 px-6 py-4">
        <Button variant="secondary" onClick={onClose} disabled={isConfirmLoading}>
          {cancelLabel}
        </Button>
        <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={isConfirmLoading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
