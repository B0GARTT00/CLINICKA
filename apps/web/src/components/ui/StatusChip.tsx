import { Chip, type ChipProps } from '@mui/material';
import type { MedicineBatchState } from '../../services/api';

type StateVariant = 'AVAILABLE' | 'EXPIRING_SOON' | 'EXPIRED' | 'DEPLETED' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'IN_CONSULTATION' | 'WAITING' | 'COMPLETED' | 'ARCHIVED' | 'ACTIVE' | 'MANUAL' | 'PUBLISHED' | 'DRAFT' | 'CLEARED' | 'REJECTED' | 'FOR_REVIEW' | 'INCOMPLETE' | 'PENDING' | 'APPROVED' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW' | 'INACTIVE' | 'SUBMITTED' | 'RECORDED' | 'VERIFIED' | 'READ' | 'UNREAD' | 'default';

const stateConfig: Record<StateVariant, { label: string; variant: ChipProps['color'] | 'default' }> = {
  AVAILABLE: { label: 'Available', variant: 'success' },
  EXPIRING_SOON: { label: 'Expiring Soon', variant: 'warning' },
  EXPIRED: { label: 'Expired', variant: 'error' },
  DEPLETED: { label: 'Depleted', variant: 'default' },
  IN_STOCK: { label: 'In Stock', variant: 'success' },
  LOW_STOCK: { label: 'Low Stock', variant: 'warning' },
  OUT_OF_STOCK: { label: 'Out of Stock', variant: 'error' },
  IN_CONSULTATION: { label: 'In Consultation', variant: 'warning' },
  WAITING: { label: 'Waiting', variant: 'default' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  ARCHIVED: { label: 'Archived', variant: 'warning' },
  ACTIVE: { label: 'Active', variant: 'success' },
  MANUAL: { label: 'Manual Entry', variant: 'default' },
  PUBLISHED: { label: 'Published', variant: 'success' },
  DRAFT: { label: 'Draft', variant: 'warning' },
  CLEARED: { label: 'Cleared', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'error' },
  FOR_REVIEW: { label: 'For Review', variant: 'warning' },
  INCOMPLETE: { label: 'Incomplete', variant: 'default' },
  PENDING: { label: 'Pending', variant: 'warning' },
  APPROVED: { label: 'Approved', variant: 'success' },
  CONFIRMED: { label: 'Confirmed', variant: 'info' },
  CANCELLED: { label: 'Cancelled', variant: 'error' },
  NO_SHOW: { label: 'No Show', variant: 'error' },
  INACTIVE: { label: 'Inactive', variant: 'default' },
  SUBMITTED: { label: 'Submitted', variant: 'warning' },
  RECORDED: { label: 'Recorded', variant: 'success' },
  VERIFIED: { label: 'Verified', variant: 'success' },
  READ: { label: 'Read', variant: 'default' },
  UNREAD: { label: 'Unread', variant: 'info' },
  default: { label: 'Unknown', variant: 'default' },
};

interface StatusChipProps extends Omit<ChipProps, 'label' | 'color' | 'variant'> {
  state: MedicineBatchState | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | string;
}

export function StatusChip({ state, ...props }: StatusChipProps) {
  const config = stateConfig[state as StateVariant] ?? stateConfig.default;
  return (
    <Chip
      label={config.label}
      color={config.variant}
      variant="outlined"
      size="small"
      sx={{
        height: 24,
        fontSize: 11,
        fontWeight: 600,
        borderWidth: 1,
        '& .MuiChip-label': { display: 'flex', alignItems: 'center', gap: 0.5, px: 1 },
      }}
      {...props}
    />
  );
}
