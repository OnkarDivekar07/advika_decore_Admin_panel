import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductForm from '../ProductForm';

// ProductForm talks to the real apiClient module (both directly, and
// indirectly through api/productJobs.js's waitForProductJob) — mock
// apiClient itself so both call sites are covered by one mock, the same
// boundary the component actually sees.
jest.mock('../../../api/apiClient', () => {
  const fn = jest.fn();
  fn.get = jest.fn();
  return { __esModule: true, default: fn };
});

// eslint-disable-next-line import/first
import apiClient from '../../../api/apiClient';

const validFields = {
  name: 'Heavy Duty Mud Flap',
  brand: 'Advika',
  price: '299.99',
  stock: '15',
  description: 'A durable mud flap.',
};

const fillValidForm = async () => {
  await userEvent.type(screen.getByLabelText('Product name'), validFields.name);
  await userEvent.type(screen.getByLabelText('Brand'), validFields.brand);
  await userEvent.type(screen.getByLabelText(/price/i), validFields.price);
  await userEvent.type(screen.getByLabelText('Stock quantity'), validFields.stock);
  await userEvent.type(screen.getByLabelText('Description'), validFields.description);
  await userEvent.click(screen.getByLabelText('Truck'));

  const file = new File(['fake-bytes'], 'shoe.jpg', { type: 'image/jpeg' });
  const fileInput = document.querySelector('input[type="file"]');
  await userEvent.upload(fileInput, file);
};

describe('ProductForm', () => {
  beforeEach(() => {
    apiClient.mockReset();
    apiClient.get.mockReset();
  });

  it('shows client-side validation errors and does not call the API when required fields are missing', async () => {
    render(<ProductForm onClose={jest.fn()} onSuccess={jest.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /add product/i }));

    expect(await screen.findByText('Product name is required')).toBeInTheDocument();
    expect(screen.getByText('Brand is required')).toBeInTheDocument();
    expect(screen.getByText('At least one product image is required')).toBeInTheDocument();
    expect(apiClient).not.toHaveBeenCalled();
  });

  it('requires at least one image on create even when every other field is valid', async () => {
    render(<ProductForm onClose={jest.fn()} onSuccess={jest.fn()} />);

    await userEvent.type(screen.getByLabelText('Product name'), validFields.name);
    await userEvent.type(screen.getByLabelText('Brand'), validFields.brand);
    await userEvent.type(screen.getByLabelText(/price/i), validFields.price);
    await userEvent.type(screen.getByLabelText('Stock quantity'), validFields.stock);
    await userEvent.type(screen.getByLabelText('Description'), validFields.description);
    await userEvent.click(screen.getByLabelText('Truck'));

    await userEvent.click(screen.getByRole('button', { name: /add product/i }));

    expect(await screen.findByText('At least one product image is required')).toBeInTheDocument();
    expect(apiClient).not.toHaveBeenCalled();
  });

  it('does not require an image when editing (existing images may be kept)', async () => {
    apiClient.mockResolvedValue({ data: { data: { jobId: 'job_1' } } });
    apiClient.get.mockResolvedValue({
      data: { data: { jobId: 'job_1', state: 'completed', result: { id: 'p1', images: [] } } },
    });

    const onSuccess = jest.fn();
    render(
      <ProductForm
        initialData={{
          id: 'p1',
          name: 'Old Name',
          brand: 'Advika',
          price: 100,
          stock: 5,
          description: 'desc',
          category: ['Truck'],
          isNewArrival: false,
        }}
        onClose={jest.fn()}
        onSuccess={onSuccess}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /update product/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(apiClient).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'patch', url: '/api/products/p1' })
    );
  });

  it('sends category as a single comma-joined field, not category[] entries', async () => {
    apiClient.mockResolvedValue({ data: { data: { jobId: 'job_1' } } });
    apiClient.get.mockResolvedValue({
      data: { data: { jobId: 'job_1', state: 'completed', result: { id: 'p1', images: [] } } },
    });

    render(<ProductForm onClose={jest.fn()} onSuccess={jest.fn()} />);
    await fillValidForm();
    await userEvent.click(screen.getByLabelText('Car'));

    await userEvent.click(screen.getByRole('button', { name: /add product/i }));

    await waitFor(() => expect(apiClient).toHaveBeenCalled());
    const call = apiClient.mock.calls[0][0];
    const formData = call.data;
    expect(formData.get('category')).toBe('Truck,Car');
    expect(formData.getAll('category[]')).toHaveLength(0);
  });

  it('uses PATCH (never PUT) for updates', async () => {
    apiClient.mockResolvedValue({ data: { data: { jobId: 'job_2' } } });
    apiClient.get.mockResolvedValue({
      data: { data: { jobId: 'job_2', state: 'completed', result: { id: 'p9', images: [] } } },
    });

    render(
      <ProductForm
        initialData={{
          id: 'p9',
          name: 'Old Name',
          brand: 'Advika',
          price: 100,
          stock: 5,
          description: 'desc',
          category: ['Truck'],
          isNewArrival: false,
        }}
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /update product/i }));

    await waitFor(() => expect(apiClient).toHaveBeenCalled());
    expect(apiClient.mock.calls[0][0].method).toBe('patch');
  });

  it('polls the job status endpoint and calls onSuccess once the job completes', async () => {
    apiClient.mockResolvedValue({ data: { data: { jobId: 'job_3' } } });
    apiClient.get
      .mockResolvedValueOnce({ data: { data: { jobId: 'job_3', state: 'active' } } })
      .mockResolvedValueOnce({
        data: {
          data: { jobId: 'job_3', state: 'completed', result: { id: 'p1', images: ['url'] } },
        },
      });

    const onSuccess = jest.fn();
    render(<ProductForm onClose={jest.fn()} onSuccess={onSuccess} />);
    await fillValidForm();

    await userEvent.click(screen.getByRole('button', { name: /add product/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ id: 'p1', images: ['url'] }), {
      timeout: 5000,
    });
    expect(apiClient.get).toHaveBeenCalledWith('/api/products/jobs/job_3', expect.anything());
  });

  it('shows an inline error (not onSuccess) when the job fails', async () => {
    apiClient.mockResolvedValue({ data: { data: { jobId: 'job_4' } } });
    apiClient.get.mockResolvedValue({
      data: { data: { jobId: 'job_4', state: 'failed', failedReason: 'S3 upload timed out' } },
    });

    const onSuccess = jest.fn();
    render(<ProductForm onClose={jest.fn()} onSuccess={onSuccess} />);
    await fillValidForm();

    await userEvent.click(screen.getByRole('button', { name: /add product/i }));

    expect(await screen.findByText('S3 upload timed out')).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('maps backend field-level validation errors (422) onto the matching inputs', async () => {
    apiClient.mockRejectedValue({
      response: {
        status: 422,
        data: {
          message: 'Validation failed',
          errors: [
            { field: 'name', message: 'Product name contains invalid characters' },
            { field: 'price', message: 'Price must be a number greater than 0' },
          ],
        },
      },
    });

    render(<ProductForm onClose={jest.fn()} onSuccess={jest.fn()} />);
    await fillValidForm();

    await userEvent.click(screen.getByRole('button', { name: /add product/i }));

    expect(await screen.findByText('Product name contains invalid characters')).toBeInTheDocument();
    expect(screen.getByText('Price must be a number greater than 0')).toBeInTheDocument();
  });

  it('prevents a duplicate submission while a save is already in flight', async () => {
    // Never resolves — this test only cares that a second/third click
    // while the first save is still pending doesn't fire a second
    // request; it doesn't need the request to ever complete.
    apiClient.mockReturnValue(new Promise(() => {}));

    render(<ProductForm onClose={jest.fn()} onSuccess={jest.fn()} />);
    await fillValidForm();

    const submitButton = screen.getByRole('button', { name: /add product/i });
    await userEvent.click(submitButton);
    await userEvent.click(submitButton);
    await userEvent.click(submitButton);

    expect(apiClient).toHaveBeenCalledTimes(1);
  });

  it('clears a field error as soon as the admin edits that field again', async () => {
    render(<ProductForm onClose={jest.fn()} onSuccess={jest.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /add product/i }));
    expect(await screen.findByText('Product name is required')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Product name'), 'A');
    expect(screen.queryByText('Product name is required')).not.toBeInTheDocument();
  });
});
