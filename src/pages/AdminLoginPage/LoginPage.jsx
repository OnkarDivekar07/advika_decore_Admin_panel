// src/pages/AdminLoginPage/LoginPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../../component/Adminlogin/Logo';
import InputField from '../../component/Adminlogin/InputField';
import SubmitButton from '../../component/Adminlogin/SubmitButton';
import { useAuth } from '../../context/AuthContext';

// Maps the shapes POST /api/admin/login can actually return (see
// backend/src/modules/admin/admin.controller.js + admin.validation.js)
// to a message worth showing an admin trying to sign in. Kept as a pure
// function so it's easy to unit test independent of the component.
export function getLoginErrorMessage(err) {
  // No `err.response` means the request never got a response at all —
  // DNS failure, offline, CORS, server down, timeout, etc. — as opposed
  // to the server responding with an error status.
  if (!err.response) {
    return 'Network error. Please check your connection and try again.';
  }

  const { status, data } = err.response;

  if (status === 422 && Array.isArray(data?.errors) && data.errors.length) {
    // express-validator field errors, shaped as { field, message } by
    // validateRequest.js.
    return data.errors.map((e) => e.message).join(' ');
  }

  if (status === 401) {
    return data?.message || 'Invalid email or password.';
  }

  if (status === 429) {
    return (
      data?.message || 'Too many login attempts. Please try again later.'
    );
  }

  return data?.message || 'Login failed. Please try again.';
}

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login, isAuthenticated, sessionMessage, clearSessionMessage } =
    useAuth();

  // An admin whose session just expired/was rejected lands back here with
  // a reason (see AuthContext) — surface it once, then let the normal
  // error state take over on the next submit.
  const [notice, setNotice] = useState(sessionMessage || '');
  useEffect(() => {
    if (sessionMessage) {
      setNotice(sessionMessage);
      clearSessionMessage();
    }
    // Only meant to run when a new session message arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionMessage]);

  // Already logged in (e.g. token still valid from an earlier tab/visit) —
  // don't show the login form.
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Belt-and-braces duplicate-submit guard alongside the disabled button:
  // a ref (not state) so a second submit event fired in the same tick
  // (e.g. Enter + click landing together) can't slip through before a
  // re-render disables the button.
  const submittingRef = useRef(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;

    submittingRef.current = true;
    setError('');
    setNotice('');
    setLoading(true);

    try {
      await login(formData);
      navigate('/dashboard');
    } catch (err) {
      setError(getLoginErrorMessage(err));
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <Logo />
        <h1 className="text-3xl font-semibold text-center text-gray-900 mb-6">
          Admin Panel Login
        </h1>

        {notice && !error && (
          <p
            className="mb-4 text-amber-600 text-center font-medium"
            role="status"
            data-testid="login-session-notice"
          >
            {notice}
          </p>
        )}

        {error && (
          <p className="mb-4 text-red-600 text-center font-medium" role="alert" data-testid="login-error">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-8" noValidate data-testid="login-form">
          <InputField
            label="Email address"
            type="email"
            name="email"
            placeholder="admin@example.com"
            iconClass="fas fa-envelope"
            value={formData.email}
            onChange={handleChange}
            data-testid="login-email-input"
          />
          <InputField
            label="Password"
            type="password"
            name="password"
            placeholder="••••••••"
            iconClass="fas fa-lock"
            value={formData.password}
            onChange={handleChange}
            data-testid="login-password-input"
          />
          <SubmitButton
            text={loading ? 'Logging in...' : 'Login'}
            disabled={loading}
            data-testid="login-submit-btn"
          />
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          © 2024 Admin Panel. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
