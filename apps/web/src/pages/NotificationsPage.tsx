import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Check } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ErrorState, LoadingState } from '../components/ui/States';
import { getNotifications, markNotificationRead } from '../services/api';
import { Box, Typography } from '@mui/material';
import { PageHeader } from '../components/ui/PageHeader';

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const notifications = useQuery({ queryKey: ['notifications'], queryFn: getNotifications });
  const read = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
  if (notifications.isLoading) return <LoadingState label="Loading notifications..." />;
  if (notifications.isError) return <ErrorState message="Unable to load notifications." />;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader
        eyebrow="Communication"
        title="Notifications"
        description="Review requirement, appointment, and system updates."
      />
      <Card title="Notification center" description="Unread notifications are highlighted.">
        {notifications.data?.length ? (
          <Box>
            {notifications.data.map((notification) => (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { sm: 'flex-start' },
                  justifyContent: 'space-between',
                  gap: 1.5,
                  px: 2.5,
                  py: 2,
                  bgcolor: notification.isRead ? 'transparent' : 'rgba(236,253,245,.55)',
                  borderBottom: 1,
                  borderColor: 'divider',
                  '&:last-child': { borderBottom: 0 },
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
                  {notification.isRead ? (
                    <Badge variant="neutral">Read</Badge>
                  ) : (
                    <Button variant="secondary" onClick={() => read.mutate(notification.id)}>
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
