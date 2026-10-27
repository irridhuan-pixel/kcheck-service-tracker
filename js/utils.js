/* ============================================================
   KCHECK Service Tracker — Utility Functions
   ============================================================ */

'use strict';

// ── ID Generation ──────────────────────────────────────────
function generateId(prefix) {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${ts}${rnd}`;
}

// ── Date Formatting ────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return '—'; }
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' }) +
           ' ' + d.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  try {
    const d   = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60)     return 'just now';
    if (diff < 3600)   return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400)  return Math.floor(diff / 3600) + 'h ago';
    if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
    return formatDate(dateStr);
  } catch { return ''; }
}

function nowISO() { return new Date().toISOString(); }

// ── Currency ───────────────────────────────────────────────
function formatMYR(value) {
  const n = parseFloat(value);
  if (isNaN(n)) return 'MYR 0.00';
  return 'MYR ' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ── Display Helpers ────────────────────────────────────────
function displayOrBlank(value, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

// Safe HTML escape (prevents XSS from user-entered data)
function escHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ── Toast Notifications ────────────────────────────────────
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
    <span class="toast-msg">${escHtml(message)}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(24px)';
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    setTimeout(() => toast.remove(), 350);
  }, duration);
}

// ── Modal ──────────────────────────────────────────────────
function showModal(title, bodyHtml, footerHtml = '', options = {}) {
  const backdrop = document.getElementById('modalBackdrop');
  const box      = document.getElementById('modalBox');
  const titleEl  = document.getElementById('modalTitle');
  const bodyEl   = document.getElementById('modalBody');
  const footerEl = document.getElementById('modalFooter');
  const closeBtn = document.getElementById('modalClose');

  titleEl.textContent = title;
  bodyEl.innerHTML    = bodyHtml;
  footerEl.innerHTML  = footerHtml;

  box.className = 'modal' + (options.large ? ' modal-lg' : '');
  backdrop.style.display = 'flex';

  const close = () => { backdrop.style.display = 'none'; };
  closeBtn.onclick = close;
  backdrop.onclick = (e) => { if (e.target === backdrop) close(); };
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
  });
  return close;
}

function closeModal() {
  const backdrop = document.getElementById('modalBackdrop');
  if (backdrop) backdrop.style.display = 'none';
}

// ── Confirm Dialog ─────────────────────────────────────────
function showConfirm(message, onConfirm, options = {}) {
  const warning = options.warning ? `<p class="confirm-warning">⚠️ ${escHtml(options.warning)}</p>` : '';
  const html = `<p class="confirm-message">${escHtml(message)}</p>${warning}`;
  const footer = `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn ${options.danger ? 'btn-danger' : 'btn-primary'}" id="confirmOkBtn">
      ${escHtml(options.confirmLabel || 'Confirm')}
    </button>
  `;
  showModal(options.title || 'Confirm', html, footer);
  document.getElementById('confirmOkBtn').onclick = () => { closeModal(); onConfirm(); };
}

// ── DOM Helpers ────────────────────────────────────────────
function el(id)   { return document.getElementById(id); }
function qs(sel)  { return document.querySelector(sel); }
function qsa(sel) { return Array.from(document.querySelectorAll(sel)); }

function setHtml(id, html) {
  const e = document.getElementById(id);
  if (e) e.innerHTML = html;
}

function renderEmpty(message, subtext = '', actionHtml = '') {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">📭</div>
      <h3>${escHtml(message)}</h3>
      <p>${escHtml(subtext)}</p>
      ${actionHtml}
    </div>`;
}

function renderLoading() {
  return `<div class="loading-state"><div class="spinner"></div><p>Loading…</p></div>`;
}

// ── Status helpers ─────────────────────────────────────────
const STATUS_LABELS = {
  NEW_REQUEST:               'New Request',
  UNDER_INSPECTION:          'Under Inspection',
  QUOTATION_PREPARATION:     'Quotation Preparation',
  AWAITING_CUSTOMER_APPROVAL:'Awaiting Approval',
  QUOTATION_APPROVED:        'Quotation Approved',
  REPAIR_IN_PROGRESS:        'Repair in Progress',
  REPAIR_COMPLETED:          'Repair Completed',
  READY_FOR_COLLECTION:      'Ready for Collection',
  VEHICLE_DELIVERED:         'Vehicle Delivered',
  QUOTATION_REJECTED:        'Quotation Rejected',
  REVISION_REQUESTED:        'Revision Requested',
  CANCELLED:                 'Cancelled',
  // Quotation statuses
  DRAFT:                     'Draft',
  AWAITING_APPROVAL:         'Awaiting Approval',
  APPROVED:                  'Approved',
  REJECTED:                  'Rejected',
  SUPERSEDED:                'Superseded',
  // Payment statuses
  UNPAID:                    'Unpaid',
  RECEIPT_SUBMITTED:         'Receipt Submitted',
  UNDER_REVIEW:              'Under Review',
  VERIFIED:                  'Verified',
  PAYMENT_REJECTED:          'Payment Rejected'
};

const STATUS_BADGE_CLASS = {
  NEW_REQUEST:               'badge-blue',
  UNDER_INSPECTION:          'badge-blue',
  QUOTATION_PREPARATION:     'badge-amber',
  AWAITING_CUSTOMER_APPROVAL:'badge-amber',
  QUOTATION_APPROVED:        'badge-green',
  REPAIR_IN_PROGRESS:        'badge-blue',
  REPAIR_COMPLETED:          'badge-green',
  READY_FOR_COLLECTION:      'badge-green',
  VEHICLE_DELIVERED:         'badge-grey',
  QUOTATION_REJECTED:        'badge-red',
  REVISION_REQUESTED:        'badge-amber',
  CANCELLED:                 'badge-red',
  DRAFT:                     'badge-grey',
  AWAITING_APPROVAL:         'badge-amber',
  APPROVED:                  'badge-green',
  REJECTED:                  'badge-red',
  SUPERSEDED:                'badge-grey',
  UNPAID:                    'badge-amber',
  RECEIPT_SUBMITTED:         'badge-blue',
  UNDER_REVIEW:              'badge-blue',
  VERIFIED:                  'badge-green',
  PAYMENT_REJECTED:          'badge-red'
};

function statusBadge(status) {
  const label = STATUS_LABELS[status] || status;
  const cls   = STATUS_BADGE_CLASS[status] || 'badge-grey';
  return `<span class="badge ${cls}">${escHtml(label)}</span>`;
}

// Allowed status transitions (service requests)
const STATUS_TRANSITIONS = {
  NEW_REQUEST:               ['UNDER_INSPECTION', 'CANCELLED'],
  UNDER_INSPECTION:          ['QUOTATION_PREPARATION', 'CANCELLED'],
  QUOTATION_PREPARATION:     ['AWAITING_CUSTOMER_APPROVAL'],
  AWAITING_CUSTOMER_APPROVAL:['QUOTATION_APPROVED', 'QUOTATION_REJECTED', 'REVISION_REQUESTED'],
  QUOTATION_APPROVED:        ['REPAIR_IN_PROGRESS'],
  REPAIR_IN_PROGRESS:        ['REPAIR_COMPLETED'],
  REPAIR_COMPLETED:          ['READY_FOR_COLLECTION'],
  READY_FOR_COLLECTION:      ['VEHICLE_DELIVERED'],
  QUOTATION_REJECTED:        ['QUOTATION_PREPARATION', 'CANCELLED'],
  REVISION_REQUESTED:        ['QUOTATION_PREPARATION'],
  VEHICLE_DELIVERED:         [],
  CANCELLED:                 []
};

// Who performs each transition
const STATUS_ACTOR = {
  NEW_REQUEST:               'admin',
  UNDER_INSPECTION:          'admin',
  QUOTATION_PREPARATION:     'admin',
  AWAITING_CUSTOMER_APPROVAL:'customer',
  QUOTATION_APPROVED:        'customer',
  REPAIR_IN_PROGRESS:        'admin',
  REPAIR_COMPLETED:          'admin',
  READY_FOR_COLLECTION:      'admin',
  VEHICLE_DELIVERED:         'admin',
  QUOTATION_REJECTED:        'customer',
  REVISION_REQUESTED:        'customer',
  CANCELLED:                 'admin'
};

// ── Form validation ────────────────────────────────────────
function validateForm(formEl) {
  let valid = true;
  formEl.querySelectorAll('[data-required]').forEach(input => {
    const errEl = formEl.querySelector(`[data-error="${input.name || input.id}"]`);
    if (!input.value.trim()) {
      valid = false;
      input.classList.add('is-invalid');
      if (errEl) { errEl.textContent = 'This field is required.'; errEl.classList.add('visible'); }
    } else {
      input.classList.remove('is-invalid');
      if (errEl) errEl.classList.remove('visible');
    }
  });
  return valid;
}

function clearFormErrors(formEl) {
  formEl.querySelectorAll('.is-invalid').forEach(e => e.classList.remove('is-invalid'));
  formEl.querySelectorAll('.form-error').forEach(e => e.classList.remove('visible'));
}

// ── LocalStorage helpers ───────────────────────────────────
const LS_KEY = 'kcheck_v1';

function lsGet() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function lsSave(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); return true; }
  catch (e) { console.error('localStorage write failed', e); return false; }
}

// Expose globally for all modules
window.KCHECK = window.KCHECK || {};
Object.assign(window.KCHECK, {
  generateId, formatDate, formatDateTime, formatRelativeTime, nowISO,
  formatMYR, displayOrBlank, escHtml,
  showToast, showModal, closeModal, showConfirm,
  el, qs, qsa, setHtml, renderEmpty, renderLoading,
  STATUS_LABELS, STATUS_BADGE_CLASS, STATUS_TRANSITIONS, STATUS_ACTOR,
  statusBadge, validateForm, clearFormErrors, lsGet, lsSave
});
