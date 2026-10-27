/* ============================================================
   KCHECK Service Tracker — Data Layer (Stage 1 LocalStorage)
   ============================================================ */

'use strict';

const { generateId, nowISO, lsGet, lsSave } = window.KCHECK;

// ── Schema Version ─────────────────────────────────────────
const SCHEMA_VERSION = 1;

// ── Default Demo Seed Data ─────────────────────────────────
function buildSeedData() {
  const now = new Date();
  const d   = (offsetDays) => {
    const t = new Date(now);
    t.setDate(t.getDate() - offsetDays);
    return t.toISOString();
  };

  const appSettings = {
    businessName:       'COT Automotive, PSMZA',
    businessFullName:   'Centre of Technology Automotive',
    businessAddress:    'Politeknik Sultan Mizan Zainal Abidin, 23000 Dungun, Terengganu',
    businessPhone:      '',
    businessEmail:      '',
    workshopName:       'Alif Workshop',
    workshopAddress:    '',
    workshopPhone:      '',
    workshopContact:    '',
    logoPath:           'assets/logos/carecheck.png',
    appDisplayName:     'KCHECK Service Tracker',
    paymentQrPath:      '',
    paymentInstructions:'⚠️ DEMO — NOT FOR PAYMENT. Payment QR and bank details will be configured by the administrator before live use.',
    paymentBankDetails: '',
    quotationFooter:    'This quotation is valid for 14 days from the date of issue. Prices are subject to change upon inspection.',
    invoiceFooter:      'Thank you for your service with COT Automotive. This is an internal service invoice and is not an LHDN-validated e-Invoice.',
    documentWatermark:  '',
    taxRate:            0,
    updatedAt:          now.toISOString()
  };

  const vehicleMaster = [
    { entryId: 'BRAND-001', type: 'brand', name: 'Perodua',  parentId: '', status: 'active', createdAt: d(30) },
    { entryId: 'BRAND-002', type: 'brand', name: 'Proton',   parentId: '', status: 'active', createdAt: d(30) },
    { entryId: 'BRAND-003', type: 'brand', name: 'Toyota',   parentId: '', status: 'active', createdAt: d(30) },
    { entryId: 'BRAND-004', type: 'brand', name: 'Honda',    parentId: '', status: 'active', createdAt: d(30) },
    { entryId: 'BRAND-005', type: 'brand', name: 'Nissan',   parentId: '', status: 'active', createdAt: d(30) },
    { entryId: 'BRAND-006', type: 'brand', name: 'Mitsubishi',parentId:'', status: 'active', createdAt: d(30) },
    { entryId: 'BRAND-007', type: 'brand', name: 'Mazda',    parentId: '', status: 'active', createdAt: d(30) },
    { entryId: 'BRAND-008', type: 'brand', name: 'Hyundai',  parentId: '', status: 'active', createdAt: d(30) },
    { entryId: 'BRAND-009', type: 'brand', name: 'Kia',      parentId: '', status: 'active', createdAt: d(30) },
    { entryId: 'BRAND-010', type: 'brand', name: 'Isuzu',    parentId: '', status: 'active', createdAt: d(30) },

    { entryId: 'MODEL-001', type: 'model', name: 'Myvi',        parentId: 'BRAND-001', status: 'active', createdAt: d(30) },
    { entryId: 'MODEL-002', type: 'model', name: 'Axia',        parentId: 'BRAND-001', status: 'active', createdAt: d(30) },
    { entryId: 'MODEL-003', type: 'model', name: 'Bezza',       parentId: 'BRAND-001', status: 'active', createdAt: d(30) },
    { entryId: 'MODEL-004', type: 'model', name: 'Ativa',       parentId: 'BRAND-001', status: 'active', createdAt: d(30) },
    { entryId: 'MODEL-005', type: 'model', name: 'Alza',        parentId: 'BRAND-001', status: 'active', createdAt: d(30) },
    { entryId: 'MODEL-006', type: 'model', name: 'Saga',        parentId: 'BRAND-002', status: 'active', createdAt: d(30) },
    { entryId: 'MODEL-007', type: 'model', name: 'Persona',     parentId: 'BRAND-002', status: 'active', createdAt: d(30) },
    { entryId: 'MODEL-008', type: 'model', name: 'Iriz',        parentId: 'BRAND-002', status: 'active', createdAt: d(30) },
    { entryId: 'MODEL-009', type: 'model', name: 'X50',         parentId: 'BRAND-002', status: 'active', createdAt: d(30) },
    { entryId: 'MODEL-010', type: 'model', name: 'Alphard',     parentId: 'BRAND-003', status: 'active', createdAt: d(30) },
    { entryId: 'MODEL-011', type: 'model', name: 'Vios',        parentId: 'BRAND-003', status: 'active', createdAt: d(30) },
    { entryId: 'MODEL-012', type: 'model', name: 'Hilux',       parentId: 'BRAND-003', status: 'active', createdAt: d(30) },
    { entryId: 'MODEL-013', type: 'model', name: 'Rush',        parentId: 'BRAND-003', status: 'active', createdAt: d(30) },
    { entryId: 'MODEL-014', type: 'model', name: 'City',        parentId: 'BRAND-004', status: 'active', createdAt: d(30) },
    { entryId: 'MODEL-015', type: 'model', name: 'Civic',       parentId: 'BRAND-004', status: 'active', createdAt: d(30) },
    { entryId: 'MODEL-016', type: 'model', name: 'HR-V',        parentId: 'BRAND-004', status: 'active', createdAt: d(30) },
    { entryId: 'MODEL-017', type: 'model', name: 'CR-V',        parentId: 'BRAND-004', status: 'active', createdAt: d(30) },
    { entryId: 'MODEL-018', type: 'model', name: 'Navara',      parentId: 'BRAND-005', status: 'active', createdAt: d(30) },
    { entryId: 'MODEL-019', type: 'model', name: 'X-Trail',     parentId: 'BRAND-005', status: 'active', createdAt: d(30) },
    { entryId: 'MODEL-020', type: 'model', name: 'Triton',      parentId: 'BRAND-006', status: 'active', createdAt: d(30) },
    { entryId: 'MODEL-021', type: 'model', name: 'ASX',         parentId: 'BRAND-006', status: 'active', createdAt: d(30) },
    { entryId: 'MODEL-022', type: 'model', name: 'Mazda 3',     parentId: 'BRAND-007', status: 'active', createdAt: d(30) },
    { entryId: 'MODEL-023', type: 'model', name: 'CX-5',        parentId: 'BRAND-007', status: 'active', createdAt: d(30) },
    { entryId: 'MODEL-024', type: 'model', name: 'Elantra',     parentId: 'BRAND-008', status: 'active', createdAt: d(30) },
    { entryId: 'MODEL-025', type: 'model', name: 'Tucson',      parentId: 'BRAND-008', status: 'active', createdAt: d(30) },
    { entryId: 'MODEL-026', type: 'model', name: 'Sportage',    parentId: 'BRAND-009', status: 'active', createdAt: d(30) },
    { entryId: 'MODEL-027', type: 'model', name: 'D-Max',       parentId: 'BRAND-010', status: 'active', createdAt: d(30) },
  ];

  // ── Demo Customers (no contact details per spec) ────────────
  const customers = [
    {
      customerId:  'CUST-0001',
      fullName:    'Hasnaty',
      phone:       '',
      email:       '',
      address:     '',
      notes:       '',
      isDemo:      true,
      isActive:    true,
      createdAt:   d(14),
      updatedAt:   d(14)
    },
    {
      customerId:  'CUST-0002',
      fullName:    'Pn. Aznira',
      phone:       '',
      email:       '',
      address:     '',
      notes:       '',
      isDemo:      true,
      isActive:    true,
      createdAt:   d(12),
      updatedAt:   d(12)
    },
    {
      customerId:  'CUST-0003',
      fullName:    'Pn. Noraini',
      phone:       '',
      email:       '',
      address:     '',
      notes:       '',
      isDemo:      true,
      isActive:    true,
      createdAt:   d(10),
      updatedAt:   d(10)
    },
    {
      customerId:  'CUST-0004',
      fullName:    'Pn. Azlina',
      phone:       '',
      email:       '',
      address:     '',
      notes:       '',
      isDemo:      true,
      isActive:    true,
      createdAt:   d(8),
      updatedAt:   d(8)
    }
  ];

  // ── Demo Vehicles (plates not invented) ────────────────────
  const vehicles = [
    {
      vehicleId:         'VEH-0003',
      customerId:        'CUST-0003',
      registrationPlate: '',
      brandId:           'BRAND-001',
      brandName:         'Perodua',
      modelId:           'MODEL-001',
      modelName:         'Myvi',
      customBrand:       '',
      customModel:       '',
      year:              '',
      mileage:           '',
      colour:            '',
      notes:             '',
      isDemo:            true,
      createdAt:         d(10),
      updatedAt:         d(10)
    },
    {
      vehicleId:         'VEH-0004',
      customerId:        'CUST-0004',
      registrationPlate: '',
      brandId:           'BRAND-003',
      brandName:         'Toyota',
      modelId:           'MODEL-010',
      modelName:         'Alphard',
      customBrand:       '',
      customModel:       '',
      year:              '',
      mileage:           '',
      colour:            '',
      notes:             '',
      isDemo:            true,
      createdAt:         d(8),
      updatedAt:         d(8)
    }
  ];

  // ── Demo Service Requests (all NEW_REQUEST) ────────────────
  const serviceRequests = [
    {
      serviceId:            'SVC-0001',
      customerId:           'CUST-0001',
      vehicleId:            '',
      vehicleSnapshot:      { brand: '', model: '', plate: '', year: '' },
      complaintDescription: 'Brake shoe service',
      inspectionFindings:   '',
      workshopRecommendation:'',
      coordinatorRemarks:   '',
      progressNotes:        [],
      status:               'NEW_REQUEST',
      activeQuotationId:    '',
      activePaymentId:      '',
      isDemo:               true,
      createdAt:            d(14),
      updatedAt:            d(14),
      auditLog:             [{ action: 'CREATED', note: 'Service request created', performedAt: d(14), performedBy: 'COT Admin' }]
    },
    {
      serviceId:            'SVC-0002',
      customerId:           'CUST-0002',
      vehicleId:            '',
      vehicleSnapshot:      { brand: '', model: '', plate: '', year: '' },
      complaintDescription: 'Vehicle value assessment',
      inspectionFindings:   '',
      workshopRecommendation:'',
      coordinatorRemarks:   '',
      progressNotes:        [],
      status:               'NEW_REQUEST',
      activeQuotationId:    '',
      activePaymentId:      '',
      isDemo:               true,
      createdAt:            d(12),
      updatedAt:            d(12),
      auditLog:             [{ action: 'CREATED', note: 'Service request created', performedAt: d(12), performedBy: 'COT Admin' }]
    },
    {
      serviceId:            'SVC-0003',
      customerId:           'CUST-0003',
      vehicleId:            'VEH-0003',
      vehicleSnapshot:      { brand: 'Perodua', model: 'Myvi', plate: '', year: '' },
      complaintDescription: 'Belting replacement',
      inspectionFindings:   '',
      workshopRecommendation:'',
      coordinatorRemarks:   '',
      progressNotes:        [],
      status:               'NEW_REQUEST',
      activeQuotationId:    '',
      activePaymentId:      '',
      isDemo:               true,
      createdAt:            d(10),
      updatedAt:            d(10),
      auditLog:             [{ action: 'CREATED', note: 'Service request created', performedAt: d(10), performedBy: 'COT Admin' }]
    },
    {
      serviceId:            'SVC-0004',
      customerId:           'CUST-0004',
      vehicleId:            'VEH-0004',
      vehicleSnapshot:      { brand: 'Toyota', model: 'Alphard', plate: '', year: '' },
      complaintDescription: 'Bush/spring noise and tyre replacement',
      inspectionFindings:   '',
      workshopRecommendation:'',
      coordinatorRemarks:   '',
      progressNotes:        [],
      status:               'NEW_REQUEST',
      activeQuotationId:    '',
      activePaymentId:      '',
      isDemo:               true,
      createdAt:            d(8),
      updatedAt:            d(8),
      auditLog:             [{ action: 'CREATED', note: 'Service request created', performedAt: d(8), performedBy: 'COT Admin' }]
    }
  ];

  return {
    schemaVersion: SCHEMA_VERSION,
    seededAt:      now.toISOString(),
    appSettings,
    vehicleMaster,
    customers,
    vehicles,
    serviceRequests,
    quotations:  [],
    approvals:   [],
    payments:    [],
    auditLogs:   []
  };
}

// ── Load or Seed ───────────────────────────────────────────
function initData() {
  const existing = lsGet();
  if (!existing || existing.schemaVersion !== SCHEMA_VERSION) {
    const seed = buildSeedData();
    lsSave(seed);
    return seed;
  }
  return existing;
}

// ── CRUD Helpers ───────────────────────────────────────────
function getDB()       { return lsGet() || initData(); }
function saveDB(db)    { lsSave(db); }

function getAll(collection)       { return getDB()[collection] || []; }
function getById(collection, id, idField = null) {
  const fieldMap = { customers: 'customerId', vehicles: 'vehicleId', serviceRequests: 'serviceId', quotations: 'quotationId', payments: 'paymentId', vehicleMaster: 'entryId', approvals: 'approvalId' };
  const field = idField || fieldMap[collection] || 'id';
  return (getDB()[collection] || []).find(r => r[field] === id) || null;
}

function insertRecord(collection, record) {
  const db = getDB();
  if (!db[collection]) db[collection] = [];
  db[collection].push(record);
  saveDB(db);
  return record;
}

function updateRecord(collection, idField, id, updates) {
  const db = getDB();
  const arr = db[collection] || [];
  const idx = arr.findIndex(r => r[idField] === id);
  if (idx === -1) return null;
  arr[idx] = { ...arr[idx], ...updates, updatedAt: nowISO() };
  db[collection] = arr;
  saveDB(db);
  return arr[idx];
}

function deleteRecord(collection, idField, id) {
  const db  = getDB();
  const arr = db[collection] || [];
  const idx = arr.findIndex(r => r[idField] === id);
  if (idx === -1) return false;
  arr.splice(idx, 1);
  db[collection] = arr;
  saveDB(db);
  return true;
}

function getSetting(key) { return (getDB().appSettings || {})[key] ?? ''; }
function saveSetting(key, value) {
  const db = getDB();
  db.appSettings = { ...(db.appSettings || {}), [key]: value, updatedAt: nowISO() };
  saveDB(db);
}
function saveSettings(updates) {
  const db = getDB();
  db.appSettings = { ...(db.appSettings || {}), ...updates, updatedAt: nowISO() };
  saveDB(db);
}

// ── Audit Log ──────────────────────────────────────────────
function addAuditLog(entityType, entityId, action, details, performedBy = 'COT Admin') {
  const entry = {
    logId:       generateId('LOG'),
    action,
    entityType,
    entityId,
    performedBy,
    performedAt: nowISO(),
    details
  };
  insertRecord('auditLogs', entry);
  return entry;
}

// ── Service-specific helpers ───────────────────────────────
function updateServiceStatus(serviceId, newStatus, note = '', performedBy = 'COT Admin') {
  const db  = getDB();
  const arr = db.serviceRequests || [];
  const idx = arr.findIndex(s => s.serviceId === serviceId);
  if (idx === -1) return null;

  const svc       = arr[idx];
  const oldStatus = svc.status;
  const logEntry  = { action: `STATUS_${newStatus}`, note: note || `Status changed from ${oldStatus} to ${newStatus}`, performedAt: nowISO(), performedBy };
  if (!svc.auditLog) svc.auditLog = [];
  svc.auditLog.push(logEntry);
  svc.status    = newStatus;
  svc.updatedAt = nowISO();

  db.serviceRequests = arr;
  saveDB(db);
  addAuditLog('serviceRequest', serviceId, `STATUS_${newStatus}`, logEntry.note, performedBy);
  return arr[idx];
}

// ── Data Export ────────────────────────────────────────────
function exportDemoData() {
  const db = getDB();
  const safe = {
    exportedAt: nowISO(),
    note: 'KCHECK Service Tracker — Stage 1 demonstration data export. No real customer data.',
    customers: db.customers.map(c => ({ ...c, phone: '', email: '' })),
    vehicles: db.vehicles,
    serviceRequests: db.serviceRequests,
    vehicleMaster: db.vehicleMaster
  };
  const blob = new Blob([JSON.stringify(safe, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'kcheck-demo-export.json';
  a.click();
  URL.revokeObjectURL(url);
}

function resetDemoData() {
  const seed = buildSeedData();
  lsSave(seed);
  return seed;
}

// ── Expose on window.KCHECK ────────────────────────────────
Object.assign(window.KCHECK, {
  initData, getDB, saveDB,
  getAll, getById, insertRecord, updateRecord, deleteRecord,
  getSetting, saveSetting, saveSettings,
  addAuditLog, updateServiceStatus,
  exportDemoData, resetDemoData
});

// ── Auto-init on load ──────────────────────────────────────
window.KCHECK.db = initData();
