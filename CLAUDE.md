# Lead Inventory — notes for Claude

## How changes go live (automatic)
- Work directly on the `main` branch. Do not create branches unless asked.
- When you finish a reply, the Stop hook `.claude/hooks/auto-publish.sh` runs:
  `npm run build` → commit → `git pull --rebase origin main` → `git push origin main`.
  Vercel deploys `main` to https://lead-inventory-leaditsupport.vercel.app in 1–3 minutes.
- If the hook reports a build error or a merge conflict, fix it before doing anything else;
  the hook retries automatically when you finish.
- Never force-push, never rewrite history on `main`, never commit secrets beyond the existing
  public Supabase keys in `.env`.
- Lovable also commits to `main`. Always keep your edits compatible with whatever the pull brings in.
- Every change must keep `npm run build` passing. Keep changes focused; explain them briefly in plain language.

## Project
- Vite + React + TypeScript + shadcn/ui (Tailwind). Supabase for database, Google sign-in,
  storage and realtime. No custom backend; access control is Supabase RLS
  (`supabase/migrations`). One edge function: `supabase/functions/oms-order-details`.
- Entry: `src/App.tsx` → `src/pages/Index.tsx` → `src/components/InventoryManagement.tsx`
  (the tab shell; tabs are defined in `src/lib/appTabs.ts`).
- Tabs → main files: Create Order `UnifiedAssetForm.tsx`, View Orders `OrdersTable.tsx`,
  Order Summary `OrderSummaryTable.tsx`, Devices `DevicesTable.tsx`,
  Asset Master `RequestsPanel.tsx` / `CreateRequestDialog.tsx` / `RequestDetailDialog.tsx`,
  Audit `AuditTable.tsx`, Activity `ActivityLogs.tsx`.
- Request approval stages live in `src/lib/requestFlows.ts`.
- Roles: Super Admin, Admin, Operator, Reporter (`users.role`); departments gate tabs and stages.
- Database schema changes go in a new file under `supabase/migrations/`. They are NOT applied
  by Vercel — tell the user they must run the migration in Supabase.

## Commands
- `npm run dev` (http://localhost:8080), `npm run build`, `npm run lint`.
