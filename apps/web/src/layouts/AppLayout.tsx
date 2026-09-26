import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import {
  Bell,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  FileCheck,
  GraduationCap,
  History,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  Megaphone,
  Package,
  Search,
  Settings,
  ShieldCheck,
  Stethoscope,
  Syringe,
  UserCog,
  Users,
  ScrollText,
} from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import MuiMenu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { useAuth } from '../hooks/useAuth';
import { canAccessPath } from '../auth/authorization';
import { SERVER_FORBIDDEN_EVENT } from '../services/api';

const drawerWidth = 268;
const navItems = [
  { group: 'Workspace', to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { group: 'Clinic', to: '/patients', label: 'Patients', icon: Users },
  { group: 'Clinic', to: '/appointments', label: 'Appointments', icon: CalendarDays },
  { group: 'Clinic', to: '/clinic/visits', label: 'Clinic queue', icon: ClipboardList },
  {
    group: 'Health records',
    to: '/requirements',
    label: 'Requirements',
    icon: FileCheck,
  },
  { group: 'Health records', to: '/clearances', label: 'Clearances', icon: ShieldCheck },
  { group: 'Health records', to: '/vaccinations', label: 'External Vaccination History', icon: Syringe },
  { group: 'Health records', to: '/screenings', label: 'Health Screening', icon: ClipboardCheck },
  { group: 'Health records', to: '/certificates', label: 'Certificates', icon: Stethoscope },
  { group: 'Inventory', to: '/inventory/medicines', label: 'Medicines', icon: Package },
  { group: 'Inventory', to: '/inventory/transactions', label: 'Transactions', icon: History },
  { group: 'Inventory', to: '/inventory/dispensing', label: 'Dispensing', icon: ClipboardList },
  { group: 'Communication', to: '/announcements', label: 'Announcements', icon: Megaphone },
  { group: 'Communication', to: '/notifications', label: 'Notifications', icon: Inbox },
  { group: 'Administration', to: '/reports', label: 'Reports', icon: LayoutDashboard },
  { group: 'Administration', to: '/admin/users', label: 'Users', icon: UserCog },
  { group: 'Administration', to: '/admin/roles', label: 'Roles & permissions', icon: ShieldCheck },
  {
    group: 'Administration',
    to: '/admin/academic-years',
    label: 'Academic Years',
    icon: GraduationCap,
  },
  { group: 'Administration', to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
  { group: 'Administration', to: '/admin/settings', label: 'Settings', icon: Settings },
];

function initials(name?: string) {
  return name
    ? name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase()
    : 'CL';
}

export function AppLayout() {
  const auth = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileAnchor, setProfileAnchor] = useState<HTMLElement | null>(null);
  const [serverDenied, setServerDenied] = useState(false);
  useEffect(() => {
    const handleForbidden = () => setServerDenied(true);
    window.addEventListener(SERVER_FORBIDDEN_EVENT, handleForbidden);
    return () => window.removeEventListener(SERVER_FORBIDDEN_EVENT, handleForbidden);
  }, []);
  const visibleNavItems = useMemo(
    () => navItems.filter((item) => Boolean(auth.user && canAccessPath(item.to, auth.user.roles))),
    [auth.user],
  );
  const visibleGroups = useMemo(
    () => Array.from(new Set(visibleNavItems.map((item) => item.group))),
    [visibleNavItems],
  );
  const currentPage =
    navItems.find(
      (item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`),
    )?.label ?? (location.pathname.startsWith('/patients/') ? 'Patient Profile' : 'Dashboard');

  const sidebar = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        color: '#fff',
        background: 'linear-gradient(180deg, #064E3B 0%, #033B2D 100%)',
      }}
    >
      <Box
        sx={{
          height: 102,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 3,
          borderBottom: '1px solid rgba(255,255,255,.14)',
        }}
      >
        <img src="/clinova-emblem.png" alt="CLINICKA emblem" width="58" height="58" />
        <Box sx={{ minWidth: 0 }}>
          <img
            src="/clinicka-wordmark.png"
            alt="CLINICKA"
            width="142"
            height="47"
            style={{ height: 25, width: 'auto', maxWidth: 140, objectFit: 'contain' }}
          />
          <Typography sx={{ mt: 0.5, fontSize: 12, color: 'rgba(236,253,245,.7)' }}>
            Campus Health Management System
          </Typography>
        </Box>
      </Box>
      <Box
        className="sidebar-navigation"
        component="nav"
        sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 1.25, py: 2 }}
      >
        {visibleGroups.map((group) => (
          <Box key={group} sx={{ mb: 2 }}>
            <Typography
              sx={{
                px: 2,
                mb: 0.5,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '.18em',
                textTransform: 'uppercase',
                color: 'rgba(236,253,245,.56)',
              }}
            >
              {group}
            </Typography>
            <List disablePadding>
              {visibleNavItems
                .filter((item) => item.group === group)
                .map((item) => (
                  <ListItemButton
                    component={NavLink}
                    to={item.to}
                    key={item.to}
                    onClick={() => setMobileOpen(false)}
                    sx={{
                      minHeight: 40,
                      px: 2,
                      py: 0.5,
                      mb: 0.25,
                      borderRadius: '10px',
                      color: 'rgba(255,255,255,.9)',
                      '& .MuiListItemIcon-root': { color: 'inherit' },
                      '&:hover': { bgcolor: 'rgba(255,255,255,.1)' },
                      '&.active': {
                        color: '#fff',
                        bgcolor: 'rgba(236,253,245,.16)',
                        boxShadow: 'inset 3px 0 0 #10B981',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 35 }}>
                      <item.icon size={19} strokeWidth={1.9} />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      slotProps={{ primary: { sx: { fontSize: 13.5, fontWeight: 600 } } }}
                    />
                    {item.to === '/notifications' && <Badge badgeContent={3} color="info" />}
                  </ListItemButton>
                ))}
            </List>
          </Box>
        ))}
      </Box>
      <Paper
        elevation={0}
        sx={{
          m: 1.5,
          p: 1.5,
          color: '#ffffff',
          bgcolor: 'rgba(255,255,255,.08)',
          border: '1px solid rgba(236,253,245,.12)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 12, fontWeight: 700 }}>
          <ShieldCheck size={18} />
          Protected workspace
        </Box>
        <Typography sx={{ mt: 0.5, pl: 3.25, fontSize: 11, color: 'rgba(236,253,245,.58)' }}>
          Audit logging enabled
        </Typography>
      </Paper>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Snackbar open={serverDenied} autoHideDuration={6000} onClose={() => setServerDenied(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}><Alert severity="warning" variant="filled" role="alert" onClose={() => setServerDenied(false)}>The server denied this action. Your access may have changed; refresh or contact an administrator.</Alert></Snackbar>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', lg: 'block' },
          '& .MuiDrawer-paper': { width: drawerWidth, border: 0 },
        }}
        open
      >
        {sidebar}
      </Drawer>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', lg: 'none' },
          '& .MuiDrawer-paper': { width: drawerWidth, border: 0 },
        }}
      >
        {sidebar}
      </Drawer>
      <Box sx={{ minHeight: '100vh', ml: { lg: `${drawerWidth}px` } }}>
        <AppBar
          position="sticky"
          color="inherit"
          elevation={0}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'rgba(255,255,255,.94)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <Toolbar
            sx={{
              minHeight: '64px !important',
              px: { xs: 2, md: 3, lg: 4 },
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
                sx={{ display: { lg: 'none' } }}
              >
                <MenuIcon size={20} />
              </IconButton>
              <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Clinic
                </Typography>
                <Typography color="divider">/</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {currentPage}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, md: 1.5 } }}>
              <ButtonBase
                sx={{
                  display: { xs: 'none', xl: 'flex' },
                  width: 180,
                  height: 40,
                  justifyContent: 'flex-start',
                  gap: 1,
                  px: 1.5,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2,
                  bgcolor: '#f8fafc',
                  color: 'text.secondary',
                  fontSize: 13,
                }}
              >
                <Search size={17} />
                <span>Search...</span>
                <Box
                  component="kbd"
                  sx={{
                    ml: 'auto',
                    px: 0.75,
                    py: 0.25,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: '#fff',
                    fontSize: 11,
                  }}
                >
                  ⌘K
                </Box>
              </ButtonBase>
              <IconButton aria-label="Notifications">
                <Badge variant="dot" color="error">
                  <Bell size={20} />
                </Badge>
              </IconButton>
              <ButtonBase
                onClick={(event: MouseEvent<HTMLElement>) => setProfileAnchor(event.currentTarget)}
                sx={{ gap: 1.25, p: 0.5, borderRadius: 2 }}
              >
                <Avatar
                  sx={{ width: 40, height: 40, bgcolor: '#075f67', fontSize: 13, fontWeight: 800 }}
                >
                  {initials(auth.user?.displayName)}
                </Avatar>
                <Box
                  sx={{ display: { xs: 'none', md: 'block' }, minWidth: 150, textAlign: 'left' }}
                >
                  <Typography noWrap sx={{ fontSize: 14, fontWeight: 700 }}>
                    {auth.user?.displayName}
                  </Typography>
                  <Typography
                    noWrap
                    sx={{
                      fontSize: 10.5,
                      letterSpacing: '.06em',
                      textTransform: 'uppercase',
                      color: 'text.secondary',
                    }}
                  >
                    {auth.user?.roles.join(', ')}
                  </Typography>
                </Box>
                <ChevronDown size={16} />
              </ButtonBase>
            </Box>
          </Toolbar>
        </AppBar>
        <MuiMenu
          anchorEl={profileAnchor}
          open={Boolean(profileAnchor)}
          onClose={() => setProfileAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem
            onClick={() => {
              setProfileAnchor(null);
              void auth.logout();
            }}
          >
            <LogOut size={17} style={{ marginRight: 10 }} />
            Log out
          </MenuItem>
        </MuiMenu>
        <Box component="main" sx={{ maxWidth: 1500, mx: 'auto', p: { xs: 2, sm: 3, lg: 4 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
