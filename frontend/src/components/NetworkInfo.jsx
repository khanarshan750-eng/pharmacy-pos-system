import { useEffect, useState } from 'react';
import { API_BASE } from './config';

export default function NetworkInfo() {
  const [info, setInfo] = useState(null);      // /server-info
  const [qrInfo, setQrInfo] = useState(null);  // /qr-info
  const [error, setError] = useState('');
  const [qrError, setQrError] = useState('');

  useEffect(() => {
    async function fetchInfo() {
      try {
        const res = await fetch(`${API_BASE}/server-info`);
        const data = await res.json();
        setInfo(data);
      } catch (err) {
        setError('Unable to detect server IP');
      }
    }

    async function fetchQr() {
      try {
        const res = await fetch(`${API_BASE}/qr-info`);
        const data = await res.json();
        if (data.success) {
          setQrInfo(data);
        } else {
          setQrError('Unable to generate QR code');
        }
      } catch (err) {
        setQrError('Unable to generate QR code');
      }
    }

    fetchInfo();
    fetchQr();
  }, []);

  if (error) {
    return (
      <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 8 }}>
        {error}
      </div>
    );
  }

  if (!info) return null;

  const hasUrl = Boolean(info.url);

  return (
    <div
      style={{
        marginTop: 12,
        padding: '10px 12px',
        borderRadius: 10,
        background: '#f9fafb',
        fontSize: 12,
        color: '#111827',
        border: '1px solid #e5e7eb'
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6 }}>
        Access on mobile (same Wi‑Fi / hotspot)
      </div>

      {!hasUrl && (
        <div style={{ color: '#b91c1c' }}>
          IP address not detected. Please make sure this PC is connected to a network.
        </div>
      )}

      {hasUrl && (
        <>
          {/* Text instructions */}
          <div style={{ marginBottom: 8, lineHeight: 1.5 }}>
            <div>1. Connect your phone to this PC&apos;s Wi‑Fi / hotspot.</div>
            <div style={{ marginTop: 2 }}>
              2. Phone browser me ye address open karein:
              <span
                style={{
                  fontFamily: 'monospace',
                  marginLeft: 4,
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: '#111827',
                  color: '#f9fafb',
                  fontSize: 11
                }}
              >
                {info.url}
              </span>
            </div>
          </div>

          {/* QR code + caption - responsive layout */}
          <div
            style={{
              marginTop: 6,
              display: 'flex',
              flexWrap: 'wrap',          // mobile pe wrap [web:1158]
              alignItems: 'flex-start',
              gap: 10
            }}
          >
            {qrInfo && qrInfo.qrDataUrl && !qrError && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  minWidth: 120
                }}
              >
                <div style={{ marginBottom: 4 }}>Ya QR scan karein:</div>
                <img
                  src={qrInfo.qrDataUrl}
                  alt="Scan to open on mobile"
                  style={{
                    width: 130,
                    height: 130,
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    background: '#ffffff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                  }}
                />
              </div>
            )}

            <div
              style={{
                flex: 1,
                minWidth: 160,           // chhoti screen pe neeche aa jayega [web:1152]
                fontSize: 11,
                color: '#4b5563',
                lineHeight: 1.5
              }}
            >
              {qrError ? (
                <div style={{ color: '#b91c1c' }}>{qrError}</div>
              ) : (
                <>
                  <div>
                    QR scan karte hi aapke mobile browser me ye address open ho jayega:
                  </div>
                  <div
                    style={{
                      fontFamily: 'monospace',
                      marginTop: 4,
                      wordBreak: 'break-all',
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: '#f3f4f6'
                    }}
                  >
                    {qrInfo?.serverUrl || info.url}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 10, color: '#9ca3af' }}>
                    Note: Ye tabhi chalega jab phone aur PC ek hi network / hotspot par hon.
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}