import { Role } from "@prisma/client";

/** Roles that can be assigned when creating or editing users in User Management. */
export const USER_ASSIGNABLE_ROLES = [Role.RECEPTIONIST, Role.ADMIN] as const;

export type UserAssignableRole = (typeof USER_ASSIGNABLE_ROLES)[number];

export const USER_ROLE_OPTIONS: { value: UserAssignableRole; label: string }[] = [
  { value: Role.RECEPTIONIST, label: "Receptionist" },
  { value: Role.ADMIN, label: "Admin" },
];

export function isUserAssignableRole(value: string): value is UserAssignableRole {
  return USER_ASSIGNABLE_ROLES.includes(value as UserAssignableRole);
}
