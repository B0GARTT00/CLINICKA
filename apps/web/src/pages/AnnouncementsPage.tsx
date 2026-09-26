import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Megaphone, Send } from 'lucide-react';
import { useState } from 'react';
import { Alert, Box, MenuItem, Typography } from '@mui/material';
import { Badge } from '../components/ui/Badge';
import { StatusChip } from '../components/ui/StatusChip';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ErrorState, LoadingState } from '../components/ui/States';
import { FormField } from '../components/ui/FormField';
import { PageHeader } from '../components/ui/PageHeader';
import { createAnnouncement, getAnnouncements, publishAnnouncement } from '../services/api';

export function AnnouncementsPage() {
  const queryClient = useQueryClient();
  const announcements = useQuery({ queryKey: ['announcements'], queryFn: getAnnouncements });
  const [form, setForm] = useState({ title: '', body: '', audience: 'ALL' });
  const create = useMutation({
    mutationFn: () => createAnnouncement(form),
    onSuccess: () => {
      setForm({ title: '', body: '', audience: 'ALL' });
      void queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
  const publish = useMutation({
    mutationFn: (id: string) => publishAnnouncement(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['announcements'] }),
  });
  if (announcements.isLoading) return <LoadingState label="Loading announcements..." />;
  if (announcements.isError) return <ErrorState message="Unable to load announcements." />;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        eyebrow="Communication"
        title="Announcements"
        description="Publish clinic schedules, reminders, and health updates."
        action={
          <Badge variant="neutral">
            <Megaphone size={14} />
            {announcements.data?.length ?? 0} messages
          </Badge>
        }
      />
      <Card
        title="Create announcement"
        description="Announcements are visible to the selected audience after publishing."
      >
        <Box
          component="form"
          sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 2.5 }}
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate();
          }}
        >
          <FormField
            required
            fullWidth
            size="small"
            label="Title"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
          <FormField
            required
            fullWidth
            multiline
            minRows={4}
            label="Message"
            value={form.body}
            onChange={(event) => setForm({ ...form, body: event.target.value })}
          />
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { sm: 'center' },
              gap: 1.5,
            }}
          >
            <FormField
              select
              size="small"
              label="Audience"
              value={form.audience}
              onChange={(event) => setForm({ ...form, audience: event.target.value })}
              sx={{ width: { xs: '100%', sm: 220 } }}
            >
              {['ALL', 'STUDENT', 'FACULTY_STAFF', 'CLINIC_STAFF'].map((audience) => (
                <MenuItem key={audience} value={audience}>
                  {audience.replaceAll('_', ' ')}
                </MenuItem>
              ))}
            </FormField>
            <Button disabled={create.isPending}>
              <Megaphone className="h-4 w-4" />
              Save draft
            </Button>
          </Box>
          {create.isError && (
            <Alert severity="error">
              Unable to save the announcement. Review the title, message, and audience.
            </Alert>
          )}
        </Box>
      </Card>
      <Card title="Announcement history" description="Draft and published clinic communications.">
        {announcements.data?.length ? (
          <Box>
            {announcements.data.map((announcement) => (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { sm: 'center' },
                  justifyContent: 'space-between',
                  gap: 2,
                  px: 2.5,
                  py: 2,
                  borderBottom: 1,
                  borderColor: 'divider',
                  '&:last-child': { borderBottom: 0 },
                }}
                key={announcement.id}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {announcement.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {announcement.body}
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    Audience: {announcement.audience.replaceAll('_', ' ')}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <StatusChip state={announcement.publishedAt ? 'PUBLISHED' : 'DRAFT'} />
                  {!announcement.publishedAt && (
                    <Button variant="secondary" onClick={() => publish.mutate(announcement.id)}>
                      <Send className="h-4 w-4" />
                      Publish
                    </Button>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography sx={{ p: 2.5 }} variant="body2" color="text.secondary">
            No announcements yet.
          </Typography>
        )}
      </Card>
    </Box>
  );
}