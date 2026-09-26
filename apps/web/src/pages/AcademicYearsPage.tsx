import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarRange, Plus } from 'lucide-react';
import { useState } from 'react';
import { Alert, Avatar, Box, Typography } from '@mui/material';
import { Badge } from '../components/ui/Badge';
import { StatusChip } from '../components/ui/StatusChip';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ErrorState, LoadingState } from '../components/ui/States';
import { FormField } from '../components/ui/FormField';
import { PageHeader } from '../components/ui/PageHeader';
import { createAcademicYear, getAcademicYears } from '../services/api';

export function AcademicYearsPage() {
  const queryClient = useQueryClient();
  const years = useQuery({ queryKey: ['academic-years'], queryFn: getAcademicYears });
  const [form, setForm] = useState({ label: '', startsAt: '', endsAt: '' });
  const create = useMutation({
    mutationFn: () =>
      createAcademicYear({
        ...form,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
      }),
    onSuccess: () => {
      setForm({ label: '', startsAt: '', endsAt: '' });
      void queryClient.invalidateQueries({ queryKey: ['academic-years'] });
    },
  });
  if (years.isLoading) return <LoadingState label="Loading academic years..." />;
  if (years.isError) return <ErrorState message="Unable to load academic years." />;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        eyebrow="Administration"
        title="Academic years"
        description="Manage school-year and semester boundaries for records and requirements."
        action={
          <Badge variant="neutral">
            <CalendarRange size={14} />
            {years.data?.length ?? 0} configured
          </Badge>
        }
      />
      <Card
        title="Add academic year"
        description="Academic-year changes are restricted to administrators."
      >
        <Box
          component="form"
          sx={{
            display: 'grid',
            gap: 1.5,
            p: 2.5,
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr auto' },
            alignItems: 'center',
          }}
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate();
          }}
        >
          <FormField
            required
            fullWidth
            size="small"
            label="Label"
            value={form.label}
            onChange={(event) => setForm({ ...form, label: event.target.value })}
            placeholder="2027-2028"
          />
          <FormField
            required
            fullWidth
            size="small"
            label="Starts"
            type="date"
            value={form.startsAt}
            onChange={(event) => setForm({ ...form, startsAt: event.target.value })}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <FormField
            required
            fullWidth
            size="small"
            label="Ends"
            type="date"
            value={form.endsAt}
            onChange={(event) => setForm({ ...form, endsAt: event.target.value })}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <Button disabled={create.isPending}>
            <Plus className="h-4 w-4" />
            Add year
          </Button>
          {create.isError && (
            <Alert severity="error" sx={{ gridColumn: '1 / -1' }}>
              Unable to add the academic year. Verify the dates do not overlap an existing period.
            </Alert>
          )}
        </Box>
      </Card>
      <Card
        title="Academic-year history"
        description="Linked semesters, requirements, and clearances."
      >
        {years.data?.length ? (
          <Box>
            {years.data.map((year) => (
              <Box
                sx={{
                  px: 2.5,
                  py: 2,
                  borderBottom: 1,
                  borderColor: 'divider',
                  '&:last-child': { borderBottom: 0 },
                }}
                key={year.id}
              >
                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar
                      variant="rounded"
                      sx={{ width: 36, height: 36, bgcolor: 'primary.50', color: 'primary.main' }}
                    >
                      <CalendarRange size={18} />
                    </Avatar>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {year.label}
                    </Typography>
                  </Box>
                  <StatusChip state={year.isActive ? 'ACTIVE' : 'ARCHIVED'} />
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 1 }}
                >
                  {year.semesters.length} semesters · {year._count.requirements} requirements ·{' '}
                  {year._count.clearances} clearances
                </Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography sx={{ p: 2.5 }} variant="body2" color="text.secondary">
            No academic years configured.
          </Typography>
        )}
      </Card>
    </Box>
  );
}
