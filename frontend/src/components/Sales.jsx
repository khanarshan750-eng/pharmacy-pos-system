import React, { useState, useEffect } from 'react';
import { API_BASE } from './config';
import { useToast } from './ToastProvider';

export default function Sales({ products, onSaleComplete }) {
  const { showToast, hideToast } = useToast();

  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [barcode, setBarcode] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [sellQuantity, setSellQuantity] = useState('');
  const [discount, setDiscount] = useState(0);
  const [sellUnit, setSellUnit] = useState('box');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // last completed sale info for printing
  const [lastSaleInfo, setLastSaleInfo] = useState(null);

  // detect mobile safely
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );

  useEffect(() => {
    const onResize = () => {
      if (typeof window === 'undefined') return;
      setIsMobile(window.innerWidth <= 768);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', onResize);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', onResize);
      }
    };
  }, []);

  // --- Derived lists / helpers ---

  const filteredProducts = products.filter((p) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    const name = (p.name || '').toLowerCase();
    const batch = (p.batchNo || '').toLowerCase();
    const code = (p.barcode || '').toLowerCase();
    return name.includes(term) || batch.includes(term) || code.includes(term);
  });

  const totalAmount = cart.reduce((sum, item) => sum + item.finalPrice, 0);
  const totalProfit = cart.reduce((sum, item) => sum + item.profit, 0);
  const grossTotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const discountTotal = grossTotal - totalAmount;

  // --- Product selection / barcode ---

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setSellQuantity('');
    setDiscount(0);
    setSellUnit('box');
  };

  const handleBarcodeKeyDown = (e) => {
    if (e.key !== 'Enter') return;

    const code = barcode.trim().toLowerCase();
    if (!code) return;

    const found = products.find(
      (p) => (p.barcode || '').toLowerCase() === code
    );

    if (found) {
      setSelectedProduct(found);
      setSellQuantity('1');
      setDiscount(0);
      setSellUnit('box');
      setSearch(found.name);
      setBarcode('');
    } else {
      showToast({
        type: 'error',
        title: 'Product not found',
        message: 'No product found for this barcode.'
      });
    }
  };

  // --- Cart logic ---

  const addToCart = () => {
    if (!selectedProduct || !sellQuantity) {
      showToast({
        type: 'error',
        title: 'Missing details',
        message: 'Select a product and enter quantity.'
      });
      return;
    }

    const product = selectedProduct;
    const qty = parseInt(sellQuantity, 10);

    if (isNaN(qty) || qty <= 0) {
      showToast({
        type: 'error',
        title: 'Invalid quantity',
        message: 'Quantity must be greater than 0.'
      });
      return;
    }

    const unitsPerBox = Number(product.unitsPerBox || 1);
    const boxesInStock = Number(product.quantity || 0);
    const looseUnits = Number(product.looseUnits || 0);
    const totalPlatesInStock = boxesInStock * unitsPerBox + looseUnits;

    if (sellUnit === 'box') {
      if (qty > boxesInStock) {
        showToast({
          type: 'error',
          title: 'Not enough stock',
          message: 'Not enough boxes available for this product.'
        });
        return;
      }
    } else {
      if (qty > totalPlatesInStock) {
        showToast({
          type: 'error',
          title: 'Not enough stock',
          message: 'Not enough plates available for this product.'
        });
        return;
      }
    }

    const rawPricePerBox = Number(product.price || 0);
    const rawProfitPerBox = Number(product.profitPerUnit || 0);

    let unitPrice;
    let unitProfit;

    if (sellUnit === 'box') {
      unitPrice = rawPricePerBox;
      unitProfit = rawProfitPerBox;
    } else {
      const safeUnitsPerBox = unitsPerBox > 0 ? unitsPerBox : 1;
      unitPrice = rawPricePerBox / safeUnitsPerBox;
      unitProfit = rawProfitPerBox / safeUnitsPerBox;
    }

    const totalPrice = unitPrice * qty;
    const discountAmount = (totalPrice * discount) / 100;
    const finalPrice = totalPrice - discountAmount;
    const profit = qty * unitProfit;

    setCart((prev) => [
      ...prev,
      {
        id: Date.now(),
        productId: product.id,
        name: product.name,
        batchNo: product.batchNo || '',
        expiryDate: product.expiryDate || '',
        price: unitPrice,
        quantity: qty,
        unitType: sellUnit,
        unitsPerBox,
        totalPrice,
        discount,
        finalPrice,
        profit
      }
    ]);

    setSellQuantity('');
    setDiscount(0);
    setSellUnit('box');
    setSelectedProduct(null);
    setSearch('');

    showToast({
      type: 'success',
      title: 'Added to cart',
      message: `"${product.name}" added to current sale.`
    });
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
    showToast({
      type: 'info',
      title: 'Item removed',
      message: 'Item removed from cart.'
    });
  };

  // --- Complete sale ---

  const completeSale = async () => {
    if (cart.length === 0) {
      showToast({
        type: 'error',
        title: 'Empty cart',
        message: 'Add at least one item before completing the sale.'
      });
      return;
    }

    const payload = {
      cart,
      customer: {
        name: customerName.trim() || null,
        phone: customerPhone.trim() || null
      },
      totals: {
        grossTotal,
        discountTotal,
        netTotal: totalAmount,
        totalProfit
      }
    };

    showToast({
      type: 'loading',
      title: 'Completing sale',
      message: `Processing sale of Rs ${totalAmount.toFixed(2)}…`
    });

    try {
      const res = await fetch(`${API_BASE}/complete-sale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      hideToast();

      if (data.success) {
        // Save info for printing BEFORE clearing cart
        setLastSaleInfo({
          saleId: data.saleId,
          dateTime: data.dateTime,
          customerName: customerName.trim() || '',
          customerPhone: customerPhone.trim() || '',
          cartSnapshot: cart,
          grossTotal,
          discountTotal,
          netTotal: totalAmount
        });

        showToast({
          type: 'success',
          title: 'Sale completed',
          message: `Total Rs ${totalAmount.toFixed(
            2
          )} • Profit Rs ${totalProfit.toFixed(2)}.`
        });

        setCart([]);
        setCustomerName('');
        setCustomerPhone('');
        setSelectedProduct(null);
        setSellQuantity('');
        setDiscount(0);
        setSellUnit('box');
        setSearch('');
        setBarcode('');

        onSaleComplete && onSaleComplete();
      } else {
        showToast({
          type: 'error',
          title: 'Sale failed',
          message: data.error || 'Error while completing sale.'
        });
      }
    } catch (err) {
      hideToast();
      showToast({
        type: 'error',
        title: 'Server error',
        message: 'Server error while completing sale. Please try again.'
      });
    }
  };

  // --- Print receipt (optional) ---
  const handlePrintReceipt = () => {
    if (!lastSaleInfo) {
      showToast({
        type: 'error',
        title: 'No receipt',
        message: 'Pehlay sale complete karo phir print kar sakte ho.'
      });
      return;
    }
    window.print();
  };

  const cardStyle = {
    background: 'var(--bg-card)',
    padding: isMobile ? '12px' : '18px',
    borderRadius: '12px',
    boxShadow: 'var(--shadow-card)',
    border: '1px solid var(--border-subtle)',
    boxSizing: 'border-box',
    color: 'var(--text-main)'
  };

  const labelStyle = {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--text-muted)',
    marginBottom: '4px'
  };

  return (
    <>
      {/* MAIN UI */}
      <div style={cardStyle} className="no-print">
        {/* Top header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            marginBottom: '12px',
            gap: '8px',
            flexWrap: 'wrap'
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: isMobile ? '16px' : '18px',
                color: 'var(--text-main)'
              }}
            >
              Make sale
            </h2>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: '12px',
                color: 'var(--text-muted)'
              }}
            >
              Search or scan, add items to cart, then confirm the sale.
            </p>
          </div>
          <div
            style={{
              padding: '4px 10px',
              borderRadius: '999px',
              background: 'rgba(129,140,248,0.12)',
              border: '1px solid var(--border-subtle)',
              fontSize: '12px',
              color: 'var(--text-main)',
              alignSelf: isMobile ? 'flex-end' : 'center'
            }}
          >
            Cart items: <strong>{cart.length}</strong>
          </div>
        </div>

        {/* Search row */}
        <div
          className="sales-search-row"
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '0.9fr 1.1fr',
            gap: '8px',
            marginBottom: '10px'
          }}
        >
          <div>
            <div style={labelStyle}>Barcode</div>
            <input
              type="text"
              placeholder="Scan / enter barcode"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={handleBarcodeKeyDown}
              style={{
                width: '100%',
                padding: '9px 10px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                fontSize: '13px',
                boxSizing: 'border-box',
                background: 'var(--bg-card)',
                color: 'var(--text-main)'
              }}
            />
          </div>
          <div>
            <div style={labelStyle}>Product search</div>
            <input
              type="text"
              placeholder="Search by name, batch or barcode"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 10px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                fontSize: '13px',
                boxSizing: 'border-box',
                background: 'var(--bg-card)',
                color: 'var(--text-main)'
              }}
            />
          </div>
        </div>

        {/* Main split layout */}
        <div
          className="sales-layout"
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1.1fr 1.2fr',
            gap: '16px',
            alignItems: 'flex-start'
          }}
        >
          {/* LEFT: Product list */}
          <div
            style={{
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)',
              overflow: 'hidden',
              maxHeight: isMobile ? '220px' : '280px',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--bg-card)'
            }}
          >
            <div
              style={{
                padding: '8px 10px',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
                background: 'rgba(15,23,42,0.04)',
                borderBottom: '1px solid var(--border-subtle)'
              }}
            >
              Products ({filteredProducts.length})
            </div>

            <div style={{ overflowY: 'auto' }}>
              {filteredProducts.length === 0 ? (
                <div
                  style={{
                    padding: '10px',
                    fontSize: '12px',
                    color: 'var(--text-muted)'
                  }}
                >
                  No products found.
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const isSelected =
                    selectedProduct && selectedProduct.id === p.id;
                  const lowStock = Number(p.quantity || 0) < 10;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectProduct(p)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 10px',
                        cursor: 'pointer',
                        border: 'none',
                        borderBottom: '1px solid var(--border-subtle)',
                        background: isSelected
                          ? 'rgba(34,197,94,0.08)'
                          : 'var(--bg-card)'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '8px',
                          alignItems: 'center'
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: '13px',
                              color: 'var(--text-main)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {p.name}
                          </div>
                          <div
                            style={{
                              fontSize: '11px',
                              color: 'var(--text-muted)'
                            }}
                          >
                            Batch: {p.batchNo || '-'} • Exp:{' '}
                            {p.expiryDate || '-'}
                          </div>
                          <div
                            style={{
                              fontSize: '11px',
                              color: 'var(--text-muted)'
                            }}
                          >
                            {p.unitsPerBox
                              ? `Units/box: ${p.unitsPerBox}`
                              : 'Units/box: -'}
                            {p.barcode ? ` • ${p.barcode}` : ''}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '11px' }}>
                          <div
                            style={{
                              color: 'var(--text-main)',
                              fontWeight: 600
                            }}
                          >
                            Rs {Number(p.price || 0).toFixed(2)}
                          </div>
                          <div
                            style={{
                              marginTop: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '2px 8px',
                              borderRadius: '999px',
                              background: lowStock
                                ? 'rgba(248,113,113,0.12)'
                                : 'rgba(22,163,74,0.12)',
                              color: lowStock
                                ? 'var(--danger)'
                                : 'var(--primary)',
                              fontWeight: 600
                            }}
                          >
                            {p.quantity}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT: Customer + current line + cart */}
          <div>
            {/* Customer info */}
            <div
              style={{
                marginBottom: '10px',
                padding: '10px',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle)',
                background: 'rgba(148,163,184,0.06)'
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--text-muted)',
                  marginBottom: '6px'
                }}
              >
                Customer (optional)
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1.1fr 0.9fr',
                  gap: '8px'
                }}
              >
                <input
                  type="text"
                  placeholder="Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 9px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)'
                  }}
                />
                <input
                  type="text"
                  placeholder="Phone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 9px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)'
                  }}
                />
              </div>
            </div>

            {/* Current line controls */}
            <div
              style={{
                marginBottom: '10px',
                padding: '10px',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-card)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                  gap: '6px',
                  alignItems: isMobile ? 'flex-start' : 'center'
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-main)'
                  }}
                >
                  {selectedProduct
                    ? selectedProduct.name
                    : 'No product selected'}
                </div>
                {selectedProduct && (
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      textAlign: 'right'
                    }}
                  >
                    Stock: {selectedProduct.quantity}{' '}
                    {selectedProduct.unitsPerBox
                      ? `• Units/box: ${selectedProduct.unitsPerBox}`
                      : ''}
                  </div>
                )}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile
                    ? '1fr 1fr'
                    : '0.9fr 0.9fr 0.9fr auto',
                  rowGap: '8px',
                  columnGap: '8px',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={labelStyle}>Unit</div>
                  <select
                    value={sellUnit}
                    onChange={(e) => setSellUnit(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 9px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '13px',
                      background: 'var(--bg-card)',
                      color: 'var(--text-main)'
                    }}
                  >
                    <option value="box">Box</option>
                    <option value="plate">Plate</option>
                  </select>
                </div>

                <div>
                  <div style={labelStyle}>Quantity</div>
                  <input
                    type="number"
                    placeholder="Qty"
                    value={sellQuantity}
                    onChange={(e) => setSellQuantity(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 9px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      background: 'var(--bg-card)',
                      color: 'var(--text-main)'
                    }}
                  />
                </div>

                <div style={{ gridColumn: isMobile ? '1 / span 1' : 'auto' }}>
                  <div style={labelStyle}>Discount %</div>
                  <input
                    type="number"
                    placeholder="0"
                    value={discount}
                    onChange={(e) =>
                      setDiscount(parseFloat(e.target.value) || 0)
                    }
                    style={{
                      width: '100%',
                      padding: '7px 9px',
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
                    marginTop: isMobile ? '0' : '18px',
                    gridColumn: isMobile ? '1 / span 2' : 'auto'
                  }}
                >
                  <button
                    type="button"
                    onClick={addToCart}
                    disabled={!selectedProduct}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '999px',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: selectedProduct ? 'pointer' : 'not-allowed',
                      background: selectedProduct
                        ? 'var(--primary)'
                        : 'var(--border-subtle)',
                      color: 'white'
                    }}
                  >
                    Add to cart
                  </button>
                </div>
              </div>
            </div>

            {/* Cart */}
            {cart.length > 0 && (
              <>
                <div
                  style={{
                    maxHeight: isMobile ? '200px' : '180px',
                    overflowY: 'auto',
                    marginBottom: '10px'
                  }}
                >
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        padding: '8px 10px',
                        background: 'rgba(148,163,184,0.06)',
                        marginBottom: '6px',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '8px',
                        border: '1px solid var(--border-subtle)'
                      }}
                    >
                      <div style={{ fontSize: '12px' }}>
                        <div
                          style={{
                            fontWeight: 600,
                            color: 'var(--text-main)'
                          }}
                        >
                          {item.name}{' '}
                          <span
                            style={{
                              fontSize: '11px',
                              color: 'var(--text-muted)'
                            }}
                          >
                            × {item.quantity}{' '}
                            {item.unitType === 'plate' ? 'plates' : 'boxes'}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-muted)'
                          }}
                        >
                          Batch: {item.batchNo || '-'} • Exp:{' '}
                          {item.expiryDate || '-'}
                          {' • '}
                          Disc: {item.discount}%
                        </div>
                      </div>
                      <div
                        style={{
                          textAlign: 'right',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: '13px',
                            color: 'var(--text-main)'
                          }}
                        >
                          Rs {item.finalPrice.toFixed(2)}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          style={{
                            marginTop: '4px',
                            color: 'var(--danger)',
                            border: 'none',
                            background: 'none',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div
                  style={{
                    padding: '10px',
                    borderRadius: '10px',
                    background: 'rgba(22,163,74,0.08)',
                    border: '1px solid rgba(74,222,128,0.6)',
                    marginBottom: '10px',
                    fontSize: '13px',
                    display: 'grid',
                    gridTemplateColumns: isMobile
                      ? '1fr'
                      : 'repeat(3, minmax(0, 1fr))',
                    gap: '8px'
                  }}
                >
                  <div>
                    <div
                      style={{ fontSize: '11px', color: 'var(--text-muted)' }}
                    >
                      Gross total
                    </div>
                    <div style={{ fontWeight: 600 }}>
                      Rs {grossTotal.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{ fontSize: '11px', color: 'var(--text-muted)' }}
                    >
                      Discount total
                    </div>
                    <div>Rs {discountTotal.toFixed(2)}</div>
                  </div>
                  <div>
                    <div
                      style={{ fontSize: '11px', color: 'var(--text-muted)' }}
                    >
                      Profit
                    </div>
                    <div
                      style={{
                        fontWeight: 600,
                        color: 'var(--primary)'
                      }}
                    >
                      Rs {totalProfit.toFixed(2)}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={completeSale}
                  style={{
                    width: '100%',
                    padding: isMobile ? '10px' : '11px',
                    background: '#111827',
                    color: 'white',
                    border: 'none',
                    borderRadius: '999px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Complete sale – Rs {totalAmount.toFixed(2)}
                </button>
              </>
            )}

            {/* Print button (optional) – cart se alag, sirf lastSaleInfo pe */}
            {lastSaleInfo && (
              <button
                type="button"
                onClick={handlePrintReceipt}
                style={{
                  width: '100%',
                  marginTop: cart.length > 0 ? '6px' : '10px',
                  padding: isMobile ? '8px' : '9px',
                  background: 'white',
                  color: '#111827',
                  border: '1px dashed var(--border-subtle)',
                  borderRadius: '999px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                Print receipt (optional)
              </button>
            )}

            {cart.length === 0 && !lastSaleInfo && (
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                  marginTop: '6px'
                }}
              >
                Cart is empty. Select a product, set quantity and add to cart.
              </div>
            )}
          </div>
        </div>
      </div>

            {/* PRINT CSS: sirf #print-receipt print hoga */}
      <style>
        {`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-receipt, #print-receipt * {
            visibility: visible;
          }
          #print-receipt {
            position: absolute;
            left: 0;
            top: 0;
          }
          @page {
            margin: 0;
            size: 80mm auto;
          }
          body {
            margin: 0;
            padding: 0;
          }
        }
        `}
      </style>

      {/* Hidden receipt for printing (80mm) */}
      {lastSaleInfo && (
        <div
          id="print-receipt"
          style={{
            position: 'fixed',
            right: '-9999px', // screen se bahar, lekin DOM me render
            top: 0,
            width: '80mm',
            background: 'white',
            color: 'black',
            padding: '8px',
            fontFamily: 'monospace',
            fontSize: '11px',
            zIndex: 9999
          }}
        >
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{`================================
        ILYAS MEDICAL STORE
      Risalpur Cantt, Nowshera
Phone: 0322-9015265.
================================
Receipt #: ${lastSaleInfo.saleId}
Date: ${new Date(lastSaleInfo.dateTime).toLocaleString()}
Customer: ${lastSaleInfo.customerName || '-'}
Phone   : ${lastSaleInfo.customerPhone || '-'}
--------------------------------
Item           Qty  Price  Total
`}
          </pre>

          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{lastSaleInfo.cartSnapshot
  .map((it) => {
    const name =
      (it.name || '').length > 12
        ? (it.name || '').slice(0, 12)
        : it.name || '';

    // plate -> 3(p), box -> 3
    const qtyRaw = `${it.quantity}${it.unitType === 'plate' ? '(p)' : ''}`;
    const qty = qtyRaw.padStart(5, ' ');

    const price = String(Math.round(it.price)).padStart(5, ' ');
    const total = String(Math.round(it.finalPrice)).padStart(6, ' ');
    return `${name.padEnd(12, ' ')} ${qty} ${price} ${total}`;
  })
  .join('\n')}
          </pre>

          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{`
--------------------------------
Subtotal            ${Math.round(lastSaleInfo.grossTotal)
  .toString()
  .padStart(5, ' ')}
Discount            ${Math.round(lastSaleInfo.discountTotal)
  .toString()
  .padStart(5, ' ')}
TOTAL               ${Math.round(lastSaleInfo.netTotal)
  .toString()
  .padStart(5, ' ')}
================================
     Thank You Visit Again
================================`}
          </pre>
        </div>
      )}
    </>
  );
}