export type RequestType = 'new_hardware' | 'asset_movement';
export type RequestStatus = 'open' | 'approved' | 'rejected' | 'revoked' | 'closed';
export type StageAction = 'pending' | 'approved' | 'rejected' | 'revoked' | 'commented' | 'submitted';
export type ReceiptIdentity = 'Standard' | 'Missing Serial' | 'Different Serial Received' | 'Damaged asset';

export const getReceiptIdentity = (comment: string | null | undefined): ReceiptIdentity | null => {
  if (!comment) return null;
  const explicit = comment.match(/^Receipt type:\s*(Standard|Missing Serial|Different Serial Received|Damaged asset)\./i)?.[1];
  if (explicit) {
    const normalized = explicit.toLowerCase();
    if (normalized === 'standard') return 'Standard';
    if (normalized === 'missing serial') return 'Missing Serial';
    if (normalized === 'different serial received') return 'Different Serial Received';
    return 'Damaged asset';
  }
  if (/^Not received serial\(s\):/i.test(comment)) return 'Missing Serial';
  if (/^Different serial received\./i.test(comment)) return 'Different Serial Received';
  if (/^Damaged serial\(s\):/i.test(comment)) return 'Damaged asset';
  return null;
};

export interface StageDef {
  key: string;
  label: string;
  dept: string;
  hint?: string;
}

// 1. Planning Team raises the procurement request (what is needed and how many).
// 2. Finance generates the asset codes, one per unit requested. No FA procurement goes
//    ahead without asset codes; NFA requests skip this step.
// 3. Procurement releases the PO (needs the asset codes for FA).
// 4. Once the material reaches the warehouse, Procurement shares the serial numbers
//    against those asset codes.
// 5. Technology verifies the serials physically. 6. SCM takes the GRN and it closes.
// (Existing stage keys are kept so requests already in progress keep working.)
export const NEW_HARDWARE_FLOW: StageDef[] = [
  { key: 'planning_raise_request', label: 'Raise Procurement Request', dept: 'Planning Team' },
  { key: 'finance_approve', label: 'Generate Asset Codes (FA only)', dept: 'Finance' },
  { key: 'proc_release_po', label: 'Release PO', dept: 'Procurement Team' },
  { key: 'proc_add_serials', label: 'Add Serial Numbers (material at WH)', dept: 'Procurement Team' },
  { key: 'tech_verify_serials', label: 'Verify Serial Numbers with Physical Assets', dept: 'Technology Team' },
  { key: 'scm_take_grn', label: 'Take GRN', dept: 'Supply Chain Management' },
];

export const SERIAL_ENTRY_STAGE = 'proc_add_serials';
export const ASSET_CODE_STAGE = 'finance_approve';
export const RELEASE_PO_STAGE = 'proc_release_po';
export const FINANCE_RECEIPT_CONFIRM_STAGE = 'finance_confirm_received_asset_codes';

/** Departments that may raise each request type (Administrators / Super Admin can raise anything). */
export const RAISING_DEPTS: Record<RequestType, string[] | null> = {
  new_hardware: ['Planning Team'],
  asset_movement: null, // anyone
};

export const canRaiseRequest = (
  type: RequestType,
  profile: { role?: string | null; department?: string | null } | null | undefined
) => {
  if (!profile) return false;
  if (profile.role === 'Super Admin' || profile.department === 'Administrators') return true;
  const depts = RAISING_DEPTS[type];
  return !depts || depts.includes(profile.department || '');
};

/**
 * Where "Send back" sends a request. New hardware requests past the serial step go back
 * to Procurement's serial step (they own the serials); otherwise back to whoever raised it.
 */
export const sendBackStage = (type: RequestType, currentKey: string): StageDef => {
  const flow = getFlow(type);
  if (type === 'new_hardware') {
    const entryIdx = flow.findIndex((s) => s.key === SERIAL_ENTRY_STAGE);
    const cur = flow.findIndex((s) => s.key === currentKey);
    if (cur > entryIdx) return flow[entryIdx];
  }
  return flow[0];
};

/** True when an asset group needs an asset code. Anything not explicitly NFA counts as FA. */
export const isFaGroup = (group: string | null | undefined) =>
  (group || '').trim().toUpperCase() !== 'NFA';

/** Stages that don't apply to a request (e.g. asset code for an NFA-only request). */
export const skippedStages = (type: RequestType, opts: { hasFA: boolean }): string[] =>
  type === 'new_hardware' && !opts.hasFA ? [ASSET_CODE_STAGE] : [];

/**
 * Where a request goes after the current stage is approved.
 * - Skips stages that don't apply (asset code for NFA-only requests, PO release when a PO exists).
 * - Goes back first to an earlier asset code / PO release stage that was never signed
 *   off (ever). This catches requests started under an older order, so they still get
 *   asset codes and a PO release before closing.
 * - Skips later stages already signed off since the last send-back (same reason).
 * Returns null when the request should close.
 */
export const nextRequiredStage = (
  type: RequestType,
  currentKey: string,
  opts: { hasFA: boolean; hasPO?: boolean; signedOff: Set<string>; everSignedOff?: Set<string> }
): StageDef | null => {
  const flow = getFlow(type);
  const skip = new Set(skippedStages(type, opts));
  if (type === 'new_hardware' && opts.hasPO) skip.add(RELEASE_PO_STAGE);
  const cur = flow.findIndex((s) => s.key === currentKey);
  if (cur < 0) return null;
  const pending = (s: StageDef, i: number) =>
    i > 0 && s.key !== currentKey && !skip.has(s.key) && !opts.signedOff.has(s.key);
  const catchUp = new Set([ASSET_CODE_STAGE, RELEASE_PO_STAGE]);
  const ever = opts.everSignedOff || opts.signedOff;
  const earlier = flow
    .slice(0, cur)
    .find((s, i) => catchUp.has(s.key) && i > 0 && !skip.has(s.key) && !ever.has(s.key));
  if (earlier) return earlier;
  return flow.slice(cur + 1).find((s, i) => pending(s, cur + 1 + i)) || null;
};


export const ASSET_MOVEMENT_FLOW: StageDef[] = [
  { key: 'planning_raise_sto', label: 'Raise STO request', dept: 'Planning Team' },
  { key: 'scm_process_sto', label: 'Process STO', dept: 'Supply Chain Management' },
  { key: 'sap_request_invoice', label: 'Request invoice from SCM', dept: 'SAP Analyst' },
  { key: 'scm_share_invoice', label: 'Share invoice', dept: 'Supply Chain Management' },
  { key: 'sap_share_pricing', label: 'Share pricing + GRN to Finance', dept: 'SAP Analyst' },
  { key: 'finance_request_serials', label: 'Request serials from Technology Team', dept: 'Finance' },
  { key: 'tech_provide_serials', label: 'Provide serials', dept: 'Technology Team' },
  { key: 'finance_final_approve', label: 'Final approval', dept: 'Finance' },
];

export const getFlow = (type: RequestType): StageDef[] =>
  type === 'new_hardware' ? NEW_HARDWARE_FLOW : ASSET_MOVEMENT_FLOW;

export const nextStage = (type: RequestType, currentKey: string): StageDef | null => {
  const flow = getFlow(type);
  const i = flow.findIndex((s) => s.key === currentKey);
  if (i < 0 || i >= flow.length - 1) return null;
  return flow[i + 1];
};

export const isTerminalStage = (type: RequestType, currentKey: string): boolean => {
  const flow = getFlow(type);
  return flow.findIndex((s) => s.key === currentKey) === flow.length - 1;
};

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  new_hardware: 'New Hardware Procurement (Stock)',
  asset_movement: 'Asset Movement (EH to FA)',
};

// Stages where an Operator of the assigned department may act directly (no admin approval).
// Procurement Operators handle the serial step, including when a request is sent back to it.
// (Each needs a matching database rule — see supabase/migrations.)
export const OPERATOR_ACTIONABLE_STAGES = ['tech_verify_serials', 'proc_add_serials'];

/** "REQ-00042" style number shown everywhere a request is listed. */
export const formatRequestNo = (n: number | null | undefined) =>
  n ? `REQ-${String(n).padStart(5, '0')}` : '';

export const canActOnStage = (opts: {
  role: string | null;
  department: string | null;
  assignedDept: string;
  raisedByRole?: string | null;
  action?: StageAction;
  stageKey?: string | null;
}) => {
  const { role, department, assignedDept, stageKey } = opts;

  if (role === 'Super Admin') return true;
  if (department === 'Administrators' && role === 'Admin') return true;

  // Technology Team Operators can verify serials themselves
  if (
    role === 'Operator' &&
    stageKey &&
    OPERATOR_ACTIONABLE_STAGES.includes(stageKey) &&
    department === assignedDept
  ) {
    return true;
  }

  // Otherwise only the assigned department's Admin can act
  // (e.g. Procurement Admin approving an Operator-raised request)
  if (role !== 'Admin') return false;
  return department === assignedDept;
};
