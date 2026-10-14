import { ROLE_CAPABILITIES, type Capability, type StaffRole } from "@hiya/contracts";

export function capabilitiesForRole(role: string): Capability[] {
  if (!(role in ROLE_CAPABILITIES)) {
    return [];
  }
  return [...ROLE_CAPABILITIES[role as StaffRole]];
}

export function hasCapability(
  granted: readonly Capability[],
  required: Capability,
): boolean {
  return granted.includes(required);
}
