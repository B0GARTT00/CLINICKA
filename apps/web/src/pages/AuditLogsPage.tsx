import { useQuery } from '@tanstack/react-query';
import { Search, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { DataTable } from '../components/ui/DataTable';
import { ErrorState, LoadingState } from '../components/ui/States';
import { FormField } from '../components/ui/FormField';
import { PageHeader } from '../components/ui/PageHeader';
import { getAuditLogs } from '../services/api';

interface AuditLogRow {
  id: string;
  createdAt: string;
  actor?: { displayName: string; email: string } | null;
  action: string;
  entity: string;
  entityId?: string | null;
}

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

  const columns = [
    { field: 'createdAt', header: 'Time', width: '180px', render: (row: AuditLogRow) => (
      <Typography variant="caption" color="text.secondary">
        {new Date(row.createdAt).toLocaleString()}
      </Typography>
    )},
    { field: 'actor', header: 'Actor', width: '150px', render: (row: AuditLogRow) => row.actor?.displayName || 'System' },
    { field: 'action', header: 'Action', width: '180px', render: (row: AuditLogRow) => <Typography sx={{ fontWeight: 700 }}>{row.action}</Typography> },
    { field: 'entity', header: 'Entity', width: '120px', render: (row: AuditLogRow) => <Badge variant="neutral">{row.entity}</Badge> },
    { field: 'entityId', header: 'Entity ID', width: '120px', render: (row: AuditLogRow) => <Typography variant="caption" color="text.secondary">{row.entityId || '-'}</Typography> },
  ];

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
          <FormField
            fullWidth
            size="small"
            label="Action"
            value={action}
            onChange={(event) => setAction(event.target.value)}
            placeholder="PATIENT_CREATED"
          />
          <FormField
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
          <DataTable
            columns={columns}
            data={logs.data}
            pagination={false}
            rowKey="id"
          />
        ) : (
          <Typography sx={{ p: 2.5 }} variant="body2" color="text.secondary">
            No audit activity found.
          </Typography>
        )}
      </Card>
    </Box>
  );
}