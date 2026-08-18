import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StockAdjustModal from '../StockAdjustModal';

jest.mock('../../../api/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), patch: jest.fn() },
}));

// eslint-disable-next-line import/first
import apiClient from '../../../api/apiClient';

const product = { id: 'prod_1', name: 'Heavy Duty Mud Flap', brand: 'Advika' };

const stockResponse = (stock) => ({ data: { data: { id: 'prod_1', stock } } });

describe('StockAdjustModal', () => {
  beforeEach(() => {
    apiClient.get.mockReset();
    apiClient.patch.mockReset();
  });

  it('loads the authoritative current stock on open, not a value passed in', async () => {
    apiClient.get.mockResolvedValue(stockResponse(42));

    render(<StockAdjustModal product={product} onClose={jest.fn()} onSuccess={jest.fn()} />);

    expect(screen.getByText(/loading current stock/i)).toBeInTheDocument();
    expect(await screen.findByText('42')).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith('/api/inventory/prod_1');
  });

  it('shows an error with retry when the current stock fails to load', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('network down'));
    render(<StockAdjustModal product={product} onClose={jest.fn()} onSuccess={jest.fn()} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/failed to load current stock/i);

    apiClient.get.mockResolvedValueOnce(stockResponse(10));
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(await screen.findByText('10')).toBeInTheDocument();
  });

  it('applies a small increment directly, without a confirmation step, and reports the backend result', async () => {
    apiClient.get.mockResolvedValue(stockResponse(10));
    apiClient.patch.mockResolvedValue(stockResponse(15));
    const onSuccess = jest.fn();

    render(<StockAdjustModal product={product} onClose={jest.fn()} onSuccess={onSuccess} />);
    await screen.findByText('10');

    await userEvent.type(screen.getByLabelText(/quantity/i), '5');
    await userEvent.click(screen.getByRole('button', { name: /^apply$/i }));

    await waitFor(() =>
      expect(apiClient.patch).toHaveBeenCalledWith('/api/inventory/prod_1', {
        action: 'increment',
        quantity: 5,
        expectedStock: 10,
      })
    );
    expect(onSuccess).toHaveBeenCalledWith({ id: 'prod_1', stock: 15 });
  });

  it('requires explicit confirmation for a decrement before it calls the backend', async () => {
    apiClient.get.mockResolvedValue(stockResponse(10));
    apiClient.patch.mockResolvedValue(stockResponse(7));
    const onSuccess = jest.fn();

    render(<StockAdjustModal product={product} onClose={jest.fn()} onSuccess={onSuccess} />);
    await screen.findByText('10');

    await userEvent.selectOptions(screen.getByLabelText(/action/i), 'decrement');
    await userEvent.type(screen.getByLabelText(/quantity/i), '3');
    await userEvent.click(screen.getByRole('button', { name: /^apply$/i }));

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/confirm stock correction/i)).toBeInTheDocument();
    expect(apiClient.patch).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole('button', { name: /confirm correction/i }));

    await waitFor(() =>
      expect(apiClient.patch).toHaveBeenCalledWith('/api/inventory/prod_1', {
        action: 'decrement',
        quantity: 3,
        expectedStock: 10,
      })
    );
    expect(onSuccess).toHaveBeenCalledWith({ id: 'prod_1', stock: 7 });
  });

  it('requires confirmation for a large increase even though increments are usually applied directly', async () => {
    apiClient.get.mockResolvedValue(stockResponse(10));
    render(<StockAdjustModal product={product} onClose={jest.fn()} onSuccess={jest.fn()} />);
    await screen.findByText('10');

    await userEvent.type(screen.getByLabelText(/quantity/i), '500');
    await userEvent.click(screen.getByRole('button', { name: /^apply$/i }));

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(apiClient.patch).not.toHaveBeenCalled();
  });

  it('cancelling the confirmation dialog does not call the backend', async () => {
    apiClient.get.mockResolvedValue(stockResponse(10));
    render(<StockAdjustModal product={product} onClose={jest.fn()} onSuccess={jest.fn()} />);
    await screen.findByText('10');

    await userEvent.selectOptions(screen.getByLabelText(/action/i), 'decrement');
    await userEvent.type(screen.getByLabelText(/quantity/i), '3');
    await userEvent.click(screen.getByRole('button', { name: /^apply$/i }));

    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: /cancel/i }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(apiClient.patch).not.toHaveBeenCalled();
  });

  it('rejects a non-integer quantity before calling the backend', async () => {
    apiClient.get.mockResolvedValue(stockResponse(10));
    render(<StockAdjustModal product={product} onClose={jest.fn()} onSuccess={jest.fn()} />);
    await screen.findByText('10');

    await userEvent.type(screen.getByLabelText(/quantity/i), '2.5');
    await userEvent.click(screen.getByRole('button', { name: /^apply$/i }));

    expect(await screen.findByText(/enter a whole number/i)).toBeInTheDocument();
    expect(apiClient.patch).not.toHaveBeenCalled();
  });

  it('surfaces a stale-edit conflict with the authoritative current stock instead of retrying blindly', async () => {
    apiClient.get.mockResolvedValue(stockResponse(10));
    apiClient.patch.mockRejectedValue({
      response: { status: 409, data: { errors: { currentStock: 6 } } },
    });
    const onSuccess = jest.fn();

    render(<StockAdjustModal product={product} onClose={jest.fn()} onSuccess={onSuccess} />);
    await screen.findByText('10');

    await userEvent.type(screen.getByLabelText(/quantity/i), '5');
    await userEvent.click(screen.getByRole('button', { name: /^apply$/i }));

    expect(await screen.findByText(/stock changed to 6/i)).toBeInTheDocument();
    // The dialog reflects the fresh value and does not silently reapply.
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('re-fetches current stock when a decrement is rejected for insufficient stock', async () => {
    apiClient.get.mockResolvedValueOnce(stockResponse(10)).mockResolvedValueOnce(stockResponse(2));
    apiClient.patch.mockRejectedValue({
      response: { status: 409, data: { errors: { insufficientItems: [{ productId: 'prod_1', quantity: 8 }] } } },
    });

    render(<StockAdjustModal product={product} onClose={jest.fn()} onSuccess={jest.fn()} />);
    await screen.findByText('10');

    await userEvent.selectOptions(screen.getByLabelText(/action/i), 'decrement');
    await userEvent.type(screen.getByLabelText(/quantity/i), '8');
    await userEvent.click(screen.getByRole('button', { name: /^apply$/i }));

    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: /confirm correction/i }));

    expect(await screen.findByText(/not enough stock available/i)).toBeInTheDocument();
    expect(await screen.findByText('2')).toBeInTheDocument();
  });

  it('cancel closes the modal without calling the backend', async () => {
    apiClient.get.mockResolvedValue(stockResponse(10));
    const onClose = jest.fn();
    render(<StockAdjustModal product={product} onClose={onClose} onSuccess={jest.fn()} />);
    await screen.findByText('10');

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onClose).toHaveBeenCalled();
    expect(apiClient.patch).not.toHaveBeenCalled();
  });
});
