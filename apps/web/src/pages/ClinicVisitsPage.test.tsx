import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createConsultation, createVisit, getVisitQueue, recordVitalSigns } from '../services/api';
import { ClinicVisitsPage } from './ClinicVisitsPage';

vi.mock('../services/api', () => ({
  getPatients: vi.fn().mockResolvedValue([
    {
      id: 'patient-1',
      patientNumber: 'CLN-2026-00042',
      type: 'STUDENT',
      firstName: 'Ana',
      lastName: 'Santos',
    },
  ]),
  getVisitQueue: vi.fn().mockResolvedValue([]),
  createVisit: vi.fn(),
  updateVisitStatus: vi.fn(),
  recordVitalSigns: vi.fn(),
  createConsultation: vi.fn(),
}));

const registeredVisit = {
  id: 'visit-1',
  patientId: 'patient-1',
  visitDate: '2026-09-19T08:00:00.000Z',
  chiefComplaint: 'Headache',
  status: 'OPEN' as const,
  patient: {
    id: 'patient-1',
    patientNumber: 'CLN-2026-00042',
    firstName: 'Ana',
    lastName: 'Santos',
  },
};

const activeVisit = { ...registeredVisit, status: 'IN_CONSULTATION' as const };

function renderPage() {
  return render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient()}>
        <ClinicVisitsPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

async function selectPatient(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByPlaceholderText('Search name or patient ID'));
  await user.click(await screen.findByText('Santos, Ana'));
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  vi.mocked(getVisitQueue).mockResolvedValue([]);
});

describe('ClinicVisitsPage walk-in registration', () => {
  it('creates the selected patient walk-in and immediately displays it in the queue', async () => {
    vi.mocked(createVisit).mockResolvedValue(registeredVisit);
    renderPage();
    const user = userEvent.setup();

    await selectPatient(user);
    await user.type(screen.getByPlaceholderText('Reason for visit'), 'Headache');
    await user.type(screen.getByPlaceholderText('Initial observations or relevant details'), 'Walk-in intake');
    await user.click(screen.getByRole('button', { name: /register walk-in/i }));

    expect(createVisit).toHaveBeenCalledWith({
      patientId: 'patient-1',
      chiefComplaint: 'Headache',
      notes: 'Walk-in intake',
    });
    expect(await screen.findByText('Ana Santos')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent("Ana Santos was registered and added to today's queue.");
  });

  it('requires a selected patient and complaint before registration', async () => {
    renderPage();

    expect(await screen.findByRole('button', { name: /register walk-in/i })).toBeDisabled();
  });

  it('shows the duplicate-visit response without adding another queue entry', async () => {
    vi.mocked(createVisit).mockRejectedValue({
      response: { data: { message: "This patient already has an active visit in today's clinic queue." } },
    });
    renderPage();
    const user = userEvent.setup();

    await selectPatient(user);
    await user.type(screen.getByPlaceholderText('Reason for visit'), 'Headache');
    await user.click(screen.getByRole('button', { name: /register walk-in/i }));

    expect(await screen.findByText("This patient already has an active visit in today's clinic queue.")).toBeInTheDocument();
    expect(screen.queryByText('Ana Santos')).not.toBeInTheDocument();
  });

  it('submits vital signs and a progress note from their form save buttons', async () => {
    vi.mocked(getVisitQueue).mockResolvedValue([activeVisit]);
    vi.mocked(recordVitalSigns).mockResolvedValue({ id: 'vitals-1' });
    vi.mocked(createConsultation).mockResolvedValue({ id: 'consultation-1' });
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Record vitals' }));
    await user.type(screen.getByLabelText('Pulse rate'), '72');
    await user.click(screen.getByRole('button', { name: 'Save vitals' }));
    expect(recordVitalSigns).toHaveBeenCalledWith('visit-1', { pulseRate: 72 });

    await user.click(await screen.findByRole('button', { name: 'Progress note' }));
    await user.type(
      screen.getByRole('textbox', { name: /Cues \/ presenting signs and symptoms/ }),
      'Headache',
    );
    await user.click(screen.getByRole('button', { name: 'Save progress note' }));
    expect(createConsultation).toHaveBeenCalledWith(
      'visit-1',
      expect.objectContaining({ cues: 'Headache' }),
    );
  });

  it('explains invalid vital-sign values before sending them', async () => {
    vi.mocked(getVisitQueue).mockResolvedValue([activeVisit]);
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Record vitals' }));
    await user.type(screen.getByLabelText('Systolic BP'), '12');

    expect(screen.getByText('Systolic BP must be between 40 and 300.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save vitals' })).toBeDisabled();
    expect(recordVitalSigns).not.toHaveBeenCalled();
  });
});
