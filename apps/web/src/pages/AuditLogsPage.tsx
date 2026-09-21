import { useQuery } from '@tanstack/react-query';
import { Search, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ErrorState, LoadingState } from '../components/ui/States';
import { PageHeader } from '../components/ui/PageHeader';
import { getAuditLogs } from '../services/api';

export function AuditLogsPage() {
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [filters, setFilters] = useState({ action: '', entity: '' });
  const logs = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => getAuditLogs(filters.action, filters.entity),
  });
  if (logs.isLoading) return <LoadingState label="Loading audit logs..." />;
  if (logs.isError)
    return <ErrorState message="Unable to load audit logs. Administrator access is required." />;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        eyebrow="Security"
        title="Audit logs"
        description="Review recorded changes and sensitive system activity."
        action={
          <Badge variant="success">
            <ShieldCheck size={14} />
            Administrator only
          </Badge>
        }
      />
      <Card title="Filter activity" description="Search by action or entity type.">
        <Box
          component="form"
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1.5,
            p: 2.5,
            alignItems: { sm: 'center' },
          }}
          onSubmit={(event) => {
            event.preventDefault();
            setFilters({ action, entity });
          }}
        >
          <TextField
            fullWidth
            size="small"
            label="Action"
            value={action}
            onChange={(event) => setAction(event.target.value)}
            placeholder="PATIENT_CREATED"
          />
          <TextField
            fullWidth
            size="small"
            label="Entity"
            value={entity}
            onChange={(event) => setEntity(event.target.value)}
            placeholder="Patient"
          />
          <Button>
            <Search className="h-4 w-4" />
            Filter
          </Button>
        </Box>
      </Card>
      <Card title="Activity history" description={`${logs.data?.length ?? 0} records shown.`}>
        {logs.data?.length ? (
          <TableContainer>
            <Table size="small" sx={{ minWidth: 760 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Time</TableCell>
                  <TableCell>Actor</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Entity</TableCell>
                  <TableCell>Entity ID</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.data.map((log) => (
                  <TableRow hover key={log.id}>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(log.createdAt).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>{log.actor?.displayName || 'System'}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{log.action}</TableCell>
                    <TableCell>
                      <Badge variant="neutral">{log.entity}</Badge>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {log.entityId || '-'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography sx={{ p: 2.5 }} variant="body2" color="text.secondary">
            No audit activity found.
          </Typography>
        )}
      </Card>
    </Box>
  );
}
