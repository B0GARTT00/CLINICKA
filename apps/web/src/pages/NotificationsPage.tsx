import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Check } from 'lucide-react';
import { StatusChip } from '../components/ui/StatusChip';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ErrorState, LoadingState } from '../components/ui/States';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../services/api';
import { Box, Typography } from '@mui/material';
import { PageHeader } from '../components/ui/PageHeader';
import { useNavigate } from 'react-router-dom';

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const notifications = useQuery({ queryKey: ['notifications'], queryFn: getNotifications });
  const read = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const readAll = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }) });
  if (notifications.isLoading) return <LoadingState label="Loading notifications..." />;
  if (notifications.isError) return <ErrorState message="Unable to load notifications." />;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        eyebrow="Communication"
        title="Notifications"
        description="Review requirement, appointment, and system updates."
        action={notifications.data?.some((item) => item.status === 'UNREAD') ? <Button variant="secondary" loading={readAll.isPending} onClick={() => readAll.mutate()}><Check className="h-4 w-4" /> Mark all read</Button> : undefined}
      />
      <Card title="Notification center" description="Unread notifications are highlighted.">
        {notifications.data?.length ? (
          <Box>
            {notifications.data.map((notification) => (
              <Box
                onClick={() => {
                  if (notification.status === 'UNREAD') read.mutate(notification.id);
                  if (notification.metadata?.href) navigate(notification.metadata.href);
                }}
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { sm: 'flex-start' },
                  justifyContent: 'space-between',
                  gap: 1.5,
                  px: 2.5,
                  py: 2,
                  bgcolor: notification.status === 'READ' ? 'transparent' : 'rgba(236,253,245,.55)',
                  borderBottom: 1,
                  borderColor: 'divider',
                  '&:last-child': { borderBottom: 0 },
                  cursor: notification.metadata?.href ? 'pointer' : 'default',
                }}
                key={notification.id}
              >
                <Box sx={{ display: 'flex', gap: 1.5, minWidth: 0 }}>
                  <Bell size={17} style={{ flexShrink: 0, marginTop: 2 }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {notification.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5, overflowWrap: 'anywhere' }}
                    >
                      {notification.body}
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      {new Date(notification.createdAt).toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ flexShrink: 0 }}>
                  {notification.status === 'READ' ? (
                    <StatusChip state="READ" />
                  ) : (
                    <Button variant="secondary" onClick={(event) => { event.stopPropagation(); read.mutate(notification.id); }}>
                      <Check className="h-4 w-4" />
                      Mark read
                    </Button>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography sx={{ p: 2.5 }} variant="body2" color="text.secondary">
            You have no notifications.
          </Typography>
        )}
      </Card>
    </Box>
  );
}
