import React, { useEffect, useState } from 'react';
import { API_BASE } from './config';
import { useToast } from './ToastProvider';

export default function CustomerHistory() {
  const { showToast } = useToast();

  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );

  // delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // 🔐 NEW: backup settings state
  const [backupPath, setBackupPath] = useState('');
  const [backupLoading, setBackupLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const fetchSalesHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/sales-history`);
      const data = await res.json();
      if (data.success) {
        setSales(data.sales || []);
      } else {
        showToast({
          type: 'error',
          title: 'Failed to load',
          message: data.error || 'Error loading sales history.'
        });
      }
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Network error',
        message: 'Error loading sales history. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  // 🔐 NEW: load backup settings from server
  const fetchBackupSettings = async () => {
    try {
      setBackupLoading(true);
      const res = await fetch(`${API_BASE}/backup-settings`);
      const data = await res.json();
      if (data.success) {
        setBackupPath(data.backupPath || '');
      } else {
        showToast({
          type: 'error',
          title: 'Backup settings',
          message: data.error || 'Failed to load backup settings.'
        });
      }
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Backup settings',
        message: 'Error loading backup settings. Please try again.'
      });
    } finally {
      setBackupLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesHistory();
    fetchBackupSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // breakpoint listener
  useEffect(() => {
    const handleResize = () => {
      if (typeof window === 'undefined') return;
      setIsMobile(window.innerWidth <= 768);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  const normalize = (v) => (v || '').toString().toLowerCase();

  const filteredSales = sales.filter((sale) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;

    const customerName = normalize(sale.customer?.name);
    const customerPhone = normalize(sale.customer?.phone);
    const saleId = normalize(sale.id);
    const date = normalize(sale.dateTime);
    const itemsText = (sale.items || [])
      .map((it) => `${it.name} ${it.batchNo || ''}`)
      .join(' ')
      .toLowerCase();

    return (
      customerName.includes(term) ||
      customerPhone.includes(term) ||
      saleId.includes(term) ||
      date.includes(term) ||
      itemsText.includes(term)
    );
  });

  const cardStyle = {
    background: 'var(--bg-card)',
    padding: '16px',
    borderRadius: '12px',
    boxShadow: 'var(--shadow-card)',
    border: '1px solid var(--border-subtle)',
    boxSizing: 'border-box',
    color: 'var(--text-main)'
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px',
    flexWrap: 'wrap'
  };

  const chipStyle = {
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '999px',
    background: 'rgba(148, 163, 184, 0.18)',
    color: 'var(--text-muted)'
  };

  const searchStyle = {
    width: '100%',
    padding: '8px 10px',
    marginBottom: '10px',
    borderRadius: '8px',
    border: '1px solid var(--border-subtle)',
    fontSize: '13px',
    boxSizing: 'border-box',
    background: 'var(--bg-card)',
    color: 'var(--text-main)'
  };

  const tableOuterWrapper = {
    width: '100%',
    maxHeight: '360px',
    overflowX: 'auto',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch'
  };

  const tableWrapperStyle = {
    borderRadius: '8px',
    border: '1px solid var(--border-subtle)',
    minWidth: '800px',
    overflow: 'hidden',
    background: 'var(--bg-card)'
  };

  const thStyle = {
    padding: '8px 10px',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--text-muted)',
    borderBottom: '1px solid var(--border-subtle)',
    background: 'rgba(15, 23, 42, 0.04)',
    whiteSpace: 'nowrap'
  };

  const tdStyle = {
    padding: '8px 10px',
    fontSize: '12px',
    borderBottom: '1px solid var(--border-subtle)',
    verticalAlign: 'middle',
    color: 'var(--text-main)'
  };

  const formatDateTime = (iso) => {
    if (!iso) return '-';
    try {
      const d = new Date(iso);
      return (
        d.toLocaleDateString() +
        ' ' +
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    } catch {
      return iso;
    }
  };

  // ---------- DELETE FLOW ----------
  const openDeleteModal = (sale) => {
    setDeleteTarget(sale);
    setAdminUser('');
    setAdminPass('');
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    if (deleteLoading) return;
    setShowDeleteModal(false);
    setDeleteTarget(null);
    setAdminUser('');
    setAdminPass('');
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    if (!adminUser || !adminPass) {
      showToast({
        type: 'error',
        title: 'Missing credentials',
        message: 'Please enter admin username and password to delete.'
      });
      return;
    }

    try {
      setDeleteLoading(true);

      const res = await fetch(`${API_BASE}/delete-sale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleId: deleteTarget.id,
          adminUser,
          adminPass
        })
      });

      const data = await res.json();

      if (!data.success) {
        showToast({
          type: 'error',
          title: 'Delete failed',
          message: data.error || 'Could not delete this sale.'
        });
        return;
      }

      setSales((prev) => prev.filter((s) => s.id !== deleteTarget.id));

      showToast({
        type: 'success',
        title: 'Sale deleted',
        message: `Sale ${deleteTarget.id} and related customer data removed.`
      });

      closeDeleteModal();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Server error',
        message: 'Error while deleting sale. Please try again.'
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // ---------- BACKUP ACTIONS ----------
  const handleSaveBackupPath = async () => {
    if (!backupPath.trim()) {
      showToast({
        type: 'error',
        title: 'Backup path',
        message: 'Please enter a folder path for backup.'
      });
      return;
    }

    try {
      setBackupLoading(true);
      const res = await fetch(`${API_BASE}/backup-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupPath: backupPath.trim() })
      });
      const data = await res.json();
      if (!data.success) {
        showToast({
          type: 'error',
          title: 'Backup path',
          message: data.error || 'Failed to save backup path.'
        });
        return;
      }

      setBackupPath(data.backupPath || backupPath.trim());

      showToast({
        type: 'success',
        title: 'Backup path saved',
        message: `Backups will be created in: ${data.backupPath || backupPath.trim()}`
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Backup path',
        message: 'Error saving backup path. Please try again.'
      });
    } finally {
      setBackupLoading(false);
    }
  };

  const handleExportMonthlyBackup = async () => {
    if (!backupPath.trim()) {
      showToast({
        type: 'error',
        title: 'Backup export',
        message: 'Please set backup folder path first.'
      });
      return;
    }

    try {
      setExportLoading(true);
      const res = await fetch(`${API_BASE}/export-monthly-backup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();

      if (!data.success) {
        showToast({
          type: 'error',
          title: 'Backup export',
          message: data.error || 'Failed to export monthly backup.'
        });
        return;
      }

      showToast({
        type: 'success',
        title: 'Backup created',
        message:
          data.message ||
          `Backup file ${data.fileName} created with ${data.salesCount} sales.`
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Backup export',
        message: 'Error exporting backup. Please try again.'
      });
    } finally {
      setExportLoading(false);
    }
  };

    // ---------- SHARED ITEMS LIST UI ----------
  const renderItemsList = (items, saleId) => {
    if (!items || items.length === 0) {
      return (
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            fontStyle: 'italic'
          }}
        >
          No items recorded for this sale.
        </div>
      );
    }

    return (
      <div
        style={{
          marginTop: 4,
          borderRadius: 8,
          border: '1px solid var(--border-subtle)',
          background: 'rgba(148,163,184,0.05)',
          padding: 8,
          maxHeight: 190,
          overflowY: 'auto'
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 11
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  textAlign: 'left',
                  padding: '4px 6px',
                  color: 'var(--text-muted)',
                  borderBottom: '1px solid var(--border-subtle)'
                }}
              >
                Product / Batch
              </th>
              <th
                style={{
                  textAlign: 'center',
                  padding: '4px 6px',
                  color: 'var(--text-muted)',
                  borderBottom: '1px solid var(--border-subtle)',
                  whiteSpace: 'nowrap'
                }}
              >
                Qty
              </th>
              <th
                style={{
                  textAlign: 'right',
                  padding: '4px 6px',
                  color: 'var(--text-muted)',
                  borderBottom: '1px solid var(--border-subtle)',
                  whiteSpace: 'nowrap'
                }}
              >
                Price
              </th>
              <th
                style={{
                  textAlign: 'right',
                  padding: '4px 6px',
                  color: 'var(--text-muted)',
                  borderBottom: '1px solid var(--border-subtle)',
                  whiteSpace: 'nowrap'
                }}
              >
                Total
              </th>
              {/* NEW: Action column */}
              <th
                style={{
                  textAlign: 'center',
                  padding: '4px 6px',
                  color: 'var(--text-muted)',
                  borderBottom: '1px solid var(--border-subtle)',
                  whiteSpace: 'nowrap'
                }}
              >
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={idx}>
                <td
                  style={{
                    padding: '4px 6px',
                    borderBottom: '1px solid var(--border-subtle)'
                  }}
                >
                  <div style={{ fontWeight: 500 }}>{it.name}</div>
                  <div
                    style={{
                      fontSize: 10,
                      color: 'var(--text-muted)',
                      marginTop: 1
                    }}
                  >
                    Batch: {it.batchNo || '-'} | Exp: {it.expiryDate || '-'}
                  </div>
                </td>
                <td
                  style={{
                    padding: '4px 6px',
                    borderBottom: '1px solid var(--border-subtle)',
                    textAlign: 'center',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {it.quantity}{' '}
                  {it.unitType === 'plate' ? 'plate(s)' : 'box(es)'}
                </td>
                <td
                  style={{
                    padding: '4px 6px',
                    borderBottom: '1px solid var(--border-subtle)',
                    textAlign: 'right',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Rs {Number(it.pricePerUnit || it.price || 0).toFixed(2)}
                </td>
                <td
                  style={{
                    padding: '4px 6px',
                    borderBottom: '1px solid var(--border-subtle)',
                    textAlign: 'right',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Rs {Number(it.lineTotal || it.totalPrice || 0).toFixed(2)}
                </td>
                {/* NEW: Remove button */}
                <td
                  style={{
                    padding: '4px 6px',
                    borderBottom: '1px solid var(--border-subtle)',
                    textAlign: 'center'
                  }}
                >
                  <button
                    onClick={() => handleReturnItem(saleId, idx)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 999,
                      border: '1px solid rgba(248,113,113,0.7)',
                      background: 'rgba(248,113,113,0.08)',
                      fontSize: 10,
                      color: 'var(--danger)',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ---------- MOBILE CARD RENDER ----------
  const renderMobileCards = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filteredSales.map((sale, idx) => {
          const isExpanded = expandedId === sale.id;
          const itemCount = (sale.items || []).length;

          return (
            <div
              key={sale.id || idx}
              style={{
                borderRadius: '10px',
                border: '1px solid var(--border-subtle)',
                padding: '10px 10px 8px',
                background: 'rgba(15,23,42,0.02)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '6px',
                  marginBottom: '6px'
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      marginBottom: '2px'
                    }}
                  >
                    Sale ID
                  </div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '12px',
                      color: 'var(--text-main)',
                      wordBreak: 'break-all'
                    }}
                  >
                    {sale.id}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      padding: '2px 6px',
                      borderRadius: '999px',
                      background: 'rgba(249, 115, 22, 0.12)',
                      color: '#ea580c',
                      fontSize: '10px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {formatDateTime(sale.dateTime)}
                  </div>
                  <div
                    style={{
                      marginTop: '4px',
                      fontSize: '10px',
                      color: 'var(--text-muted)'
                    }}
                  >
                    {itemCount} item{itemCount !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '6px',
                  marginBottom: '6px'
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      marginBottom: '2px'
                    }}
                  >
                    Customer
                  </div>
                  <div
                    style={{ fontSize: '12px', color: 'var(--text-main)' }}
                  >
                    {sale.customer?.name || (
                      <span style={{ color: 'var(--text-muted)' }}>
                        (No name)
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      marginBottom: '2px'
                    }}
                  >
                    Phone
                  </div>
                  <div
                    style={{ fontSize: '12px', color: 'var(--text-main)' }}
                  >
                    {sale.customer?.phone || (
                      <span style={{ color: 'var(--text-muted)' }}>
                        (No phone)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '6px',
                  marginBottom: '8px'
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      marginBottom: '2px'
                    }}
                  >
                    Net total
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--text-main)'
                    }}
                  >
                    Rs {(sale.netTotal ?? sale.totalAmount ?? 0).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      marginBottom: '2px'
                    }}
                  >
                    Discount
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-main)'
                    }}
                  >
                    Rs {(sale.discountTotal || 0).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      marginBottom: '2px'
                    }}
                  >
                    Profit
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--primary)',
                      fontWeight: 600
                    }}
                  >
                    Rs {(sale.totalProfit || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  marginBottom: '6px'
                }}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : sale.id)}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: '999px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-card)',
                    fontSize: '11px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    color: 'var(--text-main)'
                  }}
                >
                  {isExpanded ? 'Hide items' : 'View items'}
                </button>
                <button
                  onClick={() => openDeleteModal(sale)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '999px',
                    border: '1px solid rgba(248,113,113,0.7)',
                    background: 'rgba(248,113,113,0.12)',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: 'var(--danger)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Delete
                </button>
              </div>

         {isExpanded && (sale.items || []).length > 0 && (
  <div
    style={{
      marginTop: '6px',
      paddingTop: '6px',
      borderTop: '1px dashed var(--border-subtle)'
    }}
  >
    {renderItemsList(sale.items, sale.id)}
  </div>
)}
            </div>
          );
        })}
      </div>
    );
  };

  // ---------- DESKTOP TABLE RENDER ----------
  const renderDesktopTable = () => {
    return (
      <div style={tableOuterWrapper} className="customer-history-scroll">
        <div style={tableWrapperStyle}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              tableLayout: 'fixed'
            }}
          >
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: 'left' }}>Sale ID</th>
                <th style={{ ...thStyle, textAlign: 'left' }}>
                  Date &amp; Time
                </th>
                <th style={{ ...thStyle, textAlign: 'left' }}>Customer</th>
                <th style={{ ...thStyle, textAlign: 'left' }}>Phone</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Net Total</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Discount</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Profit</th>
                <th
                  style={{
                    ...thStyle,
                    textAlign: 'center',
                    width: 70
                  }}
                >
                  Items
                </th>
                <th
                  style={{
                    ...thStyle,
                    textAlign: 'center',
                    width: 140,
                    whiteSpace: 'nowrap'
                  }}
                >
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((sale, idx) => {
                const isExpanded = expandedId === sale.id;
                const itemCount = (sale.items || []).length;

                return (
                  <React.Fragment key={sale.id || idx}>
                    <tr
                      style={{
                        background:
                          idx % 2 === 0
                            ? 'var(--bg-card)'
                            : 'rgba(15,23,42,0.02)'
                      }}
                    >
                      <td style={tdStyle}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: '12px',
                            color: 'var(--text-main)'
                          }}
                        >
                          {sale.id}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            padding: '2px 6px',
                            borderRadius: '999px',
                            background: 'rgba(249,115,22,0.12)',
                            color: '#ea580c',
                            fontSize: '10px',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {formatDateTime(sale.dateTime)}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        {sale.customer?.name || (
                          <span
                            style={{
                              color: 'var(--text-muted)',
                              fontSize: '11px'
                            }}
                          >
                            (No name)
                          </span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        {sale.customer?.phone || (
                          <span
                            style={{
                              color: 'var(--text-muted)',
                              fontSize: '11px'
                            }}
                          >
                            (No phone)
                          </span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        Rs {(sale.netTotal ?? sale.totalAmount ?? 0).toFixed(2)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        Rs {(sale.discountTotal || 0).toFixed(2)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        Rs {(sale.totalProfit || 0).toFixed(2)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '2px 6px',
                            borderRadius: '999px',
                            background: 'rgba(34,197,94,0.14)',
                            color: 'var(--primary)',
                            fontSize: '11px',
                            fontWeight: 600
                          }}
                        >
                          {itemCount}
                        </span>
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: 'center',
                          overflow: 'visible'
                        }}
                      >
                        <div
                          style={{
                            display: 'inline-flex',
                            gap: 4,
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexWrap: 'nowrap'
                          }}
                        >
                          <button
                            onClick={() =>
                              setExpandedId(isExpanded ? null : sale.id)
                            }
                            title={isExpanded ? 'Hide items' : 'View items'}
                            style={{
                              padding: '4px 8px',
                              borderRadius: 999,
                              border: '1px solid var(--border-subtle)',
                              background: 'var(--bg-card)',
                              fontSize: '11px',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              maxWidth: 80,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              color: 'var(--text-main)'
                            }}
                          >
                            {isExpanded ? 'Hide' : 'View'}
                          </button>
                          <button
                            onClick={() => openDeleteModal(sale)}
                            title="Delete sale"
                            style={{
                              padding: '4px 8px',
                              borderRadius: 999,
                              border: '1px solid rgba(248,113,113,0.7)',
                              background: 'rgba(248,113,113,0.12)',
                              fontSize: '11px',
                              color: 'var(--danger)',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>

            {isExpanded && (
  <tr>
    <td
      colSpan={9}
      style={{
        padding: '8px 12px 10px',
        background: 'rgba(15,23,42,0.02)'
      }}
    >
      {renderItemsList(sale.items, sale.id)}
    </td>
  </tr>
)}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  // ---------- RETURN ITEM (REMOVE LINE) ----------
  const handleReturnItem = async (saleId, itemIndex) => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return;

    const item = (sale.items || [])[itemIndex];
    if (!item) return;

    // Optional: confirm dialog
    const ok = window.confirm(
      `Are you sure you want to remove "${item.name}" from this sale?`
    );
    if (!ok) return;

    try {
      // API call: yahan tum backend me naya route banao
      const res = await fetch(`${API_BASE}/sales-return-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleId,
          // itemIndex bhejna sab se simple hai
          itemIndex,
          // agar backend ko zyada info chahiye to yahan add kar sakte ho:
          productId: item.productId,
          unitType: item.unitType, // 'box' | 'plate'
          quantity: item.quantity
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!data.success || !data.sale) {
        showToast({
          type: 'error',
          title: 'Return failed',
          message: data.error || 'Could not remove item from this sale.'
        });
        return;
      }

      // Frontend state update: updated sale replace karo
      setSales((prev) =>
        prev.map((s) => (s.id === saleId ? data.sale : s))
      );

      showToast({
        type: 'success',
        title: 'Item returned',
        message: `"${item.name}" removed and bill adjusted.`
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Server error',
        message: 'Error while returning item. Please try again.'
      });
    }
  };
  // ---------- DELETE MODAL UI ----------
  const renderDeleteModal = () => {
    if (!showDeleteModal || !deleteTarget) return null;

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}
      >
        <form
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault();
            handleConfirmDelete();
          }}
          style={{
            width: '100%',
            maxWidth: 360,
            background: 'var(--bg-card)',
            borderRadius: 12,
            padding: 16,
            boxShadow: '0 18px 45px rgba(15,23,42,0.25)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-main)'
          }}
        >
          <input
            type="text"
            name="fake-user"
            autoComplete="off"
            style={{ display: 'none' }}
          />
          <input
            type="password"
            name="fake-pass"
            autoComplete="new-password"
            style={{ display: 'none' }}
          />

          <h3
            style={{
              margin: '0 0 4px',
              fontSize: 16
            }}
          >
            Confirm admin to delete
          </h3>
          <p
            style={{
              margin: '0 0 10px',
              fontSize: 12,
              color: 'var(--text-muted)'
            }}
          >
            You are about to permanently delete sale{' '}
            <strong>{deleteTarget.id}</strong>. This will also remove this
            customer&apos;s data from history.
          </p>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              marginBottom: 10
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--text-muted)',
                  marginBottom: 3
                }}
              >
                Admin user
              </div>
              <input
                type="text"
                value={adminUser}
                onChange={(e) => setAdminUser(e.target.value)}
                placeholder="Enter admin user"
                autoComplete="off"
                name="admin_user"
                style={{
                  width: '100%',
                  padding: '8px 9px',
                  borderRadius: 8,
                  border: '1px solid var(--border-subtle)',
                  fontSize: 13,
                  boxSizing: 'border-box',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)'
                }}
              />
            </div>
            <div>
              <div
                style={{
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--text-muted)',
                  marginBottom: 3
                }}
              >
                Admin password
              </div>
              <input
                type="password"
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                placeholder="Enter admin password"
                autoComplete="new-password"
                name="admin_confirm_password"
                style={{
                  width: '100%',
                  padding: '8px 9px',
                  borderRadius: 8,
                  border: '1px solid var(--border-subtle)',
                  fontSize: 13,
                  boxSizing: 'border-box',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)'
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              marginTop: 4
            }}
          >
            <button
              type="button"
              onClick={closeDeleteModal}
              disabled={deleteLoading}
              style={{
                padding: '7px 12px',
                borderRadius: 999,
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-card)',
                fontSize: 12,
                cursor: deleteLoading ? 'default' : 'pointer',
                color: 'var(--text-main)'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={deleteLoading}
              style={{
                padding: '7px 12px',
                borderRadius: 999,
                border: '1px solid rgba(248,113,113,0.7)',
                background: 'var(--danger)',
                color: 'white',
                fontSize: 12,
                fontWeight: 600,
                cursor: deleteLoading ? 'default' : 'pointer',
                opacity: deleteLoading ? 0.8 : 1
              }}
            >
              {deleteLoading ? 'Deleting...' : 'Delete sale'}
            </button>
          </div>
        </form>
      </div>
    );
  };

  // ---------- MAIN RENDER ----------
  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: '16px',
              color: 'var(--text-main)'
            }}
          >
            Customer / Sales History
          </h2>
          <span style={chipStyle}>
            {filteredSales.length} record
            {filteredSales.length !== 1 ? 's' : ''}
          </span>
        </div>

        <button
          onClick={fetchSalesHistory}
          style={{
            padding: '6px 12px',
            borderRadius: '999px',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-card)',
            fontSize: '12px',
            cursor: 'pointer',
            color: 'var(--text-main)'
          }}
        >
          Refresh
        </button>
      </div>

      <input
        type="text"
        placeholder="Search by customer name, phone, sale ID, date or product..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={searchStyle}
      />

      {loading ? (
        <p
          style={{
            marginTop: '8px',
            fontSize: '12px',
            color: 'var(--text-muted)'
          }}
        >
          Loading sales history...
        </p>
      ) : filteredSales.length === 0 ? (
        <p
          style={{
            marginTop: '8px',
            fontSize: '12px',
            color: 'var(--text-muted)'
          }}
        >
          No sales found. Try a different search.
        </p>
      ) : isMobile ? (
        renderMobileCards()
      ) : (
        renderDesktopTable()
      )}

      {/* 🔐 BACKUP SECTION */}
      <div
        style={{
          marginTop: 16,
          paddingTop: 12,
          borderTop: '1px dashed var(--border-subtle)'
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 8,
              alignItems: 'center',
              flexWrap: 'wrap'
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-main)'
                }}
              >
                Monthly sales backup (CSV)
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  marginTop: 2
                }}
              >
                Set a folder path where CSV backup files will be created. Each file
                covers one full calendar month (01–last date).
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: 8,
              alignItems: isMobile ? 'stretch' : 'center'
            }}
          >
            <input
              type="text"
              placeholder="Example: D:\\PharmacyBackups"
              value={backupPath}
              onChange={(e) => setBackupPath(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid var(--border-subtle)',
                fontSize: 13,
                boxSizing: 'border-box',
                background: 'var(--bg-card)',
                color: 'var(--text-main)'
              }}
            />
            <button
              onClick={handleSaveBackupPath}
              disabled={backupLoading}
              style={{
                padding: '8px 12px',
                borderRadius: 999,
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-card)',
                fontSize: 12,
                cursor: backupLoading ? 'default' : 'pointer',
                whiteSpace: 'nowrap',
                color: 'var(--text-main)',
                opacity: backupLoading ? 0.8 : 1
              }}
            >
              {backupLoading ? 'Saving...' : 'Save path'}
            </button>
            <button
              onClick={handleExportMonthlyBackup}
              disabled={exportLoading}
              style={{
                padding: '8px 12px',
                borderRadius: 999,
                border: '1px solid var(--primary)',
                background: 'var(--primary)',
                fontSize: 12,
                cursor: exportLoading ? 'default' : 'pointer',
                whiteSpace: 'nowrap',
                color: 'white',
                opacity: exportLoading ? 0.85 : 1
              }}
            >
              {exportLoading ? 'Exporting...' : 'Export last month CSV'}
            </button>
          </div>

          <div
            style={{
              fontSize: 11,
              color: 'var(--text-muted)'
            }}
          >
            Automatic backup also runs on 1st of every month at midnight as long
            as this app is running on the main PC.
          </div>
        </div>
      </div>

      {renderDeleteModal()}
    </div>
  );
}