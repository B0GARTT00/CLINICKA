import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, Users } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { StatusChip } from '../components/ui/StatusChip';
import { Card } from '../components/ui/card';
import { ErrorState, LoadingState } from '../components/ui/States';
import { getAdminUsers } from '../services/api';
import { Box, Typography } from '@mui/material';
import { PageHeader } from '../components/ui/PageHeader';

export function AdminUsersPage() {
  const users = useQuery({ queryKey: ['admin-users'], queryFn: getAdminUsers });
  if (users.isLoading) return <LoadingState label="Loading users..." />;
  if (users.isError) return <ErrorState message="Unable to load user administration." />;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        eyebrow="Administration"
        title="User administration"
        description="Review accounts, roles, and activation status."
        action={
          <Badge variant="success">
            <Users size={14} />
            {(users.data ?? []).length} accounts
          </Badge>
        }
      />
      <Card
        title="System users"
        description="Role assignment and account changes are restricted to administrators."
      >
        <Box>
          {(users.data ?? []).map((user) => (
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { sm: 'center' },
                justifyContent: 'space-between',
                gap: 1.5,
                px: 2.5,
                py: 2,
                borderBottom: 1,
                borderColor: 'divider',
                '&:last-child': { borderBottom: 0 },
              }}
              key={user.id}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {user.displayName}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', overflowWrap: 'anywhere' }}
                >
                  {user.email}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <StatusChip state={user.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'} />
                {user.roles.map((role) => (
                  <Typography
                    component="span"
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                    key={role.name}
                  >
                    <ShieldCheck size={14} />
                    {role.name}
                  </Typography>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      </Card>
    </Box>
  );
}
