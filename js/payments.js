/* ============================================================
   KCHECK — Payment Module
   ============================================================ */

'use strict';

const {
  getAll, getById, insertRecord, updateRecord,
  generateId, nowISO, escHtml, showToast, showModal, closeModal,
  showConfirm, formatDate, formatDateTime, formatMYR,
  renderEmpty, statusBadge, addAuditLog, getSetting
} = window.KCHECK;

// ── Render List ────────────────────────────────────────────
function renderPayments() {
  const content  = document.getElementById('pageContent');
  const payments = getAll('payments');
  const services = getAll('serviceRequests');
  const customers = getAll('customers');

  content.innerHTML = `
    <div class="page-section">
      <div class="section-header">
        <h2 class="section-title">Payments</h2>
      </div>
      <div class="demo-notice" style="margin-bottom:1rem">
        <strong>Stage 1 Prototype:</strong> Payments are simulated locally. No real money or bank transfers involved. Receipt uploads are stored in browser memory only and are not transmitted anywhere.
      </div>
      ${payments.length === 0 ? renderEmpty('No payment records yet', 'Payment records are created when a service reaches Ready for Collection.') : `
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr>
            <th>Payment Ref</th><th>Service Ref</th><th>Customer</th>
            <th>Amount (MYR)</th><th>Status</th><th>Updated</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${[...payments].sort((a,b) => new Date(b.updatedAt||b.createdAt) - new Date(a.updatedAt||a.createdAt)).map(p => {
              const svc  = services.find(s => s.serviceId === p.serviceId);
              const cust = svc ? customers.find(c => c.customerId === svc.customerId) : null;
              return `<tr>
                <td class="text-mono text-xs">${escHtml(p.paymentId)}</td>
                <td class="text-mono text-xs">${escHtml(p.serviceId)}</td>
                <td>${escHtml(cust?.fullName || '—')}</td>
                <td class="font-semibold">${formatMYR(p.expectedAmount)}</td>
                <td>${statusBadge(p.status)}</td>
                <td class="text-xs">${formatDate(p.updatedAt || p.createdAt)}</td>
                <td><button class="btn btn-ghost btn-sm" onclick="window.KCPayments.openPaymentDetail('${escHtml(p.paymentId)}')">View</button></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`}
    </div>`;
}

// ── Create Payment Record ──────────────────────────────────
function createPaymentRecord(serviceId, quotationId, expectedAmount) {
  const existing = getAll('payments').find(p => p.serviceId === serviceId);
  if (existing) return existing;

  const p = {
    paymentId:         generateId('PAY'),
    serviceId,
    quotationId,
    customerId:        getById('serviceRequests', serviceId, 'serviceId')?.customerId || '',
    expectedAmount,
    receiptStoragePath:'',
    receiptDataUrl:    '',
    receiptFileName:   '',
    uploadedAt:        '',
    uploadedBy:        '',
    status:            'UNPAID',
    verifiedAt:        '',
    verifiedBy:        '',
    rejectedAt:        '',
    rejectedBy:        '',
    rejectionReason:   '',
    createdAt:         nowISO(),
    updatedAt:         nowISO()
  };
  insertRecord('payments', p);
  updateRecord('serviceRequests', 'serviceId', serviceId, { activePaymentId: p.paymentId });
  addAuditLog('payment', p.paymentId, 'PAYMENT_CREATED', `Payment record created for ${serviceId}`);
  return p;
}

// ── Payment Detail Modal ───────────────────────────────────
function openPaymentDetail(paymentId) {
  const p = getById('payments', paymentId, 'paymentId');
  if (!p) return showToast('Payment record not found', 'error');
  const svc  = getById('serviceRequests', p.serviceId, 'serviceId');
  const cust = svc ? getById('customers', svc.customerId, 'customerId') : null;
  const qr   = getSetting('paymentQrPath') || '';
  const instructions = getSetting('paymentInstructions') || '⚠️ DEMO — NOT FOR PAYMENT. Configure payment details in Settings.';

  const receiptHtml = p.receiptDataUrl
    ? `<div style="margin-top:0.75rem">
        <div class="form-label">Uploaded Receipt</div>
        ${p.receiptFileName?.endsWith('.pdf')
          ? `<a class="btn btn-outline btn-sm" href="${escHtml(p.receiptDataUrl)}" download="${escHtml(p.receiptFileName)}">📥 Download Receipt PDF</a>`
          : `<img src="${escHtml(p.receiptDataUrl)}" alt="Receipt" style="max-width:100%;max-height:240px;border-radius:var(--radius-md);border:1px solid var(--color-border);margin-top:0.4rem" />`}
        <div class="text-xs text-muted" style="margin-top:0.25rem">Uploaded: ${formatDateTime(p.uploadedAt)}</div>
       </div>`
    : `<p class="text-muted text-sm" style="margin-top:0.5rem">No receipt uploaded yet.</p>`;

  const canVerify = p.status === 'RECEIPT_SUBMITTED' || p.status === 'UNDER_REVIEW';

  const html = `
    <div class="info-grid" style="margin-bottom:1rem">
      <div class="info-item"><div class="info-label">Payment Ref</div><div class="info-value text-mono">${escHtml(p.paymentId)}</div></div>
      <div class="info-item"><div class="info-label">Service Ref</div><div class="info-value text-mono">${escHtml(p.serviceId)}</div></div>
      <div class="info-item"><div class="info-label">Customer</div><div class="info-value">${escHtml(cust?.fullName || '—')}</div></div>
      <div class="info-item"><div class="info-label">Status</div><div class="info-value">${statusBadge(p.status)}</div></div>
      <div class="info-item"><div class="info-label">Expected Amount</div><div class="info-value font-semibold">${formatMYR(p.expectedAmount)}</div></div>
    </div>

    <!-- QR Demo -->
    <div class="qr-demo-container">
      ${qr
        ? `<img src="${escHtml(qr)}" alt="Payment QR" style="width:160px;height:160px;object-fit:contain;border-radius:var(--radius-md)" onerror="this.outerHTML='<div class=qr-demo-box>DEMO<br>NOT FOR<br>PAYMENT</div>'" />`
        : `<div class="qr-demo-box">DEMO<br>NOT FOR<br>PAYMENT</div>`}
      <div class="qr-demo-label">⚠️ DEMO — NOT FOR PAYMENT</div>
      <div style="font-size:0.75rem;color:#78350f;text-align:center">${escHtml(instructions)}</div>
    </div>

    <!-- Amount Display -->
    <div style="text-align:center;margin:1rem 0;padding:1rem;background:var(--color-surface-2);border-radius:var(--radius-md)">
      <div class="text-xs text-muted">Amount to Pay</div>
      <div style="font-size:1.8rem;font-weight:700;color:var(--color-green)">${formatMYR(p.expectedAmount)}</div>
    </div>

    <!-- Upload Receipt -->
    <h4 style="margin-bottom:0.5rem">Payment Receipt</h4>
    ${receiptHtml}
    ${p.status === 'UNPAID' || p.status === 'RECEIPT_SUBMITTED' ? `
      <div class="file-upload-area" style="margin-top:0.75rem" onclick="document.getElementById('receiptFileInput_${escHtml(paymentId)}').click()">
        <input type="file" id="receiptFileInput_${escHtml(paymentId)}" accept="image/jpeg,image/png,application/pdf"
          onchange="window.KCPayments.handleReceiptUpload('${escHtml(paymentId)}',this)" />
        <div style="font-size:1.5rem;margin-bottom:0.3rem">📎</div>
        <div class="font-medium text-sm">Click to upload receipt</div>
        <div class="text-xs text-muted">JPG, PNG or PDF — max 5 MB</div>
      </div>` : ''}

    <!-- Admin Verification -->
    ${canVerify ? `
      <div style="margin-top:1rem;padding:1rem;background:var(--color-surface-2);border-radius:var(--radius-md);border:1px solid var(--color-border)">
        <h4 style="margin-bottom:0.5rem">Admin Payment Verification</h4>
        <p class="text-sm text-muted" style="margin-bottom:0.75rem">Verify that the correct amount was transferred to the correct account before marking as Verified.</p>
        <div style="display:flex;gap:0.5rem">
          <button class="btn btn-green btn-sm" onclick="window.KCPayments.verifyPayment('${escHtml(paymentId)}')">✅ Verify Payment</button>
          <button class="btn btn-danger btn-sm" onclick="window.KCPayments.rejectPaymentPrompt('${escHtml(paymentId)}')">❌ Reject Payment</button>
        </div>
      </div>` : ''}

    ${p.status === 'VERIFIED' ? `<div style="margin-top:1rem;padding:0.75rem;background:var(--color-green-light);border:1px solid var(--color-green-border);border-radius:var(--radius-md)">
      <strong style="color:var(--color-green)">✅ Payment Verified</strong>
      <div class="text-xs text-muted">${formatDateTime(p.verifiedAt)} · ${escHtml(p.verifiedBy)}</div>
    </div>` : ''}

    ${p.status === 'REJECTED' ? `<div style="margin-top:1rem;padding:0.75rem;background:var(--color-red-light);border:1px solid var(--color-red-border);border-radius:var(--radius-md)">
      <strong style="color:var(--color-red)">❌ Payment Rejected</strong>
      <div class="text-sm">${escHtml(p.rejectionReason)}</div>
      <div class="text-xs text-muted">${formatDateTime(p.rejectedAt)}</div>
    </div>` : ''}`;

  showModal(`Payment: ${p.paymentId}`, html,
    `${p.status === 'VERIFIED' ? `<button class="btn btn-outline" onclick="closeModal();window.KCReports.generateReceiptPdf('${escHtml(p.paymentId)}')">🖨️ Print Receipt</button>` : ''}
     <button class="btn btn-ghost" onclick="closeModal()">Close</button>`,
    { large: true });
}

// ── Receipt Upload ─────────────────────────────────────────
function handleReceiptUpload(paymentId, input) {
  const file = input.files[0];
  if (!file) return;

  const ALLOWED = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!ALLOWED.includes(file.type)) {
    showToast('Invalid file type. Only JPG, PNG and PDF are allowed.', 'error');
    input.value = '';
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast('File too large. Maximum size is 5 MB.', 'error');
    input.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    updateRecord('payments', 'paymentId', paymentId, {
      receiptDataUrl:  e.target.result,
      receiptFileName: file.name,
      receiptStoragePath: `demo-local/${paymentId}/${file.name}`,
      uploadedAt:      nowISO(),
      uploadedBy:      'Customer (Simulated)',
      status:          'RECEIPT_SUBMITTED'
    });
    addAuditLog('payment', paymentId, 'RECEIPT_UPLOADED', `Receipt uploaded: ${file.name}`);
    showToast('Receipt uploaded. Status: Receipt Submitted.', 'success');
    closeModal();
    setTimeout(() => openPaymentDetail(paymentId), 100);
  };
  reader.readAsDataURL(file);
}

// ── Verify Payment ─────────────────────────────────────────
function verifyPayment(paymentId) {
  const p = getById('payments', paymentId, 'paymentId');
  if (!p) return;

  showConfirm(
    `Verify payment of ${formatMYR(p.expectedAmount)} for service ${p.serviceId}?`,
    () => {
      updateRecord('payments', 'paymentId', paymentId, {
        status: 'VERIFIED', verifiedAt: nowISO(), verifiedBy: 'COT Admin'
      });
      addAuditLog('payment', paymentId, 'PAYMENT_VERIFIED', `Payment verified by COT Admin`);

      // Advance service if it's in Ready for Collection
      const svc = getById('serviceRequests', p.serviceId, 'serviceId');
      if (svc && svc.status === 'READY_FOR_COLLECTION') {
        window.KCHECK.updateServiceStatus(p.serviceId, 'VEHICLE_DELIVERED', 'Payment verified — vehicle delivered');
      }
      showToast('Payment verified. Service marked as Vehicle Delivered.', 'success');
      closeModal();
      setTimeout(() => openPaymentDetail(paymentId), 100);
    },
    { title: 'Verify Payment', confirmLabel: 'Verify Payment', warning: 'Only verify after confirming receipt of correct amount in correct account.' }
  );
}

function rejectPaymentPrompt(paymentId) {
  showModal('Reject Payment',
    `<form id="payRejForm"><div class="form-group">
      <label class="form-label">Rejection Reason <span style="color:var(--color-red)">*</span></label>
      <textarea class="form-control" id="payRejReason" rows="3" placeholder="e.g. Incorrect amount transferred…"></textarea>
    </div></form>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
     <button class="btn btn-danger" onclick="window.KCPayments.confirmRejectPayment('${escHtml(paymentId)}')">Reject Payment</button>`);
}

function confirmRejectPayment(paymentId) {
  const reason = document.getElementById('payRejReason')?.value.trim();
  if (!reason) return showToast('Please enter a rejection reason.', 'error');

  updateRecord('payments', 'paymentId', paymentId, {
    status: 'PAYMENT_REJECTED', rejectedAt: nowISO(), rejectedBy: 'COT Admin', rejectionReason: reason
  });
  addAuditLog('payment', paymentId, 'PAYMENT_REJECTED', `Rejected: ${reason}`);
  showToast('Payment rejected.', 'info');
  closeModal();
  renderPayments();
}

window.KCPayments = {
  render: renderPayments,
  createPaymentRecord,
  openPaymentDetail,
  handleReceiptUpload,
  verifyPayment, rejectPaymentPrompt, confirmRejectPayment
};
