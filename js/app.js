/* ============================================================
   KCHECK — App Router & Global Init
   ============================================================ */

'use strict';

const { el, qs, qsa, showToast, escHtml, getSetting } = window.KCHECK;

// ── View Registry ──────────────────────────────────────────
const VIEWS = {
  dashboard:  () => window.KCDashboard.render(),
  services:   () => window.KCServices.render(),
  customers:  () => window.KCCustomers.render(),
  vehicles:   () => window.KCVehicles.render(),
  quotations: () => window.KCQuotations.render(),
  repairs:    () => window.KCServices.renderRepairs(),
  payments:   () => window.KCPayments.render(),
  reports:    () => window.KCReports.render(),
  whatsapp:   () => window.KCReports.renderWhatsApp(),
  settings:   () => window.KCSettings.render()
};

const VIEW_TITLES = {
  dashboard:  'Dashboard',
  services:   'Service Requests',
  customers:  'Customers',
  vehicles:   'Vehicles',
  quotations: 'Quotations',
  repairs:    'Repair Tracking',
  payments:   'Payments',
  reports:    'Reports & Invoices',
  whatsapp:   'WhatsApp Communication',
  settings:   'Settings'
};

// ── Router ─────────────────────────────────────────────────
let currentView = '';

function navigate(viewName) {
  if (!VIEWS[viewName]) return;
  currentView = viewName;

  // Update active nav
  qsa('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewName);
  });

  // Update page title
  const titleEl = el('topbarTitle');
  if (titleEl) titleEl.textContent = VIEW_TITLES[viewName] || viewName;

  // Render view
  const content = el('pageContent');
  if (content) content.innerHTML = '';
  try {
    VIEWS[viewName]();
  } catch (err) {
    console.error('View render error:', viewName, err);
    if (content) content.innerHTML = `
      <div class="empty-state" style="color:var(--color-red)">
        <div class="empty-state-icon">⚠️</div>
        <h3>View Error</h3>
        <p>Could not render the ${escHtml(viewName)} view. Check console for details.</p>
      </div>`;
  }

  // Close mobile sidebar
  closeSidebar();
}

window.navigate = navigate;

// ── Sidebar Toggle ─────────────────────────────────────────
function openSidebar() {
  el('sidebar').classList.add('open');
  el('sidebarOverlay').classList.add('visible');
}
function closeSidebar() {
  el('sidebar').classList.remove('open');
  el('sidebarOverlay').classList.remove('visible');
}

// ── Logo Loading ───────────────────────────────────────────
function applyBranding() {
  const logoPath = getSetting('logoPath') || 'assets/logos/carecheck.png';
  const logoEls  = document.querySelectorAll('#sidebarLogo, .portal-logo');
  logoEls.forEach(img => {
    if (img) {
      img.src = logoPath;
      img.onerror = function() { this.style.display = 'none'; };
    }
  });
  const appName = getSetting('appDisplayName');
  if (appName) {
    document.title = appName + ' — Admin';
  }
}

// ── Bootstrap ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Wire navigation clicks
  qsa('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(item.dataset.view);
    });
  });

  // Sidebar toggle
  const toggleBtn = el('sidebarToggle');
  const overlay   = el('sidebarOverlay');
  if (toggleBtn) toggleBtn.addEventListener('click', openSidebar);
  if (overlay)   overlay.addEventListener('click', closeSidebar);

  // Apply branding
  applyBranding();

  // Default view
  navigate('dashboard');

  // Remove initial loader
  const loader = el('initialLoader');
  if (loader) loader.remove();

  showToast('KCHECK Service Tracker loaded — Stage 1 Demo Mode', 'info', 3000);
});
