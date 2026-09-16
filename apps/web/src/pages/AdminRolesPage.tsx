import { useQuery } from '@tanstack/react-query';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/card';
import { ErrorState, LoadingState } from '../components/ui/States';
import { getAdminRoles } from '../services/api';
import { Box, Typography } from '@mui/material';
import { PageHeader } from '../components/ui/PageHeader';

export function AdminRolesPage() {
  const roles = useQuery({ queryKey: ['admin-roles'], queryFn: getAdminRoles });
  if (roles.isLoading) return <LoadingState label="Loading roles and permissions..." />;
  if (roles.isError)
    return <ErrorState message="Unable to load roles. Administrator access is required." />;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        eyebrow="Administration"
        title="Roles & permissions"
        description="Review access boundaries for every system role."
        action={
          <Badge variant="success">
            <ShieldCheck size={14} />
            Administrator only
          </Badge>
        }
      />
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' },
        }}
      >
        {roles.data?.map((role) => (
          <Card
            key={role.id}
            title={role.name}
            description={role.description || 'Configured system role'}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 1,
                px: 2.5,
                py: 1.5,
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {role._count.users} assigned users
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {role.permissions.length} permissions
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 2.5 }}>
              {role.permissions.map(({ permission }) => (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1,
                    overflowWrap: 'anywhere',
                  }}
                  key={permission.key}
                >
                  <KeyRound size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                  {permission.key}
                </Typography>
              ))}
            </Box>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
