import { Chip, type ChipProps } from '@mui/material';
import type { MedicineBatchState } from '../../services/api';

type StateVariant = 'AVAILABLE' | 'EXPIRING_SOON' | 'EXPIRED' | 'DEPLETED' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'default';

const stateConfig: Record<StateVariant, { label: string; variant: ChipProps['color'] | 'default' }> = {
  AVAILABLE: { label: 'Available', variant: 'success' },
  EXPIRING_SOON: { label: 'Expiring Soon', variant: 'warning' },
  EXPIRED: { label: 'Expired', variant: 'error' },
  DEPLETED: { label: 'Depleted', variant: 'default' },
  IN_STOCK: { label: 'In Stock', variant: 'success' },
  LOW_STOCK: { label: 'Low Stock', variant: 'warning' },
  OUT_OF_STOCK: { label: 'Out of Stock', variant: 'error' },
  default: { label: 'Unknown', variant: 'default' },
};

interface StatusChipProps extends Omit<ChipProps, 'label' | 'color' | 'variant'> {
  state: MedicineBatchState | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | string;
  showIcon?: boolean;
}

export function StatusChip({ state, showIcon = true, ...props }: StatusChipProps) {
  const config = stateConfig[state as StateVariant] ?? stateConfig.default;
  return (
    <Chip
      label={config.label}
      color={config.variant}
      variant="outlined"
      size="small"
      icon={showIcon ? undefined : undefined}
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