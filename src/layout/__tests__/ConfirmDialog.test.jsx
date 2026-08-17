import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmDialog from '../ConfirmDialog';

describe('ConfirmDialog', () => {
  it('renders nothing when closed', () => {
    render(<ConfirmDialog open={false} title="Delete?" onConfirm={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('renders the title, message, and error when open', () => {
    render(
      <ConfirmDialog
        open
        title="Delete this product?"
        message="This can't be undone."
        error="Failed to delete product."
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Delete this product?')).toBeInTheDocument();
    expect(screen.getByText("This can't be undone.")).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to delete product.');
  });

  it('calls onConfirm when the confirm button is clicked', async () => {
    const onConfirm = jest.fn();
    render(<ConfirmDialog open title="Delete?" onConfirm={onConfirm} onCancel={jest.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when the cancel button is clicked', async () => {
    const onCancel = jest.fn();
    render(<ConfirmDialog open title="Delete?" onConfirm={jest.fn()} onCancel={onCancel} />);

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when clicking the backdrop', async () => {
    const onCancel = jest.fn();
    render(<ConfirmDialog open title="Delete?" onConfirm={jest.fn()} onCancel={onCancel} />);

    await userEvent.click(screen.getByRole('presentation'));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('disables both buttons and shows a working state while confirming', () => {
    render(
      <ConfirmDialog open title="Delete?" isConfirming onConfirm={jest.fn()} onCancel={jest.fn()} />
    );

    expect(screen.getByRole('button', { name: /working/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
  });

  it('does not call onCancel from the backdrop while confirming', async () => {
    const onCancel = jest.fn();
    render(
      <ConfirmDialog open title="Delete?" isConfirming onConfirm={jest.fn()} onCancel={onCancel} />
    );

    await userEvent.click(screen.getByRole('presentation'));

    expect(onCancel).not.toHaveBeenCalled();
  });
});
