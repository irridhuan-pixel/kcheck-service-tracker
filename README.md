# KCHECK Service Tracker

**Automotive Service Management System**
Centre of Technology (COT) Automotive, PSMZA | Workshop Partner: Alif Workshop

---

## Stage 1 — Frontend Prototype (Local Demo)

This is the Stage 1 working prototype. It runs entirely in the browser using localStorage.
No Firebase, no deployment, no server required.

---

## Running Locally

### Option 1 — VS Code Live Server (Recommended)

1. Open the `kcheck-service-tracker/` folder in VS Code.
2. Install the **Live Server** extension (if not already installed).
3. Right-click `index.html` → **Open with Live Server**.
4. The Admin Dashboard opens at `http://127.0.0.1:5500/index.html`.
5. The Customer Portal is at `http://127.0.0.1:5500/portal.html`.

### Option 2 — Python HTTP Server

```bash
cd kcheck-service-tracker
python -m http.server 8080
```

Open `http://localhost:8080` in your browser.

### Option 3 — Node.js (npx serve)

```bash
cd kcheck-service-tracker
npx serve .
```

---

## What Works in Stage 1

### Admin Dashboard
- 8 KPI cards calculated from live demo data
- Recent service activity feed
- Quick action buttons

### Customer Management
- Register, view, edit, deactivate customers
- Search by name / email / phone
- Customer profile with service history

### Vehicle Management
- Register, view, edit vehicles
- Dynamic brand/model dropdowns (from Vehicle Master Data)
- Custom brand/model entry supported
- Service history preserved on vehicle edit

### Service Requests
- Create, view, edit service requests
- Full 9-step status workflow with transition validation
- Inspection findings, workshop recommendations, coordinator remarks
- Progress notes timeline (for Repair In Progress)
- Status update buttons (only valid next transitions shown)

### Quotation Management
- Dynamic line items with auto-calculated totals
- Labour and additional charges
- Save as draft or send for customer approval
- Quotation versioning — revision supersedes prior version
- Simulate customer approval and rejection (Stage 1 only)

### Customer Portal (Demo Mode)
- Select a demo customer from the dropdown
- View vehicles, service requests, quotation details
- Approve / reject / request revision on quotations
- QR payment display (DEMO — NOT FOR PAYMENT)
- Receipt upload (local FileReader — no server)

### Payment Module
- Payment record creation after quotation approved
- Receipt upload with file type and size validation (5 MB max)
- Admin verify / reject payment
- Status: Unpaid → Receipt Submitted → Verified

### Reports & Documents (Print to PDF)
- Repair Quotation
- Service Report
- Itemised Invoice (verified payments only)
- Payment Receipt (verified only)
- Vehicle Service History
- Browser print dialog → Save as PDF

### WhatsApp Communication
- Pre-filled wa.me links for 7 message types
- Opens in new tab — user sends manually
- Requires customer phone number

### Settings
- Organisation details
- Workshop contact
- Logo path (configurable)
- Vehicle Master Data (brands + models — add, rename, deactivate)
- Payment QR path and instructions
- Document footers
- WhatsApp templates
- Data reset

---

## Demo Data

Four initial records are seeded on first load:

| Customer | Vehicle | Complaint | Status |
|---|---|---|---|
| Hasnaty | Not specified | Brake shoe service | New Request |
| Pn. Aznira | Not specified | Vehicle value assessment | New Request |
| Pn. Noraini | Perodua Myvi | Belting replacement | New Request |
| Pn. Azlina | Toyota Alphard | Bush/spring noise and tyre replacement | New Request |

No registration plates, phone numbers, prices or approvals have been invented.
All data is stored in browser localStorage under the key `kcheck_v1`.

---

## Stage 2 — Firebase Integration (Planned)

- Firebase Authentication (email/password, role-based)
- Firestore database (replaces localStorage)
- Firebase Storage (receipt and document uploads)
- Cloud Functions:
  - `approveQuotation` — server-side version validation
  - `verifyPayment` — admin-only payment verification
  - `writeAuditLog` — append-only audit trail
- Netlify hosting with environment variables for Firebase config

**Do not connect Firebase until explicitly instructed.**

---

## Security Notes

- No real customer data in this prototype
- No Firebase keys committed to this repository
- `firebase-config.js` is excluded via `.gitignore`
- The QR payment image is clearly labelled DEMO — NOT FOR PAYMENT
- Vehicle plate numbers are display-only and are not authentication credentials
- Customer portal access in Stage 1 is a demo selector only — not authenticated

---

## File Structure

```
kcheck-service-tracker/
  index.html          Admin dashboard
  portal.html         Customer portal
  css/
    style.css         Design tokens and base
    components.css    Shared UI components
    admin.css         Admin sidebar layout
    portal.css        Customer portal styles
  js/
    utils.js          Shared utilities, status helpers
    data.js           Demo data layer (localStorage)
    app.js            Router, navigation
    dashboard.js      KPI cards, activity feed
    customers.js      Customer CRUD
    vehicles.js       Vehicle CRUD
    services.js       Service request workflow
    quotations.js     Quotation builder
    payments.js       Payment module
    reports.js        Documents and WhatsApp
    settings.js       Application settings
    portal.js         Customer portal logic
  assets/
    logos/
      carecheck.png   Brand logo (supplied — do not modify)
  docs/
    kcheck-plan.md    Project plan
  README.md
  .gitignore
```

---

## KCHECK Service Tracker · Stage 1 Prototype
COT Automotive, PSMZA · Alif Workshop
