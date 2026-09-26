import { alpha, createTheme } from '@mui/material/styles';

const colors = {
  emerald: '#006B54', emeraldDark: '#064E3B', emeraldLight: '#10B981', mint: '#ECFDF5',
  gold: '#D6A84B', background: '#F6F9F8', paper: '#FFFFFF', text: '#14213D',
  textSecondary: '#64748B', border: '#E2E8E6', info: '#2563EB', warning: '#F59E0B', error: '#DC4C4C',
} as const;

export const clinickaTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: colors.emerald, dark: colors.emeraldDark, light: colors.emeraldLight, contrastText: '#FFFFFF' },
    secondary: { main: colors.gold, dark: '#A97B25', light: '#E7C77F', contrastText: colors.text },
    success: { main: colors.emeraldLight, dark: colors.emerald, light: colors.mint, contrastText: '#FFFFFF' },
    info: { main: colors.info }, warning: { main: colors.warning }, error: { main: colors.error },
    background: { default: colors.background, paper: colors.paper },
    text: { primary: colors.text, secondary: colors.textSecondary }, divider: colors.border,
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: "Inter, 'Avenir Next', 'Segoe UI', sans-serif",
    button: { textTransform: 'none', fontWeight: 700, letterSpacing: 0 },
    h1: { fontWeight: 750, letterSpacing: '-0.025em', color: colors.text },
    h2: { fontWeight: 750, letterSpacing: '-0.02em', color: colors.text },
    h3: { fontWeight: 700, letterSpacing: '-0.015em', color: colors.text },
    h4: { fontWeight: 700, color: colors.text }, h5: { fontWeight: 700, color: colors.text }, h6: { fontWeight: 700, color: colors.text },
  },
  components: {
    MuiScopedCssBaseline: { styleOverrides: { root: { backgroundColor: colors.background, color: colors.text } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' }, rounded: { borderRadius: 14 } } },
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: {
      root: { minHeight: 38, borderRadius: 10, paddingInline: 16 },
    } },
    MuiCard: { defaultProps: { elevation: 0 }, styleOverrides: { root: { border: `1px solid ${colors.border}`, borderRadius: 14, boxShadow: '0 8px 24px rgba(20, 33, 61, 0.045)' } } },
    MuiDialog: { styleOverrides: { paper: { border: `1px solid ${colors.border}`, borderRadius: 16, boxShadow: '0 24px 64px rgba(20, 33, 61, 0.16)' } } },
    MuiDialogTitle: { styleOverrides: { root: { padding: '20px 24px 16px' } } },
    MuiDialogContent: { styleOverrides: { root: { padding: '20px 24px' } } },
    MuiDialogActions: { styleOverrides: { root: { padding: '12px 24px 20px', gap: 8 } } },
    MuiTextField: { defaultProps: { size: 'small', variant: 'outlined' } },
    MuiFormControl: { defaultProps: { size: 'small' } },
    MuiOutlinedInput: { styleOverrides: {
      root: ({ theme }) => ({ borderRadius: 10, backgroundColor: colors.paper, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha(theme.palette.primary.main, 0.7) }, '&.Mui-focused': { boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.12)}` } }),
      notchedOutline: { borderColor: colors.border },
    } },
    MuiInputLabel: { styleOverrides: { root: { color: colors.textSecondary } } },
    MuiChip: { styleOverrides: { root: { borderRadius: 999, fontWeight: 700 }, sizeSmall: { height: 26 } } },
    MuiTableCell: { styleOverrides: { root: { borderColor: colors.border }, head: { backgroundColor: colors.background, color: colors.textSecondary, fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase' } } },
    MuiAlert: { styleOverrides: { root: { borderRadius: 12 } } },
    MuiTooltip: { styleOverrides: { tooltip: { borderRadius: 8, backgroundColor: colors.text, fontSize: 12 } } },
    MuiMenu: { styleOverrides: { paper: { marginTop: 6, border: `1px solid ${colors.border}`, boxShadow: '0 16px 40px rgba(20, 33, 61, 0.12)' } } },
    MuiPaginationItem: { styleOverrides: { root: { borderRadius: 9, '&.Mui-selected': { fontWeight: 700 } } } },
    MuiCircularProgress: { defaultProps: { color: 'primary' } },
  },
});
