export type RequestType = 'new_hardware' | 'asset_movement';
export type RequestStatus = 'open' | 'approved' | 'rejected' | 'revoked' | 'closed';
export type StageAction = 'pending' | 'approved' | 'rejected' | 'revoked' | 'commented' | 'submitted';

export interface StageDef {
  key: string;
  label: string;
  dept: string;
  hint?: string;
}

export const NEW_HARDWARE_FLOW: StageDef[] = [
  { key: 'proc_add_serials', label: 'Add serials, PO/SO, warehouse, invoice', dept: 'Procurement Team' },
  { key: 'tech_verify_serials', label: 'Verify serials', dept: 'Technology Team' },
  { key: 'scm_take_grn', label: 'Take GRN', dept: 'Supply Chain Management' },
  { key: 'finance_approve', label: 'Finance approval + generate Asset Code', dept: 'Finance' },
];

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
  new_hardware: 'New Hardware Procurement',
  asset_movement: 'Existing Hardware Asset Movement',
};

export const canActOnStage = (opts: {
  role: string | null;
  department: string | null;
  assignedDept: string;
}) => {
  const { role, department, assignedDept } = opts;
  if (role === 'Super Admin') return true;
  if (role !== 'Admin') return false;
  return department === assignedDept || department === 'Administrators';
};
