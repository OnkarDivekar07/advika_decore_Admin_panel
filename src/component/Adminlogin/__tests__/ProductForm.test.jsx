import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

// Several tests here exercise real (unmocked) timers — waitForProductJob's
// actual 1000ms poll interval, plus userEvent.type()'s real per-keystroke
// delays across a multi-field form fill — rather than fake ones, since
// what's being verified is genuine async sequencing, not just that a
// callback eventually fires. Jest's default 5000ms per-test timeout is
// usually enough for that on a quiet machine, but this file was observed
// flaking (Jest's own "Exceeded timeout of 5000 ms" error, not a real
// assertion failure) only when run as part of the full 27-suite parallel
// run, never in isolation — CPU contention across workers, not a logic
// bug. Raised here rather than switching to fake timers, which would risk
// changing what these tests actually exercise.
jest.setTimeout(15000);

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
  await userEvent.type(screen.getByLabelText(/^price/i), validFields.price);
  await userEvent.type(screen.getByLabelText('Stock quantity'), validFields.stock);
  await userEvent.type(screen.getByLabelText('Description'), validFields.description);
  // A non-voltage-required category (Lights is the only one the
  // backend's VOLTAGE_REQUIRED_CATEGORIES covers — see
  // src/utils/productCategories.js), so this base "fill in everything
  // valid" helper never needs to also pick a voltage.
  await userEvent.click(screen.getByLabelText('Useful Items'));

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
    await userEvent.click(screen.getByLabelText('Useful Items'));

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
          category: ['Useful Items'],
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

  it(
    'sends category as a single comma-joined field, not category[] entries',
    async () => {
      apiClient.mockResolvedValue({ data: { data: { jobId: 'job_1' } } });
      apiClient.get.mockResolvedValue({
        data: { data: { jobId: 'job_1', state: 'completed', result: { id: 'p1', images: [] } } },
      });

      render(<ProductForm onClose={jest.fn()} onSuccess={jest.fn()} />);
      await fillValidForm();
      await userEvent.click(screen.getByLabelText('Tassels & Hangings'));

      await userEvent.click(screen.getByRole('button', { name: /add product/i }));

      await waitFor(() => expect(apiClient).toHaveBeenCalled());
      const call = apiClient.mock.calls[0][0];
      const formData = call.data;
      expect(formData.get('category')).toBe('Useful Items,Tassels & Hangings');
      expect(formData.getAll('category[]')).toHaveLength(0);
    },
    // fillValidForm's several userEvent.type calls plus this test's own
    // extra click are the most interaction-heavy sequence in this file —
    // real (non-fake) timers mean each keystroke costs real wall-clock
    // time, and that's evidently tight against Jest's default 5000ms on a
    // slower machine even though it fits comfortably in CI.
    15000
  );

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
          category: ['Useful Items'],
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

  it('offers the real Advika Auto category taxonomy, not the legacy vehicle-type list', () => {
    render(<ProductForm onClose={jest.fn()} onSuccess={jest.fn()} />);

    expect(screen.getByLabelText('Lights')).toBeInTheDocument();
    expect(screen.getByLabelText('Steering Cover')).toBeInTheDocument();
    expect(screen.getByLabelText('Useful Items')).toBeInTheDocument();
    expect(screen.queryByLabelText('Truck')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Tempo')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Two Wheeler')).not.toBeInTheDocument();
  });

  it('requires voltage for the voltage-required category (Lights)', async () => {
    render(<ProductForm onClose={jest.fn()} onSuccess={jest.fn()} />);

    await userEvent.type(screen.getByLabelText('Product name'), validFields.name);
    await userEvent.type(screen.getByLabelText('Brand'), validFields.brand);
    await userEvent.type(screen.getByLabelText(/^price/i), validFields.price);
    await userEvent.type(screen.getByLabelText('Stock quantity'), validFields.stock);
    await userEvent.type(screen.getByLabelText('Description'), validFields.description);
    await userEvent.click(screen.getByLabelText('Lights'));

    const file = new File(['fake-bytes'], 'light.jpg', { type: 'image/jpeg' });
    await userEvent.upload(document.querySelector('input[type="file"]'), file);

    await userEvent.click(screen.getByRole('button', { name: /add product/i }));

    expect(
      await screen.findByText('Voltage is required for Lights products')
    ).toBeInTheDocument();
    expect(apiClient).not.toHaveBeenCalled();
  });

  it('sends mrp/voltage/isBestSeller/rating when provided, and omits a blank optional numeric field entirely rather than sending an empty string', async () => {
    apiClient.mockResolvedValue({ data: { data: { jobId: 'job_5' } } });
    apiClient.get.mockResolvedValue({
      data: { data: { jobId: 'job_5', state: 'completed', result: { id: 'p1', images: [] } } },
    });

    render(<ProductForm onClose={jest.fn()} onSuccess={jest.fn()} />);
    await fillValidForm();

    await userEvent.selectOptions(screen.getByLabelText(/voltage/i), '12V');
    await userEvent.type(screen.getByLabelText(/mrp/i), '349.99');
    await userEvent.click(screen.getByLabelText(/best seller/i));
    await userEvent.type(screen.getByLabelText(/^rating/i), '4.5');
    // reviewCount deliberately left blank.

    await userEvent.click(screen.getByRole('button', { name: /add product/i }));

    await waitFor(() => expect(apiClient).toHaveBeenCalled());
    const formData = apiClient.mock.calls[0][0].data;
    expect(formData.get('voltage')).toBe('12V');
    expect(formData.get('mrp')).toBe('349.99');
    expect(formData.get('isBestSeller')).toBe('true');
    expect(formData.get('rating')).toBe('4.5');
    // The backend's plain express-validator `.optional()` only skips a
    // field when the key is entirely absent — an empty string would fail
    // isInt({ min: 0 }) instead of being treated as "not provided". See
    // OPTIONAL_NUMERIC_FIELDS in ProductForm.jsx.
    expect(formData.has('reviewCount')).toBe(false);
  });

  it(
    'builds specs/compatibility/variants JSON from the free-text inputs',
    async () => {
      apiClient.mockResolvedValue({ data: { data: { jobId: 'job_6' } } });
      apiClient.get.mockResolvedValue({
        data: { data: { jobId: 'job_6', state: 'completed', result: { id: 'p1', images: [] } } },
      });

      render(<ProductForm onClose={jest.fn()} onSuccess={jest.fn()} />);
      await fillValidForm();

      fireEvent.change(screen.getByLabelText(/specifications/i), {
        target: { value: 'Wattage: 100W\nIP Rating: IP68' },
      });
      await userEvent.type(
        screen.getByLabelText(/12v vehicles/i),
        'Tata Ace, Mahindra Bolero Pickup'
      );
      await userEvent.type(screen.getByLabelText(/24v vehicles/i), 'Tata Signa 4825');

      await userEvent.click(screen.getByRole('button', { name: /add variant group/i }));
      await userEvent.type(screen.getByLabelText(/variant group name/i), 'Wattage');
      await userEvent.type(screen.getByLabelText('Variant option label'), '72W');
      await userEvent.type(screen.getByLabelText('Variant option price'), '9999');
      await userEvent.type(screen.getByLabelText('Variant option MRP'), '12999');

      await userEvent.click(screen.getByRole('button', { name: /add product/i }));

      await waitFor(() => expect(apiClient).toHaveBeenCalled());
      const formData = apiClient.mock.calls[0][0].data;
      expect(JSON.parse(formData.get('specs'))).toEqual({ Wattage: '100W', 'IP Rating': 'IP68' });
      expect(JSON.parse(formData.get('compatibility'))).toEqual({
        '12V': ['Tata Ace', 'Mahindra Bolero Pickup'],
        '24V': ['Tata Signa 4825'],
      });
      expect(JSON.parse(formData.get('variants'))).toEqual([
        { label: 'Wattage', defaultIndex: 0, options: [{ label: '72W', price: 9999, mrp: 12999 }] },
      ]);
    },
    // Same reasoning as the timeout on the category test above — this is
    // the single most userEvent.type-heavy test in the file (fillValidForm
    // plus 6 more typed fields plus a button click), so it's the other
    // one most exposed to real-machine timing variance against Jest's
    // default 5000ms.
    15000
  );

  it('rejects a non-image file client-side before attempting an upload', async () => {
    render(<ProductForm onClose={jest.fn()} onSuccess={jest.fn()} />);

    const badFile = new File(['not an image'], 'malware.exe', { type: 'application/octet-stream' });
    await userEvent.upload(document.querySelector('input[type="file"]'), badFile);

    expect(
      await screen.findByText('"malware.exe" isn\'t an image file (JPG, PNG, or WEBP).')
    ).toBeInTheDocument();
  });

  it('rejects an oversized image file client-side before attempting an upload', async () => {
    render(<ProductForm onClose={jest.fn()} onSuccess={jest.fn()} />);

    const bigFile = new File(['x'], 'huge.jpg', { type: 'image/jpeg' });
    Object.defineProperty(bigFile, 'size', { value: 6 * 1024 * 1024 });
    await userEvent.upload(document.querySelector('input[type="file"]'), bigFile);

    expect(
      await screen.findByText('"huge.jpg" is too large — please use files under 5MB.')
    ).toBeInTheDocument();
  });
});
