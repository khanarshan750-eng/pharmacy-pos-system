import React, { useState, useEffect } from 'react';
import { API_BASE } from './config';
import { useToast } from './ToastProvider';

export default function ProductList({ products, onRefresh }) {
  const { showToast, hideToast } = useToast();

  const [search, setSearch] = useState('');

  // 🔄 ADJUST STOCK STATE (NEW)
  const [adjustData, setAdjustData] = useState({
    id: null,
    productName: '',
    currentBoxes: 0,
    currentLoose: 0,
    unitsPerBox: 1,
    changeQty: '',
    unitType: 'box', // 'box' | 'plate'
    mode: 'add' // 'add' (return/increase) | 'minus' (decrease)
  });

  const [showProfit, setShowProfit] = useState(() => {
    return localStorage.getItem('showProfit') !== 'false';
  });

  useEffect(() => {
    localStorage.setItem('showProfit', showProfit);
  }, [showProfit]);

  const filteredProducts = products.filter((p) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;

    const name = (p.name || '').toLowerCase();
    const batch = (p.batchNo || '').toLowerCase();

    return name.includes(term) || batch.includes(term);
  });

  // ---------- ADJUST HANDLER (NEW) ----------
  const handleAdjustStock = async () => {
    if (!adjustData.id || !adjustData.changeQty) return;

    const qty = Number(adjustData.changeQty);
    if (!qty || isNaN(qty) || qty <= 0) {
      showToast({
        type: 'error',
        title: 'Invalid quantity',
        message: 'Please enter a quantity greater than 0.'
      });
      return;
    }

    const delta =
      adjustData.mode === 'add'
        ? qty // return / increase
        : -qty; // manual decrease

    showToast({
      type: 'loading',
      title: 'Updating stock',
      message: `Updating ${adjustData.productName} stock…`
    });

    try {
      const res = await fetch(`${API_BASE}/adjust-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: adjustData.id,
          changeQty: delta,
          unitType: adjustData.unitType // 'box' | 'plate'
        })
      });

      const data = await res.json().catch(() => ({}));

      hideToast();

      if (!res.ok || !data.success) {
        showToast({
          type: 'error',
          title: 'Update failed',
          message: data.error || 'Error updating stock.'
        });
        return;
      }

      showToast({
        type: 'success',
        title: 'Stock updated',
        message: 'Stock adjusted successfully.'
      });

      setAdjustData({
        id: null,
        productName: '',
        currentBoxes: 0,
        currentLoose: 0,
        unitsPerBox: 1,
        changeQty: '',
        unitType: 'box',
        mode: 'add'
      });

      onRefresh && onRefresh();
    } catch (err) {
      hideToast();
      showToast({
        type: 'error',
        title: 'Network error',
        message: 'Error updating stock. Please try again.'
      });
    }
  };

  const isMobile =
    typeof window !== 'undefined' && window.innerWidth <= 768;

  // dynamic table width based on showProfit
  const baseMinWidth = isMobile ? 700 : 800;
  const profitExtraWidth = showProfit ? (isMobile ? 220 : 260) : 0;
  const tableMinWidth = baseMinWidth + profitExtraWidth;

  // THEME‑AWARE styles
  const cardStyle = {
    background: 'var(--bg-card)',
    padding: isMobile ? '10px' : '16px',
    borderRadius: '12px',
    boxShadow: 'var(--shadow-card)',
    border: '1px solid var(--border-subtle)',
    boxSizing: 'border-box'
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: isMobile ? 'flex-start' : 'center',
    gap: '8px',
    marginBottom: isMobile ? '8px' : '10px',
    flexWrap: 'wrap'
  };

  const chipStyle = {
    fontSize: isMobile ? '10px' : '11px',
    padding: '2px 8px',
    borderRadius: '999px',
    background: 'rgba(148, 163, 184, 0.18)',
    color: 'var(--text-muted)'
  };

  const searchStyle = {
    width: '100%',
    padding: isMobile ? '6px 8px' : '8px 10px',
    marginBottom: isMobile ? '8px' : '10px',
    borderRadius: '8px',
    border: '1px solid var(--border-subtle)',
    fontSize: isMobile ? '12px' : '13px',
    boxSizing: 'border-box',
    background: 'var(--bg-card)',
    color: 'var(--text-main)'
  };

  const tableOuterWrapper = {
    width: '100%',
    maxHeight: isMobile ? '260px' : '360px',
    overflowX: 'auto',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch'
  };

  const tableWrapperStyle = {
    borderRadius: '8px',
    border: '1px solid var(--border-subtle)',
    minWidth: `${tableMinWidth}px`,
    overflow: 'hidden',
    background: 'var(--bg-card)'
  };

  const thStyle = {
    padding: isMobile ? '6px 6px' : '8px 10px',
    fontSize: isMobile ? '9px' : '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--text-muted)',
    borderBottom: '1px solid var(--border-subtle)',
    background: 'rgba(15, 23, 42, 0.04)',
    whiteSpace: 'nowrap'
  };

  const tdStyle = {
    padding: isMobile ? '6px 6px' : '8px 10px',
    fontSize: isMobile ? '11px' : '12px',
    borderBottom: '1px solid var(--border-subtle)',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
    color: 'var(--text-main)'
  };

  const computeProductStats = (product) => {
    const boxes = Number(product.quantity || 0);
    const unitsPerBox = Number(product.unitsPerBox || 1);
    const looseUnits = Number(product.looseUnits || 0);
    const totalUnits = boxes * unitsPerBox + looseUnits;

    const rawPricePerBox = Number(product.price || 0);
    const pricePerUnit =
      unitsPerBox > 0 ? rawPricePerBox / unitsPerBox : 0;

    const profitPerUnit = Number(product.profitPerUnit || 0);
    const totalProfit = totalUnits * profitPerUnit;

    return {
      boxes,
      unitsPerBox,
      looseUnits,
      totalUnits,
      rawPricePerBox,
      pricePerUnit,
      profitPerUnit,
      totalProfit
    };
  };

  // Mobile cards
  const renderMobileCards = () => {
    // OUTER WRAPPER: chota height + scroll sirf mobile ke liye
    return (
      <div
        style={{
          maxHeight: '55vh', // jitna chota chaho kar sakte ho
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          paddingRight: 2
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            marginTop: 4
          }}
        >
          {filteredProducts.map((product) => {
            const {
              boxes,
              unitsPerBox,
              looseUnits,
              totalUnits,
              rawPricePerBox,
              profitPerUnit,
              totalProfit
            } = computeProductStats(product);

            return (
              <div
                key={product.id}
                style={{
                  borderRadius: 10,
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-card)',
                  padding: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4
                }}
              >
                {/* Top row: name + price + stock */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 8
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 13,
                        color: 'var(--text-main)'
                      }}
                    >
                      {product.name}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--text-muted)'
                      }}
                    >
                      Batch: {product.batchNo || '-'}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--text-muted)'
                      }}
                    >
                      ID: {product.id}
                    </div>
                  </div>

                  <div
                    style={{
                      textAlign: 'right',
                      fontSize: 11,
                      color: 'var(--text-main)'
                    }}
                  >
                    <div>Rs {rawPricePerBox.toFixed(2)}/box</div>
                    <div
                      style={{
                        marginTop: 2,
                        padding: '2px 6px',
                        borderRadius: 999,
                        background:
                          boxes < 10
                            ? 'rgba(248, 113, 113, 0.16)'
                            : 'rgba(34, 197, 94, 0.14)',
                        color: boxes < 10 ? 'var(--danger)' : 'var(--primary)',
                        fontWeight: 600,
                        display: 'inline-block'
                      }}
                    >
                      {boxes} boxes
                    </div>
                  </div>
                </div>

                {/* Units + expiry */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 11,
                    color: 'var(--text-main)',
                    marginTop: 2
                  }}
                >
                  <span>
                    Units/box: <strong>{unitsPerBox}</strong>
                  </span>
                  <span>
                    Total units: {totalUnits}
                    {looseUnits > 0 && (
                      <> (+{looseUnits} loose)</>
                    )}
                  </span>
                </div>

                {/* Expiry + action */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 4
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: '#f97316'
                    }}
                  >
                    Expiry:{' '}
                    {product.expiryDate ? product.expiryDate : 'Not set'}
                  </div>

                  <button
                    onClick={() => {
                      const { boxes, looseUnits, unitsPerBox } =
                        computeProductStats(product);
                      setAdjustData({
                        id: product.id,
                        productName: product.name,
                        currentBoxes: boxes,
                        currentLoose: looseUnits,
                        unitsPerBox,
                        changeQty: '',
                        unitType: 'box',
                        mode: 'add'
                      });
                    }}
                    style={{
                      background: 'var(--primary)',
                      color: 'white',
                      border: 'none',
                      padding: '4px 10px',
                      borderRadius: 999,
                      fontSize: 11,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Adjust stock
                  </button>
                </div>

                {/* Profit section (optional) */}
                {showProfit && (
                  <div
                    style={{
                      marginTop: 4,
                      paddingTop: 4,
                      borderTop: '1px dashed var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 11,
                      color: 'var(--text-main)'
                    }}
                  >
                    <span>
                      Profit/unit: Rs {profitPerUnit.toFixed(2)}
                    </span>
                    <span>
                      Total profit: Rs {totalProfit.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Desktop/tablet table (NO CHANGE)
  const renderDesktopTable = () => {
    return (
      <div style={tableOuterWrapper} className="product-table-scroll">
        <div style={tableWrapperStyle}>
          <table
            className="product-table"
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              tableLayout: 'fixed'
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    ...thStyle,
                    textAlign: 'left',
                    minWidth: 140
                  }}
                >
                  Product
                </th>
                <th
                  style={{
                    ...thStyle,
                    textAlign: 'left',
                    minWidth: 90
                  }}
                >
                  Batch
                </th>
                <th
                  style={{
                    ...thStyle,
                    textAlign: 'left',
                    minWidth: 110
                  }}
                >
                  Expiry
                </th>
                <th
                  style={{
                    ...thStyle,
                    textAlign: 'right',
                    minWidth: 90
                  }}
                >
                  Price
                </th>
                <th
                  style={{
                    ...thStyle,
                    textAlign: 'center',
                    minWidth: 70
                  }}
                >
                  Boxes
                </th>
                <th
                  style={{
                    ...thStyle,
                    textAlign: 'center',
                    minWidth: 80
                  }}
                >
                  Units/box
                </th>
                <th
                  style={{
                    ...thStyle,
                    textAlign: 'center',
                    minWidth: 110
                  }}
                >
                  Total units
                </th>

                {showProfit && (
                  <>
                    <th
                      style={{
                        ...thStyle,
                        textAlign: 'right',
                        minWidth: 110
                      }}
                    >
                      Profit/Unit
                    </th>
                    <th
                      style={{
                        ...thStyle,
                        textAlign: 'right',
                        minWidth: 120
                      }}
                    >
                      Total Profit
                    </th>
                  </>
                )}

                <th
                  style={{
                    ...thStyle,
                    textAlign: 'center',
                    minWidth: 130
                  }}
                >
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product, index) => {
                const {
                  boxes,
                  unitsPerBox,
                  looseUnits,
                  totalUnits,
                  rawPricePerBox,
                  profitPerUnit,
                  totalProfit
                } = computeProductStats(product);

                return (
                  <tr
                    key={product.id}
                    style={{
                      background:
                        index % 2 === 0
                          ? 'var(--bg-card)'
                          : 'rgba(148, 163, 184, 0.06)'
                    }}
                  >
                    <td style={tdStyle}>
                      <div
                        style={{
                          fontWeight: 600,
                          color: 'var(--text-main)',
                          fontSize: '13px'
                        }}
                      >
                        {product.name}
                      </div>
                      <div
                        style={{
                          fontSize: '10px',
                          color: 'var(--text-muted)',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        ID: {product.id}
                      </div>
                    </td>

                    <td style={tdStyle}>{product.batchNo || '-'}</td>

                    <td style={tdStyle}>
                      {product.expiryDate ? (
                        <span
                          style={{
                            padding: '2px 6px',
                            borderRadius: '999px',
                            background: 'rgba(249, 115, 22, 0.12)',
                            color: '#f97316',
                            fontSize: '10px',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {product.expiryDate}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>

                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      Rs {rawPricePerBox.toFixed(2)}
                    </td>

                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span
                        style={{
                          padding: '2px 6px',
                          borderRadius: '999px',
                          background:
                            boxes < 10
                              ? 'rgba(248, 113, 113, 0.16)'
                              : 'rgba(34, 197, 94, 0.14)',
                          color:
                            boxes < 10 ? 'var(--danger)' : 'var(--primary)',
                          fontSize: '11px',
                          fontWeight: 600,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {boxes}
                      </span>
                    </td>

                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      {unitsPerBox}
                    </td>

                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      {totalUnits}
                      {looseUnits > 0 && (
                        <span
                          style={{
                            fontSize: '10px',
                            color: 'var(--text-muted)',
                            marginLeft: '4px'
                          }}
                        >
                          ({boxes}×{unitsPerBox} + {looseUnits})
                        </span>
                      )}
                    </td>

                    {showProfit && (
                      <>
                        <td
                          style={{
                            ...tdStyle,
                            textAlign: 'right'
                          }}
                        >
                          Rs {profitPerUnit.toFixed(2)}
                        </td>

                        <td
                          style={{
                            ...tdStyle,
                            textAlign: 'right'
                          }}
                        >
                          Rs {totalProfit.toFixed(2)}
                        </td>
                      </>
                    )}

                    <td
                      style={{
                        ...tdStyle,
                        textAlign: 'center'
                      }}
                    >
                      <button
                        onClick={() => {
                          const { boxes, looseUnits, unitsPerBox } =
                            computeProductStats(product);
                          setAdjustData({
                            id: product.id,
                            productName: product.name,
                            currentBoxes: boxes,
                            currentLoose: looseUnits,
                            unitsPerBox,
                            changeQty: '',
                            unitType: 'box',
                            mode: 'add'
                          });
                        }}
                        style={{
                          background: 'var(--primary)',
                          color: 'white',
                          border: 'none',
                          padding: '5px 10px',
                          borderRadius: '999px',
                          fontSize: '11px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          maxWidth: '120px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        Adjust stock
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: isMobile ? '14px' : '16px',
              color: 'var(--text-main)'
            }}
          >
            Product Inventory
          </h2>
          <span style={chipStyle}>
            {filteredProducts.length} item
            {filteredProducts.length !== 1 ? 's' : ''}
          </span>
        </div>

        <button
          onClick={() => setShowProfit(!showProfit)}
          style={{
            padding: isMobile ? '5px 10px' : '6px 12px',
            background: showProfit ? 'var(--danger)' : 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: '999px',
            cursor: 'pointer',
            fontSize: isMobile ? '11px' : '12px',
            whiteSpace: 'nowrap'
          }}
        >
          {showProfit ? '🙈 Hide Profit' : '👁 Show Profit'}
        </button>
      </div>

      <input
        type="text"
        placeholder="Search by product name or batch no..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={searchStyle}
      />

      {filteredProducts.length === 0 ? (
        <p
          style={{
            marginTop: '8px',
            fontSize: isMobile ? '11px' : '12px',
            color: 'var(--text-muted)'
          }}
        >
          No products found. Try a different name or batch number.
        </p>
      ) : (
        <>{isMobile ? renderMobileCards() : renderDesktopTable()}</>
      )}

      {/* 🔄 ADJUST STOCK PANEL (NEW) */}
      {adjustData.id && (
        <div
          style={{
            marginTop: '12px',
            padding: isMobile ? '10px' : '12px',
            background: 'var(--bg-card)',
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)'
          }}
        >
          <h4
            style={{
              margin: '0 0 6px',
              fontSize: isMobile ? '12px' : '13px',
              color: 'var(--text-main)'
            }}
          >
            Adjust stock – {adjustData.productName}
          </h4>

          <div
            style={{
              fontSize: isMobile ? '11px' : '12px',
              color: 'var(--text-muted)',
              marginBottom: 6
            }}
          >
            Current stock: <strong>{adjustData.currentBoxes}</strong> box(es)
            {adjustData.currentLoose > 0 && (
              <>
                {' '}
                + <strong>{adjustData.currentLoose}</strong> loose plate(s)
              </>
            )}{' '}
            | Units per box: <strong>{adjustData.unitsPerBox}</strong>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: 8,
              marginBottom: 8
            }}
          >
            <select
              value={adjustData.mode}
              onChange={(e) =>
                setAdjustData((prev) => ({
                  ...prev,
                  mode: e.target.value
                }))
              }
              style={{
                padding: isMobile ? '6px 8px' : '8px 10px',
                borderRadius: 6,
                border: '1px solid var(--border-subtle)',
                fontSize: isMobile ? '11px' : '12px',
                background: 'var(--bg-card)',
                color: 'var(--text-main)'
              }}
            >
              <option value="add">Add to stock (return)</option>
              <option value="minus">Remove from stock</option>
            </select>

            <select
              value={adjustData.unitType}
              onChange={(e) =>
                setAdjustData((prev) => ({
                  ...prev,
                  unitType: e.target.value
                }))
              }
              style={{
                padding: isMobile ? '6px 8px' : '8px 10px',
                borderRadius: 6,
                border: '1px solid var(--border-subtle)',
                fontSize: isMobile ? '11px' : '12px',
                background: 'var(--bg-card)',
                color: 'var(--text-main)'
              }}
            >
              <option value="box">Box(es)</option>
              <option value="plate">Plate(s)</option>
            </select>

            <input
              type="number"
              min="1"
              placeholder="Quantity"
              value={adjustData.changeQty}
              onChange={(e) =>
                setAdjustData((prev) => ({
                  ...prev,
                  changeQty: e.target.value
                }))
              }
              style={{
                flex: 1,
                padding: isMobile ? '6px 8px' : '8px 10px',
                borderRadius: 6,
                border: '1px solid var(--border-subtle)',
                boxSizing: 'border-box',
                fontSize: isMobile ? '12px' : '13px',
                background: 'var(--bg-card)',
                color: 'var(--text-main)'
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              flexWrap: 'wrap'
            }}
          >
            <button
              onClick={() =>
                setAdjustData({
                  id: null,
                  productName: '',
                  currentBoxes: 0,
                  currentLoose: 0,
                  unitsPerBox: 1,
                  changeQty: '',
                  unitType: 'box',
                  mode: 'add'
                })
              }
              style={{
                padding: isMobile ? '5px 10px' : '6px 12px',
                borderRadius: 6,
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-card)',
                fontSize: isMobile ? '11px' : '12px',
                cursor: 'pointer',
                color: 'var(--text-main)'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleAdjustStock}
              style={{
                padding: isMobile ? '5px 10px' : '6px 12px',
                borderRadius: 6,
                border: 'none',
                background: 'var(--primary)',
                color: 'white',
                fontSize: isMobile ? '11px' : '12px',
                cursor: 'pointer'
              }}
            >
              Confirm update
            </button>
          </div>
        </div>
      )}
    </div>
  );
}