import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { getConversation, markConversationRead, sendClinicMessage } from '../services/api';
import { MessagesPage } from './MessagesPage';

vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'patient-user', roles: ['STUDENT'] } }) }));
vi.mock('../services/api', () => ({
  getConversations: vi.fn().mockResolvedValue([]), getConversation: vi.fn(),
  getPatients: vi.fn().mockResolvedValue([]), markConversationRead: vi.fn().mockResolvedValue(undefined),
  sendClinicMessage: vi.fn(), createConversation: vi.fn(), downloadPrivateDocument: vi.fn(),
  reopenConversation: vi.fn(), resolveConversation: vi.fn(),
}));
const conversation = {
  id: 'thread', subject: 'Clinic follow-up', topic: 'GENERAL_CLINIC_CONCERN' as const,
  status: 'OPEN' as const, repliesEnabled: true, createdAt: '', updatedAt: '',
  patient: { id: 'patient', patientNumber: 'P-1', firstName: 'Ana', lastName: 'Santos', type: 'STUDENT' as const },
  messages: [{ id: 'message-1', content: 'Please visit the clinic.', allowReply: true, createdAt: '2026-10-15T01:00:00Z', sender: { id: 'nurse', displayName: 'Clinic nurse' } }],
};
function renderPage() {
  render(<MemoryRouter initialEntries={['/messages/thread']}><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><Routes><Route path="/messages/:id" element={<MessagesPage />} /></Routes></QueryClientProvider></MemoryRouter>);
}
beforeEach(() => {
  vi.mocked(getConversation).mockResolvedValue(conversation);
  vi.mocked(markConversationRead).mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('marks the loaded conversation as read', async () => {
  renderPage();
  await screen.findByText('Please visit the clinic.');
  await waitFor(() => expect(markConversationRead).toHaveBeenCalledWith('thread'));
});
it('disables every reply control when patient replies are disabled', async () => {
  vi.mocked(getConversation).mockResolvedValue({ ...conversation, repliesEnabled: false });
  renderPage();
  expect(await screen.findByRole('textbox', { name: 'Secure reply' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Attach' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
});
it('sends a reply and clears the composer after success', async () => {
  vi.mocked(sendClinicMessage).mockResolvedValue(conversation);
  renderPage();
  const user = userEvent.setup();
  const reply = await screen.findByRole('textbox', { name: 'Secure reply' });
  await user.type(reply, 'Thank you');
  await user.click(screen.getByRole('button', { name: 'Send' }));
  await waitFor(() => expect(sendClinicMessage).toHaveBeenCalledWith('thread', 'Thank you', null));
  await waitFor(() => expect(reply).toHaveValue(''));
});
it('handles read failures without hiding the conversation', async () => {
  vi.mocked(markConversationRead).mockRejectedValue(new Error('Offline'));
  renderPage();
  expect(await screen.findByText(/Unable to update the read status/)).toBeInTheDocument();
  expect(screen.getByText('Please visit the clinic.')).toBeInTheDocument();
});
