/* ============================================================
   KCHECK — Customer Portal (Stage 1 Demo Mode)
   ============================================================ */

'use strict';

const {
  getAll, getById, updateRecord, getDB, saveDB,
  generateId, nowISO, escHtml, showToast, showModal, closeModal,
  formatDate, formatDateTime, formatMYR, statusBadge,
  STATUS_LABELS, STATUS_TRANSITIONS, renderEmpty
} = window.KCHECK;

let currentPortalCustomer = null;
let currentPortalView     = 'my-vehicles';

// ── Bootstrap ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Populate demo customer selector
  const sel  = document.getElementById('demoCustomerSelect');
  const custs = getAll('customers').filter(c => c.isActive !== false);
  custs.forEach(c => {
    const opt = document.createElement('option');
    opt.value       = c.customerId;
    opt.textContent = c.fullName + (c.isDemo ? ' (demo)' : '');
    sel.appendChild(opt);
  });

  sel.addEventListener('change', () => {
    const custId = sel.value;
    if (!custId) {
      currentPortalCustomer = null;
      showPortalWelcome();
      return;
    }
    currentPortalCustomer = getById('customers', custId, 'customerId');
    showPortalNav();
    navigatePortal('my-vehicles');
  });

  // Portal nav
  document.querySelectorAll('.portal-nav-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      navigatePortal(btn.dataset.portalView);
    });
  });
});

function showPortalWelcome() {
  document.getElementById('portalNav').style.display    = 'none';
  document.getElementById('portalWelcome').style.display = '';
  document.getElementById('portalContent').style.display = 'none';
}

function showPortalNav() {
  document.getElementById('portalNav').style.display     = '';
  document.getElementById('portalWelcome').style.display = 'none';
  document.getElementById('portalContent').style.display = '';
}

function navigatePortal(viewName) {
  currentPortalView = viewName;
  document.querySelectorAll('.portal-nav-item').forEach(b => {
    b.classList.toggle('active', b.dataset.portalView === viewName);
  });

  const content = document.getElementById('portalContent');
  if (!content) return;

  const views = {
    'my-vehicles':      renderPortalVehicles,
    'my-services':      renderPortalServices,
    'portal-documents': renderPortalDocuments
  };

  if (views[viewName]) {
    content.innerHTML = '';
    views[viewName]();
  }
}

// ── My Vehicles ────────────────────────────────────────────
function renderPortalVehicles() {
  if (!currentPortalCustomer) return;
  const content  = document.getElementById('portalContent');
  const custId   = currentPortalCustomer.customerId;
  const vehicles = getAll('vehicles').filter(v => v.customerId === custId);

  content.innerHTML = `
    <div>
      <h2 style="margin-bottom:0.25rem">Welcome, ${escHtml(currentPortalCustomer.fullName)}</h2>
      <p class="text-muted text-sm" style="margin-bottom:1.5rem">Your registered vehicles</p>

      ${vehicles.length === 0
        ? `<div class="portal-welcome-card">
            <div class="portal-welcome-icon">🚗</div>
            <h3>No vehicles registered</h3>
            <p>Contact COT Automotive to register your vehicle.</p>
           </div>`
        : `<div class="vehicle-cards-grid">
            ${vehicles.map(v => {
              const svcCount = getAll('serviceRequests').filter(s => s.vehicleId === v.vehicleId).length;
              const brand = v.brandName || v.customBrand || '';
              const model = v.modelName || v.customModel || '';
              return `<div class="vehicle-card" onclick="navigatePortal('my-services')">
                <div class="vehicle-card-icon">🚗</div>
                <div class="vehicle-card-name">${escHtml(brand)} ${escHtml(model)}</div>
                <div class="vehicle-card-sub">${escHtml(v.registrationPlate || 'Plate not recorded')}</div>
                ${v.year ? `<div class="vehicle-card-sub">Year: ${escHtml(v.year)}</div>` : ''}
                <div style="margin-top:0.75rem"><span class="badge badge-blue">${svcCount} service${svcCount !== 1 ? 's' : ''}</span></div>
              </div>`;
            }).join('')}
            <div class="vehicle-card" style="border-style:dashed;cursor:default;opacity:0.6">
              <div class="vehicle-card-icon">➕</div>
              <div class="vehicle-card-name text-muted">Add Vehicle</div>
              <div class="vehicle-card-sub">Contact COT Automotive to register a new vehicle.</div>
            </div>
          </div>`}`;
}

// ── My Services ────────────────────────────────────────────
function renderPortalServices() {
  if (!currentPortalCustomer) return;
  const content  = document.getElementById('portalContent');
  const custId   = currentPortalCustomer.customerId;
  const services = getAll('serviceRequests')
    .filter(s => s.customerId === custId)
    .sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  content.innerHTML = `
    <h2 style="margin-bottom:1rem">My Service Requests</h2>
    ${services.length === 0
      ? `<div class="portal-welcome-card">
          <div class="portal-welcome-icon">📋</div>
          <h3>No service requests</h3>
          <p>Your service history will appear here.</p>
         </div>`
      : services.map(s => {
          const veh  = s.vehicleSnapshot?.brand ? `${s.vehicleSnapshot.brand} ${s.vehicleSnapshot.model}` : 'Vehicle not specified';
          const hasAction = s.status === 'AWAITING_CUSTOMER_APPROVAL';
          return `<div class="portal-service-card" onclick="window.KCPortal.openPortalServiceDetail('${escHtml(s.serviceId)}')">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem">
              <div>
                <div class="portal-service-ref">${escHtml(s.serviceId)}</div>
                <div class="portal-service-title">${escHtml(s.complaintDescription)}</div>
                <div class="text-sm text-muted">${escHtml(veh)} · ${formatDate(s.updatedAt)}</div>
              </div>
              <div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.3rem">
                ${statusBadge(s.status)}
                ${hasAction ? `<span class="badge badge-brand">Action Required</span>` : ''}
              </div>
            </div>
          </div>`;
        }).join('')}`;
}

// ── Service Detail ─────────────────────────────────────────
function openPortalServiceDetail(serviceId) {
  const s    = getById('serviceRequests', serviceId, 'serviceId');
  if (!s) return;
  const veh  = s.vehicleSnapshot?.brand ? `${s.vehicleSnapshot.brand} ${s.vehicleSnapshot.model}` : 'Not specified';
  const quos = getAll('quotations').filter(q => q.serviceId === serviceId);
  const activeQuo = quos.find(q => q.quotationId === s.activeQuotationId) || quos.filter(q => q.status !== 'SUPERSEDED').pop();
  const payment   = s.activePaymentId ? getById('payments', s.activePaymentId, 'paymentId') : null;

  const steps = ['NEW_REQUEST','UNDER_INSPECTION','QUOTATION_PREPARATION','AWAITING_CUSTOMER_APPROVAL','QUOTATION_APPROVED','REPAIR_IN_PROGRESS','REPAIR_COMPLETED','READY_FOR_COLLECTION','VEHICLE_DELIVERED'];
  const idx   = steps.indexOf(s.status);

  const stepHtml = `<div style="overflow-x:auto;padding:0.5rem 0;margin-bottom:1rem">
    <div style="display:flex;align-items:center;min-width:max-content;gap:0">
      ${steps.map((step, i) => {
        const state = i < idx ? 'done' : (i === idx ? 'active' : '');
        const dotBg = state === 'done' ? '#16a34a' : state === 'active' ? '#2563eb' : '#e5e7eb';
        const dotColor = (state === 'done' || state === 'active') ? '#fff' : '#6b7280';
        return `
          ${i > 0 ? `<div style="height:2px;width:24px;background:${state === 'done' ? '#16a34a' : '#e5e7eb'};flex-shrink:0"></div>` : ''}
          <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex-shrink:0">
            <div style="width:24px;height:24px;border-radius:50%;background:${dotBg};color:${dotColor};display:flex;align-items:center;justify-content:center;font-size:0.65rem;font-weight:700">${i < idx ? '✓' : i+1}</div>
            <div style="font-size:0.6rem;color:${state ? '#374151' : '#9ca3af'};white-space:nowrap;max-width:56px;text-align:center;line-height:1.2">${escHtml(STATUS_LABELS[step]?.replace('Customer ','').replace(' Approval','') || step)}</div>
          </div>`;
      }).join('')}
    </div>
  </div>`;

  const quotationHtml = activeQuo ? `
    <div class="card" style="margin-bottom:1rem">
      <div class="card-header"><span class="card-title">Quotation</span>${statusBadge(activeQuo.status)}</div>
      <div class="card-body">
        <div style="display:flex;justify-content:space-between;margin-bottom:0.75rem">
          <span class="text-sm"><span class="text-mono">${escHtml(activeQuo.quotationId)}</span> · v${activeQuo.version}</span>
          <span class="font-semibold">${formatMYR(activeQuo.totalAmount)}</span>
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:0.83rem;margin-bottom:0.75rem">
          <thead><tr style="background:#f9fafb"><th style="padding:6px;text-align:left">Description</th><th style="padding:6px;text-align:center">Qty</th><th style="padding:6px;text-align:right">Price</th><th style="padding:6px;text-align:right">Subtotal</th></tr></thead>
          <tbody>
            ${activeQuo.lineItems.map(i => `<tr style="border-bottom:1px solid #f0f0f0">
              <td style="padding:6px">${escHtml(i.description || '—')}</td>
              <td style="padding:6px;text-align:center">${i.quantity}</td>
              <td style="padding:6px;text-align:right">${formatMYR(i.unitPrice)}</td>
              <td style="padding:6px;text-align:right">${formatMYR(i.quantity * i.unitPrice)}</td>
            </tr>`).join('')}
            <tr style="border-bottom:1px solid #eee"><td colspan="3" style="padding:6px;text-align:right;font-weight:600">Labour</td><td style="padding:6px;text-align:right">${formatMYR(activeQuo.labourCharges)}</td></tr>
            <tr style="border-top:2px solid #333"><td colspan="3" style="padding:6px;text-align:right;font-weight:700">TOTAL (MYR)</td><td style="padding:6px;text-align:right;font-weight:700">${formatMYR(activeQuo.totalAmount)}</td></tr>
          </tbody>
        </table>

        ${activeQuo.workshopRecommendation ? `<p class="text-sm"><strong>Recommendation:</strong> ${escHtml(activeQuo.workshopRecommendation)}</p>` : ''}

        ${activeQuo.status === 'AWAITING_APPROVAL' ? `
          <div class="demo-notice">
            <strong>Action Required:</strong> Please review the quotation and make your decision.
            <div style="display:flex;gap:0.5rem;margin-top:0.75rem;flex-wrap:wrap">
              <button class="btn btn-green btn-sm" onclick="window.KCPortal.portalApproveQuotation('${escHtml(activeQuo.quotationId)}','${escHtml(serviceId)}')">✅ Approve Quotation</button>
              <button class="btn btn-danger btn-sm" onclick="window.KCPortal.portalRejectQuotation('${escHtml(activeQuo.quotationId)}','${escHtml(serviceId)}')">❌ Reject</button>
              <button class="btn btn-amber btn-sm" onclick="window.KCPortal.portalRequestRevision('${escHtml(activeQuo.quotationId)}','${escHtml(serviceId)}')">🔄 Request Revision</button>
            </div>
          </div>` : ''}
      </div>
    </div>` : '';

  const paymentHtml = (activeQuo?.status === 'APPROVED' || payment) ? `
    <div class="card" style="margin-bottom:1rem">
      <div class="card-header"><span class="card-title">Payment</span>${statusBadge(payment?.status || 'UNPAID')}</div>
      <div class="card-body">
        ${payment?.status === 'VERIFIED'
          ? `<p class="text-sm" style="color:var(--color-green);font-weight:600">✅ Payment Verified · ${formatDateTime(payment.verifiedAt)}</p>`
          : `<div class="qr-demo-container" style="margin-bottom:1rem">
              <div class="qr-demo-box">DEMO<br>NOT FOR<br>PAYMENT</div>
              <div class="qr-demo-label">⚠️ DEMO — NOT FOR PAYMENT</div>
             </div>
             <p class="text-sm text-muted" style="margin-bottom:0.75rem">${escHtml(window.KCHECK.getSetting('paymentInstructions') || 'Contact COT Automotive for payment details.')}</p>
             ${payment ? `<p class="text-sm">Amount: <strong>${formatMYR(payment.expectedAmount)}</strong></p>` : `<p class="text-sm">Amount: <strong>${formatMYR(activeQuo?.totalAmount || 0)}</strong></p>`}
             ${!payment ? `<button class="btn btn-primary btn-sm" style="margin-top:0.5rem" onclick="window.KCPortal.createPortalPayment('${escHtml(serviceId)}','${escHtml(activeQuo?.quotationId || '')}',${activeQuo?.totalAmount || 0})">Proceed to Payment</button>` : ''}
             ${payment && (payment.status === 'UNPAID' || payment.status === 'RECEIPT_SUBMITTED') ? `
               <div class="file-upload-area" style="margin-top:0.75rem" onclick="document.getElementById('portalReceiptInput').click()">
                 <input type="file" id="portalReceiptInput" accept="image/jpeg,image/png,application/pdf" onchange="window.KCPayments.handleReceiptUpload('${escHtml(payment.paymentId)}',this);closeModal();renderPortalServices()" />
                 <div>📎 Upload Payment Receipt (JPG/PNG/PDF, max 5MB)</div>
               </div>` : ''}
             ${payment?.receiptDataUrl ? `<p class="text-sm" style="margin-top:0.5rem;color:var(--color-green)">✅ Receipt uploaded — awaiting admin verification.</p>` : ''}`}
      </div>
    </div>` : '';

  const html = `
    <div class="breadcrumb"><a onclick="navigatePortal('my-services')" style="cursor:pointer">My Services</a><span class="breadcrumb-sep">›</span><span>${escHtml(s.serviceId)}</span></div>
    <h2 style="margin-bottom:0.25rem">${escHtml(s.complaintDescription)}</h2>
    <p class="text-sm text-muted" style="margin-bottom:1rem">${escHtml(veh)}</p>

    ${stepHtml}

    <div class="card" style="margin-bottom:1rem">
      <div class="card-body">
        <p class="text-sm"><strong>Status:</strong> ${statusBadge(s.status)}</p>
        <p class="text-sm" style="margin-top:0.5rem"><strong>Last Updated:</strong> ${formatDate(s.updatedAt)}</p>
        ${s.inspectionFindings ? `<p class="text-sm" style="margin-top:0.5rem"><strong>Inspection Findings:</strong> ${escHtml(s.inspectionFindings)}</p>` : ''}
        ${s.workshopRecommendation ? `<p class="text-sm" style="margin-top:0.5rem"><strong>Workshop Recommendation:</strong> ${escHtml(s.workshopRecommendation)}</p>` : ''}
        ${s.coordinatorRemarks ? `<p class="text-sm" style="margin-top:0.5rem"><strong>Coordinator Remarks:</strong> ${escHtml(s.coordinatorRemarks)}</p>` : ''}
      </div>
    </div>

    ${quotationHtml}
    ${paymentHtml}`;

  showModal(s.serviceId, html, `<button class="btn btn-ghost" onclick="closeModal()">Close</button>`, { large: true });
}

// ── Quotation Actions ──────────────────────────────────────
function portalApproveQuotation(quotationId, serviceId) {
  const q = getById('quotations', quotationId, 'quotationId');
  if (!q) return;

  window.KCHECK.showConfirm(
    `Approve quotation for ${formatMYR(q.totalAmount)}?`,
    () => {
      updateRecord('quotations', 'quotationId', quotationId, {
        status: 'APPROVED', approvedAt: nowISO(), approvedBy: escHtml(currentPortalCustomer?.fullName || 'Customer')
      });
      window.KCHECK.updateServiceStatus(serviceId, 'QUOTATION_APPROVED', `Quotation v${q.version} approved by customer`);
      window.KCHECK.addAuditLog('quotation', quotationId, 'QUOTATION_APPROVED', `Approved by ${currentPortalCustomer?.fullName}`);
      showToast('Quotation approved.', 'success');
      closeModal();
      setTimeout(() => openPortalServiceDetail(serviceId), 100);
    },
    { title: 'Approve Quotation', confirmLabel: 'Approve', warning: 'Stage 1 simulation — in production this requires your authenticated account.' }
  );
}

function portalRejectQuotation(quotationId, serviceId) {
  showModal('Reject Quotation',
    `<form id="portRejForm"><div class="form-group">
      <label class="form-label">Reason for Rejection</label>
      <textarea class="form-control" id="portRejReason" rows="3" placeholder="Please explain why you are rejecting this quotation…"></textarea>
    </div></form>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
     <button class="btn btn-danger" onclick="window.KCPortal.confirmPortalRejection('${escHtml(quotationId)}','${escHtml(serviceId)}')">Reject</button>`);
}

function confirmPortalRejection(quotationId, serviceId) {
  const reason = document.getElementById('portRejReason')?.value.trim();
  if (!reason) return showToast('Please provide a reason.', 'error');
  const q = getById('quotations', quotationId, 'quotationId');
  updateRecord('quotations', 'quotationId', quotationId, {
    status: 'REJECTED', rejectedAt: nowISO(), rejectedBy: currentPortalCustomer?.fullName || 'Customer', rejectionReason: reason
  });
  window.KCHECK.updateServiceStatus(serviceId, 'QUOTATION_REJECTED', `Quotation v${q.version} rejected: ${reason}`);
  showToast('Quotation rejected.', 'info');
  closeModal();
}

function portalRequestRevision(quotationId, serviceId) {
  showModal('Request Revision',
    `<form><div class="form-group">
      <label class="form-label">Revision Request Details</label>
      <textarea class="form-control" id="portRevNote" rows="3" placeholder="Describe what changes you are requesting…"></textarea>
    </div></form>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
     <button class="btn btn-amber" onclick="window.KCPortal.confirmPortalRevision('${escHtml(quotationId)}','${escHtml(serviceId)}')">Request Revision</button>`);
}

function confirmPortalRevision(quotationId, serviceId) {
  const note = document.getElementById('portRevNote')?.value.trim();
  if (!note) return showToast('Please describe your revision request.', 'error');
  const q = getById('quotations', quotationId, 'quotationId');
  updateRecord('quotations', 'quotationId', quotationId, {
    status: 'REJECTED', rejectedAt: nowISO(), rejectedBy: currentPortalCustomer?.fullName || 'Customer', rejectionReason: 'Revision requested: ' + note
  });
  window.KCHECK.updateServiceStatus(serviceId, 'REVISION_REQUESTED', `Revision requested: ${note}`);
  showToast('Revision request submitted.', 'info');
  closeModal();
}

function createPortalPayment(serviceId, quotationId, amount) {
  window.KCPayments.createPaymentRecord(serviceId, quotationId, amount);
  showToast('Payment record created.', 'success');
  closeModal();
  setTimeout(() => openPortalServiceDetail(serviceId), 100);
}

// ── Documents ──────────────────────────────────────────────
function renderPortalDocuments() {
  if (!currentPortalCustomer) return;
  const content  = document.getElementById('portalContent');
  const custId   = currentPortalCustomer.customerId;
  const services = getAll('serviceRequests').filter(s => s.customerId === custId);

  const rows = services.map(s => {
    const quos = getAll('quotations').filter(q => q.serviceId === s.serviceId && q.status !== 'SUPERSEDED');
    const qRef = quos[0];
    const pay  = s.activePaymentId ? getById('payments', s.activePaymentId, 'paymentId') : null;

    return `<tr>
      <td class="text-mono text-xs">${escHtml(s.serviceId)}</td>
      <td>${escHtml(s.complaintDescription)}</td>
      <td>${statusBadge(s.status)}</td>
      <td>
        <div style="display:flex;gap:0.3rem;flex-wrap:wrap">
          ${qRef ? `<button class="btn btn-outline btn-sm" onclick="window.KCReports.generateQuotationPdf('${escHtml(qRef.quotationId)}')">📄 Quotation</button>` : ''}
          <button class="btn btn-outline btn-sm" onclick="window.KCReports.generateServiceReportPdf('${escHtml(s.serviceId)}')">📋 Report</button>
          ${pay?.status === 'VERIFIED' ? `
            <button class="btn btn-outline btn-sm" onclick="window.KCReports.generateInvoicePdf('${escHtml(s.serviceId)}')">🧾 Invoice</button>
            <button class="btn btn-outline btn-sm" onclick="window.KCReports.generateReceiptPdf('${escHtml(pay.paymentId)}')">✅ Receipt</button>` : ''}
        </div>
      </td>
    </tr>`;
  });

  content.innerHTML = `
    <h2 style="margin-bottom:1rem">My Documents</h2>
    ${rows.length === 0 ? `<div class="portal-welcome-card"><p>No documents available yet.</p></div>` : `
    <div class="table-wrapper">
      <table class="data-table">
        <thead><tr><th>Service Ref</th><th>Complaint</th><th>Status</th><th>Documents</th></tr></thead>
        <tbody>${rows.join('')}</tbody>
      </table>
    </div>`}`;
}

// Helper for portal to close modal and re-navigate
window.renderPortalServices = () => navigatePortal('my-services');

window.KCPortal = {
  openPortalServiceDetail,
  portalApproveQuotation, portalRejectQuotation, confirmPortalRejection,
  portalRequestRevision, confirmPortalRevision,
  createPortalPayment
};
