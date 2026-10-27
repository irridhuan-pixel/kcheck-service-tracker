/* ============================================================
   KCHECK — Vehicle Management
   ============================================================ */

'use strict';

const {
  getAll, getById, insertRecord, updateRecord, deleteRecord,
  generateId, nowISO, escHtml, showToast, showModal, closeModal,
  showConfirm, formatDate, renderEmpty, statusBadge, validateForm
} = window.KCHECK;

let vehSearchTerm = '';

// ── Helpers: get display brand/model ──────────────────────
function vehicleDisplayName(v) {
  const brand = v.brandName || v.customBrand || '';
  const model = v.modelName || v.customModel || '';
  if (!brand && !model) return 'Vehicle (details pending)';
  return [brand, model].filter(Boolean).join(' ');
}

// ── Main List View ─────────────────────────────────────────
function renderVehicles() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-section">
      <div class="section-header">
        <h2 class="section-title">Vehicles</h2>
        <div class="section-actions">
          <div class="search-bar">
            <span class="search-icon">🔍</span>
            <input type="text" id="vehSearch" placeholder="Search vehicles…" value="${escHtml(vehSearchTerm)}" />
          </div>
          <button class="btn btn-primary" onclick="window.KCVehicles.openNewVehicleModal()">+ Register Vehicle</button>
        </div>
      </div>
      <div id="vehTableWrap"></div>
    </div>`;

  document.getElementById('vehSearch').addEventListener('input', (e) => {
    vehSearchTerm = e.target.value;
    renderVehTable();
  });

  renderVehTable();
}

function renderVehTable() {
  const vehicles  = getAll('vehicles');
  const customers = getAll('customers');
  const q = vehSearchTerm.toLowerCase();
  const filtered = q
    ? vehicles.filter(v => {
        const n = vehicleDisplayName(v).toLowerCase();
        const owner = customers.find(c => c.customerId === v.customerId);
        return n.includes(q) || (owner?.fullName.toLowerCase().includes(q)) || v.registrationPlate?.toLowerCase().includes(q);
      })
    : vehicles;

  const wrap = document.getElementById('vehTableWrap');
  if (!wrap) return;

  if (filtered.length === 0) {
    wrap.innerHTML = renderEmpty('No vehicles found',
      vehSearchTerm ? 'Try a different search.' : 'Register the first vehicle.',
      `<button class="btn btn-primary" onclick="window.KCVehicles.openNewVehicleModal()">+ Register Vehicle</button>`);
    return;
  }

  wrap.innerHTML = `
    <div class="table-wrapper">
      <table class="data-table">
        <thead><tr>
          <th>Vehicle ID</th><th>Owner</th><th>Brand / Model</th>
          <th>Plate No.</th><th>Year</th><th>Mileage</th><th>Actions</th>
        </tr></thead>
        <tbody>
          ${filtered.map(v => {
            const owner = customers.find(c => c.customerId === v.customerId);
            const tag   = v.isDemo ? ' <span class="badge badge-amber" style="font-size:0.6rem">demo</span>' : '';
            return `<tr>
              <td class="text-mono text-xs">${escHtml(v.vehicleId)}</td>
              <td>${escHtml(owner ? owner.fullName : '—')}${tag}</td>
              <td>${escHtml(vehicleDisplayName(v))}</td>
              <td>${escHtml(v.registrationPlate || '—')}</td>
              <td>${escHtml(v.year || '—')}</td>
              <td>${escHtml(v.mileage ? v.mileage + ' km' : '—')}</td>
              <td>
                <div style="display:flex;gap:0.25rem">
                  <button class="btn btn-ghost btn-sm" onclick="window.KCVehicles.openVehicleDetail('${escHtml(v.vehicleId)}')">View</button>
                  <button class="btn btn-ghost btn-sm" onclick="window.KCVehicles.openEditVehicleModal('${escHtml(v.vehicleId)}')">Edit</button>
                  <button class="btn btn-ghost btn-sm" style="color:var(--color-red)" onclick="window.KCVehicles.confirmDeleteVehicle('${escHtml(v.vehicleId)}')">Delete</button>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

// ── Vehicle Detail ─────────────────────────────────────────
function openVehicleDetail(vehicleId) {
  const v    = getById('vehicles', vehicleId, 'vehicleId');
  if (!v) return showToast('Vehicle not found', 'error');
  const owner    = getById('customers', v.customerId, 'customerId');
  const services = getAll('serviceRequests').filter(s => s.vehicleId === vehicleId);

  const html = `
    <div class="info-grid" style="margin-bottom:1.25rem">
      <div class="info-item"><div class="info-label">Vehicle ID</div><div class="info-value text-mono">${escHtml(v.vehicleId)}</div></div>
      <div class="info-item"><div class="info-label">Owner</div><div class="info-value">${escHtml(owner?.fullName || '—')}</div></div>
      <div class="info-item"><div class="info-label">Brand</div><div class="info-value">${escHtml(v.brandName || v.customBrand || '—')}</div></div>
      <div class="info-item"><div class="info-label">Model</div><div class="info-value">${escHtml(v.modelName || v.customModel || '—')}</div></div>
      <div class="info-item"><div class="info-label">Registration Plate</div><div class="info-value">${escHtml(v.registrationPlate || '—')}</div></div>
      <div class="info-item"><div class="info-label">Year</div><div class="info-value">${escHtml(v.year || '—')}</div></div>
      <div class="info-item"><div class="info-label">Mileage</div><div class="info-value">${escHtml(v.mileage ? v.mileage + ' km' : '—')}</div></div>
      <div class="info-item"><div class="info-label">Colour</div><div class="info-value">${escHtml(v.colour || '—')}</div></div>
    </div>
    ${v.notes ? `<div style="margin-bottom:1rem;padding:0.75rem;background:var(--color-surface-2);border-radius:var(--radius-md);font-size:0.85rem">${escHtml(v.notes)}</div>` : ''}

    <h4 style="margin-bottom:0.5rem">Service History (${services.length})</h4>
    ${services.length === 0 ? '<p class="text-muted text-sm">No service records for this vehicle.</p>' : `
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

  showModal(`Vehicle: ${vehicleDisplayName(v)}`, html,
    `<button class="btn btn-outline" onclick="closeModal();window.KCVehicles.openEditVehicleModal('${escHtml(vehicleId)}')">Edit</button>
     <button class="btn btn-ghost" onclick="closeModal()">Close</button>`,
    { large: true });
}

// ── New Vehicle Modal ──────────────────────────────────────
function openNewVehicleModal(preselectedCustomerId = '') {
  const form = vehicleForm(null, preselectedCustomerId);
  showModal('Register New Vehicle', form,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="window.KCVehicles.saveNewVehicle()">Register Vehicle</button>`,
    { large: true });
  wireVehicleFormBrandSelect();
}

function saveNewVehicle() {
  const f = document.getElementById('vehicleForm');
  if (!validateForm(f)) return;

  const brandSel = document.getElementById('vf_brand');
  const modelSel = document.getElementById('vf_model');
  const brandId   = brandSel?.value || '';
  const modelId   = modelSel?.value || '';
  const master    = getAll('vehicleMaster');
  const brandEntry = master.find(e => e.entryId === brandId);
  const modelEntry = master.find(e => e.entryId === modelId);
  const customBrand = document.getElementById('vf_customBrand')?.value.trim() || '';
  const customModel = document.getElementById('vf_customModel')?.value.trim() || '';

  const v = {
    vehicleId:         generateId('VEH'),
    customerId:        document.getElementById('vf_customer').value,
    registrationPlate: document.getElementById('vf_plate').value.trim(),
    brandId:           brandId,
    brandName:         brandEntry ? brandEntry.name : '',
    modelId:           modelId,
    modelName:         modelEntry ? modelEntry.name : '',
    customBrand,
    customModel,
    year:              document.getElementById('vf_year').value.trim(),
    mileage:           document.getElementById('vf_mileage').value.trim(),
    colour:            document.getElementById('vf_colour').value.trim(),
    notes:             document.getElementById('vf_notes').value.trim(),
    isDemo:            false,
    createdAt:         nowISO(),
    updatedAt:         nowISO()
  };

  if (!v.customerId) return showToast('Please select an owner.', 'error');

  insertRecord('vehicles', v);
  closeModal();
  showToast('Vehicle registered successfully.', 'success');
  renderVehicles();
}

// ── Edit Vehicle ───────────────────────────────────────────
function openEditVehicleModal(vehicleId) {
  const v = getById('vehicles', vehicleId, 'vehicleId');
  if (!v) return;

  const form = vehicleForm(v);
  showModal(`Edit Vehicle: ${vehicleDisplayName(v)}`, form,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="window.KCVehicles.saveEditVehicle('${escHtml(vehicleId)}')">Save Changes</button>`,
    { large: true });
  wireVehicleFormBrandSelect(v.brandId, v.modelId);
}

function saveEditVehicle(vehicleId) {
  const f = document.getElementById('vehicleForm');
  if (!validateForm(f)) return;

  const brandSel   = document.getElementById('vf_brand');
  const modelSel   = document.getElementById('vf_model');
  const brandId    = brandSel?.value || '';
  const modelId    = modelSel?.value || '';
  const master     = getAll('vehicleMaster');
  const brandEntry = master.find(e => e.entryId === brandId);
  const modelEntry = master.find(e => e.entryId === modelId);

  updateRecord('vehicles', 'vehicleId', vehicleId, {
    customerId:        document.getElementById('vf_customer').value,
    registrationPlate: document.getElementById('vf_plate').value.trim(),
    brandId,
    brandName:         brandEntry ? brandEntry.name : '',
    modelId,
    modelName:         modelEntry ? modelEntry.name : '',
    customBrand:       document.getElementById('vf_customBrand')?.value.trim() || '',
    customModel:       document.getElementById('vf_customModel')?.value.trim() || '',
    year:              document.getElementById('vf_year').value.trim(),
    mileage:           document.getElementById('vf_mileage').value.trim(),
    colour:            document.getElementById('vf_colour').value.trim(),
    notes:             document.getElementById('vf_notes').value.trim()
  });

  closeModal();
  showToast('Vehicle updated. Service history preserved.', 'success');
  renderVehicles();
}

// ── Delete Vehicle ─────────────────────────────────────────
function confirmDeleteVehicle(vehicleId) {
  const v = getById('vehicles', vehicleId, 'vehicleId');
  if (!v) return;

  const hasServices = getAll('serviceRequests').some(s => s.vehicleId === vehicleId);
  if (hasServices) {
    return showToast('Cannot delete a vehicle with linked service records. Edit the vehicle instead.', 'warning', 5000);
  }

  showConfirm(
    `Delete vehicle "${vehicleDisplayName(v)}"?`,
    () => {
      deleteRecord('vehicles', 'vehicleId', vehicleId);
      showToast('Vehicle deleted.', 'success');
      renderVehicles();
    },
    { title: 'Delete Vehicle', danger: true, confirmLabel: 'Delete' }
  );
}

// ── Vehicle Form HTML ──────────────────────────────────────
function vehicleForm(v = null, preselectedCustomerId = '') {
  const customers = getAll('customers').filter(c => c.isActive !== false);
  const brands    = getAll('vehicleMaster').filter(e => e.type === 'brand' && e.status === 'active');
  const custId    = v?.customerId || preselectedCustomerId || '';

  return `
    <form id="vehicleForm" onsubmit="return false">
      <div class="form-group">
        <label class="form-label" for="vf_customer">Vehicle Owner <span class="required">*</span></label>
        <select class="form-control form-select" id="vf_customer" name="vf_customer" data-required>
          <option value="">— Select customer —</option>
          ${customers.map(c => `<option value="${escHtml(c.customerId)}" ${c.customerId === custId ? 'selected' : ''}>${escHtml(c.fullName)}</option>`).join('')}
        </select>
        <div class="form-error" data-error="vf_customer"></div>
      </div>
      <div class="form-row form-row-2">
        <div class="form-group">
          <label class="form-label" for="vf_brand">Brand</label>
          <select class="form-control form-select" id="vf_brand">
            <option value="">— Select brand —</option>
            ${brands.map(b => `<option value="${escHtml(b.entryId)}" ${b.entryId === v?.brandId ? 'selected' : ''}>${escHtml(b.name)}</option>`).join('')}
            <option value="CUSTOM">Other (specify below)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="vf_model">Model</label>
          <select class="form-control form-select" id="vf_model">
            <option value="">— Select brand first —</option>
          </select>
        </div>
      </div>
      <div class="form-row form-row-2" id="vf_customRow" style="display:none">
        <div class="form-group">
          <label class="form-label" for="vf_customBrand">Custom Brand</label>
          <input class="form-control" id="vf_customBrand" type="text" value="${escHtml(v?.customBrand || '')}" placeholder="Brand name" />
        </div>
        <div class="form-group">
          <label class="form-label" for="vf_customModel">Custom Model</label>
          <input class="form-control" id="vf_customModel" type="text" value="${escHtml(v?.customModel || '')}" placeholder="Model name" />
        </div>
      </div>
      <div class="form-row form-row-2">
        <div class="form-group">
          <label class="form-label" for="vf_plate">Registration Plate</label>
          <input class="form-control" id="vf_plate" type="text" value="${escHtml(v?.registrationPlate || '')}" placeholder="e.g. ABC 1234 (optional)" />
          <div class="form-hint">Plate number is not used for login or authentication.</div>
        </div>
        <div class="form-group">
          <label class="form-label" for="vf_year">Year (optional)</label>
          <input class="form-control" id="vf_year" type="text" value="${escHtml(v?.year || '')}" placeholder="e.g. 2019" />
        </div>
      </div>
      <div class="form-row form-row-2">
        <div class="form-group">
          <label class="form-label" for="vf_mileage">Mileage (km, optional)</label>
          <input class="form-control" id="vf_mileage" type="number" min="0" value="${escHtml(v?.mileage || '')}" placeholder="e.g. 45000" />
        </div>
        <div class="form-group">
          <label class="form-label" for="vf_colour">Colour (optional)</label>
          <input class="form-control" id="vf_colour" type="text" value="${escHtml(v?.colour || '')}" placeholder="e.g. Silver" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="vf_notes">Notes (optional)</label>
        <textarea class="form-control" id="vf_notes" rows="2">${escHtml(v?.notes || '')}</textarea>
      </div>
    </form>`;
}

function wireVehicleFormBrandSelect(selectedBrandId = '', selectedModelId = '') {
  const brandSel = document.getElementById('vf_brand');
  const modelSel = document.getElementById('vf_model');
  if (!brandSel || !modelSel) return;

  function updateModels() {
    const bid = brandSel.value;
    const customRow = document.getElementById('vf_customRow');

    if (bid === 'CUSTOM') {
      if (customRow) customRow.style.display = '';
      modelSel.innerHTML = '<option value="">—</option>';
      modelSel.disabled = true;
      return;
    }
    if (customRow) customRow.style.display = 'none';
    modelSel.disabled = false;

    const models = getAll('vehicleMaster').filter(e => e.type === 'model' && e.parentId === bid && e.status === 'active');
    modelSel.innerHTML = `<option value="">— Select model —</option>
      ${models.map(m => `<option value="${escHtml(m.entryId)}" ${m.entryId === selectedModelId ? 'selected' : ''}>${escHtml(m.name)}</option>`).join('')}
      <option value="CUSTOM_MODEL">Other (specify above)</option>`;
  }

  if (selectedBrandId) {
    brandSel.value = selectedBrandId;
    updateModels();
  }

  brandSel.addEventListener('change', () => {
    selectedModelId = '';
    updateModels();
  });
}

// ── Expose ─────────────────────────────────────────────────
window.KCVehicles = {
  render: renderVehicles,
  openNewVehicleModal, saveNewVehicle,
  openEditVehicleModal, saveEditVehicle,
  openVehicleDetail, confirmDeleteVehicle,
  vehicleDisplayName
};
