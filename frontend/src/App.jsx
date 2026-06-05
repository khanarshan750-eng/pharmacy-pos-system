import { useState, useEffect } from 'react';
import AddProduct from './components/AddProduct';
import ProductList from './components/ProductList';
import StockSummary from './components/StockSummary';
import Sales from './components/Sales';
import Login from './components/Login';
import Footer from './components/Footer';
import './App.css';
import { API_BASE } from './components/config';
import ToastProvider from './components/ToastProvider';
import NetworkInfo from './components/NetworkInfo';
import CustomerHistory from './components/CustomerHistory';
// LicenseSetup ki zarurat nahi to is import ko hata sakte ho
// import LicenseSetup from './LicenseSetup';

function AppInner() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [activeTab, setActiveTab] = useState('sales');
  const [currentDate, setCurrentDate] = useState(new Date());

  // 🌙 Theme state (light / dark)
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    return localStorage.getItem('theme') || 'light';
  });

  // Theme ko <html> par apply karo + localStorage
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
    setIsLoggedIn(loggedIn);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_BASE}/products`);
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error('Failed to fetch products', err);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API_BASE}/stock`);
      const data = await res.json();
      setSummary(data);
    } catch (err) {
      console.error('Failed to fetch summary', err);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchProducts();
      fetchSummary();
    }
  }, [refresh, isLoggedIn]);

  const handleRefresh = () => {
    setRefresh((prev) => prev + 1);
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('authToken');
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  const isMobile =
    typeof window !== 'undefined' && window.innerWidth <= 768;

  const headerStyle = {
    background: 'white',
    borderRadius: '14px',
    padding: isMobile ? '10px 12px' : '12px 18px',
    marginBottom: '18px',
    boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)',
    border: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px'
  };

  const tabButtonBase = {
    border: 'none',
    borderRadius: '999px',
    padding: isMobile ? '7px 10px' : '9px 14px',
    fontSize: isMobile ? '12px' : '13px',
    cursor: 'pointer',
    transition: 'all 0.18s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    whiteSpace: 'nowrap'
  };

  return (
    <div className="app-shell">
      <div className="app-shell-inner">
        {/* Top bar */}
        <header style={headerStyle} className="app-header">
          {/* Left: Small subtitle */}
          <div
            style={{
              minWidth: 0
            }}
          >
            <div
              style={{
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: '#9ca3af',
                marginBottom: '2px'
              }}
            >
              Pharmacy control panel
            </div>
            <p
              style={{
                margin: '3px 0 0',
                fontSize: '11px',
                color: '#6b7280',
                maxWidth: isMobile ? '160px' : '220px'
              }}
            >
              Track sales, inventory and customers in one place.
            </p>
          </div>

          {/* Center: Brand name badge */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: isMobile ? '6px 14px' : '7px 18px',
                background: '#07661a',
                borderRadius: 999,
                color: '#ffffff',
                fontSize: isMobile ? '14px' : '16px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                boxShadow: '0 6px 16px rgba(7, 102, 26, 0.35)'
              }}
            >
              Ilyas Medical Store
            </div>
            <div
              style={{
                fontSize: '11px',
                color: '#9ca3af',
                marginTop: 2
              }}
            >
              Powered by Arshan ERP Solutions
            </div>
          </div>

          {/* Right: Date/time + theme + admin */}
          <div
            style={{
              display: 'flex',
              alignItems: isMobile ? 'flex-end' : 'center',
              gap: '10px'
            }}
          >
            {/* Date & time */}
            <div
              style={{
                textAlign: 'right',
                fontSize: '11px',
                color: '#6b7280'
              }}
            >
              <div>{currentDate.toLocaleDateString()}</div>
              <div style={{ fontWeight: 600 }}>
                {currentDate.toLocaleTimeString()}
              </div>
            </div>

            {/* Theme toggle */}
            <button
              onClick={() =>
                setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
              }
              style={{
                borderRadius: '999px',
                border: '1px solid #d1d5db',
                padding: '5px 10px',
                fontSize: '11px',
                cursor: 'pointer',
                background: theme === 'dark' ? '#111827' : '#f9fafb',
                color: theme === 'dark' ? '#f9fafb' : '#111827'
              }}
            >
              {theme === 'dark' ? '☀ Light' : '🌙 Dark'}
            </button>

            {/* Admin badge + Logout */}
            <div
              style={{
                padding: '6px 10px',
                borderRadius: '999px',
                background: '#f3f4ff',
                border: '1px solid #e5e7eb',
                fontSize: '12px',
                color: '#4b5563',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '999px',
                  background: '#22c55e'
                }}
              />
              <span>Admin</span>
              <button
                onClick={handleLogout}
                style={{
                  marginLeft: '6px',
                  padding: '4px 8px',
                  borderRadius: '999px',
                  border: 'none',
                  background: '#ef4444',
                  color: 'white',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="app-tabs">
          <button
            className="app-tab-btn"
            onClick={() => setActiveTab('sales')}
            style={{
              ...tabButtonBase,
              background:
                activeTab === 'sales' ? '#111827' : 'transparent',
              color: activeTab === 'sales' ? 'white' : '#4b5563',
              fontWeight: activeTab === 'sales' ? 600 : 500
            }}
          >
            <span>Sales</span>
          </button>

          <button
            className="app-tab-btn"
            onClick={() => setActiveTab('products')}
            style={{
              ...tabButtonBase,
              background:
                activeTab === 'products' ? '#111827' : 'transparent',
              color: activeTab === 'products' ? 'white' : '#4b5563',
              fontWeight: activeTab === 'products' ? 600 : 500
            }}
          >
            <span>Products</span>
          </button>

          <button
            className="app-tab-btn"
            onClick={() => setActiveTab('summary')}
            style={{
              ...tabButtonBase,
              background:
                activeTab === 'summary' ? '#111827' : 'transparent',
              color: activeTab === 'summary' ? 'white' : '#4b5563',
              fontWeight: activeTab === 'summary' ? 600 : 500
            }}
          >
            <span>Summary</span>
          </button>

          <button
            className="app-tab-btn"
            onClick={() => setActiveTab('customers')}
            style={{
              ...tabButtonBase,
              background:
                activeTab === 'customers' ? '#111827' : 'transparent',
              color: activeTab === 'customers' ? 'white' : '#4b5563',
              fontWeight: activeTab === 'customers' ? 600 : 500
            }}
          >
            <span>Customers</span>
          </button>
        </div>

        {/* Content */}
        <main className="app-main">
          {activeTab === 'sales' && (
            <Sales products={products} onSaleComplete={handleRefresh} />
          )}

          {activeTab === 'products' && (
            <div className="products-layout">
              <AddProduct
                onProductAdded={handleRefresh}
                products={products}
              />
              <ProductList
                products={products}
                onRefresh={handleRefresh}
              />
            </div>
          )}

          {activeTab === 'summary' && (
            <>
              <StockSummary summary={summary} products={products} />
              <NetworkInfo />
            </>
          )}

          {activeTab === 'customers' && (
            <div className="customer-history-layout">
              <CustomerHistory />
            </div>
          )}
        </main>
      </div>

      {/* Fixed branding footer */}
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}