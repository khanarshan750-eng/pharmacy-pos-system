import { useState } from 'react';
import { API_BASE } from './config';
import { useToast } from './ToastProvider';

export default function Login({ onLogin }) {
  const { showToast, hideToast } = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // loading toast
    showToast({
      type: 'loading',
      title: 'Signing in',
      message: 'Checking your credentials...'
    });
    setLoading(true);

    setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        hideToast();

        if (data.success) {
          showToast({
            type: 'success',
            title: 'Login successful',
            message: 'Welcome back, admin.'
          });
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('authToken', 'logged-in');
          onLogin();
        } else {
          const msg = data.message || 'Invalid username or password';
          setError(msg);
          showToast({
            type: 'error',
            title: 'Login failed',
            message: msg
          });
        }
      } catch (err) {
        hideToast();
        setError('Server connection error. Is backend running?');
        showToast({
          type: 'error',
          title: 'Server error',
          message: 'Could not connect to server. Please try again.'
        });
      } finally {
        setLoading(false);
      }
    }, 950);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '16px',
        background:
          'linear-gradient(135deg, #e0f4ff 0%, #f5f7fa 40%, #fefefe 100%)',
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          background: 'white',
          padding: '28px 24px 22px',
          borderRadius: '16px',
          boxShadow: '0 18px 45px rgba(15, 23, 42, 0.18)',
          width: '100%',
          maxWidth: '360px',
          border: '1px solid #e5e7eb',
          boxSizing: 'border-box'
        }}
      >
        {/* Brand / title */}
        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 14px',
              background: '#07661a',
              borderRadius: 999,
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              boxShadow: '0 6px 16px rgba(7, 102, 26, 0.35)',
              marginBottom: '6px'
            }}
          >
            Ilyas Medical Store
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: '20px',
              color: '#111827'
            }}
          >
            Admin sign in
          </h1>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: '12px',
              color: '#6b7280'
            }}
          >
            Enter your credentials to access the dashboard.
          </p>
        </div>

        {error && (
          <div
            style={{
              marginBottom: '14px',
              padding: '8px 10px',
              borderRadius: '8px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              fontSize: '13px',
              color: '#b91c1c',
              textAlign: 'left'
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Username */}
          <div style={{ marginBottom: '10px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '4px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#4b5563'
              }}
            >
              Username
            </label>
            <input
              type="text"
              placeholder="e.g. admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 11px',
                borderRadius: '10px',
                border: '1px solid #d1d5db',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              disabled={loading}
              required
            />
          </div>

          {/* Password + show/hide */}
          <div style={{ marginBottom: '4px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '4px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#4b5563'
              }}
            >
              Password
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                borderRadius: '10px',
                border: '1px solid #d1d5db',
                paddingRight: '8px',
                background: '#f9fafb'
              }}
            >
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 11px',
                  border: 'none',
                  outline: 'none',
                  fontSize: '14px',
                  background: 'transparent'
                }}
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                disabled={loading}
                style={{
                  border: 'none',
                  background: 'none',
                  fontSize: '11px',
                  color: '#4b5563',
                  cursor: loading ? 'default' : 'pointer'
                }}
              >
                {showPass ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Optional hint spacer */}
          <div
            style={{
              fontSize: '11px',
              color: '#9ca3af',
              marginTop: '4px',
              marginBottom: '10px',
              minHeight: '14px'
            }}
          />

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '11px',
              background: loading ? '#9ca3af' : '#111827',
              color: 'white',
              border: 'none',
              borderRadius: '999px',
              fontSize: '14px',
              marginTop: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p
          style={{
            textAlign: 'center',
            marginTop: '18px',
            fontSize: '11px',
            color: '#9ca3af'
          }}
        >
          Local pharmacy panel • Secure access only
        </p>
      </div>
    </div>
  );
}