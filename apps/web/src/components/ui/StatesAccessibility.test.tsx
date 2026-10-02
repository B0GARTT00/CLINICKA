import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FormField } from './FormField';
import { EmptyState, ErrorState, LoadingState, MutationFeedback } from './States';

afterEach(cleanup);

describe('shared accessible states', () => {
  it('announces loading progress without exposing the decorative spinner', () => {
    render(<LoadingState label="Loading clearance applications..." />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading clearance applications...');
    expect(screen.getByRole('progressbar', { hidden: true })).toHaveAttribute('aria-hidden', 'true');
  });

  it('provides an actionable error alert and keyboard-operable retry', async () => {
    const retry = vi.fn();
    render(<ErrorState message="Unable to load patients." onRetry={retry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load patients.');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('renders empty-state copy without presenting a false error', () => {
    render(<EmptyState title="No requests" description="Submitted requests will appear here." />);
    expect(screen.getByText('No requests')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('associates form validation text with its invalid input', () => {
    render(<FormField name="email" label="Institutional email" error="Enter a valid institutional email." />);
    const input = screen.getByLabelText('Institutional email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Enter a valid institutional email.');
  });

  it('uses alert semantics for failed mutations and status semantics for success', () => {
    const close = vi.fn();
    render(<MutationFeedback open message="Save failed." severity="error" onClose={close} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Save failed.');
    cleanup();
    render(<MutationFeedback open message="Saved." onClose={close} />);
    expect(screen.getByRole('status')).toHaveTextContent('Saved.');
  });
});
