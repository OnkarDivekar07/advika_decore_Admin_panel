import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BannerManagement from '../bannerManagemen';

// BannerManagement calls apiClient both as apiClient.get/.delete AND as
// apiClient({...}) directly (for the upload, so onUploadProgress can be
// passed through) — mock apiClient itself so both call shapes hit the
// same mock, the same boundary the component actually sees.
jest.mock('../../../api/apiClient', () => {
  const fn = jest.fn();
  fn.get = jest.fn();
  fn.delete = jest.fn();
  return { __esModule: true, default: fn };
});

// eslint-disable-next-line import/first
import apiClient from '../../../api/apiClient';

const buildBanner = (overrides = {}) => ({
  id: 'banner_1',
  imageUrl: 'https://bucket.s3.ap-south-1.amazonaws.com/banner-images/foo.jpg',
  linkUrl: 'https://advika.com/sale',
  ...overrides,
});

const listResponse = (data) => ({ data: { data, meta: { total: data.length } } });

describe('BannerManagement', () => {
  beforeEach(() => {
    apiClient.mockReset();
    apiClient.get.mockReset();
    apiClient.delete.mockReset();
  });

  it('uses the real GET /api/homepage/banners endpoint and shows the live list', async () => {
    apiClient.get.mockResolvedValue(listResponse([buildBanner()]));

    render(<BannerManagement />);

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/api/homepage/banners'));
    expect(await screen.findByAltText('Banner')).toHaveAttribute(
      'src',
      'https://bucket.s3.ap-south-1.amazonaws.com/banner-images/foo.jpg'
    );
  });

  it('shows a loading state, then an empty state when there are no banners', async () => {
    apiClient.get.mockResolvedValue(listResponse([]));

    render(<BannerManagement />);

    expect(screen.getByText(/loading banners/i)).toBeInTheDocument();
    expect(await screen.findByText(/no banners yet/i)).toBeInTheDocument();
  });

  it('shows an error state with a working retry', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('network down'));
    render(<BannerManagement />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/failed to load banners/i);

    apiClient.get.mockResolvedValueOnce(listResponse([buildBanner()]));
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(await screen.findByAltText('Banner')).toBeInTheDocument();
  });

  it('rejects a non-image file before ever calling the upload endpoint', async () => {
    apiClient.get.mockResolvedValue(listResponse([]));
    render(<BannerManagement />);
    await screen.findByText(/no banners yet/i);

    const badFile = new File(['not an image'], 'notes.txt', { type: 'text/plain' });
    const fileInput = document.querySelector('#banner-image-input');
    await userEvent.upload(fileInput, badFile);

    expect(await screen.findByText(/please select an image file/i)).toBeInTheDocument();
    expect(apiClient).not.toHaveBeenCalled();
  });

  it('rejects a file over 5MB before ever calling the upload endpoint', async () => {
    apiClient.get.mockResolvedValue(listResponse([]));
    render(<BannerManagement />);
    await screen.findByText(/no banners yet/i);

    const bigFile = new File([new ArrayBuffer(6 * 1024 * 1024)], 'huge.jpg', { type: 'image/jpeg' });
    const fileInput = document.querySelector('#banner-image-input');
    await userEvent.upload(fileInput, bigFile);

    expect(await screen.findByText(/under 5mb/i)).toBeInTheDocument();
    expect(apiClient).not.toHaveBeenCalled();
  });

  it('shows an image preview once a valid file is selected', async () => {
    apiClient.get.mockResolvedValue(listResponse([]));
    render(<BannerManagement />);
    await screen.findByText(/no banners yet/i);

    const file = new File(['fake-bytes'], 'sale.jpg', { type: 'image/jpeg' });
    const fileInput = document.querySelector('#banner-image-input');
    await userEvent.upload(fileInput, file);

    expect(await screen.findByAltText('Selected banner preview')).toBeInTheDocument();
  });

  it('rejects a malformed link URL client-side without calling the upload endpoint', async () => {
    apiClient.get.mockResolvedValue(listResponse([]));
    render(<BannerManagement />);
    await screen.findByText(/no banners yet/i);

    const file = new File(['fake-bytes'], 'sale.jpg', { type: 'image/jpeg' });
    await userEvent.upload(document.querySelector('#banner-image-input'), file);
    await userEvent.type(screen.getByLabelText(/link url/i), 'not-a-url');
    await userEvent.click(screen.getByRole('button', { name: /upload banner/i }));

    expect(await screen.findByText(/must be a full url/i)).toBeInTheDocument();
    expect(apiClient).not.toHaveBeenCalled();
  });

  it('uploads via POST /api/homepage/banners and refreshes the list on success', async () => {
    apiClient.get.mockResolvedValue(listResponse([]));
    render(<BannerManagement />);
    await screen.findByText(/no banners yet/i);

    apiClient.mockResolvedValueOnce({ data: { data: { id: 'banner_new' } } });
    apiClient.get.mockResolvedValueOnce(listResponse([buildBanner({ id: 'banner_new' })]));

    const file = new File(['fake-bytes'], 'sale.jpg', { type: 'image/jpeg' });
    await userEvent.upload(document.querySelector('#banner-image-input'), file);
    await userEvent.click(screen.getByRole('button', { name: /upload banner/i }));

    await waitFor(() =>
      expect(apiClient).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'post', url: '/api/homepage/banners' })
      )
    );
    expect(await screen.findByText(/uploaded successfully/i)).toBeInTheDocument();
  });

  it('keeps the selected file after a failed upload so the admin can retry without re-picking it', async () => {
    apiClient.get.mockResolvedValue(listResponse([]));
    render(<BannerManagement />);
    await screen.findByText(/no banners yet/i);

    apiClient.mockRejectedValueOnce({ response: { data: { message: 'Upload failed' } } });

    const file = new File(['fake-bytes'], 'sale.jpg', { type: 'image/jpeg' });
    await userEvent.upload(document.querySelector('#banner-image-input'), file);
    await userEvent.click(screen.getByRole('button', { name: /upload banner/i }));

    expect(await screen.findByText('Upload failed')).toBeInTheDocument();
    expect(screen.getByAltText('Selected banner preview')).toBeInTheDocument();
  });

  it('shows a broken-image fallback instead of a dead <img> when the banner image fails to load', async () => {
    apiClient.get.mockResolvedValue(listResponse([buildBanner()]));
    render(<BannerManagement />);

    const img = await screen.findByAltText('Banner');
    img.dispatchEvent(new Event('error'));

    expect(await screen.findByLabelText(/image failed to load/i)).toBeInTheDocument();
  });

  it('asks for confirmation before deleting, and calls DELETE only after confirming', async () => {
    apiClient.get.mockResolvedValue(listResponse([buildBanner()]));
    render(<BannerManagement />);
    await screen.findByAltText('Banner');

    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toBeInTheDocument();
    expect(apiClient.delete).not.toHaveBeenCalled();

    apiClient.delete.mockResolvedValue({ data: {} });
    await userEvent.click(within(dialog).getByRole('button', { name: /^delete$/i }));

    await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith('/api/homepage/banners/banner_1'));
  });
});
