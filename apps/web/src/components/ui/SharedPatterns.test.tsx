import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MenuItem } from '@mui/material';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DataTable } from './DataTable';
import { FormField } from './FormField';
import { Modal } from './Modal';

afterEach(cleanup);

describe('shared MUI workflow patterns', () => {
  it('associates unnamed select fields with unique accessible labels', () => {
    render(
      <>
        <FormField select label="First status" value="ACTIVE" onChange={() => undefined}>
          <MenuItem value="ACTIVE">Active</MenuItem>
        </FormField>
        <FormField select label="Second status" value="ACTIVE" onChange={() => undefined}>
          <MenuItem value="ACTIVE">Active</MenuItem>
        </FormField>
      </>,
    );

    const first = screen.getByLabelText('First status');
    const second = screen.getByLabelText('Second status');
    expect(first).toHaveAttribute('id');
    expect(second).toHaveAttribute('id');
    expect(first.id).not.toBe(second.id);
  });

  it('gives each open modal unique accessible title and description references', () => {
    render(
      <>
        <Modal open onClose={() => undefined} title="First dialog" description="First description"><div>First content</div></Modal>
        <Modal open onClose={() => undefined} title="Second dialog" description="Second description"><div>Second content</div></Modal>
      </>,
    );

    const dialogs = screen.getAllByRole('dialog', { hidden: true });
    const titleIds = dialogs.map((dialog) => dialog.getAttribute('aria-labelledby'));
    const descriptionIds = dialogs.map((dialog) => dialog.getAttribute('aria-describedby'));
    expect(new Set(titleIds).size).toBe(2);
    expect(new Set(descriptionIds).size).toBe(2);
    titleIds.forEach((id) => expect(document.querySelectorAll(`#${id}`)).toHaveLength(1));
    descriptionIds.forEach((id) => expect(document.querySelectorAll(`#${id}`)).toHaveLength(1));
  });

  it('keeps passive rows non-interactive and supports keyboard activation for clickable rows', () => {
    const columns = [{ field: 'name', header: 'Name' }];
    const data = [{ id: 'patient-1', name: 'Ana Santos' }];
    const { rerender } = render(<DataTable columns={columns} data={data} pagination={false} />);

    const passiveRow = screen.getByRole('row', { name: 'Ana Santos' });
    expect(passiveRow).not.toHaveAttribute('role', 'button');
    expect(passiveRow).not.toHaveAttribute('aria-selected');

    const onRowClick = vi.fn();
    rerender(<DataTable columns={columns} data={data} pagination={false} onRowClick={onRowClick} />);
    const activeRow = screen.getByRole('button', { name: 'Ana Santos' });
    fireEvent.keyDown(activeRow, { key: 'Enter' });
    expect(onRowClick).toHaveBeenCalledWith(data[0]);
  });
});
