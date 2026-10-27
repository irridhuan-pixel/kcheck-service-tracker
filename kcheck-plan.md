# KCHECK Service Tracker — Implementation Plan (v2)

**Project:** KCHECK Service Tracker
**Organisation:** Centre of Technology (COT) Automotive, Politeknik Sultan Mizan Zainal Abidin (PSMZA)
**Workshop Partner:** Alif Workshop
**Plan Version:** 2 — Updated with confirmed decisions
**Status:** Approved — Ready for Agent Mode

---

## Confirmed Decisions (v2 Updates)

The following decisions were confirmed and are now locked into this plan:

1. **Branding** — Use the uploaded CareCheck logo image unchanged as the temporary brand asset. Display "KCHECK Service Tracker" as the application heading. Black, white, charcoal and subtle red as primary palette with functional status colours. Logo path is configurable.
2. **Dynamic Vehicle Master Data** — Vehicle brands and models are not hardcoded. Managed via a Vehicle Master Data admin module. Custom model entry supported. Service history preserved on vehicle edits.
3. **Business Document Templates** — A4 print-friendly format for all five document types with consistent KCHECK branding.
4. **Demonstration Payment** — Fictional QR placeholder clearly labelled "DEMO — NOT FOR PAYMENT". No functional bank QR. Payment configuration managed by admin after deployment.
5. **Editable Application Settings** — Admin settings module covers all configurable areas of the application.
6. **Initial Records** — Four supplied records retained, all at NEW_REQUEST. No invented plates, prices or approvals.
7. **Development Rules** — Stage 1 = local frontend prototype only. No Firebase connection, no deployment, no GitHub push without explicit instruction.

---

## Top-Level Overview

KCHECK Service Tracker is a role-based automotive service management web application built with HTML5, CSS3, and Vanilla JavaScript on the frontend, Firebase (Auth, Firestore, Storage, Cloud Functions) as the backend, deployed via Netlify and version-controlled on GitHub.

The application coordinates vehicle servicing between three parties: COT Admin (coordinator), Customers, and Alif Workshop (offline in V1). It replaces paper-based job cards with a structured, auditable digital workflow.

**Development is divided into three stages:**
- Stage 1 — Frontend Prototype (local, demonstration data, no Firebase, no deployment)
- Stage 2 — Firebase Integration (Auth, Firestore, Storage, Cloud Functions)
- Stage 3 — Testing and Deployment (UAT, GitHub, Netlify — only after explicit instruction)

Each stage is broken into focused sub-tasks, each independently reviewable before the next begins.

---

## 1. System Architecture

### Layer Overview

```
Browser
  └── HTML5 / CSS3 / Vanilla JS (SPA-style, hash routing)
        ├── Admin Dashboard (sidebar layout)
        └── Customer Portal (single-page layout)

Stage 1 — Local Demo Mode
  └── js/data.js — static in-memory demonstration data
      └── Replaces all Firebase calls during Stage 1
      └── Includes Vehicle Master Data as static arrays

Stage 2 — Firebase Backend
  ├── Firebase Authentication — identity and role
  ├── Firestore — structured service records + vehicle master + settings
  ├── Firebase Storage — receipts, documents, logo, QR image
  └── Cloud Functions — server-side sensitive operations:
        ├── approveQuotation (validates version, prevents stale approval)
        ├── verifyPayment (admin-only write path)
        └── writeAuditLog (append-only, tamper-resistant)

Stage 3 — Hosting
  └── Netlify (static hosting, environment variables for Firebase config)
  └── GitHub (version control — no secrets committed)
```

### Module Dependency Map

```
app.js (router, global init, auth state listener)
  ├── auth.js (demo shim → Firebase Auth in Stage 2)
  ├── data.js (demo data → Firestore adapter in Stage 2)
  ├── dashboard.js (KPI cards, recent activity feed)
  ├── customers.js (customer CRUD, profile view)
  ├── vehicles.js (vehicle CRUD, linked service history)
  ├── vehicleMaster.js (brand/model master data management)
  ├── services.js (service request CRUD, status machine)
  ├── quotations.js (quotation builder, version control)
  ├── payments.js (QR display, receipt upload, verification)
  ├── documents.js (jsPDF templates — A4 print-friendly)
  ├── whatsapp.js (pre-filled wa.me message builder)
  ├── settings.js (all editable application settings)
  └── utils.js (formatDate, generateId, formatMYR, displayOrBlank)
```

---

## 2. Application Sitemap

### Admin Site

```
/ (root — redirects based on role)
  └── /admin
        ├── /dashboard              — KPI cards, recent activity
        ├── /service-requests       — list, search, filter
        │     └── /:id              — detail view, timeline, status update
        ├── /customers              — list, register, edit
        │     └── /:id              — customer profile, vehicles, services
        ├── /vehicles               — list, register, edit
        │     └── /:id              — vehicle detail, service history
        ├── /quotations             — list, create, revise
        │     └── /:id              — quotation detail, version history
        ├── /repair-tracking        — active repairs, progress notes
        ├── /payments               — receipt review, verify/reject
        ├── /reports                — generate and download documents
        ├── /whatsapp               — message templates and send triggers
        └── /settings
              ├── /organisation     — business name, address, contact
              ├── /workshop         — Alif Workshop contact info
              ├── /branding         — logo asset path, colour overrides
              ├── /vehicle-master   — manage brands and models
              ├── /payment          — QR image upload, bank details, instructions
              ├── /documents        — quotation notes, invoice footer, document footer
              └── /templates        — WhatsApp message template editor
```

### Customer Portal Site

```
/portal
  ├── /login                   — email and password login
  ├── /my-vehicles             — vehicles linked to this account
  ├── /my-services             — service requests for this customer
  │     └── /:id               — detail view, status timeline
  ├── /quotation/:id           — view quotation, approve/reject/revise
  ├── /payment/:id             — QR display, receipt upload, payment status
  └── /documents/:id           — download available documents
```

---

## 3. User Roles and Permissions Matrix

| Action | COT Admin | Customer | Unauthenticated |
|---|---|---|---|
| Register customer | YES | NO | NO |
| Register vehicle | YES | NO | NO |
| Create service request | YES | NO | NO |
| Update service status | YES | NO | NO |
| Create quotation | YES | NO | NO |
| Revise quotation | YES | NO | NO |
| View any service record | YES | Own only | NO |
| View any quotation | YES | Own only | NO |
| Approve quotation | NO | Own only | NO |
| Reject quotation | NO | Own only | NO |
| Request quotation revision | NO | Own only | NO |
| Update repair progress | YES | NO | NO |
| Upload payment receipt | YES (on behalf) | Own only | NO |
| Verify payment | YES only | NO | NO |
| Reject payment | YES only | NO | NO |
| Generate documents | YES | Download own | NO |
| Manage vehicle master data | YES | NO | NO |
| Configure settings | YES | NO | NO |
| Configure QR/payment | YES | NO | NO |
| Edit WhatsApp templates | YES | NO | NO |
| View audit logs | YES | NO | NO |

**Role enforcement layers:**
1. Firebase Auth — identity verification (Stage 2+)
2. Firestore Security Rules — server-side document access (Stage 2+)
3. JavaScript route guards — UI redirect on unauthorised access (Stage 1+)
4. Cloud Functions — sensitive operations validated server-side (Stage 2+)
5. Demo auth shim — role-based routing in Stage 1 without Firebase

---

## 4. Service Workflow and Status Transitions

### Status Definitions

| Status | Responsible Party | Entry Condition |
|---|---|---|
| NEW_REQUEST | COT Admin | Service request created |
| UNDER_INSPECTION | COT Admin | Admin sends vehicle to workshop |
| QUOTATION_PREPARATION | COT Admin | Inspection findings recorded |
| AWAITING_CUSTOMER_APPROVAL | Customer | Quotation sent to customer |
| QUOTATION_APPROVED | Customer | Customer approves current quotation version |
| REPAIR_IN_PROGRESS | COT Admin | Admin confirms workshop has started |
| REPAIR_COMPLETED | COT Admin | Admin records completion |
| READY_FOR_COLLECTION | COT Admin | Vehicle ready, customer notified |
| VEHICLE_DELIVERED | COT Admin | Payment verified, vehicle collected |
| QUOTATION_REJECTED | Customer | Customer rejects quotation |
| REVISION_REQUESTED | Customer | Customer requests changes before approving |
| CANCELLED | COT Admin | Service cancelled for any reason |

### Allowed Status Transitions

```
NEW_REQUEST
  → UNDER_INSPECTION (Admin only)
  → CANCELLED (Admin only)

UNDER_INSPECTION
  → QUOTATION_PREPARATION (Admin only, after recording findings)
  → CANCELLED (Admin only)

QUOTATION_PREPARATION
  → AWAITING_CUSTOMER_APPROVAL (Admin only, after quotation created and sent)

AWAITING_CUSTOMER_APPROVAL
  → QUOTATION_APPROVED (Customer only, current version match required)
  → QUOTATION_REJECTED (Customer only)
  → REVISION_REQUESTED (Customer only)

QUOTATION_REJECTED
  → QUOTATION_PREPARATION (Admin only)
  → CANCELLED (Admin only)

REVISION_REQUESTED
  → QUOTATION_PREPARATION (Admin only — must create new quotation version)

QUOTATION_APPROVED
  → REPAIR_IN_PROGRESS (Admin only — requires approved version to match active quotation version)

REPAIR_IN_PROGRESS
  → REPAIR_COMPLETED (Admin only)

REPAIR_COMPLETED
  → READY_FOR_COLLECTION (Admin only)

READY_FOR_COLLECTION
  → VEHICLE_DELIVERED (Admin only — requires payment status = VERIFIED)

VEHICLE_DELIVERED  →  [terminal]
CANCELLED          →  [terminal]
```

### Quotation Version Control Rules

- Every quotation revision creates a new document with `version` incremented. Previous version is set to `SUPERSEDED`.
- A customer's approval records the exact `quotationId` and `version` at the time of decision.
- The `QUOTATION_APPROVED → REPAIR_IN_PROGRESS` transition requires a server-side check (Cloud Function in Stage 2, JavaScript check in Stage 1) that the `activeQuotationId` and its current `version` still match the recorded approval.
- A new version invalidates all prior approvals for that service request.
- Only the customer who owns the service record may approve. Approval by any other party is blocked.

---

## 5. Screen-by-Screen UI Plan

### Admin — Dashboard

- Top bar: logo (configurable asset path), application title "KCHECK Service Tracker", user name, logout
- Sidebar: 10-item navigation (fixed desktop, slide-in drawer on mobile)
- KPI cards (8 cards — 4-column desktop, 2-column tablet, 1-column mobile):
  - Total Service Requests
  - New Requests
  - Under Inspection
  - Awaiting Quotation
  - Awaiting Customer Approval
  - Repairs in Progress
  - Completed Services
  - Pending Payment Verification
- Recent Activity feed (last 10 status change events)
- Quick Actions: + New Customer, + New Service Request

### Admin — Service Requests

- Searchable table: Ref, Customer, Vehicle, Complaint summary, Status badge, Last Updated
- Filter bar: status dropdown, date range, search text
- Row click → Service Detail:
  - Customer and vehicle summary card
  - Status badge + horizontal progress timeline
  - Inspection findings (editable)
  - Workshop recommendation (editable)
  - Coordinator remarks (editable)
  - Status update button (only shows valid next transitions)
  - Related quotation card (link + status)
  - Related payment card (link + status)
  - Audit log accordion (Stage 2: live logs; Stage 1: demo event list)

### Admin — Customers

- Table: Customer ID, Full Name, Phone, Email, Registered Date, Actions
- Register form: Full Name (required), Phone (optional), Email (optional), Notes
- Customer profile: linked vehicles, linked service requests
- Edit: updates customer record, does not affect service history

### Admin — Vehicles

- Table: Vehicle ID, Owner Name, Plate No, Brand, Model, Year, Actions
- Register form:
  - Owner (customer lookup/dropdown)
  - Registration plate (free text — not a login credential)
  - Brand (dropdown from Vehicle Master — or type to add custom)
  - Model (dropdown filtered by brand — or type to add custom)
  - Year (optional free text)
  - Mileage at registration (optional)
  - Notes (optional)
- Vehicle detail: complete field view, linked service history table
- Edit: updates vehicle fields. Linked service records retain their own snapshot of vehicle info at time of service.

### Admin — Vehicle Master Data (Settings sub-section)

- Brands list: Brand ID, Brand Name, Status (Active/Inactive), Actions
- Add Brand: Name (required)
- Edit Brand: rename, deactivate (deactivated brands hidden in dropdowns but existing records preserved)
- Models list (per brand): Model ID, Model Name, Brand, Status, Actions
- Add Model: Name (required), linked to Brand
- Edit Model: rename, deactivate
- All vehicle forms also allow free-text entry of brand/model not in the master list

### Admin — Quotations

- Table: Quotation Ref, Service Ref, Customer, Version, Status, Total (MYR), Date
- Quotation builder:
  - Linked service reference (read-only once set)
  - Line items table: Description, Qty, Unit Price, Subtotal (auto-calculated)
  - Add/remove line item buttons
  - Labour charges (MYR)
  - Additional charges (MYR, optional label)
  - Total (auto-calculated, display only, never manually entered)
  - Workshop recommendation notes
  - Coordinator remarks
  - Document footer (pulled from Settings — editable override per quotation)
  - Save as Draft / Send to Customer buttons
- Revision: new document created, version incremented, prior version set to SUPERSEDED, prior approval invalidated

### Admin — Repair Tracking

- Filtered view of service requests in REPAIR_IN_PROGRESS
- Progress notes entry: free text + auto timestamp
- Progress timeline: each entry shown as a timeline item (date, note, entered by)
- Status update button to advance to REPAIR_COMPLETED

### Admin — Payments

- Table: Payment Ref, Service Ref, Customer, Expected Amount (MYR), Receipt Status, Verification Status
- Payment detail view:
  - Expected amount from approved quotation (read-only)
  - Receipt image/PDF inline viewer (Stage 2: from Storage; Stage 1: demo placeholder)
  - Verify button — admin only, opens confirmation dialog
  - Reject button — requires rejection reason input
  - Verification records: verified-by user, timestamp
  - Rejection reason displayed if applicable
- Rule: receipt upload does not auto-verify. Admin action required.

### Admin — Reports and Invoices

- List of service requests with available document types per record
- Generate buttons: Quotation PDF, Service Report PDF, Invoice PDF (post-payment), Payment Receipt PDF, Service History PDF
- Download triggered client-side (Stage 1: jsPDF); saved to Storage in Stage 2

### Admin — WhatsApp Communication

- Template list with template name, trigger context, last edited
- Each template shows preview text with placeholders
- Click Send for a service record: replaces placeholders with live data, opens `wa.me` link in new tab
- User initiates send manually — no automated messaging
- Templates editable from Settings > WhatsApp Templates

### Admin — Settings

#### Organisation Details
- Business name, address, phone, email (used in document headers)

#### Workshop Contact
- Alif Workshop name, address, phone, contact person

#### Application Branding
- Logo asset path (configurable — points to `assets/images/logo.png` by default)
- Application display name
- Note: Logo file is not uploaded via this form in Stage 1 — path only

#### Vehicle Master Data
- Full brand and model management as described above

#### Payment Configuration
- QR image path (configurable — points to `assets/images/payment-qr-demo.png` in Stage 1)
- Payment instructions text (displayed alongside QR)
- Bank/account details text (displayed after payment verification)
- Note: In Stage 1, the demo QR image is labelled DEMO — NOT FOR PAYMENT

#### Quotation and Invoice Notes
- Standard terms and notes for quotation footer
- Standard terms and notes for invoice footer
- Document watermark text (e.g. DRAFT, COPY)

#### WhatsApp Templates
- Editable template editor for each of the 7 message types
- Placeholder tokens listed: {customerName}, {serviceRef}, {vehicleModel}, {totalMYR}, {portalLink}

---

## 6. Customer Portal — Screen Plan

### Login
- Email and password fields
- Sign In button
- Error message on failure
- No self-registration — accounts created by COT Admin

### My Vehicles
- Cards: Brand + Model (or "Vehicle details pending"), Plate (or "Not specified"), active service badge if applicable
- Tap card → linked service requests for that vehicle

### My Services
- Timeline list: Service Ref, Complaint, Status badge, Last Updated
- Tap row → Service Detail

### Service Detail
- Horizontal step progress bar (scrollable on mobile)
- Complaint description
- Inspection findings (read-only, shows "Pending inspection" if empty)
- Workshop recommendation (read-only)
- Coordinator remarks (read-only)
- Link to current quotation if status is at or past AWAITING_CUSTOMER_APPROVAL

### Quotation View and Action
- Quotation reference and version
- Line items table (read-only)
- Labour, additional charges, Total in MYR
- Workshop recommendation
- Action buttons (only shown when status = AWAITING_CUSTOMER_APPROVAL and version is current):
  - Approve → confirmation dialog → records approval
  - Reject → reason input → records rejection
  - Request Revision → notes input → records revision request
- Superseded versions shown as collapsed historical entries

### Payment
- Expected total amount (MYR) from approved quotation
- QR image (from configurable path — Stage 1: demo placeholder with DEMO label)
- Payment instructions text
- Upload Receipt button (JPG, PNG, PDF — max 5 MB)
- Current payment status badge
- Rejection reason if applicable

### Documents
- Download Repair Quotation PDF (available from AWAITING_CUSTOMER_APPROVAL)
- Download Service Report PDF (available from REPAIR_COMPLETED)
- Download Invoice PDF (available after payment VERIFIED)
- Download Payment Receipt PDF (available after payment VERIFIED)

---

## 7. Firebase Data Model

### Collection: `users`

```json
{
  "uid": "demo-admin-001",
  "email": "coordinator@cotpsmza.edu.my",
  "role": "admin",
  "displayName": "COT Admin",
  "phone": "",
  "createdAt": "2025-01-15T08:00:00Z",
  "createdBy": "system"
}
```

Required: `uid`, `email`, `role`, `displayName`, `createdAt`
Permissions: Admin reads all. Customer reads own document only.

---

### Collection: `customers`

```json
{
  "customerId": "CUST-0001",
  "userId": "demo-user-001",
  "fullName": "Hasnaty",
  "phone": "",
  "email": "",
  "notes": "",
  "createdAt": "2025-01-15T08:00:00Z",
  "createdBy": "demo-admin-001"
}
```

Required: `customerId`, `userId`, `fullName`, `createdAt`, `createdBy`
Permissions: Admin reads/writes all. Customer reads own record only.
Note: `phone` and `email` are intentionally blank for demo records.

---

### Collection: `vehicles`

```json
{
  "vehicleId": "VEH-0003",
  "customerId": "CUST-0003",
  "registrationPlate": "",
  "brandId": "BRAND-002",
  "brandName": "Perodua",
  "modelId": "MODEL-005",
  "modelName": "Myvi",
  "customBrand": "",
  "customModel": "",
  "year": "",
  "mileageAtRegistration": "",
  "notes": "",
  "createdAt": "2025-01-15T08:00:00Z",
  "createdBy": "demo-admin-001"
}
```

Required: `vehicleId`, `customerId`, `createdAt`, `createdBy`
Note: `brandId` and `modelId` reference Vehicle Master Data. `customBrand` and `customModel` used when user types a value not in master list. Both `registrationPlate` and `year` are optional and stored as empty strings, never null.
Note: Service records store their own vehicle snapshot — vehicle edits do not alter historical service data.
Permissions: Admin reads/writes all. Customer reads own vehicles only.

---

### Collection: `vehicleMaster`

```json
{
  "entryId": "BRAND-001",
  "type": "brand",
  "name": "Toyota",
  "parentId": "",
  "status": "active",
  "createdAt": "2025-01-15T08:00:00Z",
  "createdBy": "demo-admin-001"
}
```

```json
{
  "entryId": "MODEL-001",
  "type": "model",
  "name": "Alphard",
  "parentId": "BRAND-001",
  "status": "active",
  "createdAt": "2025-01-15T08:00:00Z",
  "createdBy": "demo-admin-001"
}
```

Required: `entryId`, `type`, `name`, `status`, `createdAt`, `createdBy`
`type` is `brand` or `model`. `parentId` is empty for brands, set to `brandId` for models.
`status` is `active` or `inactive`. Inactive entries hidden in dropdowns but not deleted.
Permissions: Admin reads/writes. Authenticated users read active entries only.

---

### Collection: `serviceRequests`

```json
{
  "serviceId": "SVC-0001",
  "customerId": "CUST-0001",
  "vehicleId": "",
  "vehicleSnapshot": {
    "brand": "",
    "model": "",
    "plate": "",
    "year": ""
  },
  "complaintDescription": "Brake shoe service",
  "inspectionFindings": "",
  "workshopRecommendation": "",
  "coordinatorRemarks": "",
  "progressNotes": [],
  "status": "NEW_REQUEST",
  "activeQuotationId": "",
  "activePaymentId": "",
  "createdAt": "2025-01-15T08:00:00Z",
  "updatedAt": "2025-01-15T08:00:00Z",
  "createdBy": "demo-admin-001"
}
```

`vehicleSnapshot` is populated when a vehicle is linked and stores a copy of brand, model, plate, year at that moment. Vehicle edits after this point do not change the snapshot.
`progressNotes` is an array of `{ note, enteredBy, enteredAt }` objects.
Required: `serviceId`, `customerId`, `complaintDescription`, `status`, `createdAt`, `updatedAt`, `createdBy`
Permissions: Admin reads/writes all. Customer reads own records only.

---

### Collection: `quotations`

```json
{
  "quotationId": "QUO-0001",
  "serviceId": "SVC-0001",
  "customerId": "CUST-0001",
  "version": 1,
  "lineItems": [
    { "description": "Brake Shoe Set (Front)", "quantity": 1, "unitPrice": 0 }
  ],
  "labourCharges": 0,
  "additionalCharges": 0,
  "additionalChargesLabel": "",
  "totalAmount": 0,
  "workshopRecommendation": "",
  "coordinatorRemarks": "",
  "documentFooter": "",
  "status": "DRAFT",
  "createdAt": "2025-01-15T08:00:00Z",
  "createdBy": "demo-admin-001",
  "sentAt": "",
  "approvedAt": "",
  "approvedBy": "",
  "rejectedAt": "",
  "rejectedBy": "",
  "rejectionReason": ""
}
```

`status` values: `DRAFT`, `AWAITING_APPROVAL`, `APPROVED`, `REJECTED`, `SUPERSEDED`
`totalAmount` is always computed (sum of line items + labour + additional), never entered manually.
Required: `quotationId`, `serviceId`, `customerId`, `version`, `lineItems`, `totalAmount`, `status`, `createdAt`, `createdBy`
Permissions: Admin reads/writes all. Customer reads own quotations. Customer approval goes through Cloud Function (Stage 2) or validated JS (Stage 1).

---

### Collection: `approvals`

```json
{
  "approvalId": "APR-0001",
  "quotationId": "QUO-0001",
  "serviceId": "SVC-0001",
  "customerId": "CUST-0001",
  "quotationVersion": 1,
  "decision": "APPROVED",
  "decidedBy": "demo-user-001",
  "decidedAt": "2025-01-20T14:30:00Z",
  "revisionRequest": ""
}
```

`quotationVersion` must match `quotations/{quotationId}.version` at time of decision. If they differ, the approval is invalid.
Required: all fields
Permissions: Admin reads all. Customer reads own approvals. No direct writes — only via Cloud Function (Stage 2) or validated service logic (Stage 1).

---

### Collection: `payments`

```json
{
  "paymentId": "PAY-0001",
  "serviceId": "SVC-0001",
  "quotationId": "QUO-0001",
  "customerId": "CUST-0001",
  "expectedAmount": 0,
  "receiptStoragePath": "",
  "uploadedAt": "",
  "uploadedBy": "",
  "status": "UNPAID",
  "verifiedAt": "",
  "verifiedBy": "",
  "rejectedAt": "",
  "rejectedBy": "",
  "rejectionReason": ""
}
```

`status` values: `UNPAID`, `RECEIPT_SUBMITTED`, `UNDER_REVIEW`, `VERIFIED`, `REJECTED`
Receipt upload sets status to `RECEIPT_SUBMITTED` only. `VERIFIED` set by admin Cloud Function only.
Required: `paymentId`, `serviceId`, `quotationId`, `customerId`, `expectedAmount`, `status`
Permissions: Admin reads/writes all. Customer reads own record and may update `receiptStoragePath` and `uploadedAt` only.

---

### Collection: `documents`

```json
{
  "documentId": "DOC-0001",
  "serviceId": "SVC-0001",
  "customerId": "CUST-0001",
  "documentType": "INVOICE",
  "storagePath": "documents/SVC-0001/invoice-v1.pdf",
  "generatedAt": "2025-01-25T10:00:00Z",
  "generatedBy": "demo-admin-001",
  "version": 1
}
```

`documentType` values: `QUOTATION`, `SERVICE_REPORT`, `INVOICE`, `PAYMENT_RECEIPT`, `SERVICE_HISTORY`
Required: `documentId`, `serviceId`, `customerId`, `documentType`, `storagePath`, `generatedAt`, `generatedBy`
Permissions: Admin reads/writes all. Customer reads own documents only.

---

### Collection: `auditLogs`

```json
{
  "logId": "LOG-0001",
  "action": "QUOTATION_APPROVED",
  "entityType": "quotation",
  "entityId": "QUO-0001",
  "performedBy": "demo-user-001",
  "performedAt": "2025-01-20T14:30:00Z",
  "details": "Version 1 approved by customer"
}
```

Required: all fields. No user writes directly — append-only via Cloud Function (Stage 2) or in-memory log in Stage 1.
Permissions: Admin reads all. No direct writes by any user.

---

### Collection: `appSettings`

```json
{
  "settingId": "global",
  "businessName": "COT Automotive, PSMZA",
  "businessAddress": "",
  "businessPhone": "",
  "businessEmail": "",
  "workshopName": "Alif Workshop",
  "workshopAddress": "",
  "workshopPhone": "",
  "workshopContact": "",
  "logoPath": "assets/images/logo.png",
  "appDisplayName": "KCHECK Service Tracker",
  "paymentQrPath": "assets/images/payment-qr-demo.png",
  "paymentInstructions": "DEMO — NOT FOR PAYMENT. Payment QR will be configured by administrator.",
  "paymentBankDetails": "",
  "quotationFooter": "",
  "invoiceFooter": "",
  "documentWatermark": "",
  "whatsappTemplates": {
    "newRequest": "...",
    "inspectionUpdate": "...",
    "quotationReady": "...",
    "approvalReminder": "...",
    "repairProgress": "...",
    "paymentReminder": "...",
    "vehicleReady": "..."
  },
  "updatedAt": "2025-01-15T08:00:00Z",
  "updatedBy": "demo-admin-001"
}
```

Required: `settingId`
All other fields have sensible defaults. Admin reads/writes all. Authenticated users read non-sensitive fields only (logoPath, appDisplayName, paymentQrPath, paymentInstructions).

---

### Firestore Security Rules Summary

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAdmin() {
      return request.auth != null &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    function isCustomerOwner(customerId) {
      return request.auth != null &&
             get(/databases/$(database)/documents/customers/$(customerId)).data.userId == request.auth.uid;
    }

    match /users/{userId} {
      allow read: if request.auth.uid == userId || isAdmin();
      allow write: if isAdmin();
    }
    match /customers/{id} {
      allow read: if isAdmin() || isCustomerOwner(id);
      allow write: if isAdmin();
    }
    match /vehicles/{id} {
      allow read: if isAdmin() || isCustomerOwner(resource.data.customerId);
      allow write: if isAdmin();
    }
    match /vehicleMaster/{id} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }
    match /serviceRequests/{id} {
      allow read: if isAdmin() || isCustomerOwner(resource.data.customerId);
      allow write: if isAdmin();
    }
    match /quotations/{id} {
      allow read: if isAdmin() || isCustomerOwner(resource.data.customerId);
      allow write: if isAdmin();
    }
    match /approvals/{id} {
      allow read: if isAdmin() || isCustomerOwner(resource.data.customerId);
      allow write: if false;
    }
    match /payments/{id} {
      allow read: if isAdmin() || isCustomerOwner(resource.data.customerId);
      allow update: if isCustomerOwner(resource.data.customerId) &&
                       request.resource.data.diff(resource.data).affectedKeys()
                         .hasOnly(['receiptStoragePath','uploadedAt','uploadedBy','status']) &&
                       request.resource.data.status == 'RECEIPT_SUBMITTED';
      allow write: if isAdmin();
    }
    match /documents/{id} {
      allow read: if isAdmin() || isCustomerOwner(resource.data.customerId);
      allow write: if isAdmin();
    }
    match /auditLogs/{id} {
      allow read: if isAdmin();
      allow write: if false;
    }
    match /appSettings/{id} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }
  }
}
```

### Firebase Storage Rules Summary

- Receipts path: `receipts/{customerId}/{serviceId}/{filename}`
- Customer may write to their own `customerId` path only
- File size: max 5 MB
- Content type: `image/jpeg`, `image/png`, `application/pdf`
- Admin reads all paths
- Customer reads own path prefix only

### Firestore Indexes Required

- `serviceRequests`: `customerId` ASC + `status` ASC + `createdAt` DESC
- `serviceRequests`: `status` ASC + `createdAt` DESC
- `quotations`: `serviceId` ASC + `version` DESC
- `payments`: `customerId` ASC + `status` ASC
- `vehicleMaster`: `type` ASC + `parentId` ASC + `status` ASC
- `auditLogs`: `entityId` ASC + `performedAt` DESC

---

## 8. Project Folder Structure

```
kcheck-service-tracker/
  index.html                     — Admin entry point
  portal.html                    — Customer portal entry point
  css/
    style.css                    — Design tokens, layout grid
    admin.css                    — Admin sidebar, dashboard
    portal.css                   — Customer portal styles
    components.css               — Cards, badges, tables, forms, modals, timeline
    print.css                    — A4 print styles for document generation
  js/
    app.js                       — Hash router, global init, auth state
    auth.js                      — Demo auth shim (Stage 1) → Firebase Auth (Stage 2)
    data.js                      — Demo data store (Stage 1) → Firestore adapter (Stage 2)
    dashboard.js                 — KPI cards, activity feed
    customers.js                 — Customer list, register, profile
    vehicles.js                  — Vehicle list, register, detail
    vehicleMaster.js             — Brand/model master data CRUD
    services.js                  — Service request CRUD, status machine
    quotations.js                — Quotation builder, line items, version control
    payments.js                  — QR display, receipt upload, verification
    documents.js                 — jsPDF A4 templates (5 document types)
    whatsapp.js                  — Template renderer, wa.me link builder
    settings.js                  — All editable settings sections
    firebase-config.js           — Firebase SDK init [EXCLUDED FROM GITHUB]
    utils.js                     — formatDate, formatMYR, generateId, displayOrBlank
  assets/
    images/
      logo.png                   — CareCheck logo (supplied — use unchanged)
      payment-qr-demo.png        — DEMO QR placeholder (clearly labelled NOT FOR PAYMENT)
    icons/
  firebase/
    firestore.rules              — Firestore Security Rules
    storage.rules                — Storage Security Rules
    firestore.indexes.json       — Composite index definitions
  functions/
    index.js                     — Cloud Functions entry (Stage 2)
    approveQuotation.js          — Version-validated approval
    verifyPayment.js             — Admin-only payment verification
    writeAuditLog.js             — Append-only audit writer
  docs/
    kcheck-plan.md               — This plan file
  .gitignore
  .env.example                   — Env variable names only, no values
  netlify.toml                   — Netlify config (Stage 3)
  README.md
```

**`.gitignore` must include:**
```
js/firebase-config.js
.env
node_modules/
.firebase/
*.key.json
service-account*.json
```

---

## 9. Design System

### Colour Palette (v2 — Confirmed)

| Token | Value | Usage |
|---|---|---|
| `--color-bg` | `#111111` | Page background |
| `--color-surface` | `#1c1c1c` | Sidebar, card background |
| `--color-surface-2` | `#262626` | Table row, input background |
| `--color-border` | `#3a3a3a` | Borders, dividers |
| `--color-text-primary` | `#f0f0f0` | Primary text |
| `--color-text-secondary` | `#9a9a9a` | Labels, captions |
| `--color-brand-red` | `#c0392b` | Subtle branding accent — header stripe, active nav item |
| `--color-accent-blue` | `#2563eb` | Information, primary action buttons |
| `--color-accent-green` | `#16a34a` | Success, Approved, Delivered |
| `--color-accent-amber` | `#d97706` | Pending, Awaiting, Draft |
| `--color-accent-red` | `#dc2626` | Rejected, Cancelled, Error |
| `--color-white` | `#ffffff` | Button text, logo area |

### Status Badge Colour Map

| Status | Colour |
|---|---|
| NEW_REQUEST | Blue |
| UNDER_INSPECTION | Blue |
| QUOTATION_PREPARATION | Amber |
| AWAITING_CUSTOMER_APPROVAL | Amber |
| QUOTATION_APPROVED | Green |
| REPAIR_IN_PROGRESS | Blue |
| REPAIR_COMPLETED | Green |
| READY_FOR_COLLECTION | Green |
| VEHICLE_DELIVERED | Green (muted) |
| QUOTATION_REJECTED | Red |
| REVISION_REQUESTED | Amber |
| CANCELLED | Red (muted) |
| UNPAID | Amber |
| RECEIPT_SUBMITTED | Blue |
| UNDER_REVIEW | Blue |
| VERIFIED | Green |
| PAYMENT_REJECTED | Red |

### Typography

- Font: `Inter, system-ui, sans-serif` (Google Fonts CDN)
- Heading weight: `600`
- Body size: `0.9rem`, line-height `1.6`
- Reference IDs, amounts: `font-family: 'Courier New', monospace`

### Component Patterns

- **Cards:** `border-radius: 8px`, surface background, 1px border
- **Tables:** Striped rows, sticky header, row hover highlight
- **Badges:** Pill shape (`border-radius: 99px`), `font-size: 0.72rem`, `font-weight: 600`
- **Forms:** Full-width inputs, above-field labels, inline validation message
- **Modals:** Centred overlay, `backdrop-filter: blur(4px)`, close on Escape and outside click
- **Sidebar:** 240px fixed on desktop ≥ 1024px, slide-in drawer on mobile (hamburger toggle)
- **Progress Timeline:** Vertical stepper with status dots and connecting lines
- **Loading State:** Skeleton shimmer animation on cards and table rows
- **Empty State:** Icon + heading + description + primary action button
- **Error State:** Red-bordered banner, icon, message, retry button
- **Confirmation Dialog:** Modal with context message, Confirm (primary) and Cancel (ghost) buttons

### Branding Rules

- Logo image loaded from `assets.logoPath` (configurable in Settings)
- Default path: `assets/images/logo.png` (the supplied CareCheck logo — used unchanged)
- Application heading "KCHECK Service Tracker" always displayed in text alongside the logo
- If logo file is missing or fails to load, text heading is shown alone — no broken image shown
- Logo replacement: admin updates the logo path in Settings. No code change required.

---

## 10. Document Generation Plan

All five documents are generated client-side using `jsPDF` + `jsPDF-AutoTable` (CDN, no build tool).
Print CSS in `css/print.css` supports A4 print-from-browser as an alternative.

### Shared Document Header (all five types)

```
[Logo image]    KCHECK Service Tracker
                COT Automotive, PSMZA
                [Business address from Settings]
                [Business phone / email from Settings]
─────────────────────────────────────────────
Document Type   |   Ref No   |   Date   |   Version
─────────────────────────────────────────────
Customer: [name]            Vehicle: [brand model plate]
```

### Document 1 — Repair Quotation

- Section: Service complaint, inspection findings, workshop recommendation
- Table: Line items (Description, Qty, Unit Price, Subtotal)
- Labour charges, additional charges, Total (MYR) — bold
- Footer: Quotation validity note, coordinator name, quotation status
- Watermark: DRAFT if status = DRAFT

### Document 2 — Service Report

- Section: Complaint description, inspection findings, workshop recommendation
- Progress timeline: all progress notes with timestamps
- Status history timeline
- Section: Coordinator remarks
- Footer: Report date, coordinator name, business details from Settings

### Document 3 — Itemised Invoice

- Section: Customer details, vehicle details
- Table: Approved quotation line items
- Labour, additional, Total (MYR)
- Payment reference, verified by, verification date
- Footer: Invoice notes from Settings
- Label: "Internal Service Invoice — Not an LHDN e-Invoice"

### Document 4 — Confirmed Payment Receipt

- Payment reference number
- Customer name, service reference
- Total amount (MYR)
- Payment method: Manual/QR Transfer
- Verified by (admin name), verification date
- Business details from Settings

### Document 5 — Vehicle Service History

- Vehicle details header: brand, model, plate, year
- Table: all service records for this vehicle — Date, Service Ref, Complaint, Status, Total (MYR)
- Total services count, total spend (if available)
- Generated date

---

## 11. WhatsApp Message Templates

All templates render as `https://wa.me/{phone}?text={encoded_message}`. User clicks → opens WhatsApp → sends manually.

| Template Key | Trigger Context | Placeholder Tokens |
|---|---|---|
| `newRequest` | After service request created | `{customerName}`, `{serviceRef}`, `{complaint}` |
| `inspectionUpdate` | Status → UNDER_INSPECTION | `{customerName}`, `{serviceRef}`, `{inspectionNote}` |
| `quotationReady` | Status → AWAITING_CUSTOMER_APPROVAL | `{customerName}`, `{serviceRef}`, `{totalMYR}`, `{portalLink}` |
| `approvalReminder` | Admin manual trigger | `{customerName}`, `{serviceRef}`, `{expiryNote}` |
| `repairProgress` | Admin adds progress note | `{customerName}`, `{serviceRef}`, `{progressNote}` |
| `paymentReminder` | Status → READY_FOR_COLLECTION | `{customerName}`, `{serviceRef}`, `{totalMYR}` |
| `vehicleReady` | Status → READY_FOR_COLLECTION | `{customerName}`, `{vehicleModel}`, `{locationNote}` |

Templates are editable by admin in Settings > WhatsApp Templates.

---

## 12. Initial Demonstration Records

Stored in `js/data.js` as static JavaScript objects. Loaded automatically on app start in Stage 1.

```
Vehicle Master (demo seed):
  BRAND-001  Toyota     (active)
  BRAND-002  Perodua    (active)
  MODEL-001  Alphard    (parentId: BRAND-001, active)
  MODEL-002  Myvi       (parentId: BRAND-002, active)

Customers:
  CUST-0001  Hasnaty       phone: ""  email: ""
  CUST-0002  Pn. Aznira    phone: ""  email: ""
  CUST-0003  Pn. Noraini   phone: ""  email: ""
  CUST-0004  Pn. Azlina    phone: ""  email: ""

Vehicles:
  VEH-0003  CUST-0003  brand: Perodua  model: Myvi   plate: ""
  VEH-0004  CUST-0004  brand: Toyota   model: Alphard  plate: ""
  (CUST-0001 and CUST-0002 have no vehicle records)

Service Requests:
  SVC-0001  CUST-0001  vehicleId: ""    "Brake shoe service"                     NEW_REQUEST
  SVC-0002  CUST-0002  vehicleId: ""    "Vehicle value assessment"               NEW_REQUEST
  SVC-0003  CUST-0003  vehicleId: VEH-0003  "Belting replacement"               NEW_REQUEST
  SVC-0004  CUST-0004  vehicleId: VEH-0004  "Bush/spring noise and tyre replacement"  NEW_REQUEST
```

All quotation, approval, payment, and plate fields are empty strings. No values invented.
Demo user accounts for Stage 1 auth shim:
- Admin: `admin@demo.kcheck` / any password
- Customer (Hasnaty): `hasnaty@demo.kcheck` / any password

---

## 13. Feature Implementation Priority

| Priority | Feature | Stage |
|---|---|---|
| P0 | Folder structure and CSS design system | S1 |
| P0 | Branding: logo asset, KCHECK heading | S1 |
| P0 | Admin dashboard layout with KPI cards | S1 |
| P0 | Demo data layer (4 records, vehicle master) | S1 |
| P0 | Service requests list, filter, detail, status update | S1 |
| P1 | Customer and vehicle registration forms | S1 |
| P1 | Vehicle Master Data management (admin) | S1 |
| P1 | Quotation builder with line items, version display | S1 |
| P1 | Customer portal (read-only demo preview) | S1 |
| P1 | Application Settings — all sections | S1 |
| P2 | PDF document generation (jsPDF, 5 templates) | S1 |
| P2 | Demo QR payment display (clearly labelled) | S1 |
| P2 | WhatsApp message templates | S1 |
| P3 | Firebase Auth and role routing | S2 |
| P3 | Firestore data adapter (replace data.js) | S2 |
| P3 | Firestore and Storage Security Rules | S2 |
| P3 | approveQuotation Cloud Function | S2 |
| P3 | Firebase Storage receipt upload | S2 |
| P3 | verifyPayment Cloud Function | S2 |
| P3 | Audit logging | S2 |
| P4 | Full functional and security testing | S3 |
| P4 | Mobile responsive testing | S3 |
| P4 | UAT with 4 initial records | S3 |
| P4 | GitHub push and Netlify deployment | S3 (explicit instruction only) |

---

## 14. Stage 1 Sub-Tasks (Agent Mode Implementation Order)

### S1-T1: Project Scaffold and Design System
**Intent:** Establish folder structure, base HTML shells, CSS design tokens and reusable component styles.
**Expected Outcomes:** All folders and files created. `style.css` renders the dark automotive theme. Sidebar layout works on desktop and collapses on mobile. KCHECK heading and logo placeholder visible.
**Steps:**
1. Create full folder structure as defined in Section 8
2. Write `index.html` (admin shell with sidebar placeholder)
3. Write `portal.html` (customer portal shell)
4. Write `css/style.css` with all CSS custom property tokens
5. Write `css/components.css` (cards, badges, tables, forms, modals, timeline, states)
6. Write `css/admin.css` (sidebar, topbar, dashboard grid)
7. Write `css/portal.css` (portal-specific layout)
8. Write `css/print.css` (A4 print media query styles)
9. Write `js/utils.js` (formatDate, formatMYR, generateId, displayOrBlank)
10. Place CareCheck logo at `assets/images/logo.png` (reference supplied file)
11. Create DEMO QR placeholder at `assets/images/payment-qr-demo.png` with watermark text
**Status:** [ ] pending

### S1-T2: Demonstration Data Layer
**Intent:** Create the complete static data store that all other modules read from in Stage 1.
**Expected Outcomes:** `js/data.js` exports all entity arrays. The 4 service records, customers, vehicles and vehicle master data match the specification exactly. No invented values.
**Steps:**
1. Write `js/data.js` with demo users, customers, vehicles, vehicleMaster, serviceRequests
2. Include in-memory appSettings with demo QR path and payment instructions
3. Export CRUD-like helper functions: `getData`, `createRecord`, `updateRecord`
4. Export the STATUS_TRANSITIONS map used by the status machine
5. Export WhatsApp template defaults
**Status:** [ ] pending

### S1-T3: Admin Dashboard
**Intent:** Render the admin dashboard with 8 KPI cards and a recent activity feed from demo data.
**Expected Outcomes:** 8 KPI cards count demo records by status correctly. Recent activity shows the most recent status events. Quick action buttons are present.
**Steps:**
1. Write `js/dashboard.js`
2. Render 8 KPI cards from data.js status counts
3. Render recent activity feed from serviceRequests sorted by updatedAt
4. Wire up Quick Action buttons (navigate to create forms)
**Status:** [ ] pending

### S1-T4: Service Requests Module
**Intent:** Searchable and filterable table of all service requests with a detail view and status update capability.
**Expected Outcomes:** Table renders all 4 demo records. Status filter and search text work. Detail view shows timeline, editable fields and allowed next-status buttons only.
**Steps:**
1. Write `js/services.js`
2. Render service request list with search and status filter
3. Render service detail view with all fields
4. Implement status transition buttons using STATUS_TRANSITIONS from data.js
5. Implement in-memory status update and audit log entry
6. Render progress notes timeline with add-note form
**Status:** [ ] pending

### S1-T5: Customer and Vehicle Management
**Intent:** Customer and vehicle registration forms, list views, and linked profile views.
**Expected Outcomes:** Forms validate required fields, save to in-memory data, tables list all records. Vehicle form uses Vehicle Master dropdowns with custom entry fallback.
**Steps:**
1. Write `js/customers.js` — list, register form, profile view
2. Write `js/vehicles.js` — list, register form, detail view with service history
3. Write `js/vehicleMaster.js` — brand/model list, add/edit/deactivate UI
4. Vehicle form: brand dropdown (from vehicleMaster), model dropdown filtered by brand, custom entry allowed
**Status:** [ ] pending

### S1-T6: Quotation Builder
**Intent:** Admin creates draft quotations with dynamic line items. Version number displayed. Total auto-calculated.
**Expected Outcomes:** Quotation form saves to in-memory data linked to service request. Version shown. Total = sum of line items + labour + additional. Revision creates new version and sets previous to SUPERSEDED.
**Steps:**
1. Write `js/quotations.js`
2. Render quotation list with version and status columns
3. Render quotation builder form with dynamic add/remove line items
4. Auto-calculate totals on input change
5. Save as Draft / Send to Customer actions
6. Revision flow: creates new version, marks previous SUPERSEDED
**Status:** [ ] pending

### S1-T7: Customer Portal Preview
**Intent:** Read-only customer portal showing demo service records without real authentication.
**Expected Outcomes:** Portal renders with the demo auth shim. Switching demo customer shows their vehicles and services. Service detail includes timeline and quotation view. Approve/Reject buttons appear when status = AWAITING_CUSTOMER_APPROVAL and quotation version is current.
**Steps:**
1. Write `js/auth.js` with demo auth shim
2. Write `js/app.js` with hash router and role-based routing
3. Write customer portal pages: login, my-vehicles, my-services, service-detail, quotation, payment, documents
4. Bind all portal views to data.js
5. Approval flow: version check, in-memory update, status change
**Status:** [ ] pending

### S1-T8: Application Settings
**Intent:** Admin settings section covering all 7 configurable areas.
**Expected Outcomes:** Settings form renders all sections. Changes update in-memory appSettings. Logo path change updates the displayed logo. Demo QR path and payment instructions are pre-filled and editable.
**Steps:**
1. Write `js/settings.js`
2. Render all settings sections as tab-panel or accordion
3. Organisation, Workshop, Branding (logo path), Vehicle Master link, Payment, Document notes, WhatsApp templates
4. Save updates to in-memory appSettings
5. Logo path change triggers logo reload in header
**Status:** [ ] pending

### S1-T9: PDF Document Generation
**Intent:** Generate A4-formatted PDFs for all 5 document types using jsPDF.
**Expected Outcomes:** Clicking Generate on a service record downloads a correctly formatted PDF with KCHECK header, document-specific content, and footer from Settings. Invoice only available after payment verified.
**Steps:**
1. Write `js/documents.js`
2. Add jsPDF and jsPDF-AutoTable via CDN in index.html and portal.html
3. Implement 5 template functions: quotation, serviceReport, invoice, paymentReceipt, serviceHistory
4. Header function: logo (if loadable), business details from settings, document ref, date
5. Footer function: notes from settings, page number
6. Render generate buttons on service detail, quotation detail, payment detail
**Status:** [ ] pending

### S1-T10: Payments and WhatsApp
**Intent:** Demo QR payment display, receipt upload simulation and WhatsApp message generation.
**Expected Outcomes:** Payment section shows demo QR with DEMO label and payment instructions. Upload file input updates demo payment record to RECEIPT_SUBMITTED. Admin verify/reject buttons work in-memory. WhatsApp send buttons generate correct wa.me links with pre-filled message.
**Steps:**
1. Write `js/payments.js`
2. Payment detail: load QR from settings.paymentQrPath, show expected amount
3. Upload receipt: file input, validate type and size, update payment record in-memory
4. Admin payment detail: inline receipt viewer (FileReader for local file), Verify/Reject buttons
5. Write `js/whatsapp.js` — template renderer, token replacer, wa.me link opener
6. Render Send WhatsApp buttons on service detail and WhatsApp section
**Status:** [ ] pending

---

## 15. Stage 2 Sub-Tasks (Firebase Integration)

### S2-T1: Firebase Auth and Role Routing
**Status:** [ ] pending

### S2-T2: Firestore Data Adapter
**Status:** [ ] pending

### S2-T3: Firestore and Storage Security Rules
**Status:** [ ] pending

### S2-T4: approveQuotation Cloud Function
**Status:** [ ] pending

### S2-T5: Firebase Storage Receipt Upload
**Status:** [ ] pending

### S2-T6: verifyPayment Cloud Function
**Status:** [ ] pending

### S2-T7: Audit Logging Cloud Function
**Status:** [ ] pending

### S2-T8: Live WhatsApp Templates and QR from Firestore
**Status:** [ ] pending

---

## 16. Stage 3 Sub-Tasks (Testing and Deployment)

### S3-T1: Functional and Access Control Testing
**Status:** [ ] pending

### S3-T2: Mobile Responsive Testing
**Status:** [ ] pending

### S3-T3: UAT with Initial Records
**Status:** [ ] pending

### S3-T4: GitHub and Netlify Deployment
**Status:** [ ] pending — requires explicit approval before execution

---

## 17. Risks and Acceptance Criteria

### Security Risks

| Risk | Mitigation | Acceptance Criterion |
|---|---|---|
| Cross-customer data access | Firestore rules: `isCustomerOwner` check on every customer-scoped collection | Emulator test: cross-customer read returns PERMISSION_DENIED |
| Stale quotation approval | Version match check in approveQuotation Cloud Function | Approving superseded version returns error, status not changed |
| Payment auto-verified | Status set to RECEIPT_SUBMITTED on upload only. VERIFIED only via admin Cloud Function | Upload cannot set status beyond RECEIPT_SUBMITTED in any code path |
| Firebase config in repo | `firebase-config.js` in `.gitignore` | GitHub repo scan finds no API keys |
| Unauthenticated portal access | Route guard in auth.js redirects to login | Direct URL to portal page without auth token → login page |
| File upload abuse | Storage rules: 5 MB max, image/PDF only | Oversized and wrong-type uploads rejected by Storage rules |

### Data Quality Rules

| Risk | Mitigation |
|---|---|
| Invented vehicle plates | Registration plate field is always optional; UI shows "Not specified" for empty values |
| Invented prices | Demo quotations have 0.00 as default; never auto-populated |
| Missing vehicle for service | vehicleId optional; service proceeds; vehicle linkable later |
| Vehicle edit breaks history | serviceRequests stores vehicleSnapshot at time of creation |
| Duplicate customers | Admin warned on name match before save |
| Null crashes in UI | `displayOrBlank(value, fallback)` utility used on all optional fields |

### Acceptance Criteria Summary

- All 4 demo records render correctly with no invented data
- Status transitions follow allowed map in all cases
- Customer portal shows only records for the authenticated/demo customer
- Quotation approval with wrong version is blocked
- Payment verification requires admin action
- No Firebase credentials in GitHub repository
- Application renders on 375px mobile viewport
- All 5 PDF types generate with correct KCHECK header and document content
- Demo QR image is clearly labelled DEMO — NOT FOR PAYMENT
- Logo loads from configurable path; missing logo shows text heading only
