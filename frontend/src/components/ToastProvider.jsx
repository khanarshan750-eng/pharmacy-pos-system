// frontend/src/components/ToastProvider.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import logo from '../assets/logo.ico';

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

export default function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((options) => {
    // options: { type: 'loading' | 'success' | 'error' | 'info', title, message, duration }
    const {
      type = 'info',
      title = '',
      message = '',
      duration = 1800
    } = options || {};

      // loading wale ko auto-hide mat karo (jab tak manually close na karein)
    if (type === 'loading') {
      setToast({ type, title, message, autoClose: false });
    } else {
      setToast({ type, title, message, autoClose: true });
      if (duration > 0) {
        setTimeout(() => {
          setToast((current) => {
            if (!current) return null;
            if (current.type === type && current.title === title && current.message === message) {
              return null;
            }
            return current;
          });
        }, duration);
      }
    }
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  const value = { showToast, hideToast };

  const getBorderColor = () => {
    if (!toast) return '#e5e7eb';
    switch (toast.type) {
      case 'success':
        return '#22c55e';
      case 'error':
        return '#ef4444';
      case 'loading':
        return '#3b82f6';
      case 'info':
      default:
        return '#6366f1';
    }
  };

  const getTitleColor = () => {
    if (!toast) return '#111827';
    switch (toast.type) {
      case 'success':
        return '#16a34a';
      case 'error':
        return '#b91c1c';
      case 'loading':
        return '#1d4ed8';
      case 'info':
      default:
        return '#111827';
    }
  };

    return (
    <ToastContext.Provider value={value}>
      {children}

      {toast && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 99999,
            background: 'transparent'
          }}
        >
          {/* Center content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              pointerEvents: 'auto'
            }}
          >
            {/* Pulse circle + logo */}
            <div
              style={{
                position: 'relative',
                width: 80,
                height: 80
              }}
            >
              {/* outer pulse ring */}
              {toast.type !== 'error' && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '999px',
                    background:
                      toast.type === 'success'
                        ? 'rgba(34,197,94,0.16)'
                        : toast.type === 'loading'
                        ? 'rgba(59,130,246,0.16)'
                        : 'rgba(99,102,241,0.16)',
                    animation: 'toast-pulse 1.4s ease-out infinite'
                  }}
                />
              )}

              {/* inner solid circle */}
              <div
                style={{
                  position: 'absolute',
                  inset: 10,
                  borderRadius: '999px',
                  background: 'white',
                  boxShadow: '0 8px 18px rgba(15,23,42,0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {/* logo or simple icon */}
                <img
                  src={logo}
                  alt="Brand"
                  style={{
                    width: 40,
                    height: 40,
                    objectFit: 'contain',
                    opacity: toast.type === 'loading' ? 0.75 : 1
                  }}
                />

                {/* small loader ring when loading */}
                {toast.type === 'loading' && (
                  <div
                    style={{
                      position: 'absolute',
                      width: 56,
                      height: 56,
                      borderRadius: '999px',
                      border: '2px solid rgba(209,213,219,0.7)',
                      borderTopColor: '#3b82f6',
                      animation: 'toast-spin 0.8s linear infinite'
                    }}
                  />
                )}

                {/* error cross overlay */}
                {toast.type === 'error' && (
                  <div
                    style={{
                      position: 'absolute',
                      width: 42,
                      height: 42,
                      borderRadius: '999px',
                      background: 'rgba(239,68,68,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ef4444',
                      fontWeight: 700,
                      fontSize: 20
                    }}
                  >
                    !
                  </div>
                )}
              </div>
            </div>

            {/* Text */}
            <div
              style={{
                textAlign: 'center',
                maxWidth: 260
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color:
                    toast.type === 'success'
                      ? '#16a34a'
                      : toast.type === 'error'
                      ? '#b91c1c'
                      : toast.type === 'loading'
                      ? '#1d4ed8'
                      : '#111827'
                }}
              >
                {toast.title ||
                  (toast.type === 'success'
                    ? 'Done successfully'
                    : toast.type === 'error'
                    ? 'Something went wrong'
                    : toast.type === 'loading'
                    ? 'Please wait'
                    : 'Notification')}
              </div>
              {toast.message && (
                <div
                  style={{
                    fontSize: 12,
                    color: '#6b7280',
                    marginTop: 4
                  }}
                >
                  {toast.message}
                </div>
              )}
            </div>

            {/* Dismiss hint (only for non-loading) */}
            {toast.type !== 'loading' && (
              <button
                type="button"
                onClick={hideToast}
                style={{
                  marginTop: 4,
                  border: 'none',
                  background: 'transparent',
                  fontSize: 11,
                  color: '#9ca3af',
                  cursor: 'pointer'
                }}
              >
                tap to dismiss
              </button>
            )}
          </div>

          {/* animations */}
          <style>
            {`
              @keyframes toast-pulse {
                0% {
                  transform: scale(0.9);
                  opacity: 0.6;
                }
                70% {
                  transform: scale(1.15);
                  opacity: 0;
                }
                100% {
                  transform: scale(1.15);
                  opacity: 0;
                }
              }
              @keyframes toast-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
          </style>
        </div>
      )}
    </ToastContext.Provider>
  );
}