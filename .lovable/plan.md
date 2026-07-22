# Departments, Requests & Notifications

## 1. Departments
Add to CreateUserDialog department list (no removals):
`Procurement Team`, `Planning Team`, `Finance`, `Supply Chain Management`, `SAP Analyst`, `Technology Team` (Technology Team already exists — keep).

## 2. Permissions rule
- Role stays primary for app-wide CRUD (existing behavior unchanged).
- Department gates **who can raise / act on which request stage**.
- Within a stage: only that department's **Admin / Super Admin** can Approve / Reject / Revoke. Operator & Reporter of that dept = view only. Global **Administrator (Super Admin)** can do everything, everywhere.

## 3. Request types & stage flows

### A. New Hardware Procurement
```text
Procurement (add serials, asset group, PO/SO#, warehouse, invoice)
  → Technology Team (verify serials)
  → Supply Chain Mgmt (request PO release)
  → Procurement (release PO)
  → Supply Chain Mgmt (take GRN)
  → Finance (approve + generate Asset Code)
  → Closed
```

### B. Existing Hardware Asset Group Movement
```text
Planning Team (raise STO request)
  → Inventory Management / SCM (process STO)
  → SAP Analyst (request Invoice from SCM)
  → Supply Chain Mgmt (share Invoice)
  → SAP Analyst (share pricing + GRN to Finance)
  → Finance (request serials from Technology Team)
  → Technology Team (provide serials)
  → Finance (final approval)
  → Closed
```

Each stage records: actor, department, role, action (approve/reject/revoke), comment, timestamp, attachments.

## 4. Serial number handling (both flows)
- Enter one-by-one **or** bulk paste **or** CSV/XLSX upload (template downloadable).
- On upload: dedupe against `devices` table. If any already exist, show summary + **Download existing-serials CSV** for analysis.
- Track mismatches (serial / asset group / warehouse) as separate flags on the request; approver sees them highlighted before deciding.

## 5. Documents / Invoices
Reuse existing `asset-documents` bucket; new `request_documents` linkage table for per-request/per-stage uploads (invoice, PO, GRN, STO, misc). PDF/JPG/PNG/XLSX/CSV, ≤10 MB.

## 6. Notifications
- Real-time bell icon in header (next to Active Users) with unread badge.
- Supabase Realtime on `notifications` table filtered by recipient dept + user_id.
- Click bell → dropdown list (unread first) → click item → opens the request detail dialog.
- Toast when a new notification arrives while app is open.
- Auto-fired on: request created, stage advanced, approved, rejected, revoked, comment added.

## 7. Terminology
Show `PO Number` in UI wherever `sales_order` appears in the new hardware flow (data column stays `sales_order` to avoid breaking existing tables).

## 8. UI
New top-level tab **Requests** with sub-tabs: `Inbox` (actions needed by me/my dept), `My Requests`, `All` (Admin only). Each row: type, current stage, raiser, dept, age, status pill. Row click → full-screen dialog with:
- Header: type, PO#, current stage, status
- Left: stage timeline (who / when / action / comment) — full history preserved
- Right: fields, serial-number table (with duplicate flags), documents, comment box, action buttons (Approve / Reject / Revoke — shown only if current dept + role allows)

## 9. Data model (new tables)
- `departments` (seed list, active flag)
- `requests` (id, type, status, current_stage, raised_by, raised_dept, po_number, warehouse, asset_type, model, configuration, quantity, asset_group, agreement_type, notes, created_at, updated_at)
- `request_serials` (request_id, serial_number, asset_group, warehouse, is_duplicate, exists_in_devices)
- `request_stages` (request_id, stage_key, order_index, assigned_dept, actor_id, action, comment, acted_at)
- `request_documents` (request_id, stage_key, file_path, file_name, uploaded_by, uploaded_at)
- `notifications` (id, user_id, dept, request_id, kind, title, body, read_at, created_at)

RLS: raiser + assigned-dept members can read; only assigned-dept Admin/Super Admin (or global Super Admin) can write actions. Reporter view-only.

## 10. Integration with existing tables
On Finance final approval for **New Hardware Procurement**:
- Insert into `orders` (Inward, order_type=Hardware, PO# → sales_order)
- Insert one row per serial into `devices` (status=Stock, asset_group from request, warehouse from request, Asset Code generated)

For **Asset Group Movement** final approval: update matched `devices` rows (asset_group / warehouse) and log via existing history trigger.

## 11. Out of scope for this pass
Email/SMS notifications, SLA timers, request re-assignment, mobile-specific bell layout.

---

Given the scope, I'll ship this in two migrations + ~8 new components. Reply "go" to build, or tell me what to adjust.