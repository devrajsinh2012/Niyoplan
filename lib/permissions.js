export const ORG_ROLE_KEYS = ['admin', 'pm', 'qa', 'developer', 'member', 'viewer'];

export const PERMISSION_DEFINITIONS = [
  {
    key: 'create_issue',
    label: 'Create Issues',
    description: 'Can create new project issues/cards.'
  },
  {
    key: 'edit_issue',
    label: 'Edit Issues',
    description: 'Can update issue fields and details.'
  },
  {
    key: 'delete_issue',
    label: 'Delete Issues',
    description: 'Can permanently delete issues/cards.'
  },
  {
    key: 'manage_members',
    label: 'Manage Members',
    description: 'Can invite members and update member roles.'
  },
  {
    key: 'manage_sprints',
    label: 'Manage Sprints',
    description: 'Can create/update sprint plans.'
  },
  {
    key: 'manage_settings',
    label: 'Manage Settings',
    description: 'Can update project and organization settings.'
  }
];

const DEFAULT_ROLE_PERMISSIONS = {
  admin: ['create_issue', 'edit_issue', 'delete_issue', 'manage_members', 'manage_sprints', 'manage_settings'],
  pm: ['create_issue', 'edit_issue', 'manage_members', 'manage_sprints'],
  qa: ['create_issue', 'edit_issue'],
  developer: ['create_issue', 'edit_issue'],
  member: ['create_issue'],
  viewer: []
};

const PERMISSION_KEYS = PERMISSION_DEFINITIONS.map((permission) => permission.key);

export function getDefaultRolePermissionMatrix() {
  return ORG_ROLE_KEYS.reduce((roleAcc, role) => {
    roleAcc[role] = PERMISSION_KEYS.reduce((permissionAcc, permissionKey) => {
      permissionAcc[permissionKey] = DEFAULT_ROLE_PERMISSIONS[role]?.includes(permissionKey) || false;
      return permissionAcc;
    }, {});
    return roleAcc;
  }, {});
}

export function applyPermissionRows(rows = []) {
  const matrix = getDefaultRolePermissionMatrix();

  rows.forEach((row) => {
    if (!row || !ORG_ROLE_KEYS.includes(row.role) || !PERMISSION_KEYS.includes(row.permission_key)) {
      return;
    }

    matrix[row.role][row.permission_key] = Boolean(row.is_allowed);
  });

  return matrix;
}

export function normalizeRolePermissionPayload(payload = {}) {
  const matrix = getDefaultRolePermissionMatrix();

  ORG_ROLE_KEYS.forEach((role) => {
    const incomingRolePermissions = payload?.[role] || {};

    PERMISSION_KEYS.forEach((permissionKey) => {
      if (Object.prototype.hasOwnProperty.call(incomingRolePermissions, permissionKey)) {
        matrix[role][permissionKey] = Boolean(incomingRolePermissions[permissionKey]);
      }
    });
  });

  return matrix;
}

export function matrixToPermissionRows(organizationId, matrix) {
  const nowIso = new Date().toISOString();
  const normalizedMatrix = normalizeRolePermissionPayload(matrix);

  return ORG_ROLE_KEYS.flatMap((role) => {
    return PERMISSION_KEYS.map((permissionKey) => ({
      organization_id: organizationId,
      role,
      permission_key: permissionKey,
      is_allowed: Boolean(normalizedMatrix?.[role]?.[permissionKey]),
      updated_at: nowIso,
    }));
  });
}

export function roleHasPermission(matrix, role, permissionKey) {
  if (!matrix || !role || !permissionKey) {
    return false;
  }

  return Boolean(matrix?.[role]?.[permissionKey]);
}
