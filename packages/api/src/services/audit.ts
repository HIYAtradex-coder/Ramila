import type { PrismaClient, Prisma } from "@hiya/db";

export type AuditWrite = {
  organizationId: string;
  storeId?: string | null;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  payloadJson?: Prisma.InputJsonValue;
};

/**
 * Append-only audit writer. Never update or delete prior AuditEvent rows.
 */
export async function appendAudit(
  db: PrismaClient,
  event: AuditWrite,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const client = tx ?? db;
  await client.auditEvent.create({
    data: {
      organizationId: event.organizationId,
      storeId: event.storeId ?? null,
      actorUserId: event.actorUserId ?? null,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId ?? null,
      payloadJson: event.payloadJson ?? {},
    },
  });
}
