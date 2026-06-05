const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { machineIdSync } = require('node-machine-id');
const os = require('os');

const schedule = require('node-schedule');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const QRCode = require('qrcode');

const app = express();
const PORT = 5000;
const DATA_FILE = path.join(__dirname, 'shop.json');
const SALES_FILE = path.join(__dirname, 'sales.json');
const AUTH_FILE = path.join(__dirname, 'auth.json');
const SALES_SUMMARY_FILE = path.join(__dirname, 'sales_summary.json');
const LICENSE_FILE = path.join(__dirname, 'license.json');

// 🔐 backup settings file
const BACKUP_SETTINGS_FILE = path.join(__dirname, 'backup-settings.json');

app.use(cors());
app.use(express.json());

// ====================== LOCAL IP HELPER ======================
function getLocalIp() {
  const nets = os.networkInterfaces();
  let ip = null;

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        ip = net.address;
        break;
      }
    }
    if (ip) break;
  }

  return ip;
}

// ====================== LICENSE CHECK ======================
function readLicense() {
  try {
    const raw = fs.readFileSync(LICENSE_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function verifyLicenseOnStart() {
  const lic = readLicense();

  if (!lic || !lic.licenseKey || typeof lic.licenseKey !== 'string') {
    throw new Error(
      'License missing or invalid. Please contact the developer to activate this app.'
    );
  }

  let currentId;
  try {
    currentId = machineIdSync();
  } catch (e) {
    throw new Error('Unable to read machine ID. License check failed.');
  }

  if (!lic.machineId) {
    throw new Error(
      'License is not bound to any machine. Contact the developer to activate.'
    );
  }

  if (lic.machineId !== currentId) {
    throw new Error(
      'License is for a different machine. This copy is not authorized.'
    );
  }

  console.log('✅ License OK for machine:', currentId);
  console.log('   Customer:', lic.customer || 'Unknown customer');
}

// ====================== INIT FILES ======================
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}
if (!fs.existsSync(SALES_FILE)) {
  fs.writeFileSync(SALES_FILE, JSON.stringify([], null, 2));
}
if (!fs.existsSync(SALES_SUMMARY_FILE)) {
  fs.writeFileSync(
    SALES_SUMMARY_FILE,
    JSON.stringify(
      {
        totalSalesProfit: 0,
        totalSalesAmount: 0,
        totalSalesCount: 0,
        lastResetAt: null
      },
      null,
      2
    )
  );
}
if (!fs.existsSync(AUTH_FILE)) {
  fs.writeFileSync(
    AUTH_FILE,
    JSON.stringify(
      {
        username: 'admin',
        password: 'admin123'
      },
      null,
      2
    )
  );
}

// 🔐 backup-settings.json default
if (!fs.existsSync(BACKUP_SETTINGS_FILE)) {
  fs.writeFileSync(
    BACKUP_SETTINGS_FILE,
    JSON.stringify(
      {
        backupPath: path.join(__dirname, 'backups')
      },
      null,
      2
    )
  );
}

// ====================== HELPER FUNCTIONS ======================
const readProducts = () => {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return [];
  }
};

const writeProducts = (products) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(products, null, 2));
    return true;
  } catch {
    return false;
  }
};

const readSales = () => {
  try {
    return JSON.parse(fs.readFileSync(SALES_FILE, 'utf8'));
  } catch {
    return [];
  }
};

const writeSales = (sales) => {
  try {
    fs.writeFileSync(SALES_FILE, JSON.stringify(sales, null, 2));
    return true;
  } catch {
    return false;
  }
};

const readSalesSummary = () => {
  try {
    return JSON.parse(fs.readFileSync(SALES_SUMMARY_FILE, 'utf8'));
  } catch {
    return {
      totalSalesProfit: 0,
      totalSalesAmount: 0,
      totalSalesCount: 0,
      lastResetAt: null
    };
  }
};

const writeSalesSummary = (summary) => {
  try {
    fs.writeFileSync(SALES_SUMMARY_FILE, JSON.stringify(summary, null, 2));
    return true;
  } catch {
    return false;
  }
};

const readAuth = () => {
  try {
    return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
  } catch {
    return { username: 'admin', password: 'admin123' };
  }
};

const writeAuth = (auth) => {
  try {
    fs.writeFileSync(AUTH_FILE, JSON.stringify(auth, null, 2));
    return true;
  } catch {
    return false;
  }
};

// 🔐 backup settings helpers
const readBackupSettings = () => {
  try {
    return JSON.parse(fs.readFileSync(BACKUP_SETTINGS_FILE, 'utf8'));
  } catch {
    return { backupPath: path.join(__dirname, 'backups') };
  }
};

const writeBackupSettings = (settings) => {
  try {
    fs.writeFileSync(BACKUP_SETTINGS_FILE, JSON.stringify(settings, null, 2));
    return true;
  } catch {
    return false;
  }
};

// ====================== HELPER: RESTORE STOCK FROM SALE ITEM ======================
function restoreStockFromSaleItem(item) {
  const products = readProducts();

  const idx = products.findIndex((p) => p.id === Number(item.productId));
  if (idx === -1) {
    return false;
  }

  const product = products[idx];

  const unitsPerBox = Number(product.unitsPerBox || item.unitsPerBox || 1);
  if (!unitsPerBox || isNaN(unitsPerBox) || unitsPerBox <= 0) {
    return false;
  }

  let boxes = Number(product.quantity || 0);
  let loose = Number(product.looseUnits || 0);
  const unitType = item.unitType || 'box';
  const qty = Number(item.quantity || 0);

  if (!qty || isNaN(qty) || qty <= 0) {
    return false;
  }

  if (unitType === 'box') {
    boxes += qty;
  } else if (unitType === 'plate') {
    const totalPlates = boxes * unitsPerBox + loose + qty;
    boxes = Math.floor(totalPlates / unitsPerBox);
    loose = totalPlates % unitsPerBox;
  } else {
    return false;
  }

  product.quantity = boxes;
  product.looseUnits = loose;

  writeProducts(products);
  return true;
}

// ====================== ADD PRODUCT ======================
app.post('/add-product', (req, res) => {
  const {
    name,
    price,
    quantity,
    profitPerUnit,
    batchNo,
    expiryDate,
    barcode,
    unitsPerBox
  } = req.body;

  if (
    !name ||
    !price ||
    !quantity ||
    profitPerUnit === undefined ||
    !batchNo ||
    !expiryDate ||
    !unitsPerBox
  ) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const products = readProducts();
  const productName = name.trim().toLowerCase();
  const newQuantity = parseInt(quantity, 10);
  const newPrice = parseFloat(price);
  const newProfit = parseFloat(profitPerUnit || 0);
  const batch = batchNo.trim().toLowerCase();
  const cleanBarcode = barcode ? String(barcode).trim() : '';
  const units = parseInt(unitsPerBox, 10);

  if (isNaN(units) || units <= 0) {
    return res
      .status(400)
      .json({ error: 'Units per box must be greater than 0' });
  }

  const existingProduct = products.find(
    (p) =>
      p.name.toLowerCase() === productName &&
      (p.batchNo || '').toLowerCase() === batch &&
      (p.expiryDate || '') === expiryDate &&
      Number(p.price) === newPrice &&
      Number(p.unitsPerBox || 0) === units
  );

  if (existingProduct) {
    existingProduct.quantity += newQuantity;
    existingProduct.price = newPrice;
    existingProduct.profitPerUnit = newProfit;
    existingProduct.expiryDate = expiryDate;
    existingProduct.unitsPerBox = units;
    if (cleanBarcode) {
      existingProduct.barcode = cleanBarcode;
    }
    writeProducts(products);
    return res.json({ message: `Stock updated for ${existingProduct.name}` });
  }

  const newProduct = {
    id: Date.now(),
    name: name.trim(),
    batchNo: batchNo.trim(),
    expiryDate,
    price: newPrice,
    quantity: newQuantity,
    profitPerUnit: newProfit,
    barcode: cleanBarcode || null,
    unitsPerBox: units,
    looseUnits: 0,
    addedAt: new Date().toISOString()
  };

  products.push(newProduct);
  writeProducts(products);
  res.status(201).json({ message: 'New product added successfully' });
});

// ====================== COMPLETE SALE ======================
function generateSaleId() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `sale_${yyyy}${mm}${dd}_${rand}`;
}

app.post('/complete-sale', (req, res) => {
  const { cart, customer, totals, paymentMethod } = req.body;

  if (!cart || !Array.isArray(cart) || cart.length === 0) {
    return res.status(400).json({ success: false, error: 'Invalid sale data' });
  }

  let products = readProducts();
  const dateTime = new Date().toISOString();

  const saleRecord = {
    id: generateSaleId(),
    dateTime,
    customer: {
      name: customer?.name || null,
      phone: customer?.phone || null
    },
    items: cart.map((item) => ({
      productId: item.productId,
      name: item.name,
      batchNo: item.batchNo || '',
      expiryDate: item.expiryDate || '',
      quantity: item.quantity,
      unitType: item.unitType,
      unitsPerBox: item.unitsPerBox,
      pricePerUnit: item.price,
      discount: item.discount,
      lineTotal: item.finalPrice
    })),
    grossTotal:
      totals?.grossTotal ??
      cart.reduce((sum, item) => sum + item.totalPrice, 0),
    discountTotal:
      totals?.discountTotal ??
      cart.reduce((sum, item) => sum + (item.totalPrice - item.finalPrice), 0),
    netTotal:
      totals?.netTotal ??
      cart.reduce((sum, item) => sum + item.finalPrice, 0),
    totalProfit:
      totals?.totalProfit ??
      cart.reduce((sum, item) => sum + (item.profit || 0), 0),
    paymentMethod: paymentMethod || 'cash'
  };

  for (const item of cart) {
    const index = products.findIndex((p) => p.id === item.productId);
    if (index === -1) continue;

    const product = products[index];
    const unitsPerBox = Number(product.unitsPerBox || 1);
    const currentBoxes = Number(product.quantity || 0);
    const currentLoose = Number(product.looseUnits || 0);
    const unitType = item.unitType || 'box';
    const qty = Number(item.quantity || 0);

    if (unitType === 'box') {
      product.quantity = currentBoxes - qty;
      if (product.quantity < 0) product.quantity = 0;
    } else if (unitType === 'plate') {
      const totalPlatesInStock = currentBoxes * unitsPerBox + currentLoose;
      const platesToSell = qty;

      if (platesToSell > totalPlatesInStock) {
        continue;
      }

      const remainingPlates = totalPlatesInStock - platesToSell;
      const newBoxes = Math.floor(remainingPlates / unitsPerBox);
      const loosePlates = remainingPlates % unitsPerBox;

      product.quantity = newBoxes;
      product.looseUnits = loosePlates;
    }

    const boxesLeft = Number(product.quantity || 0);
    const looseLeft = Number(product.looseUnits || 0);
    if (boxesLeft <= 0 && looseLeft <= 0) {
      products.splice(index, 1);
    }
  }

  const allSales = readSales();
  allSales.push(saleRecord);
  const okSales = writeSales(allSales);

  const currentSummary = readSalesSummary();
  const newSummary = {
    totalSalesProfit:
      (currentSummary.totalSalesProfit || 0) + (saleRecord.totalProfit || 0),
    totalSalesAmount:
      (currentSummary.totalSalesAmount || 0) + (saleRecord.netTotal || 0),
    totalSalesCount: (currentSummary.totalSalesCount || 0) + 1,
    lastResetAt: currentSummary.lastResetAt || null
  };
  const okSummary = writeSalesSummary(newSummary);

  const okProducts = writeProducts(products);

  if (okSales && okProducts && okSummary) {
    res.json({
      success: true,
      message: 'Sale completed successfully',
      totalProfit: saleRecord.totalProfit,
      saleId: saleRecord.id,
      dateTime: saleRecord.dateTime
    });
  } else {
    res
      .status(500)
      .json({ success: false, error: 'Failed to save sale or stock' });
  }
});

// ====================== SALES SUMMARY ======================
app.get('/sales-summary', (req, res) => {
  const summary = readSalesSummary();

  res.json({
    totalSalesProfit: summary.totalSalesProfit || 0,
    totalSalesAmount: summary.totalSalesAmount || 0,
    totalSalesCount: summary.totalSalesCount || 0,
    lastResetAt: summary.lastResetAt || null
  });
});

// ====================== SALES HISTORY ======================
app.get('/sales-history', (req, res) => {
  try {
    const sales = readSales();
    res.json({ success: true, sales });
  } catch (err) {
    console.error('Error reading sales history:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to read sales history'
    });
  }
});

// ====================== SALES RETURN: REMOVE ONE ITEM FROM SALE ======================
app.post('/sales-return-item', (req, res) => {
  const { saleId, itemIndex, productId, unitType, quantity } = req.body;

  if (!saleId || itemIndex === undefined) {
    return res.status(400).json({
      success: false,
      error: 'saleId and itemIndex are required'
    });
  }

  try {
    const sales = readSales();
    const saleIdx = sales.findIndex((s) => s.id === saleId);

    if (saleIdx === -1) {
      return res.status(404).json({
        success: false,
        error: 'Sale not found'
      });
    }

    const sale = sales[saleIdx];

    if (!sale.items || !Array.isArray(sale.items) || sale.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No items found for this sale'
      });
    }

    const idx = Number(itemIndex);
    if (isNaN(idx) || idx < 0 || idx >= sale.items.length) {
      return res.status(400).json({
        success: false,
        error: 'Invalid itemIndex'
      });
    }

    const removedItem = sale.items[idx];

    if (productId !== undefined) removedItem.productId = productId;
    if (unitType) removedItem.unitType = unitType;
    if (quantity !== undefined) removedItem.quantity = quantity;

    restoreStockFromSaleItem(removedItem);

    sale.items.splice(idx, 1);

    const items = sale.items;

    const grossTotal = items.reduce(
      (sum, it) => sum + Number(it.lineTotal || it.totalPrice || 0),
      0
    );

    const discountTotal = sale.discountTotal ?? 0;
    const netTotal = grossTotal - discountTotal;

    const totalProfit = items.reduce(
      (sum, it) => sum + Number(it.profit || 0),
      0
    );

    sale.grossTotal = grossTotal;
    sale.discountTotal = discountTotal;
    sale.netTotal = netTotal;
    sale.totalProfit = totalProfit;

    sales[saleIdx] = sale;

    if (!writeSales(sales)) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update sales file'
      });
    }

    return res.json({
      success: true,
      sale
    });
  } catch (err) {
    console.error('Error in /sales-return-item:', err);
    return res.status(500).json({
      success: false,
      error: 'Server error while returning item'
    });
  }
});

// ====================== DELETE SALE ======================
app.post('/delete-sale', (req, res) => {
  const { saleId, adminUser, adminPass } = req.body;

  if (!saleId || !adminUser || !adminPass) {
    return res
      .status(400)
      .json({ success: false, error: 'saleId, adminUser and adminPass required' });
  }

  const auth = readAuth();

  if (adminUser !== auth.username || adminPass !== auth.password) {
    return res
      .status(401)
      .json({ success: false, error: 'Invalid admin credentials' });
  }

  try {
    const sales = readSales();
    const before = sales.length;
    const updated = sales.filter((s) => s.id !== saleId);

    if (updated.length === before) {
      return res
        .status(404)
        .json({ success: false, error: 'Sale not found' });
    }

    if (!writeSales(updated)) {
      return res
        .status(500)
        .json({ success: false, error: 'Failed to update sales file' });
    }

    return res.json({
      success: true,
      message: `Sale ${saleId} deleted successfully`
    });
  } catch (err) {
    console.error('Error deleting sale:', err);
    return res
      .status(500)
      .json({ success: false, error: 'Server error while deleting sale' });
  }
});

// ====================== RESET SALES SUMMARY ======================
app.post('/reset-sales-summary', (req, res) => {
  const { username, password } = req.body;
  const auth = readAuth();

  if (username !== auth.username || password !== auth.password) {
    return res
      .status(401)
      .json({ success: false, error: 'Invalid credentials' });
  }

  try {
    const resetSummary = {
      totalSalesProfit: 0,
      totalSalesAmount: 0,
      totalSalesCount: 0,
      lastResetAt: new Date().toISOString()
    };

    if (!writeSalesSummary(resetSummary)) {
      return res
        .status(500)
        .json({ success: false, error: 'Failed to reset sales summary' });
    }

    return res.json({
      success: true,
      message: 'Sales summary reset successfully'
    });
  } catch (err) {
    console.error('Error while resetting sales summary:', err);
    return res
      .status(500)
      .json({ success: false, error: 'Server error while resetting' });
  }
});

// ====================== OTHER ROUTES ======================
app.get('/products', (req, res) => res.json(readProducts()));

app.get('/stock', (req, res) => {
  const products = readProducts();
  const totalProfit = products.reduce(
    (sum, p) => sum + p.quantity * (p.profitPerUnit || 0),
    0
  );

  const totalBoxes = products.reduce((sum, p) => sum + p.quantity, 0);
  const totalPlates = products.reduce((sum, p) => {
    const unitsPerBox = Number(p.unitsPerBox || 1);
    const looseUnits = Number(p.looseUnits || 0);
    return sum + p.quantity * unitsPerBox + looseUnits;
  }, 0);

  res.json({
    totalProducts: products.length,
    totalItems: totalBoxes,
    totalValue: products.reduce(
      (sum, p) => sum + p.price * p.quantity,
      0
    ),
    totalProfit: totalProfit,
    totalPlates,
    lowStock: products.filter((p) => p.quantity < 10)
  });
});

app.get('/server-info', (req, res) => {
  const ip = getLocalIp();
  res.json({
    ipAddress: ip,
    port: PORT,
    url: ip ? `http://${ip}:${PORT}` : null
  });
});

// ====================== MOBILE CONNECT QR INFO (NEW) ======================
app.get('/qr-info', async (req, res) => {
  try {
    const ip = getLocalIp();
    if (!ip) {
      return res.status(500).json({
        success: false,
        error: 'Could not detect local IP address'
      });
    }

    const serverUrl = `http://${ip}:${PORT}`;

    const qrDataUrl = await QRCode.toDataURL(serverUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      scale: 6
    });

    res.json({
      success: true,
      serverUrl,
      qrDataUrl
    });
  } catch (err) {
    console.error('Error generating QR code:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to generate QR code'
    });
  }
});

// ====================== ADJUST STOCK (boxes + plates) ======================
app.post('/adjust-stock', (req, res) => {
  const { productId, changeQty, unitType } = req.body;

  if (
    productId === undefined ||
    changeQty === undefined ||
    !unitType
  ) {
    return res.status(400).json({
      success: false,
      error: 'productId, changeQty and unitType are required'
    });
  }

  const delta = Number(changeQty);
  if (!delta || isNaN(delta)) {
    return res.status(400).json({
      success: false,
      error: 'changeQty must be a non‑zero number'
    });
  }

  const allowedUnitTypes = ['box', 'plate'];
  if (!allowedUnitTypes.includes(unitType)) {
    return res.status(400).json({
      success: false,
      error: 'unitType must be "box" or "plate"'
    });
  }

  const products = readProducts();
  const index = products.findIndex((p) => p.id === Number(productId));

  if (index === -1) {
    return res
      .status(404)
      .json({ success: false, error: 'Product not found' });
  }

  const product = products[index];

  const unitsPerBox = Number(product.unitsPerBox || 1);
  if (!unitsPerBox || isNaN(unitsPerBox) || unitsPerBox <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid unitsPerBox for this product'
    });
  }

  let boxes = Number(product.quantity || 0);
  let loose = Number(product.looseUnits || 0);

  if (unitType === 'box') {
    const newBoxes = boxes + delta;
    if (newBoxes < 0) {
      return res.status(400).json({
        success: false,
        error: 'Stock cannot be negative (boxes)'
      });
    }
    boxes = newBoxes;
  } else if (unitType === 'plate') {
    const totalPlates = boxes * unitsPerBox + loose + delta;

    if (totalPlates < 0) {
      return res.status(400).json({
        success: false,
        error: 'Stock cannot be negative (plates)'
      });
    }

    boxes = Math.floor(totalPlates / unitsPerBox);
    loose = totalPlates % unitsPerBox;
  }

  product.quantity = boxes;
  product.looseUnits = loose;

  if (!writeProducts(products)) {
    return res.status(500).json({
      success: false,
      error: 'Failed to update stock'
    });
  }

  return res.json({
    success: true,
    message: 'Stock adjusted successfully',
    product: {
      id: product.id,
      quantity: product.quantity,
      looseUnits: product.looseUnits,
      unitsPerBox
    }
  });
});

// ====================== LOGIN ======================
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const auth = readAuth();

  if (username === auth.username && password === auth.password) {
    res.json({ success: true, message: 'Login successful' });
  } else {
    res
      .status(401)
      .json({ success: false, message: 'Invalid credentials' });
  }
});

// ====================== CHANGE PASSWORD ======================
app.post('/change-password', (req, res) => {
  const { username, oldPassword, newPassword } = req.body;

  if (!username || !oldPassword || !newPassword) {
    return res
      .status(400)
      .json({ success: false, message: 'All fields are required' });
  }

  const auth = readAuth();

  if (username !== auth.username || oldPassword !== auth.password) {
    return res.status(401).json({
      success: false,
      message: 'Old username or password is incorrect'
    });
  }

  const updatedAuth = {
    username: auth.username,
    password: newPassword
  };

  if (!writeAuth(updatedAuth)) {
    return res
      .status(500)
      .json({ success: false, message: 'Failed to update password' });
  }

  return res.json({
    success: true,
    message: 'Password updated successfully'
  });
});

// ====================== 🔐 BACKUP SETTINGS ROUTES ======================

// GET backup settings
app.get('/backup-settings', (req, res) => {
  try {
    const settings = readBackupSettings();
    res.json({
      success: true,
      backupPath: settings.backupPath
    });
  } catch (err) {
    console.error('Error reading backup settings:', err);
    res.status(500).json({ success: false, error: 'Failed to read backup settings' });
  }
});

// POST save backup path
app.post('/backup-settings', (req, res) => {
  const { backupPath } = req.body;

  if (!backupPath || typeof backupPath !== 'string') {
    return res
      .status(400)
      .json({ success: false, error: 'backupPath is required' });
  }

  try {
    const settings = {
      backupPath: backupPath.trim()
    };

    if (!writeBackupSettings(settings)) {
      return res
        .status(500)
        .json({ success: false, error: 'Failed to save backup path' });
    }

    res.json({
      success: true,
      backupPath: settings.backupPath
    });
  } catch (err) {
    console.error('Error saving backup settings:', err);
    res
      .status(500)
      .json({ success: false, error: 'Server error while saving backup path' });
  }
});

// ====================== 🔄 MONTHLY BACKUP (CSV EXPORT) ======================

// Helper: format date as DD-MM-YYYY
function formatDateDDMMYYYY(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

// Helper: get last calendar month range
function getLastMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0–11

  const startDate = new Date(year, month - 1, 1, 0, 0, 0);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  return {
    start: startDate,
    end: endDate,
    startStr: formatDateDDMMYYYY(startDate),
    endStr: formatDateDDMMYYYY(endDate)
  };
}

async function exportMonthlyBackup(mode = 'auto') {
  const { start, end, startStr, endStr } = getLastMonthRange();

  const allSales = readSales();

  const filteredSales = allSales.filter((sale) => {
    const saleDate = new Date(sale.dateTime);
    return saleDate >= start && saleDate <= end;
  });

  const rows = [];
  filteredSales.forEach((sale) => {
    (sale.items || []).forEach((item) => {
      rows.push({
        saleId: sale.id,
        dateTime: sale.dateTime,
        customerName: sale.customer?.name || '',
        customerPhone: sale.customer?.phone || '',
        netTotal: sale.netTotal ?? 0,
        discountTotal: sale.discountTotal ?? 0,
        profitTotal: sale.totalProfit ?? 0,
        productName: item.name,
        batchNo: item.batchNo || '',
        expiryDate: item.expiryDate || '',
        quantity: item.quantity,
        unitType: item.unitType || '',
        lineTotal: item.lineTotal ?? 0
      });
    });
  });

  const settings = readBackupSettings();
  const backupPath = settings.backupPath;

  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(backupPath, { recursive: true });
  }

  const fileName = `${startStr}_${endStr}.csv`;
  const filePath = path.join(backupPath, fileName);

  const csvWriter = createCsvWriter({
    path: filePath,
    header: [
      { id: 'saleId', title: 'SALE_ID' },
      { id: 'dateTime', title: 'DATE_TIME' },
      { id: 'customerName', title: 'CUSTOMER_NAME' },
      { id: 'customerPhone', title: 'CUSTOMER_PHONE' },
      { id: 'netTotal', title: 'NET_TOTAL' },
      { id: 'discountTotal', title: 'DISCOUNT_TOTAL' },
      { id: 'profitTotal', title: 'PROFIT_TOTAL' },
      { id: 'productName', title: 'PRODUCT_NAME' },
      { id: 'batchNo', title: 'BATCH_NO' },
      { id: 'expiryDate', title: 'EXPIRY_DATE' },
      { id: 'quantity', title: 'QTY' },
      { id: 'unitType', title: 'UNIT_TYPE' },
      { id: 'lineTotal', title: 'LINE_TOTAL' }
    ]
  });

  await csvWriter.writeRecords(rows);

  return {
    fileName,
    filePath,
    rowsCount: rows.length,
    salesCount: filteredSales.length
  };
}

// POST export monthly backup (manual + auto)
app.post('/export-monthly-backup', async (req, res) => {
  try {
    const result = await exportMonthlyBackup('manual');
    res.json({
      success: true,
      fileName: result.fileName,
      filePath: result.filePath,
      rowsCount: result.rowsCount,
      salesCount: result.salesCount,
      message: `Monthly backup created with ${result.salesCount} sales, ${result.rowsCount} items.`
    });
  } catch (err) {
    console.error('Error exporting monthly backup:', err);
    res
      .status(500)
      .json({ success: false, error: 'Error while exporting monthly backup' });
  }
});

// 🔐 Schedule monthly backup: every 1st of month at 00:00
schedule.scheduleJob('0 0 1 * *', async () => {
  console.log('🕒 Running automatic monthly backup...');
  try {
    const result = await exportMonthlyBackup('auto');
    console.log('✅ Monthly backup completed:', result.fileName, result.rowsCount, 'rows');
  } catch (err) {
    console.error('❌ Monthly backup failed:', err);
  }
});

// ===== Serve React build from ../frontend/dist =====
const FRONTEND_BUILD_PATH = path.join(__dirname, '../frontend/dist');

app.use(express.static(FRONTEND_BUILD_PATH));

app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND_BUILD_PATH, 'index.html'));
});

// ====================== START SERVER ======================
try {
  verifyLicenseOnStart();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  });
} catch (err) {
  console.error('❌ License error:', err.message);
  console.error(
    'Server not started. Put a valid license.json file next to server.js'
  );
  process.exit(1);
}