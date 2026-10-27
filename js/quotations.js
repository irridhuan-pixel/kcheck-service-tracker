/* ============================================================
   KCHECK — Quotation Management
   ============================================================ */

'use strict';

const {
  getAll, getById, insertRecord, updateRecord, getDB, saveDB,
  generateId, nowISO, escHtml, showToast, showModal, closeModal,
  showConfirm, formatDate, formatDateTime, formatMYR, renderEmpty,
  statusBadge, validateForm, addAuditLog
} = window.KCHECK;

// ── Line Item ──────────────────────────────────────────────
let lineItems = [];

// ── Render List ────────────────────────────────────────────
function renderQuotations() {
  const content = document.getElementById('pageContent');
  const quotations = getAll('quotations');
  const services   = getAll('serviceRequests');
  const customers  = getAll('customers');

  content.innerHTML = `
    <div class="page-section">
      <div class="section-header">
        <h2 class="section-title">Quotations</h2>
        <button class="btn btn-primary" onclick="window.KCQuotations.openNewQuotationModal()">+ New Quotation</button>
      </div>
      ${quotations.length === 0 ? renderEmpty('No quotations yet', 'Create a quotation from a service request.',
        `<button class="btn btn-primary" onclick="window.KCQuotations.openNewQuotationModal()">+ New Quotation</button>`) : `
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr><th>Quotation Ref</th><th>Service Ref</th><th>Customer</th><th>Version</th><th>Total (MYR)</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            ${[...quotations].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).map(q => {
              const svc  = services.find(s => s.serviceId === q.serviceId);
              const cust = svc ? customers.find(c => c.customerId === svc.customerId) : null;
              return `<tr>
                <td class="text-mono text-xs">${escHtml(q.quotationId)}</td>
                <td class="text-mono text-xs">${escHtml(q.serviceId)}</td>
                <td>${escHtml(cust?.fullName || '—')}</td>
                <td>v${q.version}</td>
                <td class="font-semibold">${formatMYR(q.totalAmount)}</td>
                <td>${statusBadge(q.status)}</td>
                <td class="text-xs">${formatDate(q.createdAt)}</td>
                <td>
                  <div style="display:flex;gap:0.25rem">
                    <button class="btn btn-ghost btn-sm" onclick="window.KCQuotations.openQuotationDetail('${escHtml(q.quotationId)}')">View</button>
                    ${['DRAFT','REJECTED','SUPERSEDED'].includes(q.status) ? '' :
                      q.status !== 'APPROVED' && q.status !== 'SUPERSEDED' ?
                      `<button class="btn btn-ghost btn-sm" onclick="window.KCQuotations.openReviseQuotationModal('${escHtml(q.quotationId)}')">Revise</button>` : ''}
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`}
    </div>`;
}

// ── New Quotation ──────────────────────────────────────────
function openNewQuotationModal(preselectedServiceId = '') {
  const services  = getAll('serviceRequests').filter(s => !['VEHICLE_DELIVERED','CANCELLED'].includes(s.status));
  const customers = getAll('customers');
  lineItems = [{ description: '', quantity: 1, unitPrice: 0 }];

  const html = `
    <form id="quoForm" onsubmit="return false">
      <div class="form-group">
        <label class="form-label" for="qf_service">Service Request <span class="required">*</span></label>
        <select class="form-control form-select" id="qf_service" data-required>
          <option value="">— Select service —</option>
          ${services.map(s => {
            const c = customers.find(cu => cu.customerId === s.customerId);
            return `<option value="${escHtml(s.serviceId)}" ${s.serviceId === preselectedServiceId ? 'selected' : ''}>${escHtml(s.serviceId)} — ${escHtml(c?.fullName||'?')} (${escHtml(s.complaintDescription.substring(0,30))})</option>`;
          }).join('')}
        </select>
        <div class="form-error" data-error="qf_service"></div>
      </div>

      <h4 style="margin-bottom:0.5rem;margin-top:1rem">Line Items (Spare Parts)</h4>
      <div id="lineItemsContainer"></div>
      <button type="button" class="btn btn-ghost btn-sm" style="margin-bottom:1rem" onclick="window.KCQuotations.addLineItem()">+ Add Item</button>

      <div class="form-row form-row-2">
        <div class="form-group">
          <label class="form-label" for="qf_labour">Labour Charges (MYR)</label>
          <input class="form-control" id="qf_labour" type="number" min="0" step="0.01" value="0" oninput="window.KCQuotations.recalcTotal()" />
        </div>
        <div class="form-group">
          <label class="form-label" for="qf_additional">Additional Charges (MYR)</label>
          <input class="form-control" id="qf_additional" type="number" min="0" step="0.01" value="0" oninput="window.KCQuotations.recalcTotal()" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="qf_addLabel">Additional Charges Label</label>
        <input class="form-control" id="qf_addLabel" type="text" placeholder="e.g. Disposal fee" />
      </div>
      <div id="quoTotalsBlock" style="margin-bottom:1rem"></div>

      <div class="form-group">
        <label class="form-label" for="qf_wsrec">Workshop Recommendation</label>
        <textarea class="form-control" id="qf_wsrec" rows="2" placeholder="Workshop recommendation notes…"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label" for="qf_remarks">Coordinator Remarks</label>
        <textarea class="form-control" id="qf_remarks" rows="2" placeholder="Internal remarks…"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label" for="qf_footer">Document Footer (optional)</label>
        <textarea class="form-control" id="qf_footer" rows="2" placeholder="Terms and conditions…">${escHtml(window.KCHECK.getSetting('quotationFooter') || '')}</textarea>
      </div>
    </form>`;

  showModal('Create Quotation', html,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
     <button class="btn btn-outline" onclick="window.KCQuotations.saveQuotation('DRAFT')">Save as Draft</button>
     <button class="btn btn-primary" onclick="window.KCQuotations.saveQuotation('AWAITING_APPROVAL')">Send for Approval</button>`,
    { large: true });

  renderLineItemsTable();
  recalcTotal();
}

function addLineItem() {
  lineItems.push({ description: '', quantity: 1, unitPrice: 0 });
  renderLineItemsTable();
  recalcTotal();
}

function removeLineItem(idx) {
  lineItems.splice(idx, 1);
  renderLineItemsTable();
  recalcTotal();
}

function renderLineItemsTable() {
  const container = document.getElementById('lineItemsContainer');
  if (!container) return;

  container.innerHTML = `
    <table class="line-items-table">
      <thead><tr><th style="width:45%">Description</th><th style="width:15%">Qty</th><th style="width:20%">Unit Price (MYR)</th><th style="width:15%">Subtotal</th><th style="width:5%"></th></tr></thead>
      <tbody id="lineItemsBody">
        ${lineItems.map((item, i) => `<tr>
          <td><input type="text" placeholder="Part description…" value="${escHtml(item.description)}" oninput="window.KCQuotations.updateLineItem(${i},'description',this.value)" /></td>
          <td><input type="number" class="qty-input" min="1" value="${item.quantity}" oninput="window.KCQuotations.updateLineItem(${i},'quantity',this.value)" /></td>
          <td><input type="number" class="price-input" min="0" step="0.01" value="${item.unitPrice}" oninput="window.KCQuotations.updateLineItem(${i},'unitPrice',this.value)" /></td>
          <td class="subtotal-cell">${formatMYR(item.quantity * item.unitPrice)}</td>
          <td><button type="button" class="btn btn-ghost btn-icon" onclick="window.KCQuotations.removeLineItem(${i})" style="color:var(--color-red)">✕</button></td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

function updateLineItem(idx, field, value) {
  if (!lineItems[idx]) return;
  if (field === 'quantity' || field === 'unitPrice') {
    lineItems[idx][field] = parseFloat(value) || 0;
  } else {
    lineItems[idx][field] = value;
  }
  // Update subtotal cell inline
  const rows = document.querySelectorAll('#lineItemsBody tr');
  if (rows[idx]) {
    const subtotalCell = rows[idx].querySelector('.subtotal-cell');
    if (subtotalCell) subtotalCell.textContent = formatMYR(lineItems[idx].quantity * lineItems[idx].unitPrice);
  }
  recalcTotal();
}

function recalcTotal() {
  const labour     = parseFloat(document.getElementById('qf_labour')?.value) || 0;
  const additional = parseFloat(document.getElementById('qf_additional')?.value) || 0;
  const subtotal   = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const total      = subtotal + labour + additional;

  const block = document.getElementById('quoTotalsBlock');
  if (block) {
    block.innerHTML = `<div class="totals-block">
      <div class="totals-row"><span>Parts Subtotal</span><span>${formatMYR(subtotal)}</span></div>
      <div class="totals-row"><span>Labour</span><span>${formatMYR(labour)}</span></div>
      <div class="totals-row"><span>Additional</span><span>${formatMYR(additional)}</span></div>
      <div class="totals-row total"><span>TOTAL</span><span>${formatMYR(total)}</span></div>
    </div>`;
  }
  return total;
}

function saveQuotation(statusToSave) {
  const f = document.getElementById('quoForm');
  if (!validateForm(f)) return;

  const serviceId = document.getElementById('qf_service').value;
  if (!serviceId) return showToast('Select a service request.', 'error');

  // Calculate version
  const existing = getAll('quotations').filter(q => q.serviceId === serviceId && q.status !== 'SUPERSEDED');
  const version  = existing.length + 1;

  const labour     = parseFloat(document.getElementById('qf_labour').value) || 0;
  const additional = parseFloat(document.getElementById('qf_additional').value) || 0;
  const subtotal   = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const total      = subtotal + labour + additional;

  const q = {
    quotationId:          generateId('QUO'),
    serviceId,
    customerId:           getById('serviceRequests', serviceId, 'serviceId')?.customerId || '',
    version,
    lineItems:            [...lineItems],
    labourCharges:        labour,
    additionalCharges:    additional,
    additionalChargesLabel: document.getElementById('qf_addLabel').value.trim(),
    totalAmount:          total,
    workshopRecommendation: document.getElementById('qf_wsrec').value.trim(),
    coordinatorRemarks:   document.getElementById('qf_remarks').value.trim(),
    documentFooter:       document.getElementById('qf_footer').value.trim(),
    status:               statusToSave,
    createdAt:            nowISO(),
    createdBy:            'COT Admin',
    sentAt:               statusToSave === 'AWAITING_APPROVAL' ? nowISO() : '',
    approvedAt: '', approvedBy: '', rejectedAt: '', rejectedBy: '', rejectionReason: ''
  };

  insertRecord('quotations', q);

  // Update service request active quotation
  updateRecord('serviceRequests', 'serviceId', serviceId, { activeQuotationId: q.quotationId });

  // If sent for approval, update service status
  if (statusToSave === 'AWAITING_APPROVAL') {
    const svc = getById('serviceRequests', serviceId, 'serviceId');
    if (svc && svc.status === 'QUOTATION_PREPARATION') {
      window.KCHECK.updateServiceStatus(serviceId, 'AWAITING_CUSTOMER_APPROVAL', `Quotation ${q.quotationId} sent for customer approval`);
    }
  }

  addAuditLog('quotation', q.quotationId, `QUOTATION_${statusToSave}`, `Quotation v${version} ${statusToSave === 'DRAFT' ? 'saved as draft' : 'sent for approval'}`);

  closeModal();
  showToast(`Quotation ${q.quotationId} ${statusToSave === 'DRAFT' ? 'saved as draft' : 'sent for approval'}.`, 'success');
  renderQuotations();
}

// ── Quotation Detail ───────────────────────────────────────
function openQuotationDetail(quotationId) {
  const q    = getById('quotations', quotationId, 'quotationId');
  if (!q) return showToast('Quotation not found', 'error');
  const svc  = getById('serviceRequests', q.serviceId, 'serviceId');
  const cust = svc ? getById('customers', svc.customerId, 'customerId') : null;

  const html = `
    <div class="info-grid" style="margin-bottom:1rem">
      <div class="info-item"><div class="info-label">Quotation Ref</div><div class="info-value text-mono">${escHtml(q.quotationId)}</div></div>
      <div class="info-item"><div class="info-label">Version</div><div class="info-value">v${q.version}</div></div>
      <div class="info-item"><div class="info-label">Service Ref</div><div class="info-value text-mono">${escHtml(q.serviceId)}</div></div>
      <div class="info-item"><div class="info-label">Customer</div><div class="info-value">${escHtml(cust?.fullName || '—')}</div></div>
      <div class="info-item"><div class="info-label">Status</div><div class="info-value">${statusBadge(q.status)}</div></div>
      <div class="info-item"><div class="info-label">Created</div><div class="info-value">${formatDate(q.createdAt)}</div></div>
    </div>

    <table class="line-items-table">
      <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th></tr></thead>
      <tbody>
        ${q.lineItems.map(item => `<tr>
          <td>${escHtml(item.description || '(no description)')}</td>
          <td style="text-align:center">${item.quantity}</td>
          <td style="text-align:right">${formatMYR(item.unitPrice)}</td>
          <td style="text-align:right">${formatMYR(item.quantity * item.unitPrice)}</td>
        </tr>`).join('')}
      </tbody>
    </table>

    <div class="totals-block" style="margin-top:0.5rem;margin-bottom:1rem">
      <div class="totals-row"><span>Parts Subtotal</span><span>${formatMYR(q.lineItems.reduce((s,i) => s + i.quantity*i.unitPrice, 0))}</span></div>
      <div class="totals-row"><span>Labour</span><span>${formatMYR(q.labourCharges)}</span></div>
      <div class="totals-row"><span>${escHtml(q.additionalChargesLabel || 'Additional')}</span><span>${formatMYR(q.additionalCharges)}</span></div>
      <div class="totals-row total"><span>TOTAL (MYR)</span><span>${formatMYR(q.totalAmount)}</span></div>
    </div>

    ${q.workshopRecommendation ? `<p class="text-sm"><strong>Workshop Recommendation:</strong> ${escHtml(q.workshopRecommendation)}</p>` : ''}
    ${q.coordinatorRemarks ? `<p class="text-sm"><strong>Coordinator Remarks:</strong> ${escHtml(q.coordinatorRemarks)}</p>` : ''}
    ${q.approvedBy ? `<p class="text-sm text-muted" style="margin-top:0.5rem">Approved: ${formatDateTime(q.approvedAt)} · ${escHtml(q.approvedBy)}</p>` : ''}
    ${q.rejectionReason ? `<p class="text-sm" style="color:var(--color-red);margin-top:0.5rem">Rejection: ${escHtml(q.rejectionReason)}</p>` : ''}

    ${q.status === 'AWAITING_APPROVAL' ? `
      <div class="demo-notice" style="margin-top:1rem">
        <strong>Stage 1 Simulation:</strong> In production, only the authenticated customer can approve or reject this quotation.
        <div style="display:flex;gap:0.5rem;margin-top:0.75rem">
          <button class="btn btn-green btn-sm" onclick="window.KCQuotations.simulateApproval('${escHtml(q.quotationId)}','${escHtml(q.serviceId)}')">✅ Simulate Customer Approval</button>
          <button class="btn btn-danger btn-sm" onclick="window.KCQuotations.simulateRejection('${escHtml(q.quotationId)}','${escHtml(q.serviceId)}')">❌ Simulate Customer Rejection</button>
        </div>
      </div>` : ''}`;

  showModal(`Quotation: ${q.quotationId}`, html,
    `<button class="btn btn-outline" onclick="closeModal();window.KCReports.generateQuotationPdf('${escHtml(q.quotationId)}')">🖨️ Print / PDF</button>
     <button class="btn btn-ghost" onclick="closeModal()">Close</button>`,
    { large: true });
}

// ── Simulate Approval / Rejection ─────────────────────────
function simulateApproval(quotationId, serviceId) {
  const q = getById('quotations', quotationId, 'quotationId');
  if (!q) return;

  showConfirm(
    'Simulate customer approval of this quotation?',
    () => {
      updateRecord('quotations', 'quotationId', quotationId, {
        status: 'APPROVED', approvedAt: nowISO(), approvedBy: '(Simulated — Customer)'
      });
      window.KCHECK.updateServiceStatus(serviceId, 'QUOTATION_APPROVED', `Quotation v${q.version} approved (simulated)`);
      addAuditLog('quotation', quotationId, 'QUOTATION_APPROVED', 'Simulated customer approval');
      showToast('Quotation approved (simulated). Status updated to Quotation Approved.', 'success');
      closeModal();
      renderQuotations();
    },
    { title: 'Simulate Approval', warning: 'This is a Stage 1 simulation only. Real approval requires Firebase Authentication.' }
  );
}

function simulateRejection(quotationId, serviceId) {
  const q = getById('quotations', quotationId, 'quotationId');
  if (!q) return;

  showModal('Simulate Customer Rejection',
    `<form id="rejForm"><div class="form-group">
      <label class="form-label">Rejection Reason <span style="color:var(--color-red)">*</span></label>
      <textarea class="form-control" id="rejReason" rows="3" placeholder="Customer's reason for rejection…"></textarea>
    </div>
    <div class="demo-notice">Stage 1 simulation only.</div></form>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
     <button class="btn btn-danger" onclick="window.KCQuotations.confirmSimulateRejection('${escHtml(quotationId)}','${escHtml(serviceId)}')">Simulate Rejection</button>`);
}

function confirmSimulateRejection(quotationId, serviceId) {
  const reason = document.getElementById('rejReason')?.value.trim();
  if (!reason) return showToast('Please enter a rejection reason.', 'error');

  const q = getById('quotations', quotationId, 'quotationId');
  updateRecord('quotations', 'quotationId', quotationId, {
    status: 'REJECTED', rejectedAt: nowISO(), rejectedBy: '(Simulated — Customer)', rejectionReason: reason
  });
  window.KCHECK.updateServiceStatus(serviceId, 'QUOTATION_REJECTED', `Quotation v${q.version} rejected: ${reason}`);
  addAuditLog('quotation', quotationId, 'QUOTATION_REJECTED', `Rejection reason: ${reason}`);
  showToast('Quotation rejected (simulated).', 'info');
  closeModal();
  renderQuotations();
}

// ── Revise Quotation ───────────────────────────────────────
function openReviseQuotationModal(quotationId) {
  const q = getById('quotations', quotationId, 'quotationId');
  if (!q) return;

  showConfirm(
    `Revise quotation ${quotationId} (v${q.version})? A new version will be created and the current version will be marked Superseded.`,
    () => {
      // Mark current as superseded
      updateRecord('quotations', 'quotationId', quotationId, { status: 'SUPERSEDED' });
      // Update service back to quotation prep
      window.KCHECK.updateServiceStatus(q.serviceId, 'QUOTATION_PREPARATION', `Revising quotation — v${q.version} superseded`);
      addAuditLog('quotation', quotationId, 'QUOTATION_SUPERSEDED', `Revision initiated — v${q.version} superseded`);
      showToast('Previous version superseded. Create new quotation.', 'info');
      openNewQuotationModal(q.serviceId);
    },
    { title: 'Revise Quotation', warning: 'Any prior customer approval is invalidated when a new version is created.' }
  );
}

window.KCQuotations = {
  render: renderQuotations,
  openNewQuotationModal, saveQuotation,
  addLineItem, removeLineItem, updateLineItem, recalcTotal, renderLineItemsTable,
  openQuotationDetail,
  simulateApproval, simulateRejection, confirmSimulateRejection,
  openReviseQuotationModal
};
