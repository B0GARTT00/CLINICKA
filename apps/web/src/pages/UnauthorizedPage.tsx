import { ArrowLeft, LayoutDashboard, ShieldX } from 'lucide-react';
import { Box, Paper, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';

export function UnauthorizedPage() {
  const navigate = useNavigate();
  return <Box component="main" sx={{ minHeight: 'calc(100vh - 160px)', display: 'grid', placeItems: 'center', px: 2 }}>
    <Paper variant="outlined" sx={{ maxWidth: 520, p: { xs: 3, sm: 5 }, textAlign: 'center' }}>
      <Box sx={{ width: 56, height: 56, mx: 'auto', display: 'grid', placeItems: 'center', borderRadius: '50%', bgcolor: '#FEF2F2', color: 'error.main' }}><ShieldX size={28} /></Box>
      <Typography component="h1" variant="h5" sx={{ mt: 2 }}>Access restricted</Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>Your account does not have permission to open this workflow. If you believe this is incorrect, contact a CLINICKA administrator.</Typography>
      <Box sx={{ mt: 3, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1 }}>
        <Button variant="secondary" onClick={() => navigate(-1)}><ArrowLeft size={16} />Go back</Button>
        <Button type="button" onClick={() => navigate('/dashboard')}><LayoutDashboard size={16} />Dashboard</Button>
      </Box>
    </Paper>
  </Box>;
}
