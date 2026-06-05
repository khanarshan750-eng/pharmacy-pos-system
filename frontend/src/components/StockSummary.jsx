import React, { useState, useEffect } from 'react';
import { API_BASE } from './config';
import { useToast } from './ToastProvider';

export default function StockSummary({ summary, products = [] }) {
  const { showToast, hideToast } = useToast();

  const [salesSummary, setSalesSummary] = useState(null);
  const [showProfit, setShowProfit] = useState(() => {
    return localStorage.getItem('showProfit') !== 'false';
  });

  // Reset sales modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

  // Change password modal state
  const [showChangePassModal, setShowChangePassModal] = useState(false);
  const [cpUser, setCpUser] = useState('');
  const [cpOldPass, setCpOldPass] = useState('');
  const [cpNewPass, setCpNewPass] = useState('');
  const [cpLoading, setCpLoading] = useState(false);
  const [cpError, setCpError] = useState('');

  const fetchSalesSummary = () => {
    fetch(`${API_BASE}/sales-summary`)
      .then((res) => res.json())
      .then((data) => setSalesSummary(data))
      .catch((err) => console.error('Failed to fetch sales summary', err));
  };

  useEffect(() => {
    localStorage.setItem('showProfit', showProfit);
  }, [showProfit]);

  useEffect(() => {
    fetchSalesSummary();
  }, []);

  if (!summary) {
    return (
      <div
        style={{
          background: 'var(--bg-card)',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: 'var(--shadow-card)',
          border: '1px solid var(--border-subtle)',
          marginTop: '20px',
          fontSize: '13px',
          color: 'var(--text-muted)',
          boxSizing: 'border-box'
        }}
      >
        Loading summary...
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getMonthDiff = (from, to) => {
    let months = (to.getFullYear() - from.getFullYear()) * 12;
    months -= from.getMonth();
    months += to.getMonth();
    return months;
  };

  const enrichedProducts = products.map((p) => {
    const expiry = p.expiryDate ? new Date(p.expiryDate) : null;
    if (!expiry || isNaN(expiry.getTime())) {
      return {
        ...p,
        monthsLeft: null,
        isExpired: false,
        isNearExpiry: false
      };
    }

    expiry.setHours(0, 0, 0, 0);

    const monthsLeft = getMonthDiff(today, expiry);
    const isExpired = expiry < today;
    const isNearExpiry = !isExpired && monthsLeft <= 7;

    return {
      ...p,
      monthsLeft,
      isExpired,
      isNearExpiry
    };
  });

  const expiredProducts = enrichedProducts.filter((p) => p.isExpired);
  const nearExpiryProducts = enrichedProducts.filter((p) => p.isNearExpiry);

  const totalValue = summary.totalValue || 0;
  const currentStockProfit = summary.totalProfit || 0;
  const salesProfit = salesSummary ? salesSummary.totalSalesProfit : 0;
  const grandTotalProfit = currentStockProfit + salesProfit;

  const cardStyle = {
    background: 'var(--bg-card)',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: 'var(--shadow-card)',
    border: '1px solid var(--border-subtle)',
    marginTop: '20px',
    boxSizing: 'border-box',
    position: 'relative',
    color: 'var(--text-main)'
  };

  const statCardStyle = {
    background: 'rgba(148, 163, 184, 0.08)',
    padding: '14px',
    borderRadius: '10px',
    border: '1px solid var(--border-subtle)'
  };

  // Reset sales profit
  const handleResetSalesProfit = async (e) => {
    e && e.preventDefault();
    setResetError('');

    if (!adminUser || !adminPass) {
      setResetError('Username and password required');
      return;
    }

    showToast({
      type: 'loading',
      title: 'Resetting sales profit',
      message: 'Please wait while sales profit is being reset...'
    });

    try {
      setResetLoading(true);

      const res = await fetch(`${API_BASE}/reset-sales-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: adminUser,
          password: adminPass
        })
      });

      const data = await res.json();

      hideToast();

      if (!res.ok || !data.success) {
        setResetError(data.error || 'Invalid credentials or server error');
        showToast({
          type: 'error',
          title: 'Reset failed',
          message: data.error || 'Could not reset sales profit.'
        });
      } else {
        setAdminPass('');
        setShowResetModal(false);
        fetchSalesSummary();
        showToast({
          type: 'success',
          title: 'Sales profit reset',
          message: 'Sales profit has been reset successfully.'
        });
      }
    } catch (err) {
      hideToast();
      setResetError('Server connection error while resetting');
      showToast({
        type: 'error',
        title: 'Server error',
        message: 'Server connection error while resetting.'
      });
    } finally {
      setResetLoading(false);
    }
  };

  // Change password handler
  const handleChangePassword = async (e) => {
    e && e.preventDefault();
    setCpError('');

    if (!cpUser || !cpOldPass || !cpNewPass) {
      setCpError('All fields are required');
      return;
    }

    showToast({
      type: 'loading',
      title: 'Updating password',
      message: 'Please wait while the password is being updated...'
    });

    try {
      setCpLoading(true);

      const res = await fetch(`${API_BASE}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cpUser,
          oldPassword: cpOldPass,
          newPassword: cpNewPass
        })
      });

      const data = await res.json();

      hideToast();

      if (!res.ok || !data.success) {
        setCpError(data.message || 'Invalid credentials or server error');
        showToast({
          type: 'error',
          title: 'Password change failed',
          message: data.message || 'Could not change password.'
        });
      } else {
        showToast({
          type: 'success',
          title: 'Password updated',
          message: 'Admin password updated successfully.'
        });
        setCpOldPass('');
        setCpNewPass('');
        setShowChangePassModal(false);
      }
    } catch (err) {
      hideToast();
      setCpError('Server connection error while changing password');
      showToast({
        type: 'error',
        title: 'Server error',
        message: 'Server connection error while changing password.'
      });
    } finally {
      setCpLoading(false);
    }
  };

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          gap: '10px',
          flexWrap: 'wrap'
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: '18px',
              color: 'var(--text-main)'
            }}
          >
            Stock & Sales Summary
          </h2>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: '12px',
              color: 'var(--text-muted)'
            }}
          >
            Overview of inventory, profit and expiry status.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            justifyContent: 'flex-end'
          }}
        >
          {/* Change password button */}
          <button
            onClick={() => {
              setCpError('');
              setShowChangePassModal(true);
            }}
            style={{
              padding: '8px 12px',
              background: '#1f2937',
              color: 'white',
              border: 'none',
              borderRadius: '999px',
              cursor: 'pointer',
              fontSize: '12px',
              whiteSpace: 'nowrap'
            }}
          >
            🔐 Change admin password
          </button>

          {/* Reset profit button */}
          <button
            onClick={() => {
              setResetError('');
              setShowResetModal(true);
            }}
            style={{
              padding: '8px 12px',
              background: '#111827',
              color: 'white',
              border: 'none',
              borderRadius: '999px',
              cursor: 'pointer',
              fontSize: '12px',
              whiteSpace: 'nowrap'
            }}
          >
            🔁 Reset sales profit
          </button>

          <button
            onClick={() => setShowProfit(!showProfit)}
            style={{
              padding: '8px 14px',
              background: showProfit ? 'var(--danger)' : 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '999px',
              cursor: 'pointer',
              fontSize: '13px',
              whiteSpace: 'nowrap'
            }}
          >
            {showProfit ? '🙈 Hide Profit' : '👁 Show Profit'}
          </button>
        </div>
      </div>

      {/* Top KPIs */}
      <div
        className="summary-kpi-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '14px',
          marginBottom: '18px'
        }}
      >
        <div style={statCardStyle}>
          <div
            style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-muted)'
            }}
          >
            Total products
          </div>
          <h2
            style={{
              margin: '4px 0 0',
              fontSize: '22px',
              color: 'var(--text-main)'
            }}
          >
            {summary.totalProducts}
          </h2>
        </div>

        <div style={statCardStyle}>
          <div
            style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-muted)'
            }}
          >
            Total items
          </div>
          <h2
            style={{
              margin: '4px 0 0',
              fontSize: '22px',
              color: 'var(--text-main)'
            }}
          >
            {summary.totalItems}
          </h2>
        </div>

        <div style={statCardStyle}>
          <div
            style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-muted)'
            }}
          >
            Inventory value
          </div>
          <h2
            style={{
              margin: '4px 0 0',
              fontSize: '20px',
              color: 'var(--text-main)'
            }}
          >
            Rs {totalValue.toFixed(2)}
          </h2>
        </div>
      </div>

      {/* Profit section */}
      {showProfit && (
        <div
          className="summary-kpi-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '14px',
            marginBottom: '20px'
          }}
        >
          <div style={statCardStyle}>
            <div
              style={{
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text-muted)'
              }}
            >
              Current stock profit
            </div>
            <h3
              style={{
                margin: '4px 0 0',
                fontSize: '18px',
                color: '#f59e0b'
              }}
            >
              Rs {currentStockProfit.toFixed(2)}
            </h3>
          </div>

          <div style={statCardStyle}>
            <div
              style={{
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text-muted)'
              }}
            >
              Profit from sales
            </div>
            <h3
              style={{
                margin: '4px 0 0',
                fontSize: '18px',
                color: 'var(--primary)'
              }}
            >
              Rs {salesProfit.toFixed(2)}
            </h3>
            <small
              style={{ fontSize: '11px', color: 'var(--text-muted)' }}
            >
              {salesSummary?.totalSalesCount || 0} sales
            </small>
          </div>

          <div
            style={{
              ...statCardStyle,
              background: 'rgba(34, 197, 94, 0.09)',
              borderColor: 'rgba(34, 197, 94, 0.4)'
            }}
          >
            <div
              style={{
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#15803d'
              }}
            >
              Grand total profit
            </div>
            <h2
              style={{
                margin: '4px 0 0',
                fontSize: '20px',
                color: 'var(--primary)'
              }}
            >
              Rs {grandTotalProfit.toFixed(2)}
            </h2>
          </div>
        </div>
      )}

      {/* Alerts section */}
      <div style={{ marginTop: '10px' }}>
        {/* Low stock */}
        {summary.lowStock && summary.lowStock.length > 0 && (
          <div
            style={{
              marginTop: '16px',
              padding: '14px',
              background: 'rgba(251, 191, 36, 0.08)',
              borderRadius: '10px',
              border: '1px solid rgba(234, 179, 8, 0.5)'
            }}
          >
            <strong
              style={{ fontSize: '13px', color: '#854d0e' }}
            >
              ⚠️ Low stock alert
            </strong>

            <div
              style={{
                marginTop: '8px',
                maxHeight: '120px',
                overflowY: 'auto',
                paddingRight: '4px'
              }}
            >
              <ul
                style={{
                  margin: 0,
                  paddingLeft: '18px',
                  fontSize: '13px',
                  color: 'var(--text-main)'
                }}
              >
                {summary.lowStock.map((item) => (
                  <li key={item.id}>
                    {item.name} —{' '}
                    <span style={{ fontWeight: 600 }}>
                      {item.quantity} left
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Near expiry */}
        {nearExpiryProducts.length > 0 && (
          <div
            style={{
              marginTop: '16px',
              padding: '14px',
              background: 'rgba(251, 191, 36, 0.12)',
              borderRadius: '10px',
              border: '1px solid rgba(245, 158, 11, 0.7)'
            }}
          >
            <strong
              style={{ fontSize: '13px', color: '#92400e' }}
            >
              ⏳ Near expiry (7 months or less)
            </strong>

            <div
              style={{
                marginTop: '8px',
                maxHeight: '120px',
                overflowY: 'auto',
                paddingRight: '4px'
              }}
            >
              <ul
                style={{
                  margin: 0,
                  paddingLeft: '18px',
                  fontSize: '13px',
                  color: 'var(--text-main)'
                }}
              >
                {nearExpiryProducts.map((item) => (
                  <li key={item.id}>
                    {item.name} | Batch: {item.batchNo || '-'} | Expiry:{' '}
                    {item.expiryDate || '-'} |{' '}
                    <span style={{ fontWeight: 600 }}>
                      {item.monthsLeft} month(s) left
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Expired */}
        {expiredProducts.length > 0 && (
          <div
            style={{
              marginTop: '16px',
              padding: '14px',
              background: 'rgba(248, 113, 113, 0.12)',
              borderRadius: '10px',
              border: '1px solid rgba(220, 38, 38, 0.7)'
            }}
          >
            <strong
              style={{ fontSize: '13px', color: '#b91c1c' }}
            >
              ❌ Expired products
            </strong>

            <div
              style={{
                marginTop: '8px',
                maxHeight: '120px',
                overflowY: 'auto',
                paddingRight: '4px'
              }}
            >
              <ul
                style={{
                  margin: 0,
                  paddingLeft: '18px',
                  fontSize: '13px',
                  color: 'var(--text-main)'
                }}
              >
                {expiredProducts.map((item) => (
                  <li key={item.id}>
                    {item.name} | Batch: {item.batchNo || '-'} | Expired
                    on: {item.expiryDate || '-'}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Reset confirmation modal */}
      {showResetModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
        >
          <form
            autoComplete="off"
            onSubmit={handleResetSalesProfit}
            style={{
              width: '100%',
              maxWidth: '360px',
              background: 'var(--bg-card)',
              borderRadius: '12px',
              padding: '18px 16px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
              boxSizing: 'border-box',
              color: 'var(--text-main)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            {/* hidden fake field for autofill */}
            <input
              type="text"
              name="hidden-reset-user"
              autoComplete="off"
              style={{ display: 'none' }}
            />

            <h3
              style={{
                margin: 0,
                marginBottom: '8px',
                fontSize: '16px'
              }}
            >
              Reset sales profit
            </h3>
            <p
              style={{
                margin: 0,
                marginBottom: '10px',
                fontSize: '12px',
                color: 'var(--text-muted)'
              }}
            >
              Enter admin username and password to reset profit from sales. This
              is usually used for daily sales reset.
            </p>

            {resetError && (
              <p
                style={{
                  margin: 0,
                  marginBottom: '8px',
                  fontSize: '12px',
                  color: 'var(--danger)',
                  background: 'rgba(248, 113, 113, 0.16)',
                  padding: '6px 8px',
                  borderRadius: '6px'
                }}
              >
                {resetError}
              </p>
            )}

            <div style={{ marginBottom: '8px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  marginBottom: '4px',
                  color: 'var(--text-main)'
                }}
              >
                Username
              </label>
              <input
                type="text"
                value={adminUser}
                onChange={(e) => setAdminUser(e.target.value)}
                autoComplete="off"
                name="reset_admin_user"
                style={{
                  width: '100%',
                  padding: '8px 9px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)'
                }}
              />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  marginBottom: '4px',
                  color: 'var(--text-main)'
                }}
              >
                Password
              </label>
              <input
                type="password"
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                autoComplete="new-password"
                name="reset_admin_password"
                style={{
                  width: '100%',
                  padding: '8px 9px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)'
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                flexWrap: 'wrap',
                marginTop: '6px'
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setShowResetModal(false);
                  setAdminPass('');
                  setResetError('');
                }}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-card)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  color: 'var(--text-main)'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={resetLoading}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: resetLoading ? '#6b7280' : 'var(--danger)',
                  color: 'white',
                  fontSize: '12px',
                  cursor: resetLoading ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  whiteSpace: 'nowrap'
                }}
              >
                {resetLoading ? 'Resetting...' : 'Confirm reset'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Change password modal */}
      {showChangePassModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
        >
          <form
            autoComplete="off"
            onSubmit={handleChangePassword}
            style={{
              width: '100%',
              maxWidth: '360px',
              background: 'var(--bg-card)',
              borderRadius: '12px',
              padding: '18px 16px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
              boxSizing: 'border-box',
              color: 'var(--text-main)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            {/* hidden fake field */}
            <input
              type="text"
              name="hidden-change-user"
              autoComplete="off"
              style={{ display: 'none' }}
            />

            <h3
              style={{
                margin: 0,
                marginBottom: '8px',
                fontSize: '16px'
              }}
            >
              Change admin password
            </h3>
            <p
              style={{
                margin: 0,
                marginBottom: '10px',
                fontSize: '12px',
                color: 'var(--text-muted)'
              }}
            >
              Enter your current password and new password.
            </p>

            {cpError && (
              <p
                style={{
                  margin: 0,
                  marginBottom: '8px',
                  fontSize: '12px',
                  color: 'var(--danger)',
                  background: 'rgba(248, 113, 113, 0.16)',
                  padding: '6px 8px',
                  borderRadius: '6px'
                }}
              >
                {cpError}
              </p>
            )}

            <div style={{ marginBottom: '8px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  marginBottom: '4px',
                  color: 'var(--text-main)'
                }}
              >
                Username
              </label>
              <input
                type="text"
                value={cpUser}
                onChange={(e) => setCpUser(e.target.value)}
                autoComplete="off"
                name="change_admin_user"
                style={{
                  width: '100%',
                  padding: '8px 9px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)'
                }}
              />
            </div>

            <div style={{ marginBottom: '8px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  marginBottom: '4px',
                  color: 'var(--text-main)'
                }}
              >
                Old password
              </label>
              <input
                type="password"
                value={cpOldPass}
                onChange={(e) => setCpOldPass(e.target.value)}
                autoComplete="new-password"
                name="change_admin_old_password"
                style={{
                  width: '100%',
                  padding: '8px 9px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)'
                }}
              />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  marginBottom: '4px',
                  color: 'var(--text-main)'
                }}
              >
                New password
              </label>
              <input
                type="password"
                value={cpNewPass}
                onChange={(e) => setCpNewPass(e.target.value)}
                autoComplete="new-password"
                name="change_admin_new_password"
                style={{
                  width: '100%',
                  padding: '8px 9px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)'
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                flexWrap: 'wrap',
                marginTop: '6px'
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setShowChangePassModal(false);
                  setCpOldPass('');
                  setCpNewPass('');
                  setCpError('');
                }}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-card)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  color: 'var(--text-main)'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={cpLoading}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: cpLoading ? '#6b7280' : 'var(--primary)',
                  color: 'white',
                  fontSize: '12px',
                  cursor: cpLoading ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  whiteSpace: 'nowrap'
                }}
              >
                {cpLoading ? 'Updating...' : 'Update password'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}