import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getNotifications, markNotificationRead } from '../services/api';
import { NotificationsPage } from './NotificationsPage';

vi.mock('../services/api', () => ({
  getNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('NotificationsPage', () => {
  it('marks an unread notification read through the canonical API mutation', async () => {
    vi.mocked(getNotifications)
      .mockResolvedValueOnce([
        {
          id: 'notification-1',
          title: 'Appointment update',
          body: 'Your appointment has been confirmed.',
          type: 'APPOINTMENT',
          status: 'UNREAD',
          createdAt: '2026-09-19T00:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'notification-1',
          title: 'Appointment update',
          body: 'Your appointment has been confirmed.',
          type: 'APPOINTMENT',
          status: 'READ',
          createdAt: '2026-09-19T00:00:00.000Z',
        },
      ]);
    vi.mocked(markNotificationRead).mockResolvedValue({
      id: 'notification-1',
      title: 'Appointment update',
      body: 'Your appointment has been confirmed.',
      type: 'APPOINTMENT',
      status: 'READ',
      createdAt: '2026-09-19T00:00:00.000Z',
    });

    render(
      <QueryClientProvider client={new QueryClient()}>
        <NotificationsPage />
      </QueryClientProvider>,
    );
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /mark read/i }));

    expect(markNotificationRead).toHaveBeenCalledWith('notification-1');
    expect(await screen.findByText('Read')).toBeInTheDocument();
  });
});
