/* ============================================================
   KCHECK — Admin Dashboard
   ============================================================ */

'use strict';

const { getAll, escHtml, formatDateTime, formatRelativeTime, statusBadge, STATUS_LABELS } = window.KCHECK;

// ── Render Dashboard ───────────────────────────────────────
function renderDashboard() {
  const services  = getAll('serviceRequests');
  const customers = getAll('customers');
  const vehicles  = getAll('vehicles');
  const payments  = getAll('payments');

  const counts = {
    total:       services.length,
    new:         services.filter(s => s.status === 'NEW_REQUEST').length,
    inspection:  services.filter(s => s.status === 'UNDER_INSPECTION').length,
    awaitingQuote: services.filter(s => s.status === 'QUOTATION_PREPARATION').length,
    awaitingApproval: services.filter(s => s.status === 'AWAITING_CUSTOMER_APPROVAL').length,
    inProgress:  services.filter(s => s.status === 'REPAIR_IN_PROGRESS').length,
    completed:   services.filter(s => ['REPAIR_COMPLETED','READY_FOR_COLLECTION','VEHICLE_DELIVERED'].includes(s.status)).length,
    pendingPayment: payments.filter(p => p.status === 'RECEIPT_SUBMITTED' || p.status === 'UNDER_REVIEW').length
  };

  // Build recent activity from all service request audit logs
  const activities = [];
  services.forEach(s => {
    const cust = getAll('customers').find(c => c.customerId === s.customerId);
    const custName = cust ? cust.fullName : 'Unknown';
    (s.auditLog || []).forEach(log => {
      activities.push({ ...log, serviceId: s.serviceId, customerName: custName, complaint: s.complaintDescription });
    });
  });
  activities.sort((a, b) => new Date(b.performedAt) - new Date(a.performedAt));
  const recent = activities.slice(0, 10);

  // Recent services (last 5)
  const recentServices = [...services]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5);

  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-section">
      <!-- KPI Cards -->
      <div class="kpi-grid" style="margin-bottom:1.5rem">
        ${kpiCard('Total Service Requests', counts.total, 'kpi-brand', 'services', '📋')}
        ${kpiCard('New Requests',           counts.new,   'kpi-blue',  'services?status=NEW_REQUEST', '🆕')}
        ${kpiCard('Under Inspection',       counts.inspection, 'kpi-blue', 'services?status=UNDER_INSPECTION', '🔍')}
        ${kpiCard('Awaiting Quotation',     counts.awaitingQuote, 'kpi-amber', 'services?status=QUOTATION_PREPARATION', '📝')}
        ${kpiCard('Awaiting Approval',      counts.awaitingApproval, 'kpi-amber', 'services?status=AWAITING_CUSTOMER_APPROVAL', '✋')}
        ${kpiCard('Repairs in Progress',    counts.inProgress, 'kpi-blue', 'repairs', '🔧')}
        ${kpiCard('Completed Services',     counts.completed, 'kpi-green', 'services?status=REPAIR_COMPLETED', '✅')}
        ${kpiCard('Pending Payment Verify', counts.pendingPayment, 'kpi-red', 'payments', '💳')}
      </div>

      <!-- Quick Actions -->
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:1.5rem">
        <button class="btn btn-primary" onclick="navigate('services');window.KCServices.openNewServiceModal()">+ New Service Request</button>
        <button class="btn btn-outline" onclick="navigate('customers');window.KCCustomers.openNewCustomerModal()">+ Register Customer</button>
        <button class="btn btn-outline" onclick="navigate('vehicles');window.KCVehicles.openNewVehicleModal()">+ Register Vehicle</button>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
        <!-- Recent Service Requests -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">Recent Service Requests</span>
            <button class="btn btn-ghost btn-sm" onclick="navigate('services')">View All →</button>
          </div>
          <div class="card-body" style="padding:0">
            ${recentServices.length === 0 ? '<div class="empty-state" style="padding:2rem"><p>No service requests yet.</p></div>' : `
            <table class="data-table">
              <thead><tr><th>Ref</th><th>Customer</th><th>Complaint</th><th>Status</th></tr></thead>
              <tbody>
                ${recentServices.map(s => {
                  const cust = getAll('customers').find(c => c.customerId === s.customerId);
                  return `<tr class="clickable" onclick="navigate('services');window.KCServices.openServiceDetail('${escHtml(s.serviceId)}')">
                    <td class="text-mono text-xs">${escHtml(s.serviceId)}</td>
                    <td>${escHtml(cust ? cust.fullName : '—')}</td>
                    <td>${escHtml(s.complaintDescription)}</td>
                    <td>${statusBadge(s.status)}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>`}
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">Recent Activity</span>
          </div>
          <div class="card-body" style="padding:0.75rem 1rem">
            ${recent.length === 0 ? '<p class="text-muted text-sm">No activity yet.</p>' :
              recent.map(a => `
                <div class="activity-item">
                  <span class="activity-icon">📌</span>
                  <div class="activity-text">
                    <strong>${escHtml(a.customerName)}</strong> — ${escHtml(a.note || a.action)}
                    <div class="activity-time">${formatRelativeTime(a.performedAt)} · ${escHtml(a.serviceId)}</div>
                  </div>
                </div>`).join('')}
          </div>
        </div>
      </div>

      <!-- Summary Stats -->
      <div class="card" style="margin-top:1rem">
        <div class="card-header">
          <span class="card-title">Service Status Overview</span>
        </div>
        <div class="card-body">
          <div style="display:flex;gap:0.75rem;flex-wrap:wrap">
            ${Object.entries({
              NEW_REQUEST: counts.new,
              UNDER_INSPECTION: counts.inspection,
              QUOTATION_PREPARATION: counts.awaitingQuote,
              AWAITING_CUSTOMER_APPROVAL: counts.awaitingApproval,
              REPAIR_IN_PROGRESS: counts.inProgress,
              COMPLETED: counts.completed
            }).map(([status, count]) => `
              <div style="text-align:center;padding:0.6rem 1rem;background:var(--color-surface-2);border-radius:var(--radius-md);border:1px solid var(--color-border);min-width:100px">
                <div style="font-size:1.4rem;font-weight:700">${count}</div>
                <div class="text-xs text-muted" style="margin-top:0.2rem">${escHtml(STATUS_LABELS[status] || status)}</div>
              </div>`).join('')}
            <div style="text-align:center;padding:0.6rem 1rem;background:var(--color-surface-2);border-radius:var(--radius-md);border:1px solid var(--color-border);min-width:100px">
              <div style="font-size:1.4rem;font-weight:700">${customers.length}</div>
              <div class="text-xs text-muted" style="margin-top:0.2rem">Customers</div>
            </div>
            <div style="text-align:center;padding:0.6rem 1rem;background:var(--color-surface-2);border-radius:var(--radius-md);border:1px solid var(--color-border);min-width:100px">
              <div style="font-size:1.4rem;font-weight:700">${vehicles.length}</div>
              <div class="text-xs text-muted" style="margin-top:0.2rem">Vehicles</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  // Wire KPI clicks
  document.querySelectorAll('.kpi-card[data-nav]').forEach(card => {
    card.addEventListener('click', () => {
      const parts = card.dataset.nav.split('?');
      navigate(parts[0]);
      if (parts[1] && window.KCServices) {
        const params = new URLSearchParams(parts[1]);
        const status = params.get('status');
        if (status) setTimeout(() => window.KCServices.filterByStatus(status), 50);
      }
    });
  });
}

function kpiCard(label, value, colorClass, nav, icon) {
  return `
    <div class="kpi-card ${colorClass}" data-nav="${nav}" style="cursor:pointer">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <span class="kpi-label">${escHtml(label)}</span>
        <span style="font-size:1.2rem;opacity:0.6">${icon}</span>
      </div>
      <div class="kpi-value">${value}</div>
      <div class="kpi-sub">Click to view →</div>
    </div>`;
}

window.KCDashboard = { render: renderDashboard };
