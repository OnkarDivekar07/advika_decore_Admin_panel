import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBoundary from '../ErrorBoundary';

// Deliberately-crashing component used to trigger the boundary.
const Bomb = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('kaboom');
  }
  return <div>All good</div>;
};

describe('ErrorBoundary', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    // React logs the caught error to console.error itself (in addition
    // to this boundary's own componentDidCatch log) — silence both so
    // the expected-crash tests don't spam the test output.
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('renders a fallback UI when a child throws during render', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.queryByText('All good')).not.toBeInTheDocument();
  });

  it('logs the caught error', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Admin panel crashed:',
      expect.any(Error),
      expect.anything()
    );
  });

  it('uses a custom fallback title when provided', () => {
    render(
      <ErrorBoundary fallbackTitle="This page crashed">
        <Bomb shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText('This page crashed')).toBeInTheDocument();
  });

  it('offers a "Try again" button that resets the boundary', async () => {
    const { rerender } = render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Fix the underlying condition, then reset — a real re-render after
    // "Try again" would only recover if whatever caused the crash is no
    // longer true, exactly like this.
    rerender(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    );

    await userEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('offers a "Reload page" button', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
  });
});
