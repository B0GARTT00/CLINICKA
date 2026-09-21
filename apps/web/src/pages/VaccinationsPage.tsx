import { Alert, Box } from '@mui/material';
import { ScreeningsPage } from './ScreeningsPage';
import { VaccinationHistoryPage } from './VaccinationHistoryPage';

/**
 * Compatibility view retained for older links and tests. The application now
 * exposes vaccination history and health screening as focused routes, while
 * this view composes those maintained workflows instead of duplicating them.
 */
export function VaccinationsPage() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Alert severity="info">
        Vaccination history and health screenings are maintained as separate clinical records.
      </Alert>
      <VaccinationHistoryPage />
      <ScreeningsPage />
    </Box>
  );
}
