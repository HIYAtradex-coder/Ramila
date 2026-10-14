import { PrismaClient } from "@prisma/client";

export { PrismaClient, Prisma } from "@prisma/client";
export type {
  Organization,
  User,
  Store,
  StoreMembership,
  AuditEvent,
  InventoryItem,
  InventoryMovement,
  InvoiceDocument,
  InvoiceLine,
  SalesDaily,
  OperatingExpense,
} from "@prisma/client";

const globalForPrisma = globalThis as unknown as { hiyaPrisma?: PrismaClient };

export function createPrismaClient(databaseUrl?: string): PrismaClient {
  return new PrismaClient(
    databaseUrl
      ? { datasources: { db: { url: databaseUrl } } }
      : undefined,
  );
}

/** Shared client for app processes. Tests should create isolated clients. */
export const prisma = globalForPrisma.hiyaPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.hiyaPrisma = prisma;
}
