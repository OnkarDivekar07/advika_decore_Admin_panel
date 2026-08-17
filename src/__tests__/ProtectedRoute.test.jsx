import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';

let mockAuthState;
jest.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

const renderProtected = () =>
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/" element={<div>Login Page</div>} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div>Secret Admin Content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );

describe('ProtectedRoute', () => {
  it('redirects to / when there is no authenticated session', () => {
    mockAuthState = { isAuthenticated: false, isCheckingSession: false };
    renderProtected();

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Secret Admin Content')).not.toBeInTheDocument();
  });

  it('renders the protected content once authenticated', () => {
    mockAuthState = { isAuthenticated: true, isCheckingSession: false };
    renderProtected();

    expect(screen.getByText('Secret Admin Content')).toBeInTheDocument();
  });

  it('shows a checking state instead of redirecting while the backend session check is in flight', () => {
    mockAuthState = { isAuthenticated: false, isCheckingSession: true };
    renderProtected();

    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    expect(screen.queryByText('Secret Admin Content')).not.toBeInTheDocument();
    expect(screen.getByText(/checking session/i)).toBeInTheDocument();
  });
});
