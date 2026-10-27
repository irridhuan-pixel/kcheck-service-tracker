/* ============================================================
   KCHECK — Service Request Management
   ============================================================ */

'use strict';

const {
  getAll, getById, insertRecord, updateRecord,
  generateId, nowISO, escHtml, showToast, showModal, closeModal,
  showConfirm, formatDate, formatDateTime, renderEmpty, statusBadge,
  validateForm, STATUS_TRANSITIONS, STATUS_LABELS, STATUS_ACTOR,
  updateServiceStatus, addAuditLog
} = window.KCHECK;

let svcSearchTerm  = '';
let svcStatusFilter = '';

// ── Main List View ─────────────────────────────────────────
function renderServices() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-section">
      <div class="section-header">
        <h2 class="section-title">Service Requests</h2>
        <div class="section-actions">
          <button class="btn btn-primary" onclick="window.KCServices.openNewServiceModal()">+ New Service Request</button>
        </div>
      </div>
      <div class="filter-bar">
        <div class="search-bar" style="max-width:260px">
          <span class="search-icon">🔍</span>
          <input type="text" id="svcSearch" placeholder="Search…" value="${escHtml(svcSearchTerm)}" />
        </div>
        <select id="svcStatusFilter" class="form-control form-select" style="width:auto">
          <option value="">All Statuses</option>
          ${Object.entries(STATUS_LABELS).slice(0,12).map(([k,v]) => `<option value="${k}" ${k === svcStatusFilter ? 'selected':''}>${escHtml(v)}</option>`).join('')}
        </select>
        <button class="btn btn-ghost btn-sm" onclick="window.KCServices.clearFilters()">Clear</button>
      </div>
      <div id="svcTableWrap"></div>
    </div>`;

  document.getElementById('svcSearch').addEventListener('input', e => { svcSearchTerm = e.target.value; renderSvcTable(); });
  document.getElementById('svcStatusFilter').addEventListener('change', e => { svcStatusFilter = e.target.value; renderSvcTable(); });
  renderSvcTable();
}

function filterByStatus(status) {
  svcStatusFilter = status;
  renderServices();
}
function clearFilters() { svcSearchTerm = ''; svcStatusFilter = ''; renderServices(); }

function renderSvcTable() {
  const services  = getAll('serviceRequests');
  const customers = getAll('customers');
  const q = svcSearchTerm.toLowerCase();

  let filtered = services;
  if (svcStatusFilter) filtered = filtered.filter(s => s.status === svcStatusFilter);
  if (q) filtered = filtered.filter(s => {
    const cust = customers.find(c => c.customerId === s.customerId);
    return s.serviceId.toLowerCase().includes(q)
      || s.complaintDescription.toLowerCase().includes(q)
      || (cust?.fullName.toLowerCase().includes(q))
      || (s.vehicleSnapshot?.model?.toLowerCase().includes(q));
  });

  filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  const wrap = document.getElementById('svcTableWrap');
  if (!wrap) return;

  if (filtered.length === 0) {
    wrap.innerHTML = renderEmpty('No service requests found',
      svcSearchTerm || svcStatusFilter ? 'Try adjusting your filters.' : 'Create the first service request.',
      `<button class="btn btn-primary" onclick="window.KCServices.openNewServiceModal()">+ New Service Request</button>`);
    return;
  }

  wrap.innerHTML = `
    <div class="table-wrapper">
      <table class="data-table">
        <thead><tr>
          <th>Service Ref</th><th>Customer</th><th>Vehicle</th>
          <th>Complaint</th><th>Status</th><th>Updated</th><th>Actions</th>
        </tr></thead>
        <tbody>
          ${filtered.map(s => {
            const cust = customers.find(c => c.customerId === s.customerId);
            const veh  = s.vehicleSnapshot?.brand ? `${s.vehicleSnapshot.brand} ${s.vehicleSnapshot.model}` : '—';
            return `<tr class="clickable" onclick="window.KCServices.openServiceDetail('${escHtml(s.serviceId)}')">
              <td class="text-mono text-xs">${escHtml(s.serviceId)}</td>
              <td>${escHtml(cust?.fullName || '—')}</td>
              <td>${escHtml(veh)}</td>
              <td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(s.complaintDescription)}</td>
              <td>${statusBadge(s.status)}</td>
              <td class="text-xs text-muted">${formatDate(s.updatedAt)}</td>
              <td><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();window.KCServices.openServiceDetail('${escHtml(s.serviceId)}')">View</button></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

// ── Repair Tracking view ───────────────────────────────────
function renderRepairs() {
  const content = document.getElementById('pageContent');
  const repairs  = getAll('serviceRequests').filter(s => s.status === 'REPAIR_IN_PROGRESS');
  const customers = getAll('customers');

  content.innerHTML = `
    <div class="page-section">
      <div class="section-header">
        <h2 class="section-title">Repair Tracking</h2>
      </div>
      ${repairs.length === 0 ? renderEmpty('No active repairs', 'Repairs in Progress will appear here.') : `
        <div style="display:flex;flex-direction:column;gap:1rem">
          ${repairs.map(s => {
            const cust = customers.find(c => c.customerId === s.customerId);
            const veh  = s.vehicleSnapshot?.brand ? `${s.vehicleSnapshot.brand} ${s.vehicleSnapshot.model}` : 'Vehicle not specified';
            return `<div class="card">
              <div class="card-header">
                <div>
                  <span class="text-mono text-xs text-muted">${escHtml(s.serviceId)}</span>
                  <div class="font-semibold">${escHtml(cust?.fullName || '—')} — ${escHtml(veh)}</div>
                </div>
                ${statusBadge(s.status)}
              </div>
              <div class="card-body">
                <p class="text-sm" style="margin-bottom:0.75rem"><strong>Complaint:</strong> ${escHtml(s.complaintDescription)}</p>
                <h4 style="margin-bottom:0.5rem">Progress Notes</h4>
                ${(s.progressNotes || []).length === 0 ? '<p class="text-muted text-sm">No progress notes yet.</p>' : `
                  <div class="status-timeline">
                    ${s.progressNotes.map(n => `
                      <div class="timeline-item">
                        <div class="timeline-dot timeline-dot-done">✓</div>
                        <div class="timeline-content">
                          <div class="timeline-note">${escHtml(n.note)}</div>
                          <div class="timeline-time">${formatDateTime(n.enteredAt)} · ${escHtml(n.enteredBy)}</div>
                        </div>
                      </div>`).join('')}
                  </div>`}
                <div style="display:flex;gap:0.5rem;margin-top:0.75rem">
                  <input class="form-control" id="progressNote_${escHtml(s.serviceId)}" type="text" placeholder="Add progress note…" style="flex:1" />
                  <button class="btn btn-blue btn-sm" onclick="window.KCServices.addProgressNote('${escHtml(s.serviceId)}')">Add Note</button>
                  <button class="btn btn-green btn-sm" onclick="window.KCServices.advanceStatus('${escHtml(s.serviceId)}','REPAIR_COMPLETED','Repair completed by Alif Workshop')">Mark Completed</button>
                </div>
              </div>
            </div>`;
          }).join('')}
        </div>`}
    </div>`;
}

function addProgressNote(serviceId) {
  const inp = document.getElementById(`progressNote_${serviceId}`);
  if (!inp || !inp.value.trim()) return showToast('Please enter a progress note.', 'warning');

  const db  = window.KCHECK.getDB();
  const arr = db.serviceRequests;
  const idx = arr.findIndex(s => s.serviceId === serviceId);
  if (idx === -1) return;

  if (!arr[idx].progressNotes) arr[idx].progressNotes = [];
  arr[idx].progressNotes.push({ note: inp.value.trim(), enteredBy: 'COT Admin', enteredAt: nowISO() });
  arr[idx].updatedAt = nowISO();
  window.KCHECK.saveDB(db);

  inp.value = '';
  showToast('Progress note added.', 'success');
  renderRepairs();
}

// ── Service Detail ─────────────────────────────────────────
function openServiceDetail(serviceId) {
  const s = getById('serviceRequests', serviceId, 'serviceId');
  if (!s) return showToast('Service record not found', 'error');

  const cust = getById('customers', s.customerId, 'customerId');
  const veh  = s.vehicleId ? getById('vehicles', s.vehicleId, 'vehicleId') : null;
  const quotations = getAll('quotations').filter(q => q.serviceId === serviceId);
  const activeQuo  = quotations.find(q => q.quotationId === s.activeQuotationId) || quotations.filter(q => q.status !== 'SUPERSEDED').pop();
  const payment    = s.activePaymentId ? getById('payments', s.activePaymentId, 'paymentId') : null;

  const nextTransitions = STATUS_TRANSITIONS[s.status] || [];
  const vehDisplay = s.vehicleSnapshot?.brand ? `${s.vehicleSnapshot.brand} ${s.vehicleSnapshot.model}` : 'Not specified';

  // Validation notes for transitions
  const transitionNotes = {};
  if (nextTransitions.includes('AWAITING_CUSTOMER_APPROVAL') && !activeQuo) {
    transitionNotes['AWAITING_CUSTOMER_APPROVAL'] = 'A quotation must be created first.';
  }
  if (nextTransitions.includes('REPAIR_IN_PROGRESS')) {
    if (!activeQuo || activeQuo.status !== 'APPROVED') {
      transitionNotes['REPAIR_IN_PROGRESS'] = 'Requires an approved quotation.';
    }
  }
  if (nextTransitions.includes('VEHICLE_DELIVERED')) {
    if (!payment || payment.status !== 'VERIFIED') {
      transitionNotes['VEHICLE_DELIVERED'] = 'Requires verified payment.';
    }
  }

  const html = `
    <!-- Breadcrumb -->
    <div class="breadcrumb"><span class="text-muted">Service Requests</span><span class="breadcrumb-sep">›</span><span>${escHtml(s.serviceId)}</span></div>

    <!-- Status Progress -->
    ${renderStatusSteps(s.status)}

    <!-- Details Grid -->
    <div class="card" style="margin-bottom:1rem">
      <div class="card-header">
        <span class="card-title">Service Details</span>
        ${statusBadge(s.status)}
      </div>
      <div class="card-body">
        <div class="info-grid">
          <div class="info-item"><div class="info-label">Service Ref</div><div class="info-value text-mono">${escHtml(s.serviceId)}</div></div>
          <div class="info-item"><div class="info-label">Customer</div><div class="info-value">${escHtml(cust?.fullName || '—')}</div></div>
          <div class="info-item"><div class="info-label">Vehicle</div><div class="info-value">${escHtml(vehDisplay)}</div></div>
          <div class="info-item"><div class="info-label">Created</div><div class="info-value">${formatDate(s.createdAt)}</div></div>
          <div class="info-item"><div class="info-label">Last Updated</div><div class="info-value">${formatDate(s.updatedAt)}</div></div>
        </div>
        <div style="margin-top:1rem">
          <div class="form-group">
            <label class="form-label">Complaint</label>
            <textarea class="form-control" id="sd_complaint_${escHtml(serviceId)}" rows="2">${escHtml(s.complaintDescription)}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Inspection Findings</label>
            <textarea class="form-control" id="sd_findings_${escHtml(serviceId)}" rows="2" placeholder="Record findings from Alif Workshop…">${escHtml(s.inspectionFindings || '')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Workshop Recommendation</label>
            <textarea class="form-control" id="sd_wsrec_${escHtml(serviceId)}" rows="2" placeholder="Workshop repair recommendation…">${escHtml(s.workshopRecommendation || '')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Coordinator Remarks</label>
            <textarea class="form-control" id="sd_remarks_${escHtml(serviceId)}" rows="2" placeholder="Internal coordinator notes…">${escHtml(s.coordinatorRemarks || '')}</textarea>
          </div>
          <button class="btn btn-outline btn-sm" onclick="window.KCServices.saveServiceFields('${escHtml(serviceId)}')">Save Fields</button>
        </div>
      </div>
    </div>

    <!-- Status Actions -->
    <div class="card" style="margin-bottom:1rem">
      <div class="card-header"><span class="card-title">Update Status</span></div>
      <div class="card-body">
        ${nextTransitions.length === 0
          ? `<p class="text-muted text-sm">This service is in a terminal status.</p>`
          : `<div style="display:flex;gap:0.5rem;flex-wrap:wrap">
              ${nextTransitions.map(t => {
                const blocked = transitionNotes[t];
                const isCustomer = STATUS_ACTOR[t] === 'customer';
                return `<button class="btn ${blocked ? 'btn-outline' : (isCustomer ? 'btn-amber' : 'btn-blue')} btn-sm"
                  ${blocked ? `title="${escHtml(blocked)}" disabled` : `onclick="window.KCServices.promptStatusChange('${escHtml(serviceId)}','${t}')"`}>
                  ${isCustomer ? '👤 ' : ''}${escHtml(STATUS_LABELS[t] || t)}
                  ${blocked ? ' 🔒' : ''}
                </button>`;
              }).join('')}
            </div>
            <p class="text-xs text-muted" style="margin-top:0.5rem">👤 = Customer action (simulated in Stage 1)</p>`}
      </div>
    </div>

    <!-- Linked Quotation -->
    <div class="card" style="margin-bottom:1rem">
      <div class="card-header">
        <span class="card-title">Quotation</span>
        ${activeQuo ? statusBadge(activeQuo.status) : '<span class="text-muted text-sm">None</span>'}
      </div>
      <div class="card-body">
        ${activeQuo ? `
          <div class="info-grid" style="margin-bottom:0.75rem">
            <div class="info-item"><div class="info-label">Ref</div><div class="info-value text-mono">${escHtml(activeQuo.quotationId)}</div></div>
            <div class="info-item"><div class="info-label">Version</div><div class="info-value">v${activeQuo.version}</div></div>
            <div class="info-item"><div class="info-label">Total</div><div class="info-value font-semibold">${window.KCHECK.formatMYR(activeQuo.totalAmount)}</div></div>
          </div>
          <div style="display:flex;gap:0.5rem">
            <button class="btn btn-outline btn-sm" onclick="closeModal();navigate('quotations');window.KCQuotations.openQuotationDetail('${escHtml(activeQuo.quotationId)}')">View Quotation</button>
            ${activeQuo.status === 'AWAITING_APPROVAL' ? `<button class="btn btn-green btn-sm" onclick="window.KCQuotations.simulateApproval('${escHtml(activeQuo.quotationId)}','${escHtml(serviceId)}')">Simulate Approval ⚠️</button>
            <button class="btn btn-danger btn-sm" onclick="window.KCQuotations.simulateRejection('${escHtml(activeQuo.quotationId)}','${escHtml(serviceId)}')">Simulate Rejection ⚠️</button>` : ''}
          </div>` : `
          <p class="text-muted text-sm" style="margin-bottom:0.75rem">No quotation created yet.</p>
          <button class="btn btn-primary btn-sm" onclick="closeModal();navigate('quotations');window.KCQuotations.openNewQuotationModal('${escHtml(serviceId)}')">Create Quotation</button>`}
      </div>
    </div>

    <!-- Linked Payment -->
    ${payment ? `<div class="card" style="margin-bottom:1rem">
      <div class="card-header"><span class="card-title">Payment</span>${statusBadge(payment.status)}</div>
      <div class="card-body">
        <p class="text-sm">Ref: <span class="text-mono">${escHtml(payment.paymentId)}</span> · Amount: <strong>${window.KCHECK.formatMYR(payment.expectedAmount)}</strong></p>
        <button class="btn btn-outline btn-sm" style="margin-top:0.5rem" onclick="closeModal();navigate('payments');window.KCPayments.openPaymentDetail('${escHtml(payment.paymentId)}')">View Payment</button>
      </div>
    </div>` : ''}

    <!-- Audit Log -->
    <div class="card">
      <div class="card-header"><span class="card-title">Activity Log</span></div>
      <div class="card-body" style="padding:0.75rem 1rem;max-height:200px;overflow-y:auto">
        ${(s.auditLog || []).length === 0 ? '<p class="text-muted text-sm">No log entries.</p>' :
          [...(s.auditLog || [])].reverse().map(l => `
            <div class="activity-item">
              <span class="activity-icon">📌</span>
              <div class="activity-text">${escHtml(l.note || l.action)}
                <div class="activity-time">${formatDateTime(l.performedAt)} · ${escHtml(l.performedBy || 'System')}</div>
              </div>
            </div>`).join('')}
      </div>
    </div>`;

  showModal(`Service Request: ${s.serviceId}`, html, `<button class="btn btn-ghost" onclick="closeModal()">Close</button>`, { large: true });
}

function saveServiceFields(serviceId) {
  const complaint = document.getElementById(`sd_complaint_${serviceId}`)?.value.trim();
  const findings  = document.getElementById(`sd_findings_${serviceId}`)?.value.trim();
  const wsrec     = document.getElementById(`sd_wsrec_${serviceId}`)?.value.trim();
  const remarks   = document.getElementById(`sd_remarks_${serviceId}`)?.value.trim();
  if (!complaint) return showToast('Complaint description is required.', 'error');

  updateRecord('serviceRequests', 'serviceId', serviceId, { complaintDescription: complaint, inspectionFindings: findings, workshopRecommendation: wsrec, coordinatorRemarks: remarks });
  showToast('Service details saved.', 'success');
}

function promptStatusChange(serviceId, newStatus) {
  const isCustomerAction = STATUS_ACTOR[newStatus] === 'customer';
  const label = STATUS_LABELS[newStatus] || newStatus;
  const warning = isCustomerAction
    ? 'Stage 1 Simulation: In production, this action is performed by the authenticated customer only.'
    : '';

  showConfirm(
    `Change status to "${label}"?`,
    () => {
      advanceStatus(serviceId, newStatus);
      closeModal();
      setTimeout(() => openServiceDetail(serviceId), 150);
    },
    { title: 'Confirm Status Update', confirmLabel: 'Confirm', warning }
  );
}

function advanceStatus(serviceId, newStatus, note = '') {
  updateServiceStatus(serviceId, newStatus, note || `Status updated to ${STATUS_LABELS[newStatus] || newStatus}`);
  showToast(`Status updated: ${STATUS_LABELS[newStatus] || newStatus}`, 'success');
  if (document.getElementById('svcTableWrap')) renderSvcTable();
}

// ── Status Steps Visual ────────────────────────────────────
const SERVICE_STEPS = [
  'NEW_REQUEST', 'UNDER_INSPECTION', 'QUOTATION_PREPARATION', 'AWAITING_CUSTOMER_APPROVAL',
  'QUOTATION_APPROVED', 'REPAIR_IN_PROGRESS', 'REPAIR_COMPLETED', 'READY_FOR_COLLECTION', 'VEHICLE_DELIVERED'
];
function renderStatusSteps(currentStatus) {
  const errorStatuses = ['QUOTATION_REJECTED','REVISION_REQUESTED','CANCELLED'];
  if (errorStatuses.includes(currentStatus)) {
    return `<div style="margin-bottom:1rem">${statusBadge(currentStatus)}</div>`;
  }
  const idx = SERVICE_STEPS.indexOf(currentStatus);
  return `<div class="progress-steps" style="margin-bottom:1.25rem">
    ${SERVICE_STEPS.map((step, i) => {
      const state = i < idx ? 'done' : (i === idx ? 'active' : '');
      return `
        ${i > 0 ? `<div class="progress-step-line ${i <= idx ? 'done' : ''}"></div>` : ''}
        <div class="progress-step ${state}">
          <div class="progress-step-dot">${i < idx ? '✓' : i + 1}</div>
          <div class="progress-step-label" style="font-size:0.65rem">${escHtml(STATUS_LABELS[step] || step)}</div>
        </div>`;
    }).join('')}
  </div>`;
}

// ── New Service Request ────────────────────────────────────
function openNewServiceModal() {
  const customers = getAll('customers').filter(c => c.isActive !== false);
  const vehicles  = getAll('vehicles');

  const html = `
    <form id="newSvcForm" onsubmit="return false">
      <div class="form-group">
        <label class="form-label" for="ns_customer">Customer <span class="required">*</span></label>
        <select class="form-control form-select" id="ns_customer" name="ns_customer" data-required onchange="window.KCServices.onNewSvcCustomerChange()">
          <option value="">— Select customer —</option>
          ${customers.map(c => `<option value="${escHtml(c.customerId)}">${escHtml(c.fullName)}</option>`).join('')}
        </select>
        <div class="form-error" data-error="ns_customer"></div>
      </div>
      <div class="form-group">
        <label class="form-label" for="ns_vehicle">Vehicle (optional)</label>
        <select class="form-control form-select" id="ns_vehicle">
          <option value="">— Select customer first —</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="ns_complaint">Service Complaint <span class="required">*</span></label>
        <textarea class="form-control" id="ns_complaint" name="ns_complaint" data-required rows="3" placeholder="Describe the service request or complaint…"></textarea>
        <div class="form-error" data-error="ns_complaint"></div>
      </div>
    </form>`;

  showModal('New Service Request', html,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="window.KCServices.saveNewService()">Create Service Request</button>`);
}

function onNewSvcCustomerChange() {
  const custId  = document.getElementById('ns_customer')?.value;
  const vehSel  = document.getElementById('ns_vehicle');
  if (!vehSel) return;
  const vehicles = getAll('vehicles').filter(v => v.customerId === custId);
  vehSel.innerHTML = `<option value="">— No vehicle selected —</option>
    ${vehicles.map(v => `<option value="${escHtml(v.vehicleId)}">${escHtml(window.KCVehicles.vehicleDisplayName(v))} ${v.registrationPlate ? '('+v.registrationPlate+')' : ''}</option>`).join('')}`;
}

function saveNewService() {
  const f = document.getElementById('newSvcForm');
  if (!validateForm(f)) return;

  const custId   = document.getElementById('ns_customer').value;
  const vehicleId = document.getElementById('ns_vehicle').value;
  const complaint = document.getElementById('ns_complaint').value.trim();

  let vehicleSnapshot = { brand: '', model: '', plate: '', year: '' };
  if (vehicleId) {
    const veh = getById('vehicles', vehicleId, 'vehicleId');
    if (veh) vehicleSnapshot = { brand: veh.brandName || veh.customBrand || '', model: veh.modelName || veh.customModel || '', plate: veh.registrationPlate || '', year: veh.year || '' };
  }

  const svc = {
    serviceId:            generateId('SVC'),
    customerId:           custId,
    vehicleId:            vehicleId,
    vehicleSnapshot,
    complaintDescription: complaint,
    inspectionFindings:   '',
    workshopRecommendation:'',
    coordinatorRemarks:   '',
    progressNotes:        [],
    status:               'NEW_REQUEST',
    activeQuotationId:    '',
    activePaymentId:      '',
    isDemo:               false,
    createdAt:            nowISO(),
    updatedAt:            nowISO(),
    auditLog:             [{ action: 'CREATED', note: 'Service request created', performedAt: nowISO(), performedBy: 'COT Admin' }]
  };

  insertRecord('serviceRequests', svc);
  closeModal();
  showToast(`Service request ${svc.serviceId} created.`, 'success');
  renderServices();
}

window.KCServices = {
  render: renderServices,
  renderRepairs,
  filterByStatus, clearFilters,
  openServiceDetail, saveServiceFields,
  promptStatusChange, advanceStatus,
  openNewServiceModal, onNewSvcCustomerChange, saveNewService,
  addProgressNote
};
