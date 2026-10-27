/* ============================================================
   KCHECK — Application Settings
   ============================================================ */

'use strict';

const {
  getAll, getDB, saveDB, insertRecord, updateRecord, deleteRecord,
  generateId, nowISO, escHtml, showToast, showModal, closeModal,
  showConfirm, renderEmpty, getSetting, saveSetting, saveSettings,
  exportDemoData, resetDemoData
} = window.KCHECK;

// ── Render Settings ────────────────────────────────────────
function renderSettings() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-section">
      <h2 class="section-title" style="margin-bottom:1rem">Settings</h2>
      <div class="tab-list" id="settingsTabList">
        <button class="tab-btn active" data-tab="org">Organisation</button>
        <button class="tab-btn" data-tab="workshop">Workshop</button>
        <button class="tab-btn" data-tab="branding">Branding</button>
        <button class="tab-btn" data-tab="vehicles-master">Vehicle Master</button>
        <button class="tab-btn" data-tab="payment">Payment</button>
        <button class="tab-btn" data-tab="documents">Documents</button>
        <button class="tab-btn" data-tab="templates">WhatsApp Templates</button>
        <button class="tab-btn" data-tab="data">Data Management</button>
      </div>
      <div id="settingsTabContent"></div>
    </div>`;

  document.querySelectorAll('#settingsTabList .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#settingsTabList .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderSettingsTab(btn.dataset.tab);
    });
  });

  renderSettingsTab('org');
}

function renderSettingsTab(tab) {
  const container = document.getElementById('settingsTabContent');
  if (!container) return;

  const biz = window.KCHECK.getDB().appSettings || {};

  const tabs = {
    org:       renderOrgTab(biz),
    workshop:  renderWorkshopTab(biz),
    branding:  renderBrandingTab(biz),
    'vehicles-master': renderVehicleMasterTab(),
    payment:   renderPaymentTab(biz),
    documents: renderDocumentsTab(biz),
    templates: renderTemplatesTab(biz),
    data:      renderDataTab()
  };

  container.innerHTML = `<div class="card"><div class="card-body">${tabs[tab] || '<p>Unknown tab.</p>'}</div></div>`;
}

// ── Organisation ───────────────────────────────────────────
function renderOrgTab(biz) {
  return `
    <h3 style="margin-bottom:1rem">Organisation Details</h3>
    <div class="form-row form-row-2">
      <div class="form-group"><label class="form-label">Business Name</label>
        <input class="form-control" id="cfg_bizName" value="${escHtml(biz.businessName || '')}" /></div>
      <div class="form-group"><label class="form-label">Full Name</label>
        <input class="form-control" id="cfg_bizFull" value="${escHtml(biz.businessFullName || '')}" /></div>
    </div>
    <div class="form-group"><label class="form-label">Address</label>
      <textarea class="form-control" id="cfg_bizAddr" rows="2">${escHtml(biz.businessAddress || '')}</textarea></div>
    <div class="form-row form-row-2">
      <div class="form-group"><label class="form-label">Phone</label>
        <input class="form-control" id="cfg_bizPhone" type="tel" value="${escHtml(biz.businessPhone || '')}" /></div>
      <div class="form-group"><label class="form-label">Email</label>
        <input class="form-control" id="cfg_bizEmail" type="email" value="${escHtml(biz.businessEmail || '')}" /></div>
    </div>
    <button class="btn btn-primary" onclick="window.KCSettings.saveOrg()">Save Organisation Details</button>`;
}

function saveOrg() {
  saveSettings({
    businessName:     document.getElementById('cfg_bizName').value.trim(),
    businessFullName: document.getElementById('cfg_bizFull').value.trim(),
    businessAddress:  document.getElementById('cfg_bizAddr').value.trim(),
    businessPhone:    document.getElementById('cfg_bizPhone').value.trim(),
    businessEmail:    document.getElementById('cfg_bizEmail').value.trim()
  });
  showToast('Organisation details saved.', 'success');
}

// ── Workshop ───────────────────────────────────────────────
function renderWorkshopTab(biz) {
  return `
    <h3 style="margin-bottom:1rem">Workshop Contact</h3>
    <div class="form-row form-row-2">
      <div class="form-group"><label class="form-label">Workshop Name</label>
        <input class="form-control" id="cfg_wsName" value="${escHtml(biz.workshopName || 'Alif Workshop')}" /></div>
      <div class="form-group"><label class="form-label">Contact Person</label>
        <input class="form-control" id="cfg_wsContact" value="${escHtml(biz.workshopContact || '')}" /></div>
    </div>
    <div class="form-group"><label class="form-label">Address</label>
      <textarea class="form-control" id="cfg_wsAddr" rows="2">${escHtml(biz.workshopAddress || '')}</textarea></div>
    <div class="form-group"><label class="form-label">Phone</label>
      <input class="form-control" id="cfg_wsPhone" type="tel" value="${escHtml(biz.workshopPhone || '')}" /></div>
    <button class="btn btn-primary" onclick="window.KCSettings.saveWorkshop()">Save Workshop Details</button>`;
}
function saveWorkshop() {
  saveSettings({
    workshopName:    document.getElementById('cfg_wsName').value.trim(),
    workshopContact: document.getElementById('cfg_wsContact').value.trim(),
    workshopAddress: document.getElementById('cfg_wsAddr').value.trim(),
    workshopPhone:   document.getElementById('cfg_wsPhone').value.trim()
  });
  showToast('Workshop details saved.', 'success');
}

// ── Branding ───────────────────────────────────────────────
function renderBrandingTab(biz) {
  return `
    <h3 style="margin-bottom:1rem">Application Branding</h3>
    <div class="form-group">
      <label class="form-label">Application Display Name</label>
      <input class="form-control" id="cfg_appName" value="${escHtml(biz.appDisplayName || 'KCHECK Service Tracker')}" />
    </div>
    <div class="form-group">
      <label class="form-label">Logo File Path</label>
      <input class="form-control" id="cfg_logoPath" value="${escHtml(biz.logoPath || 'assets/logos/carecheck.png')}" />
      <div class="form-hint">Path to logo image relative to index.html. The supplied CareCheck logo is at assets/logos/carecheck.png. Do not modify the logo file itself.</div>
    </div>
    <div style="margin-bottom:1rem">
      <div class="form-label">Current Logo Preview</div>
      <img id="logoPreviewImg" src="${escHtml(biz.logoPath || 'assets/logos/carecheck.png')}" alt="Logo Preview"
        style="height:60px;border:1px solid var(--color-border);border-radius:var(--radius-md);padding:8px;background:#fff"
        onerror="this.style.display='none';document.getElementById('logoPreviewFallback').style.display='block'" />
      <div id="logoPreviewFallback" style="display:none" class="text-muted text-sm">Logo not found at specified path.</div>
    </div>
    <button class="btn btn-primary" onclick="window.KCSettings.saveBranding()">Save Branding</button>`;
}
function saveBranding() {
  const logoPath = document.getElementById('cfg_logoPath').value.trim();
  const appName  = document.getElementById('cfg_appName').value.trim();
  saveSettings({ logoPath, appDisplayName: appName });

  // Live reload logo in sidebar
  const sidebarLogo = document.getElementById('sidebarLogo');
  if (sidebarLogo) {
    sidebarLogo.src = logoPath;
    sidebarLogo.onerror = function() { this.style.display = 'none'; };
    sidebarLogo.onload  = function() { this.style.display = 'block'; };
  }
  showToast('Branding updated.', 'success');
  // Refresh preview
  const preview = document.getElementById('logoPreviewImg');
  if (preview) { preview.src = logoPath; preview.style.display = 'block'; }
}

// ── Vehicle Master ─────────────────────────────────────────
function renderVehicleMasterTab() {
  const master = getAll('vehicleMaster');
  const brands = master.filter(e => e.type === 'brand').sort((a,b) => a.name.localeCompare(b.name));

  return `
    <h3 style="margin-bottom:1rem">Vehicle Brands &amp; Models</h3>
    <div class="demo-notice" style="margin-bottom:1rem">Deactivated brands/models are hidden in vehicle forms but existing records are preserved.</div>

    <!-- Add brand -->
    <div style="display:flex;gap:0.5rem;margin-bottom:1rem;align-items:flex-end">
      <div class="form-group" style="margin:0;flex:1">
        <label class="form-label">Add New Brand</label>
        <input class="form-control" id="newBrandName" type="text" placeholder="Brand name…" />
      </div>
      <button class="btn btn-primary btn-sm" onclick="window.KCSettings.addBrand()">Add Brand</button>
    </div>

    <div style="display:flex;flex-direction:column;gap:0.75rem">
      ${brands.map(brand => {
        const models = master.filter(e => e.type === 'model' && e.parentId === brand.entryId).sort((a,b) => a.name.localeCompare(b.name));
        return `<div class="card">
          <div class="card-header" style="padding:0.6rem 1rem">
            <div style="display:flex;align-items:center;gap:0.5rem">
              <span class="font-semibold">${escHtml(brand.name)}</span>
              <span class="badge ${brand.status === 'active' ? 'badge-green' : 'badge-red'}">${brand.status}</span>
            </div>
            <div style="display:flex;gap:0.3rem">
              <button class="btn btn-ghost btn-sm" onclick="window.KCSettings.editBrandPrompt('${escHtml(brand.entryId)}')">Rename</button>
              <button class="btn btn-ghost btn-sm" onclick="window.KCSettings.toggleBrandStatus('${escHtml(brand.entryId)}')">${brand.status === 'active' ? 'Deactivate' : 'Activate'}</button>
            </div>
          </div>
          <div class="card-body" style="padding:0.5rem 1rem">
            <div style="display:flex;gap:0.5rem;margin-bottom:0.5rem;align-items:flex-end">
              <input class="form-control" id="newModel_${escHtml(brand.entryId)}" type="text" placeholder="Add model…" style="flex:1" />
              <button class="btn btn-outline btn-sm" onclick="window.KCSettings.addModel('${escHtml(brand.entryId)}')">Add</button>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:0.3rem">
              ${models.map(m => `<span class="badge ${m.status === 'active' ? 'badge-blue' : 'badge-grey'}" style="cursor:pointer;gap:0.4rem">
                ${escHtml(m.name)}
                <span onclick="window.KCSettings.toggleModelStatus('${escHtml(m.entryId)}')" title="${m.status === 'active' ? 'Deactivate' : 'Activate'}" style="opacity:0.6">${m.status === 'active' ? '✕' : '+'}</span>
              </span>`).join('')}
              ${models.length === 0 ? '<span class="text-muted text-xs">No models yet.</span>' : ''}
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

function addBrand() {
  const name = document.getElementById('newBrandName')?.value.trim();
  if (!name) return showToast('Enter a brand name.', 'warning');
  const exists = getAll('vehicleMaster').find(e => e.type === 'brand' && e.name.toLowerCase() === name.toLowerCase());
  if (exists) return showToast('This brand already exists.', 'warning');
  insertRecord('vehicleMaster', { entryId: generateId('BRAND'), type: 'brand', name, parentId: '', status: 'active', createdAt: nowISO() });
  showToast(`Brand "${name}" added.`, 'success');
  renderSettingsTab('vehicles-master');
}

function addModel(brandId) {
  const inp  = document.getElementById(`newModel_${brandId}`);
  const name = inp?.value.trim();
  if (!name) return showToast('Enter a model name.', 'warning');
  insertRecord('vehicleMaster', { entryId: generateId('MODEL'), type: 'model', name, parentId: brandId, status: 'active', createdAt: nowISO() });
  showToast(`Model "${name}" added.`, 'success');
  renderSettingsTab('vehicles-master');
}

function editBrandPrompt(entryId) {
  const entry = getAll('vehicleMaster').find(e => e.entryId === entryId);
  if (!entry) return;
  showModal('Rename Brand',
    `<div class="form-group"><label class="form-label">Brand Name</label>
    <input class="form-control" id="editBrandInp" value="${escHtml(entry.name)}" /></div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="window.KCSettings.saveBrandEdit('${escHtml(entryId)}')">Save</button>`);
}
function saveBrandEdit(entryId) {
  const name = document.getElementById('editBrandInp')?.value.trim();
  if (!name) return showToast('Name cannot be empty.', 'error');
  const db  = getDB();
  const idx = db.vehicleMaster.findIndex(e => e.entryId === entryId);
  if (idx > -1) { db.vehicleMaster[idx].name = name; saveDB(db); }
  closeModal();
  showToast('Brand renamed.', 'success');
  renderSettingsTab('vehicles-master');
}

function toggleBrandStatus(entryId) {
  const db  = getDB();
  const idx = db.vehicleMaster.findIndex(e => e.entryId === entryId);
  if (idx > -1) { db.vehicleMaster[idx].status = db.vehicleMaster[idx].status === 'active' ? 'inactive' : 'active'; saveDB(db); }
  renderSettingsTab('vehicles-master');
}

function toggleModelStatus(entryId) {
  const db  = getDB();
  const idx = db.vehicleMaster.findIndex(e => e.entryId === entryId);
  if (idx > -1) { db.vehicleMaster[idx].status = db.vehicleMaster[idx].status === 'active' ? 'inactive' : 'active'; saveDB(db); }
  renderSettingsTab('vehicles-master');
}

// ── Payment ────────────────────────────────────────────────
function renderPaymentTab(biz) {
  return `
    <h3 style="margin-bottom:1rem">Payment Configuration</h3>
    <div class="demo-notice" style="margin-bottom:1rem">
      <strong>Stage 1:</strong> Payment QR and bank details are for display only. Configure real payment details here before going live. The demo QR is clearly labelled "NOT FOR PAYMENT".
    </div>
    <div class="form-group">
      <label class="form-label">Payment QR Image Path</label>
      <input class="form-control" id="cfg_qrPath" value="${escHtml(biz.paymentQrPath || '')}" placeholder="assets/images/payment-qr.png" />
      <div class="form-hint">Leave blank to show the DEMO placeholder. After go-live, set this to the actual QR image path.</div>
    </div>
    <div class="form-group">
      <label class="form-label">Payment Instructions</label>
      <textarea class="form-control" id="cfg_payInstr" rows="3">${escHtml(biz.paymentInstructions || '')}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Bank / Account Details (displayed after verification)</label>
      <textarea class="form-control" id="cfg_bankDet" rows="2">${escHtml(biz.paymentBankDetails || '')}</textarea>
    </div>
    <button class="btn btn-primary" onclick="window.KCSettings.savePaymentConfig()">Save Payment Settings</button>`;
}
function savePaymentConfig() {
  saveSettings({
    paymentQrPath:      document.getElementById('cfg_qrPath').value.trim(),
    paymentInstructions: document.getElementById('cfg_payInstr').value.trim(),
    paymentBankDetails:  document.getElementById('cfg_bankDet').value.trim()
  });
  showToast('Payment settings saved.', 'success');
}

// ── Documents ──────────────────────────────────────────────
function renderDocumentsTab(biz) {
  return `
    <h3 style="margin-bottom:1rem">Document Notes &amp; Footers</h3>
    <div class="form-group">
      <label class="form-label">Quotation Footer</label>
      <textarea class="form-control" id="cfg_quoFooter" rows="2">${escHtml(biz.quotationFooter || '')}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Invoice Footer</label>
      <textarea class="form-control" id="cfg_invFooter" rows="2">${escHtml(biz.invoiceFooter || '')}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Document Watermark Text (e.g. DRAFT)</label>
      <input class="form-control" id="cfg_watermark" value="${escHtml(biz.documentWatermark || '')}" placeholder="Leave blank for no watermark" />
    </div>
    <button class="btn btn-primary" onclick="window.KCSettings.saveDocConfig()">Save Document Settings</button>`;
}
function saveDocConfig() {
  saveSettings({
    quotationFooter:  document.getElementById('cfg_quoFooter').value.trim(),
    invoiceFooter:    document.getElementById('cfg_invFooter').value.trim(),
    documentWatermark: document.getElementById('cfg_watermark').value.trim()
  });
  showToast('Document settings saved.', 'success');
}

// ── WhatsApp Templates ─────────────────────────────────────
function renderTemplatesTab(biz) {
  const templates = biz.whatsappTemplates || {};
  const defs = {
    newRequest:      'New service request confirmation',
    inspectionUpdate:'Inspection update',
    quotationReady:  'Quotation ready notification',
    approvalReminder:'Quotation approval reminder',
    repairProgress:  'Repair progress update',
    paymentReminder: 'Payment reminder',
    vehicleReady:    'Vehicle ready for collection'
  };
  return `
    <h3 style="margin-bottom:0.5rem">WhatsApp Message Templates</h3>
    <p class="text-sm text-muted" style="margin-bottom:1rem">Available tokens: {customerName} {serviceRef} {complaint} {totalMYR} {vehicleModel} {portalLink}</p>
    ${Object.entries(defs).map(([key, label]) => `
      <div class="form-group">
        <label class="form-label">${escHtml(label)}</label>
        <textarea class="form-control" id="tpl_${key}" rows="3">${escHtml(templates[key] || '')}</textarea>
      </div>`).join('')}
    <button class="btn btn-primary" onclick="window.KCSettings.saveTemplates()">Save Templates</button>`;
}
function saveTemplates() {
  const keys = ['newRequest','inspectionUpdate','quotationReady','approvalReminder','repairProgress','paymentReminder','vehicleReady'];
  const tpls = {};
  keys.forEach(k => { tpls[k] = document.getElementById(`tpl_${k}`)?.value.trim() || ''; });
  const db = getDB();
  db.appSettings.whatsappTemplates = tpls;
  saveDB(db);
  showToast('WhatsApp templates saved.', 'success');
}

// ── Data Management ────────────────────────────────────────
function renderDataTab() {
  const db = getDB();
  const stats = {
    customers:    (db.customers || []).length,
    vehicles:     (db.vehicles || []).length,
    services:     (db.serviceRequests || []).length,
    quotations:   (db.quotations || []).length,
    payments:     (db.payments || []).length,
    vehicleMaster:(db.vehicleMaster || []).length,
    auditLogs:    (db.auditLogs || []).length,
    seededAt:     db.seededAt
  };
  return `
    <h3 style="margin-bottom:1rem">Data Management</h3>
    <div class="info-grid" style="margin-bottom:1.5rem">
      ${Object.entries(stats).map(([k,v]) => `<div class="info-item"><div class="info-label">${escHtml(k)}</div><div class="info-value">${escHtml(String(v))}</div></div>`).join('')}
    </div>
    <div style="display:flex;gap:0.75rem;flex-wrap:wrap">
      <button class="btn btn-outline" onclick="window.KCHECK.exportDemoData()">📥 Export Demo Data (JSON)</button>
      <button class="btn btn-danger" onclick="window.KCSettings.confirmResetData()">🔄 Reset to Demo Data</button>
    </div>
    <div class="demo-notice" style="margin-top:1rem">Reset will restore the four initial demonstration records and remove all changes. This cannot be undone.</div>`;
}

function confirmResetData() {
  showConfirm(
    'Reset all data to the original four demonstration records?',
    () => {
      resetDemoData();
      showToast('Data reset to demonstration state.', 'success');
      renderSettings();
    },
    { title: 'Reset Demo Data', danger: true, confirmLabel: 'Reset', warning: 'All added records, quotations, payments and settings will be lost.' }
  );
}

window.KCSettings = {
  render: renderSettings,
  saveOrg, saveWorkshop, saveBranding,
  addBrand, addModel, editBrandPrompt, saveBrandEdit,
  toggleBrandStatus, toggleModelStatus,
  savePaymentConfig, saveDocConfig, saveTemplates,
  confirmResetData
};
