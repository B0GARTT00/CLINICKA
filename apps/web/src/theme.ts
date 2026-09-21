import { alpha, createTheme } from '@mui/material/styles';

export const clinickaTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#006a4e', dark: '#005940', light: '#2a8b70', contrastText: '#ffffff' },
    secondary: { main: '#087b87', dark: '#045d68', contrastText: '#ffffff' },
    error: { main: '#be123c' }, warning: { main: '#b45309' }, success: { main: '#047857' },
    background: { default: '#f6f9fb', paper: '#ffffff' },
    text: { primary: '#111916', secondary: '#64736d' }, divider: '#e2e8e6',
  },
  shape: { borderRadius: 12 },
  typography: { fontFamily: "Inter, 'Avenir Next', 'Segoe UI', sans-serif", button: { textTransform: 'none', fontWeight: 650 }, h1: { fontWeight: 700, letterSpacing: '-0.025em' }, h2: { fontWeight: 700, letterSpacing: '-0.02em' } },
  components: {
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { minHeight: 36, borderRadius: 12, paddingInline: 14 } } },
    MuiCard: { styleOverrides: { root: { border: '1px solid #e2e8e6', boxShadow: '0 8px 24px rgba(15, 45, 38, 0.05)' } } },
    MuiDialog: { styleOverrides: { paper: { border: '1px solid #e2e8e6', borderRadius: 16 } } },
    MuiOutlinedInput: { styleOverrides: { root: ({ theme }) => ({ borderRadius: 12, backgroundColor: '#fff', '&.Mui-focused': { boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.12)}` } }) } },
  },
});
