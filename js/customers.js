/* ============================================================
   KCHECK — Customer Management
   ============================================================ */

'use strict';

const {
  getAll, getById, insertRecord, updateRecord, deleteRecord,
  generateId, nowISO, escHtml, showToast, showModal, closeModal,
  showConfirm, formatDate, renderEmpty, statusBadge, validateForm, clearFormErrors
} = window.KCHECK;

let custSearchTerm = '';

// ── Main List View ─────────────────────────────────────────
function renderCustomers() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-section">
      <div class="section-header">
        <h2 class="section-title">Customers</h2>
        <div class="section-actions">
          <div class="search-bar">
            <span class="search-icon">🔍</span>
            <input type="text" id="custSearch" placeholder="Search customers…" value="${escHtml(custSearchTerm)}" />
          </div>
          <button class="btn btn-primary" onclick="window.KCCustomers.openNewCustomerModal()">+ Register Customer</button>
        </div>
      </div>
      <div id="custTableWrap"></div>
    </div>`;

  document.getElementById('custSearch').addEventListener('input', (e) => {
    custSearchTerm = e.target.value;
    renderCustTable();
  });

  renderCustTable();
}

function renderCustTable() {
  const customers = getAll('customers');
  const q = custSearchTerm.toLowerCase();
  const filtered = q
    ? customers.filter(c => c.fullName.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.includes(q))
    : customers;

  const active = filtered.filter(c => c.isActive !== false);

  const wrap = document.getElementById('custTableWrap');
  if (!wrap) return;

  if (active.length === 0) {
    wrap.innerHTML = renderEmpty('No customers found', custSearchTerm ? 'Try a different search.' : 'Register the first customer using the button above.',
      `<button class="btn btn-primary" onclick="window.KCCustomers.openNewCustomerModal()">+ Register Customer</button>`);
    return;
  }

  wrap.innerHTML = `
    <div class="table-wrapper">
      <table class="data-table">
        <thead><tr>
          <th>Customer ID</th><th>Full Name</th><th>Phone</th><th>Email</th>
          <th>Registered</th><th>Services</th><th>Actions</th>
        </tr></thead>
        <tbody>
          ${active.map(c => {
            const svcCount = getAll('serviceRequests').filter(s => s.customerId === c.customerId).length;
            const tag = c.isDemo ? ' <span class="badge badge-amber" style="font-size:0.6rem">demo</span>' : '';
            return `<tr>
              <td class="text-mono text-xs">${escHtml(c.customerId)}</td>
              <td><strong>${escHtml(c.fullName)}</strong>${tag}</td>
              <td>${escHtml(c.phone || '—')}</td>
              <td>${escHtml(c.email || '—')}</td>
              <td>${formatDate(c.createdAt)}</td>
              <td><span class="badge badge-blue">${svcCount}</span></td>
              <td>
                <div style="display:flex;gap:0.25rem">
                  <button class="btn btn-ghost btn-sm" onclick="window.KCCustomers.openCustomerProfile('${escHtml(c.customerId)}')">View</button>
                  <button class="btn btn-ghost btn-sm" onclick="window.KCCustomers.openEditCustomerModal('${escHtml(c.customerId)}')">Edit</button>
                  <button class="btn btn-ghost btn-sm" style="color:var(--color-red)" onclick="window.KCCustomers.confirmDeleteCustomer('${escHtml(c.customerId)}')">Delete</button>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

// ── Customer Profile ───────────────────────────────────────
function openCustomerProfile(customerId) {
  const c = getById('customers', customerId, 'customerId');
  if (!c) return showToast('Customer not found', 'error');

  const vehicles = getAll('vehicles').filter(v => v.customerId === customerId);
  const services = getAll('serviceRequests').filter(s => s.customerId === customerId);

  const html = `
    <div class="info-grid" style="margin-bottom:1.25rem">
      <div class="info-item"><div class="info-label">Customer ID</div><div class="info-value text-mono">${escHtml(c.customerId)}</div></div>
      <div class="info-item"><div class="info-label">Full Name</div><div class="info-value">${escHtml(c.fullName)}</div></div>
      <div class="info-item"><div class="info-label">Phone</div><div class="info-value">${escHtml(c.phone || '—')}</div></div>
      <div class="info-item"><div class="info-label">Email</div><div class="info-value">${escHtml(c.email || '—')}</div></div>
      <div class="info-item"><div class="info-label">Address</div><div class="info-value">${escHtml(c.address || '—')}</div></div>
      <div class="info-item"><div class="info-label">Registered</div><div class="info-value">${formatDate(c.createdAt)}</div></div>
    </div>
    ${c.notes ? `<div style="margin-bottom:1rem;padding:0.75rem;background:var(--color-surface-2);border-radius:var(--radius-md);font-size:0.85rem">${escHtml(c.notes)}</div>` : ''}

    <h4 style="margin-bottom:0.5rem">Vehicles (${vehicles.length})</h4>
    ${vehicles.length === 0 ? '<p class="text-muted text-sm" style="margin-bottom:1rem">No vehicles registered.</p>' : `
      <div style="margin-bottom:1rem">
        ${vehicles.map(v => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0.75rem;border:1px solid var(--color-border);border-radius:var(--radius-md);margin-bottom:0.4rem;font-size:0.85rem">
            <span><strong>${escHtml(v.brandName || v.customBrand || '—')} ${escHtml(v.modelName || v.customModel || '')}</strong></span>
            <span class="text-muted">${escHtml(v.registrationPlate || 'No plate')}</span>
          </div>`).join('')}
      </div>`}

    <h4 style="margin-bottom:0.5rem">Service History (${services.length})</h4>
    ${services.length === 0 ? '<p class="text-muted text-sm">No service records.</p>' : `
      <table class="data-table" style="font-size:0.83rem">
        <thead><tr><th>Ref</th><th>Complaint</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>
          ${services.map(s => `<tr>
            <td class="text-mono">${escHtml(s.serviceId)}</td>
            <td>${escHtml(s.complaintDescription)}</td>
            <td>${statusBadge(s.status)}</td>
            <td>${formatDate(s.createdAt)}</td>
          </tr>`).join('')}
        </tbody>
      </table>`}`;

  showModal(`Customer: ${c.fullName}`, html,
    `<button class="btn btn-outline" onclick="closeModal();window.KCCustomers.openEditCustomerModal('${escHtml(c.customerId)}')">Edit</button>
     <button class="btn btn-ghost" onclick="closeModal()">Close</button>`,
    { large: true });
}

// ── New Customer Modal ─────────────────────────────────────
function openNewCustomerModal() {
  const form = customerForm();
  showModal('Register New Customer', form,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="window.KCCustomers.saveNewCustomer()">Register Customer</button>`);
}

function saveNewCustomer() {
  const f = document.getElementById('customerForm');
  if (!validateForm(f)) return;

  const name = document.getElementById('cf_name').value.trim();
  // Check duplicate name
  const existing = getAll('customers').find(c => c.fullName.toLowerCase() === name.toLowerCase() && c.isActive !== false);
  if (existing) {
    showToast(`A customer named "${name}" already exists (${existing.customerId}).`, 'warning');
    if (!confirm('A customer with this name already exists. Register anyway?')) return;
  }

  const cust = {
    customerId:  generateId('CUST'),
    fullName:    name,
    phone:       document.getElementById('cf_phone').value.trim(),
    email:       document.getElementById('cf_email').value.trim(),
    address:     document.getElementById('cf_address').value.trim(),
    notes:       document.getElementById('cf_notes').value.trim(),
    isDemo:      false,
    isActive:    true,
    createdAt:   nowISO(),
    updatedAt:   nowISO()
  };

  insertRecord('customers', cust);
  closeModal();
  showToast(`Customer "${cust.fullName}" registered successfully.`, 'success');
  renderCustomers();
}

// ── Edit Customer ──────────────────────────────────────────
function openEditCustomerModal(customerId) {
  const c = getById('customers', customerId, 'customerId');
  if (!c) return;

  const form = customerForm(c);
  showModal(`Edit Customer: ${c.fullName}`, form,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="window.KCCustomers.saveEditCustomer('${escHtml(customerId)}')">Save Changes</button>`);
}

function saveEditCustomer(customerId) {
  const f = document.getElementById('customerForm');
  if (!validateForm(f)) return;

  updateRecord('customers', 'customerId', customerId, {
    fullName: document.getElementById('cf_name').value.trim(),
    phone:    document.getElementById('cf_phone').value.trim(),
    email:    document.getElementById('cf_email').value.trim(),
    address:  document.getElementById('cf_address').value.trim(),
    notes:    document.getElementById('cf_notes').value.trim()
  });

  closeModal();
  showToast('Customer updated.', 'success');
  renderCustomers();
}

// ── Delete Customer ────────────────────────────────────────
function confirmDeleteCustomer(customerId) {
  const c = getById('customers', customerId, 'customerId');
  if (!c) return;

  const hasServices = getAll('serviceRequests').some(s => s.customerId === customerId);
  const hasVehicles = getAll('vehicles').some(v => v.customerId === customerId);
  const linked = hasServices || hasVehicles;

  if (linked) {
    showConfirm(
      `"${c.fullName}" has linked records. Deactivating instead of deleting to preserve history.`,
      () => {
        updateRecord('customers', 'customerId', customerId, { isActive: false });
        showToast(`Customer "${c.fullName}" deactivated.`, 'info');
        renderCustomers();
      },
      { title: 'Deactivate Customer', confirmLabel: 'Deactivate', warning: 'The customer will be hidden but service history is preserved.' }
    );
  } else {
    showConfirm(
      `Permanently delete customer "${c.fullName}"?`,
      () => {
        deleteRecord('customers', 'customerId', customerId);
        showToast(`Customer deleted.`, 'success');
        renderCustomers();
      },
      { title: 'Delete Customer', danger: true, confirmLabel: 'Delete' }
    );
  }
}

// ── Form HTML ──────────────────────────────────────────────
function customerForm(c = null) {
  return `
    <form id="customerForm" onsubmit="return false">
      <div class="form-group">
        <label class="form-label" for="cf_name">Full Name <span class="required">*</span></label>
        <input class="form-control" id="cf_name" name="cf_name" data-required type="text" value="${escHtml(c?.fullName || '')}" placeholder="e.g. Ahmad bin Abdullah" />
        <div class="form-error" data-error="cf_name"></div>
      </div>
      <div class="form-row form-row-2">
        <div class="form-group">
          <label class="form-label" for="cf_phone">Contact Number</label>
          <input class="form-control" id="cf_phone" type="tel" value="${escHtml(c?.phone || '')}" placeholder="e.g. 019-XXXXXXX" />
        </div>
        <div class="form-group">
          <label class="form-label" for="cf_email">Email (optional)</label>
          <input class="form-control" id="cf_email" type="email" value="${escHtml(c?.email || '')}" placeholder="email@example.com" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="cf_address">Address (optional)</label>
        <textarea class="form-control" id="cf_address" rows="2" placeholder="Street, City, State">${escHtml(c?.address || '')}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label" for="cf_notes">Notes (optional)</label>
        <textarea class="form-control" id="cf_notes" rows="2" placeholder="Any additional notes…">${escHtml(c?.notes || '')}</textarea>
      </div>
    </form>`;
}

window.KCCustomers = {
  render: renderCustomers,
  openNewCustomerModal, saveNewCustomer,
  openEditCustomerModal, saveEditCustomer,
  openCustomerProfile, confirmDeleteCustomer
};
