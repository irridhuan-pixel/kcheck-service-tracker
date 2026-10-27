/* ============================================================
   KCHECK — App Router & Global Init
   ============================================================ */

'use strict';

// Read helpers lazily from window.KCHECK (populated after data.js loads)
function kc() { return window.KCHECK; }

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
  kc().qsa('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewName);
  });

  // Update page title
  const titleEl = kc().el('topbarTitle');
  if (titleEl) titleEl.textContent = VIEW_TITLES[viewName] || viewName;

  // Render view
  const content = kc().el('pageContent');
  if (content) content.innerHTML = '';
  try {
    VIEWS[viewName]();
  } catch (err) {
    console.error('View render error:', viewName, err);
    if (content) content.innerHTML = `
      <div class="empty-state" style="color:var(--color-red)">
        <div class="empty-state-icon">⚠️</div>
        <h3>View Error</h3>
        <p>Could not render the ${kc().escHtml(viewName)} view. Check console for details.</p>
      </div>`;
  }

  // Close mobile sidebar
  closeSidebar();
}

window.navigate = navigate;

// ── Sidebar Toggle ─────────────────────────────────────────
function openSidebar() {
  kc().el('sidebar').classList.add('open');
  kc().el('sidebarOverlay').classList.add('visible');
}
function closeSidebar() {
  kc().el('sidebar').classList.remove('open');
  kc().el('sidebarOverlay').classList.remove('visible');
}

// ── Logo Loading ───────────────────────────────────────────
function applyBranding() {
  const logoPath = kc().getSetting('logoPath') || 'assets/logos/carecheck.png';
  const logoEls  = document.querySelectorAll('#sidebarLogo, .portal-logo');
  logoEls.forEach(img => {
    if (img) {
      img.src = logoPath;
      img.onerror = function() { this.style.display = 'none'; };
    }
  });
  const appName = kc().getSetting('appDisplayName');
  if (appName) {
    document.title = appName + ' — Admin';
  }
}

// ── Bootstrap ──────────────────────────────────────────────
function removeLoader() {
  // The loader may already be gone if navigate() cleared pageContent.innerHTML
  const loader = document.getElementById('initialLoader');
  if (loader) loader.remove();
}

function showInitError(msg) {
  removeLoader();
  const content = document.getElementById('pageContent');
  if (content) {
    content.innerHTML = `
      <div style="padding:2rem;text-align:center;color:#c0392b">
        <div style="font-size:2rem;margin-bottom:0.5rem">⚠️</div>
        <h2 style="margin-bottom:0.5rem">Initialisation Error</h2>
        <p style="color:#555;max-width:480px;margin:0 auto 1rem">${msg}</p>
        <p style="color:#888;font-size:0.85rem">Open the browser console (F12) for full details.</p>
        <button onclick="location.reload()" style="margin-top:1rem;padding:0.5rem 1.2rem;background:#c0392b;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.9rem">Reload</button>
      </div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    // Verify KCHECK module loaded correctly
    if (!window.KCHECK || typeof window.KCHECK.getAll !== 'function') {
      throw new Error('KCHECK data module failed to load. Ensure the app is served via HTTP (not file://).');
    }

    // Wire navigation clicks
    kc().qsa('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        navigate(item.dataset.view);
      });
    });

    // Sidebar toggle
    const toggleBtn = kc().el('sidebarToggle');
    const overlay   = kc().el('sidebarOverlay');
    if (toggleBtn) toggleBtn.addEventListener('click', openSidebar);
    if (overlay)   overlay.addEventListener('click', closeSidebar);

    // Apply branding
    applyBranding();

    // Default view — this clears pageContent which removes the loader
    navigate('dashboard');

    // Belt-and-braces: remove loader if somehow still present
    removeLoader();

    kc().showToast('KCHECK Service Tracker loaded — Stage 1 Demo Mode', 'info', 3000);

  } catch (err) {
    console.error('KCHECK init error:', err);
    showInitError(err.message || 'Unexpected error during application startup.');
  }
});

// Fallback: if DOMContentLoaded never fires (e.g. script load failure),
// show a readable error after 6 seconds instead of endless spinner.
setTimeout(() => {
  const loader = document.getElementById('initialLoader');
  if (loader && loader.isConnected) {
    showInitError(
      'The application took too long to load. ' +
      'Make sure you are serving it via a local HTTP server (e.g. VS Code Live Server or <code>python -m http.server</code>), ' +
      'not opening the file directly in the browser.'
    );
  }
}, 6000);
