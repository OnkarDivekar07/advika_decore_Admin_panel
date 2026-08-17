import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Pagination from '../Pagination';

describe('Pagination', () => {
  it('renders nothing when there is only one page', () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} total={5} onPageChange={jest.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when there is no data', () => {
    const { container } = render(
      <Pagination page={1} totalPages={0} total={0} onPageChange={jest.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the current page and total count', () => {
    render(<Pagination page={2} totalPages={5} total={47} onPageChange={jest.fn()} />);
    expect(screen.getByText(/page 2 of 5/i)).toBeInTheDocument();
    expect(screen.getByText(/47 total/i)).toBeInTheDocument();
  });

  it('disables Previous on the first page and Next on the last page', () => {
    const { rerender } = render(
      <Pagination page={1} totalPages={3} total={30} onPageChange={jest.fn()} />
    );
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next/i })).toBeEnabled();

    rerender(<Pagination page={3} totalPages={3} total={30} onPageChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: /previous/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('calls onPageChange with the next/previous page number', async () => {
    const onPageChange = jest.fn();
    render(<Pagination page={2} totalPages={5} total={50} onPageChange={onPageChange} />);

    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(3);

    await userEvent.click(screen.getByRole('button', { name: /previous/i }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });
});
