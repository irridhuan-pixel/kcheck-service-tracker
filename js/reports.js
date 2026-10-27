/* ============================================================
   KCHECK — Reports, Documents & WhatsApp
   ============================================================ */

'use strict';

const {
  getAll, getById, escHtml, showToast, showModal, closeModal,
  formatDate, formatDateTime, formatMYR, renderEmpty,
  statusBadge, getSetting
} = window.KCHECK;

// ── Reports View ───────────────────────────────────────────
function renderReports() {
  const content  = document.getElementById('pageContent');
  const services = getAll('serviceRequests');
  const customers = getAll('customers');

  content.innerHTML = `
    <div class="page-section">
      <div class="section-header">
        <h2 class="section-title">Reports &amp; Invoices</h2>
      </div>
      <div class="demo-notice" style="margin-bottom:1rem">
        Documents are generated using your browser's Print function. Click "Print / PDF" on any document, then choose "Save as PDF" in the print dialog.
        These documents are for demonstration only and are <strong>not LHDN-validated e-Invoices</strong>.
      </div>
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr>
            <th>Service Ref</th><th>Customer</th><th>Vehicle</th><th>Status</th>
            <th>Documents</th>
          </tr></thead>
          <tbody>
            ${services.length === 0 ? `<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--color-text-muted)">No service records.</td></tr>` :
              [...services].sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt)).map(s => {
                const cust = customers.find(c => c.customerId === s.customerId);
                const veh  = s.vehicleSnapshot?.brand ? `${s.vehicleSnapshot.brand} ${s.vehicleSnapshot.model}` : '—';
                const quos  = getAll('quotations').filter(q => q.serviceId === s.serviceId && q.status !== 'SUPERSEDED');
                const activeQuo = quos[0];
                const payment = s.activePaymentId ? getById('payments', s.activePaymentId, 'paymentId') : null;

                return `<tr>
                  <td class="text-mono text-xs">${escHtml(s.serviceId)}</td>
                  <td>${escHtml(cust?.fullName || '—')}</td>
                  <td>${escHtml(veh)}</td>
                  <td>${statusBadge(s.status)}</td>
                  <td>
                    <div style="display:flex;gap:0.25rem;flex-wrap:wrap">
                      ${activeQuo ? `<button class="btn btn-outline btn-sm" onclick="window.KCReports.generateQuotationPdf('${escHtml(activeQuo.quotationId)}')">📄 Quotation</button>` : ''}
                      <button class="btn btn-outline btn-sm" onclick="window.KCReports.generateServiceReportPdf('${escHtml(s.serviceId)}')">📋 Service Report</button>
                      <button class="btn btn-outline btn-sm" onclick="window.KCReports.generateServiceHistoryPdf('${escHtml(s.customerId)}')">📅 History</button>
                      ${payment?.status === 'VERIFIED' ? `
                        <button class="btn btn-outline btn-sm" onclick="window.KCReports.generateInvoicePdf('${escHtml(s.serviceId)}')">🧾 Invoice</button>
                        <button class="btn btn-outline btn-sm" onclick="window.KCReports.generateReceiptPdf('${escHtml(payment.paymentId)}')">✅ Receipt</button>
                      ` : ''}
                    </div>
                  </td>
                </tr>`;
              }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

// ── WhatsApp View ──────────────────────────────────────────
function renderWhatsApp() {
  const content  = document.getElementById('pageContent');
  const services = getAll('serviceRequests').filter(s => !['VEHICLE_DELIVERED','CANCELLED'].includes(s.status));
  const customers = getAll('customers');

  content.innerHTML = `
    <div class="page-section">
      <div class="section-header">
        <h2 class="section-title">WhatsApp Communication</h2>
      </div>
      <div class="demo-notice" style="margin-bottom:1rem">
        <strong>Manual Send Only:</strong> Click a button to open a pre-filled WhatsApp message in a new tab. You must have WhatsApp installed. Messages are user-initiated — nothing is sent automatically.
        A valid customer phone number is required. Templates can be edited in Settings → WhatsApp Templates.
      </div>
      ${services.length === 0 ? renderEmpty('No active service requests', 'WhatsApp messages can be sent for active services.') : `
      <div style="display:flex;flex-direction:column;gap:0.75rem">
        ${services.map(s => {
          const cust = customers.find(c => c.customerId === s.customerId);
          const veh  = s.vehicleSnapshot?.brand ? `${s.vehicleSnapshot.brand} ${s.vehicleSnapshot.model}` : '';
          const phone = cust?.phone || '';
          const hasPhone = !!phone;
          return `<div class="card">
            <div class="card-body">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.75rem;flex-wrap:wrap;gap:0.5rem">
                <div>
                  <span class="text-mono text-xs text-muted">${escHtml(s.serviceId)}</span>
                  <div class="font-semibold">${escHtml(cust?.fullName || '—')} ${veh ? '— ' + veh : ''}</div>
                  <div class="text-sm text-muted">${escHtml(s.complaintDescription)}</div>
                </div>
                ${statusBadge(s.status)}
              </div>
              ${!hasPhone ? `<div class="demo-notice" style="margin-bottom:0.5rem">No phone number for this customer. Add a phone number to enable WhatsApp links.</div>` : ''}
              <div style="display:flex;gap:0.4rem;flex-wrap:wrap">
                ${waButton('New Request', s, cust, 'newRequest', !hasPhone)}
                ${waButton('Inspection Update', s, cust, 'inspectionUpdate', !hasPhone)}
                ${waButton('Quotation Ready', s, cust, 'quotationReady', !hasPhone)}
                ${waButton('Approval Reminder', s, cust, 'approvalReminder', !hasPhone)}
                ${waButton('Repair Progress', s, cust, 'repairProgress', !hasPhone)}
                ${waButton('Payment Reminder', s, cust, 'paymentReminder', !hasPhone)}
                ${waButton('Vehicle Ready', s, cust, 'vehicleReady', !hasPhone)}
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>`}
    </div>`;
}

function waButton(label, s, cust, templateKey, disabled) {
  return `<button class="btn btn-ghost btn-sm" style="border:1px solid var(--color-border)" ${disabled ? 'disabled' : `onclick="window.KCReports.sendWhatsApp('${escHtml(s.serviceId)}','${templateKey}')"`}>
    💬 ${escHtml(label)}
  </button>`;
}

function sendWhatsApp(serviceId, templateKey) {
  const s    = getById('serviceRequests', serviceId, 'serviceId');
  const cust = s ? getById('customers', s.customerId, 'customerId') : null;
  if (!cust?.phone) return showToast('No phone number for this customer.', 'warning');

  const qRef = s.activeQuotationId ? getById('quotations', s.activeQuotationId, 'quotationId') : null;
  const totalMYR = qRef ? formatMYR(qRef.totalAmount) : '—';

  const templates = {
    newRequest:      `Assalamualaikum {customerName}, terima kasih kerana menggunakan perkhidmatan kami. Permintaan servis anda telah kami terima dengan Ref: {serviceRef}. Aduan: {complaint}.`,
    inspectionUpdate:`Assalamualaikum {customerName}, kenderaan anda (Ref: {serviceRef}) sedang dalam pemeriksaan oleh bengkel. Kami akan maklumkan keputusan dalam masa terdekat.`,
    quotationReady:  `Assalamualaikum {customerName}, sebutan harga untuk servis {serviceRef} telah disediakan. Jumlah anggaran: {totalMYR}. Sila semak dan berikan kelulusan anda.`,
    approvalReminder:`Assalamualaikum {customerName}, peringatan: sebutan harga untuk servis {serviceRef} masih menunggu kelulusan anda. Sila semak dalam masa terdekat.`,
    repairProgress:  `Assalamualaikum {customerName}, kami ingin memaklumkan bahawa kerja-kerja pembaikan untuk kenderaan anda (Ref: {serviceRef}) sedang dalam proses.`,
    paymentReminder: `Assalamualaikum {customerName}, kenderaan anda (Ref: {serviceRef}) telah siap dibaiki. Jumlah bayaran: {totalMYR}. Sila buat pembayaran untuk mengambil kenderaan.`,
    vehicleReady:    `Assalamualaikum {customerName}, kenderaan anda telah siap dan boleh diambil. Ref: {serviceRef}. Hubungi kami untuk mengesahkan masa pengambilan.`
  };

  // Allow template override from settings
  const db = window.KCHECK.getDB();
  const customTemplate = db.appSettings?.whatsappTemplates?.[templateKey];
  let msg = (customTemplate || templates[templateKey] || '').trim();

  msg = msg.replace(/{customerName}/g,  cust.fullName || '')
           .replace(/{serviceRef}/g,    s.serviceId)
           .replace(/{complaint}/g,     s.complaintDescription)
           .replace(/{totalMYR}/g,      totalMYR)
           .replace(/{vehicleModel}/g,  s.vehicleSnapshot?.model || '')
           .replace(/{portalLink}/g,    window.location.origin + '/portal.html');

  const phone = cust.phone.replace(/[^0-9]/g, '');
  const url   = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
  showToast('WhatsApp opened in new tab. Review and send manually.', 'info');
}

// ── PDF Document Generation (Print Window) ─────────────────

function getDocHeader(biz) {
  return `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #c0392b">
      <div>
        <div style="font-size:20px;font-weight:700;letter-spacing:2px">KCHECK SERVICE TRACKER</div>
        <div style="font-size:12px;color:#444">${escHtml(biz.businessName || 'COT Automotive, PSMZA')}</div>
        <div style="font-size:11px;color:#666">${escHtml(biz.businessAddress || '')}</div>
        ${biz.businessPhone ? `<div style="font-size:11px;color:#666">Tel: ${escHtml(biz.businessPhone)}</div>` : ''}
      </div>
      <div style="text-align:right;font-size:11px;color:#666">
        <div style="font-size:13px;font-weight:600;color:#c0392b">COT Automotive, PSMZA</div>
        <div>Workshop: Alif Workshop</div>
      </div>
    </div>`;
}

function printDoc(title, bodyHtml) {
  const biz    = window.KCHECK.getDB().appSettings || {};
  const header = getDocHeader(biz);
  const footer = biz.invoiceFooter ? `<div style="margin-top:24px;padding-top:12px;border-top:1px solid #ddd;font-size:10px;color:#888">${escHtml(biz.invoiceFooter)}</div>` : '';

  const doc = window.open('', '_blank');
  doc.document.write(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8"><title>${escHtml(title)}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12pt; color: #1a1a1a; margin: 0; padding: 20mm; max-width: 210mm; box-sizing: border-box; }
      table { width: 100%; border-collapse: collapse; margin: 12px 0; }
      th { background: #f3f4f6; padding: 8px; text-align: left; font-size: 10pt; border-bottom: 1px solid #ddd; }
      td { padding: 7px 8px; border-bottom: 1px solid #eee; font-size: 11pt; }
      .total-row { font-weight: bold; font-size: 12pt; border-top: 2px solid #333; }
      .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 9pt; }
      @media print { button { display: none; } }
      .print-btn { background:#c0392b;color:#fff;border:none;padding:8px 20px;border-radius:6px;font-size:12pt;cursor:pointer;margin-bottom:16px }
    </style>
  </head><body>
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
    ${header}
    ${bodyHtml}
    ${footer}
    <div style="margin-top:16px;font-size:9pt;color:#aaa;text-align:center">Generated by KCHECK Service Tracker — Stage 1 Demonstration · ${new Date().toLocaleDateString('en-MY')}</div>
  </body></html>`);
  doc.document.close();
}

function generateQuotationPdf(quotationId) {
  const q    = getById('quotations', quotationId, 'quotationId');
  if (!q) return showToast('Quotation not found', 'error');
  const svc  = getById('serviceRequests', q.serviceId, 'serviceId');
  const cust = svc ? getById('customers', svc.customerId, 'customerId') : null;

  const body = `
    <div style="margin-bottom:16px">
      <table style="width:auto;margin:0">
        <tr><td style="font-weight:700;font-size:16pt;padding:0;border:none" colspan="2">REPAIR QUOTATION</td></tr>
        <tr><td style="color:#666;border:none">Quotation Ref:</td><td style="font-family:monospace;border:none">${escHtml(q.quotationId)}</td></tr>
        <tr><td style="color:#666;border:none">Version:</td><td style="border:none">v${q.version}</td></tr>
        <tr><td style="color:#666;border:none">Date:</td><td style="border:none">${formatDate(q.createdAt)}</td></tr>
        <tr><td style="color:#666;border:none">Service Ref:</td><td style="font-family:monospace;border:none">${escHtml(q.serviceId)}</td></tr>
        <tr><td style="color:#666;border:none">Customer:</td><td style="border:none">${escHtml(cust?.fullName || '—')}</td></tr>
        <tr><td style="color:#666;border:none">Vehicle:</td><td style="border:none">${escHtml(svc?.vehicleSnapshot?.brand || '')} ${escHtml(svc?.vehicleSnapshot?.model || '')}</td></tr>
        <tr><td style="color:#666;border:none">Status:</td><td style="border:none">${escHtml(window.KCHECK.STATUS_LABELS[q.status] || q.status)}</td></tr>
      </table>
    </div>
    <h3 style="margin-bottom:8px">Itemised Parts &amp; Services</h3>
    <table>
      <thead><tr><th>Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price (MYR)</th><th style="text-align:right">Subtotal (MYR)</th></tr></thead>
      <tbody>
        ${q.lineItems.map(i => `<tr>
          <td>${escHtml(i.description || '—')}</td>
          <td style="text-align:center">${i.quantity}</td>
          <td style="text-align:right">${(+i.unitPrice).toFixed(2)}</td>
          <td style="text-align:right">${(i.quantity * i.unitPrice).toFixed(2)}</td>
        </tr>`).join('')}
        <tr><td colspan="3" style="text-align:right;font-weight:600">Labour</td><td style="text-align:right">${(+q.labourCharges).toFixed(2)}</td></tr>
        <tr><td colspan="3" style="text-align:right;font-weight:600">${escHtml(q.additionalChargesLabel || 'Additional')}</td><td style="text-align:right">${(+q.additionalCharges).toFixed(2)}</td></tr>
        <tr class="total-row"><td colspan="3" style="text-align:right">TOTAL (MYR)</td><td style="text-align:right">${(+q.totalAmount).toFixed(2)}</td></tr>
      </tbody>
    </table>
    ${q.workshopRecommendation ? `<p><strong>Workshop Recommendation:</strong> ${escHtml(q.workshopRecommendation)}</p>` : ''}
    ${q.coordinatorRemarks ? `<p><strong>Coordinator Remarks:</strong> ${escHtml(q.coordinatorRemarks)}</p>` : ''}
    <p style="margin-top:16px;font-size:10pt;color:#666">This quotation is an estimate only. Final charges may vary upon completion.</p>`;

  printDoc(`Quotation ${q.quotationId}`, body);
}

function generateServiceReportPdf(serviceId) {
  const s    = getById('serviceRequests', serviceId, 'serviceId');
  if (!s) return showToast('Service not found', 'error');
  const cust = getById('customers', s.customerId, 'customerId');

  const body = `
    <table style="width:auto;margin:0 0 16px 0">
      <tr><td style="font-weight:700;font-size:16pt;padding:0;border:none" colspan="2">SERVICE REPORT</td></tr>
      <tr><td style="color:#666;border:none">Service Ref:</td><td style="font-family:monospace;border:none">${escHtml(s.serviceId)}</td></tr>
      <tr><td style="color:#666;border:none">Date:</td><td style="border:none">${formatDate(s.createdAt)}</td></tr>
      <tr><td style="color:#666;border:none">Customer:</td><td style="border:none">${escHtml(cust?.fullName || '—')}</td></tr>
      <tr><td style="color:#666;border:none">Vehicle:</td><td style="border:none">${escHtml(s.vehicleSnapshot?.brand || '')} ${escHtml(s.vehicleSnapshot?.model || '')} ${escHtml(s.vehicleSnapshot?.plate || '')}</td></tr>
      <tr><td style="color:#666;border:none">Status:</td><td style="border:none">${escHtml(window.KCHECK.STATUS_LABELS[s.status] || s.status)}</td></tr>
    </table>
    <p><strong>Service Complaint:</strong><br>${escHtml(s.complaintDescription)}</p>
    <p><strong>Inspection Findings:</strong><br>${escHtml(s.inspectionFindings || 'Pending inspection')}</p>
    <p><strong>Workshop Recommendation:</strong><br>${escHtml(s.workshopRecommendation || 'Not yet provided')}</p>
    <p><strong>Coordinator Remarks:</strong><br>${escHtml(s.coordinatorRemarks || '—')}</p>
    ${s.progressNotes?.length ? `<h3>Progress Notes</h3><ul>${s.progressNotes.map(n => `<li>${formatDateTime(n.enteredAt)}: ${escHtml(n.note)}</li>`).join('')}</ul>` : ''}`;

  printDoc(`Service Report ${s.serviceId}`, body);
}

function generateInvoicePdf(serviceId) {
  const s    = getById('serviceRequests', serviceId, 'serviceId');
  if (!s) return showToast('Service not found', 'error');
  const cust = getById('customers', s.customerId, 'customerId');
  const quos = getAll('quotations').filter(q => q.serviceId === serviceId && q.status === 'APPROVED');
  const q    = quos[0];
  const pay  = s.activePaymentId ? getById('payments', s.activePaymentId, 'paymentId') : null;

  if (!pay || pay.status !== 'VERIFIED') return showToast('Invoice only available after payment is verified.', 'warning');

  const body = `
    <div style="margin-bottom:16px">
      <p style="color:#c0392b;font-style:italic;font-size:10pt">This is an internal service invoice. This is NOT an LHDN-validated e-Invoice.</p>
      <table style="width:auto;margin:8px 0 0 0">
        <tr><td style="font-weight:700;font-size:16pt;padding:0;border:none" colspan="2">SERVICE INVOICE</td></tr>
        <tr><td style="color:#666;border:none">Service Ref:</td><td style="font-family:monospace;border:none">${escHtml(s.serviceId)}</td></tr>
        <tr><td style="color:#666;border:none">Invoice Date:</td><td style="border:none">${formatDate(pay.verifiedAt)}</td></tr>
        <tr><td style="color:#666;border:none">Customer:</td><td style="border:none">${escHtml(cust?.fullName || '—')}</td></tr>
        <tr><td style="color:#666;border:none">Vehicle:</td><td style="border:none">${escHtml(s.vehicleSnapshot?.brand || '')} ${escHtml(s.vehicleSnapshot?.model || '')}</td></tr>
        <tr><td style="color:#666;border:none">Payment Verified:</td><td style="border:none">${formatDateTime(pay.verifiedAt)} · ${escHtml(pay.verifiedBy)}</td></tr>
      </table>
    </div>
    ${q ? `<table>
      <thead><tr><th>Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Subtotal</th></tr></thead>
      <tbody>
        ${q.lineItems.map(i => `<tr><td>${escHtml(i.description)}</td><td style="text-align:center">${i.quantity}</td><td style="text-align:right">${(+i.unitPrice).toFixed(2)}</td><td style="text-align:right">${(i.quantity * i.unitPrice).toFixed(2)}</td></tr>`).join('')}
        <tr><td colspan="3" style="text-align:right;font-weight:600">Labour</td><td style="text-align:right">${(+q.labourCharges).toFixed(2)}</td></tr>
        <tr><td colspan="3" style="text-align:right;font-weight:600">Additional</td><td style="text-align:right">${(+q.additionalCharges).toFixed(2)}</td></tr>
        <tr class="total-row"><td colspan="3" style="text-align:right">TOTAL PAID (MYR)</td><td style="text-align:right">${(+q.totalAmount).toFixed(2)}</td></tr>
      </tbody>
    </table>` : `<p>Invoiced Amount: ${formatMYR(pay.expectedAmount)}</p>`}`;

  printDoc(`Invoice — ${s.serviceId}`, body);
}

function generateReceiptPdf(paymentId) {
  const p    = getById('payments', paymentId, 'paymentId');
  if (!p || p.status !== 'VERIFIED') return showToast('Receipt only available for verified payments.', 'warning');
  const svc  = getById('serviceRequests', p.serviceId, 'serviceId');
  const cust = svc ? getById('customers', svc.customerId, 'customerId') : null;

  const body = `
    <table style="width:auto;margin:0 0 16px 0">
      <tr><td style="font-weight:700;font-size:16pt;padding:0;border:none" colspan="2">PAYMENT RECEIPT</td></tr>
      <tr><td style="color:#666;border:none">Receipt Ref:</td><td style="font-family:monospace;border:none">${escHtml(p.paymentId)}</td></tr>
      <tr><td style="color:#666;border:none">Service Ref:</td><td style="font-family:monospace;border:none">${escHtml(p.serviceId)}</td></tr>
      <tr><td style="color:#666;border:none">Customer:</td><td style="border:none">${escHtml(cust?.fullName || '—')}</td></tr>
      <tr><td style="color:#666;border:none">Amount Paid:</td><td style="font-weight:700;font-size:14pt;color:#16a34a;border:none">MYR ${(+p.expectedAmount).toFixed(2)}</td></tr>
      <tr><td style="color:#666;border:none">Verified By:</td><td style="border:none">${escHtml(p.verifiedBy)}</td></tr>
      <tr><td style="color:#666;border:none">Verified At:</td><td style="border:none">${formatDateTime(p.verifiedAt)}</td></tr>
    </table>
    <p style="color:green;font-weight:600">✅ Payment Confirmed</p>`;

  printDoc(`Receipt — ${p.paymentId}`, body);
}

function generateServiceHistoryPdf(customerId) {
  const cust     = getById('customers', customerId, 'customerId');
  if (!cust) return showToast('Customer not found', 'error');
  const services = getAll('serviceRequests').filter(s => s.customerId === customerId);
  const vehicles = getAll('vehicles').filter(v => v.customerId === customerId);

  const body = `
    <table style="width:auto;margin:0 0 8px 0">
      <tr><td style="font-weight:700;font-size:16pt;padding:0;border:none" colspan="2">VEHICLE SERVICE HISTORY</td></tr>
      <tr><td style="color:#666;border:none">Customer:</td><td style="border:none">${escHtml(cust.fullName)}</td></tr>
      <tr><td style="color:#666;border:none">Generated:</td><td style="border:none">${formatDate(new Date().toISOString())}</td></tr>
    </table>
    ${vehicles.length ? `<p><strong>Registered Vehicles:</strong> ${vehicles.map(v => `${escHtml(v.brandName || v.customBrand || '')} ${escHtml(v.modelName || v.customModel || '')} ${v.registrationPlate ? '('+v.registrationPlate+')' : ''}`).join(', ')}</p>` : ''}
    <table>
      <thead><tr><th>Service Ref</th><th>Date</th><th>Complaint</th><th>Status</th></tr></thead>
      <tbody>
        ${services.length === 0 ? `<tr><td colspan="4" style="text-align:center;color:#888">No service records.</td></tr>` :
          services.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).map(s => `<tr>
            <td style="font-family:monospace;font-size:10pt">${escHtml(s.serviceId)}</td>
            <td>${formatDate(s.createdAt)}</td>
            <td>${escHtml(s.complaintDescription)}</td>
            <td>${escHtml(window.KCHECK.STATUS_LABELS[s.status] || s.status)}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;

  printDoc(`Service History — ${cust.fullName}`, body);
}

window.KCReports = {
  render: renderReports,
  renderWhatsApp, sendWhatsApp,
  generateQuotationPdf, generateServiceReportPdf,
  generateInvoicePdf, generateReceiptPdf, generateServiceHistoryPdf
};
