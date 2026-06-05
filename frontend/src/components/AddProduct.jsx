import { useState, useMemo } from 'react';
import { API_BASE } from './config';
import { useToast } from './ToastProvider';

export default function AddProduct({ onProductAdded, products = [] }) {
  const { showToast, hideToast } = useToast();

  const [form, setForm] = useState({
    name: '',
    batchNo: '',
    expiryDate: '',
    price: '',
    quantity: '',
    profitPercent: '14.5', // default 14%
    barcode: '',
    unitsPerBox: '' // plates/box
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [nameFocused, setNameFocused] = useState(false);

  const isMobile =
    typeof window !== 'undefined' && window.innerWidth <= 768;

  // Name based suggestions
  const nameTerm = form.name.trim().toLowerCase();

  const suggestions = useMemo(() => {
    if (!nameTerm) return [];

    const matches = products.filter((p) => {
      const n = (p.name || '').toLowerCase();
      return n.includes(nameTerm);
    });

    const uniqKey = new Set();
    const unique = [];
    for (const p of matches) {
      const key = `${p.name}__${p.batchNo}__${p.expiryDate}`;
      if (!uniqKey.has(key)) {
        uniqKey.add(key);
        unique.push(p);
      }
    }
    return unique.slice(0, 6);
  }, [nameTerm, products]);

  const handleSelectSuggestion = (p) => {
    setForm((prev) => ({
      ...prev,
      name: p.name || '',
      batchNo: p.batchNo || '',
      expiryDate: p.expiryDate || '',
      price: p.price != null ? String(p.price) : '',
      quantity: '',
      profitPercent: '14.5',
      barcode: p.barcode || '',
      unitsPerBox:
        p.unitsPerBox != null ? String(p.unitsPerBox) : ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const name = form.name.trim();
    const batchNo = form.batchNo.trim();
    const expiryDate = form.expiryDate;
    const pricePerBox = parseFloat(form.price);
    const quantity = parseInt(form.quantity, 10); // boxes
    const profitPercent = parseFloat(form.profitPercent);
    const barcode = form.barcode.trim();
    const unitsPerBox = parseInt(form.unitsPerBox, 10); // plates/box

    if (!name) {
      setError('Product name is required');
      setLoading(false);
      return;
    }
    if (!batchNo) {
      setError('Batch number is required');
      setLoading(false);
      return;
    }
    if (!expiryDate) {
      setError('Expiry date is required');
      setLoading(false);
      return;
    }
    if (isNaN(pricePerBox) || pricePerBox <= 0) {
      setError('Price per box must be greater than 0');
      setLoading(false);
      return;
    }
    if (isNaN(quantity) || quantity <= 0) {
      setError('Quantity (boxes) must be greater than 0');
      setLoading(false);
      return;
    }
    if (isNaN(unitsPerBox) || unitsPerBox <= 0) {
      setError('Units per box must be greater than 0');
      setLoading(false);
      return;
    }
    if (isNaN(profitPercent) || profitPercent < 0) {
      setError('Profit percentage cannot be negative');
      setLoading(false);
      return;
    }

    // Rs per unit calculate from percentage (Razolam-style)
    // profit per unit = (pricePerBox * profitPercent%) / unitsPerBox
    const profitPerUnitRs =
      unitsPerBox > 0
        ? (pricePerBox * (profitPercent / 100)) / unitsPerBox
        : 0;

    showToast({
      type: 'loading',
      title: 'Adding product',
      message: `Please wait while we add “${name}” to stock…`
    });

    try {
      const res = await fetch(`${API_BASE}/add-product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          batchNo,
          expiryDate,
          price: pricePerBox,
          quantity, // boxes
          profitPerUnit: profitPerUnitRs, // Rs per unit backend ko
          barcode,
          unitsPerBox // plates/box
        })
      });

      const data = await res.json();

      hideToast();

      if (res.ok) {
        showToast({
          type: 'success',
          title: 'Product saved',
          message: data.message || `“${name}” has been added / updated.`
        });

        setForm({
          name: '',
          batchNo: '',
          expiryDate: '',
          price: '',
          quantity: '',
          profitPercent: '14.5',
          barcode: '',
          unitsPerBox: ''
        });

        onProductAdded && onProductAdded();
      } else {
        setError(data.error || 'Failed to add product');

        showToast({
          type: 'error',
          title: 'Add failed',
          message: data.error || 'Could not save this product.'
        });
      }
    } catch (err) {
      hideToast();
      setError('Server connection error');

      showToast({
        type: 'error',
        title: 'Network error',
        message: 'Server connection error, please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  // THEME‑AWARE STYLES (CSS variables use karo)
  const labelStyle = {
    display: 'block',
    fontSize: isMobile ? '11px' : '12px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    marginBottom: '4px'
  };

  const inputStyle = {
    width: '100%',
    padding: isMobile ? '6px 8px' : '8px 10px',
    borderRadius: '8px',
    border: '1px solid var(--border-subtle)',
    fontSize: isMobile ? '12px' : '13px',
    outline: 'none',
    boxSizing: 'border-box',
    background: 'var(--bg-card)',
    color: 'var(--text-main)'
  };

  const inputWrapperStyle = {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '10px',
    position: 'relative'
  };

  const sectionBoxStyle = {
    border: '1px solid var(--border-subtle)',
    borderRadius: '10px',
    padding: isMobile ? '8px' : '10px',
    marginBottom: '10px',
    background: 'var(--bg-card)'
  };

  const sectionTitleStyle = {
    fontSize: isMobile ? '12px' : '13px',
    fontWeight: 600,
    color: 'var(--text-main)',
    margin: '0 0 6px'
  };

  const suggestionsBoxStyle = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 20,
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '8px',
    marginTop: '4px',
    maxHeight: '180px',
    overflowY: 'auto',
    boxShadow: '0 10px 25px rgba(15,23,42,0.22)',
    fontSize: '12px'
  };

  const suggestionItemStyle = {
    padding: '7px 9px',
    cursor: 'pointer',
    borderBottom: '1px solid var(--border-subtle)'
  };

  return (
    <div className="app-section-card add-product-card">
      <div style={{ marginBottom: '8px' }}>
        <h2
          style={{
            margin: 0,
            fontSize: isMobile ? '14px' : '16px',
            color: 'var(--text-main)'
          }}
        >
          Add Product
        </h2>
        <p
          style={{
            margin: '4px 0 0',
            fontSize: isMobile ? '11px' : '12px',
            color: 'var(--text-muted)'
          }}
        >
          Quickly add new stock or update existing items.
        </p>
      </div>

      {error && (
        <p
          style={{
            color: 'var(--danger)',
            marginBottom: '10px',
            padding: '8px 10px',
            borderRadius: '6px',
            background:
              'rgba(248, 113, 113, 0.12)', // soft red tint, dark mode me bhi theek
            fontSize: isMobile ? '11px' : '12px'
          }}
        >
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit}>
        {/* Product details */}
        <div style={sectionBoxStyle}>
          <h3 style={sectionTitleStyle}>Product details</h3>

          <div className="stack-mobile" style={{ marginBottom: 4 }}>
            <div style={{ ...inputWrapperStyle, marginBottom: 0 }}>
              <label style={labelStyle}>Product name</label>
              <input
                type="text"
                placeholder="e.g. Paracetamol 500mg"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                onFocus={() => setNameFocused(true)}
                onBlur={() => {
                  setTimeout(() => setNameFocused(false), 150);
                }}
                style={inputStyle}
                required
              />

              {nameFocused && suggestions.length > 0 && (
                <div style={suggestionsBoxStyle}>
                  {suggestions.map((p) => (
                    <div
                      key={`${p.id}-${p.batchNo}-${p.expiryDate}`}
                      style={suggestionItemStyle}
                      onClick={() => handleSelectSuggestion(p)}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          color: 'var(--text-main)',
                          fontSize: '12px'
                        }}
                      >
                        {p.name}
                      </div>
                      <div
                        style={{
                          color: 'var(--text-muted)',
                          fontSize: '11px'
                        }}
                      >
                        Batch: {p.batchNo || '-'} • Exp:{' '}
                        {p.expiryDate || '-'}
                      </div>
                      <div
                        style={{
                          color: 'var(--text-main)',
                          fontSize: '11px'
                        }}
                      >
                        Price: Rs {p.price} • Profit/unit:{' '}
                        {p.profitPerUnit ?? 0}
                      </div>
                      {p.unitsPerBox && (
                        <div
                          style={{
                            color: 'var(--text-muted)',
                            fontSize: '11px'
                          }}
                        >
                          Units/box: {p.unitsPerBox}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ ...inputWrapperStyle, marginBottom: 0 }}>
              <label style={labelStyle}>Batch number</label>
              <input
                type="text"
                placeholder="e.g. BATCH-1234"
                value={form.batchNo}
                onChange={(e) =>
                  setForm({ ...form, batchNo: e.target.value })
                }
                style={inputStyle}
                required
              />
            </div>
          </div>

          <div style={inputWrapperStyle}>
            <label style={labelStyle}>Barcode / SKU (optional)</label>
            <input
              type="text"
              placeholder="Scan or enter barcode"
              value={form.barcode}
              onChange={(e) =>
                setForm({ ...form, barcode: e.target.value })
              }
              style={inputStyle}
            />
          </div>
        </div>

        {/* Stock details */}
        <div style={sectionBoxStyle}>
          <h3 style={sectionTitleStyle}>Stock</h3>

          <div className="stack-mobile">
            <div style={inputWrapperStyle}>
              <label style={labelStyle}>Expiry date</label>
              <input
                type="date"
                value={form.expiryDate}
                onChange={(e) =>
                  setForm({ ...form, expiryDate: e.target.value })
                }
                style={inputStyle}
                required
              />
            </div>

            <div style={inputWrapperStyle}>
              <label style={labelStyle}>Quantity (boxes)</label>
              <input
                type="number"
                placeholder="e.g. 50"
                value={form.quantity}
                onChange={(e) =>
                  setForm({ ...form, quantity: e.target.value })
                }
                style={inputStyle}
                required
              />
            </div>
          </div>

          <div style={inputWrapperStyle}>
            <label style={labelStyle}>Units per box (plates/strips)</label>
            <input
              type="number"
              placeholder="e.g. 10"
              value={form.unitsPerBox}
              onChange={(e) =>
                setForm({ ...form, unitsPerBox: e.target.value })
              }
              style={inputStyle}
              required
            />
          </div>
        </div>

        {/* Pricing */}
        <div style={sectionBoxStyle}>
          <h3 style={sectionTitleStyle}>Pricing & profit</h3>

          <div className="stack-mobile">
            <div style={inputWrapperStyle}>
              <label style={labelStyle}>Price per box (Rs)</label>
              <input
                type="number"
                placeholder="e.g. 250"
                value={form.price}
                onChange={(e) =>
                  setForm({ ...form, price: e.target.value })
                }
                style={inputStyle}
                required
              />
            </div>

            <div style={inputWrapperStyle}>
              <label style={labelStyle}>Profit per unit (%)</label>
              <input
                type="number"
                placeholder="e.g. 20"
                value={form.profitPercent}
                onChange={(e) =>
                  setForm({
                    ...form,
                    profitPercent: e.target.value
                  })
                }
                style={inputStyle}
                required
              />
              <span
                style={{
                  marginTop: 2,
                  fontSize: 10,
                  color: 'var(--text-muted)'
                }}
              >
                Default 14.5%. Example: 20 means 20% of unit price as
                profit.
              </span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
          style={{
            width: '100%',
            justifyContent: 'center',
            marginTop: '6px',
            padding: isMobile ? '8px 10px' : '9px 12px',
            background: loading ? '#95a5a6' : 'var(--primary)',
            fontSize: isMobile ? '12px' : '13px',
            letterSpacing: '0.03em',
            fontWeight: 600
          }}
        >
          {loading ? 'Adding product…' : 'Add product to stock'}
        </button>
      </form>
    </div>
  );
}