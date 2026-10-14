import Fastify from "fastify";
import cors from "@fastify/cors";
import type { PrismaClient } from "@hiya/db";
import prismaPlugin from "./plugins/prisma.js";
import authPlugin from "./plugins/auth.js";
import healthRoutes from "./routes/health.js";
import authRoutes from "./routes/auth.js";
import storeRoutes from "./routes/stores.js";
import billingRoutes from "./routes/billing.js";
import inventoryRoutes from "./routes/inventory.js";
import invoiceRoutes from "./routes/invoices.js";
import auditRoutes from "./routes/audit.js";
import expenseRoutes from "./routes/expenses.js";
import profitabilityRoutes from "./routes/profitability.js";

export type BuildAppOptions = {
  prisma?: PrismaClient;
  databaseUrl?: string;
  jwtSecret?: string;
  logger?: boolean;
};

export async function buildApp(opts: BuildAppOptions = {}) {
  const app = Fastify({ logger: opts.logger ?? true });

  await app.register(cors, { origin: true });
  await app.register(prismaPlugin, {
    prisma: opts.prisma,
    databaseUrl: opts.databaseUrl,
  });
  await app.register(authPlugin, {
    jwtSecret: opts.jwtSecret ?? process.env.JWT_SECRET ?? "dev-only-jwt-secret",
  });

  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(storeRoutes);
  await app.register(billingRoutes);
  await app.register(inventoryRoutes);
  await app.register(invoiceRoutes);
  await app.register(auditRoutes);
  await app.register(expenseRoutes);
  await app.register(profitabilityRoutes);

  return app;
}
