import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAnnouncement, getAnnouncements, publishAnnouncement } from '../services/api';
import { AnnouncementsPage } from './AnnouncementsPage';

vi.mock('../services/api', () => ({
  getAnnouncements: vi.fn(),
  createAnnouncement: vi.fn(),
  publishAnnouncement: vi.fn(),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <AnnouncementsPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AnnouncementsPage staff workflow', () => {
  it('creates a staff announcement draft with the selected audience', async () => {
    vi.mocked(getAnnouncements).mockResolvedValue([]);
    vi.mocked(createAnnouncement).mockResolvedValue({ id: 'announcement-1', title: 'Clinic closed', body: 'Closed this afternoon.', audience: 'STUDENT' });
    renderPage();
    const user = userEvent.setup();

    await screen.findByText('No announcements yet.');
    await user.type(screen.getByLabelText('Title'), 'Clinic closed');
    await user.type(screen.getByLabelText('Message'), 'Closed this afternoon.');
    await user.click(screen.getByLabelText('Audience'));
    await user.click(await screen.findByRole('option', { name: 'STUDENT' }));
    await user.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(createAnnouncement).toHaveBeenCalledWith({ title: 'Clinic closed', body: 'Closed this afternoon.', audience: 'STUDENT' });
    expect(await screen.findByRole('status')).toHaveTextContent('Announcement draft saved');
  });

  it('exposes announcement API failures as an accessible alert', async () => {
    vi.mocked(getAnnouncements).mockResolvedValue([]);
    vi.mocked(createAnnouncement).mockRejectedValue(new Error('network unavailable'));
    renderPage();
    const user = userEvent.setup();

    await screen.findByText('No announcements yet.');
    await user.type(screen.getByLabelText('Title'), 'Clinic closed');
    await user.type(screen.getByLabelText('Message'), 'Closed this afternoon.');
    await user.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to save the announcement');
  });

  it('publishes a draft and confirms notification delivery', async () => {
    vi.mocked(getAnnouncements).mockResolvedValue([{ id: 'announcement-1', title: 'Reminder', body: 'Bring your ID.', audience: 'ALL' }]);
    vi.mocked(publishAnnouncement).mockResolvedValue({ id: 'announcement-1', title: 'Reminder', body: 'Bring your ID.', audience: 'ALL', publishedAt: new Date().toISOString() });
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Publish' }));

    expect(publishAnnouncement).toHaveBeenCalledWith('announcement-1');
    expect(await screen.findByRole('status')).toHaveTextContent('sent to the selected users');
  });
});
