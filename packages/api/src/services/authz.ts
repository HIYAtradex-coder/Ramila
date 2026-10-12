import type { Capability } from "@hiya/contracts";
import type { PrismaClient } from "@hiya/db";
import { capabilitiesForRole, hasCapability } from "../lib/capabilities.js";

export class AuthzError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(message: string, statusCode = 403, code = "forbidden") {
    super(message);
    this.name = "AuthzError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export type ActorContext = {
  userId: string;
  organizationId: string;
  email: string;
  displayName: string;
};

/**
 * Resolve store membership from the database. Never trust client-supplied
 * organizationId, role, or capabilities.
 */
export async function requireStoreCapability(
  db: PrismaClient,
  actor: ActorContext,
  storeId: string,
  capability: Capability,
): Promise<{ storeId: string; role: string; capabilities: Capability[] }> {
  const membership = await db.storeMembership.findFirst({
    where: {
      userId: actor.userId,
      storeId,
      active: true,
      store: {
        id: storeId,
        organizationId: actor.organizationId,
        active: true,
      },
      user: { active: true, organizationId: actor.organizationId },
    },
    include: { store: true },
  });

  if (!membership) {
    throw new AuthzError("No active membership for this store", 403, "store_scope_denied");
  }

  const capabilities = capabilitiesForRole(membership.role);
  if (!hasCapability(capabilities, capability)) {
    throw new AuthzError(
      `Missing capability: ${capability}`,
      403,
      "capability_denied",
    );
  }

  return { storeId: membership.storeId, role: membership.role, capabilities };
}
