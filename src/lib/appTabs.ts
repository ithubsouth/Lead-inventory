export interface AppTabDef {
  key: string;
  label: string;
  /** Roles that can never see this tab regardless of grants */
  deniedRoles?: string[];
}

/**
 * Single source of truth for dashboard tabs.
 * Add a new tab here and it automatically appears in User Management → Tab Access.
 */
export const APP_TABS: AppTabDef[] = [
  { key: 'create', label: 'Create Order', deniedRoles: ['Reporter'] },
  { key: 'view', label: 'View Orders' },
  { key: 'order', label: 'Order Summary' },
  { key: 'devices', label: 'Devices' },
  { key: 'requests', label: 'Approvals' },
  { key: 'audit', label: 'Audit View' },
  { key: 'activity', label: 'Activity Logs' },
];

export const ALL_TAB_KEYS = APP_TABS.map((t) => t.key);

/** Departments other than Administrators only get Approvals by default. */
export const DEFAULT_TAB_KEYS = ['requests'];

export const ADMIN_DEPARTMENT = 'Administrators';

/** Departments whose members only work with their own warehouse/location. */
export const LOCATION_SCOPED_DEPARTMENTS = ['Technology Team', 'Supply Chain Management'];

export const isLocationScopedDept = (dept?: string | null) =>
  !!dept && LOCATION_SCOPED_DEPARTMENTS.includes(dept);

export const hasFullAccess = (opts: { role?: string | null; department?: string | null }) =>
  opts.role === 'Super Admin' || opts.department === ADMIN_DEPARTMENT;

/**
 * Resolves which tab keys a user may see.
 * - Administrators department / Super Admin → everything
 * - Explicit grants (users.tab_access) → those tabs
 * - Otherwise → Approvals only
 */
export function resolveTabAccess(opts: {
  role?: string | null;
  department?: string | null;
  tabAccess?: string[] | null;
}): string[] {
  const roleAllowed = (k: string) => {
    const def = APP_TABS.find((t) => t.key === k);
    if (!def) return false;
    return !(def.deniedRoles || []).includes(opts.role || '');
  };

  if (hasFullAccess(opts)) return ALL_TAB_KEYS.filter(roleAllowed);

  const granted = (opts.tabAccess || []).filter((k) => ALL_TAB_KEYS.includes(k));
  const keys = granted.length ? granted : DEFAULT_TAB_KEYS;
  const resolved = ALL_TAB_KEYS.filter((k) => keys.includes(k) && roleAllowed(k));
  return resolved.length ? resolved : ['requests'];
}
