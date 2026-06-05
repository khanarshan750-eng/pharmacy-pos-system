import { useEffect, useState } from 'react';
import { API_BASE } from './config';

export default function LicenseSetup() {
  const [machineId, setMachineId] = useState('');
  const [customer, setCustomer] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loadingId, setLoadingId] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadMachineId() {
      try {
        setLoadingId(true);
        const res = await fetch(`${API_BASE}/machine-id`);
        const data = await res.json();
        if (data.success) {
          setMachineId(data.machineId);
        } else {
          setError(data.error || 'Unable to fetch machine ID');
        }
      } catch {
        setError('Unable to fetch machine ID');
      } finally {
        setLoadingId(false);
      }
    }
    loadMachineId();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!licenseKey.trim() || !customer.trim() || !machineId.trim()) {
      setError('Please fill all fields before saving.');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/license`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseKey: licenseKey.trim(),
          customer: customer.trim(),
          machineId: machineId.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessage('License saved successfully. Please restart the application.');
      } else {
        setError(data.error || 'Failed to save license');
      }
    } catch {
      setError('Failed to save license');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 480,
        margin: '16px auto',
        padding: '16px 14px',
        borderRadius: 12,
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        fontSize: 14,
        color: '#111827'
      }}
    >
      <h2
        style={{
          fontSize: 18,
          fontWeight: 600,
          marginBottom: 6
        }}
      >
        License activation
      </h2>
      <p
        style={{
          fontSize: 12,
          color: '#6b7280',
          marginBottom: 10
        }}
      >
        Send this machine ID to the developer, get your license key, then enter
        the details below and save. After saving, restart the app.
      </p>

      {error && (
        <div
          style={{
            marginBottom: 8,
            padding: '6px 8px',
            borderRadius: 8,
            background: '#fef2f2',
            color: '#b91c1c',
            fontSize: 12
          }}
        >
          {error}
        </div>
      )}
      {message && (
        <div
          style={{
            marginBottom: 8,
            padding: '6px 8px',
            borderRadius: 8,
            background: '#ecfdf3',
            color: '#15803d',
            fontSize: 12
          }}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSave}>
        <div style={{ marginBottom: 10 }}>
          <label
            style={{
              fontSize: 12,
              fontWeight: 500,
              display: 'block',
              marginBottom: 4
            }}
          >
            Machine ID
          </label>
          {loadingId ? (
            <div style={{ fontSize: 12, color: '#6b7280' }}>Loading...</div>
          ) : (
            <textarea
              value={machineId}
              readOnly
              style={{
                width: '100%',
                fontFamily: 'monospace',
                fontSize: 11,
                padding: 6,
                borderRadius: 8,
                border: '1px solid #d1d5db',
                resize: 'none',
                minHeight: 60,
                background: '#f3f4f6'
              }}
            />
          )}
        </div>

        <div style={{ marginBottom: 10 }}>
          <label
            style={{
              fontSize: 12,
              fontWeight: 500,
              display: 'block',
              marginBottom: 4
            }}
          >
            Customer name
          </label>
          <input
            type="text"
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            placeholder="e.g. ABS Pharmacy - Main Branch"
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              fontSize: 13
            }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              fontSize: 12,
              fontWeight: 500,
              display: 'block',
              marginBottom: 4
            }}
          >
            License key
          </label>
          <input
            type="text"
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value)}
            placeholder="e.g. ABS-001-LOCAL"
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              fontSize: 13,
              letterSpacing: 1
            }}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{
            padding: '7px 14px',
            borderRadius: 8,
            border: 'none',
            background: saving ? '#93c5fd' : '#2563eb',
            color: 'white',
            fontSize: 13,
            fontWeight: 500,
            cursor: saving ? 'default' : 'pointer'
          }}
        >
          {saving ? 'Saving...' : 'Save license'}
        </button>
      </form>
    </div>
  );
}