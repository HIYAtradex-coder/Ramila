import type { FastifyPluginAsync } from "fastify";
import { AddStoreRequest } from "@hiya/contracts";
import { appendAudit } from "../services/audit.js";
import { getOrgPlanView, ensureOrgPlan } from "../services/plan.js";
import {
  capabilitiesForRole,
  hasCapability,
} from "../lib/capabilities.js";

const storeRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/stores",
    { preHandler: [app.authenticate] },
    async (request) => {
      const memberships = await app.prisma.storeMembership.findMany({
        where: {
          userId: request.actor.userId,
          active: true,
          store: { organizationId: request.actor.organizationId, active: true },
        },
        include: { store: true },
      });

      return {
        stores: memberships.map((m) => ({
          id: m.store.id,
          code: m.store.code,
          name: m.store.name,
          storeType: m.store.storeType,
          timezone: m.store.timezone,
          role: m.role,
          config: m.store.configJson,
        })),
      };
    },
  );

  /**
   * Add a store seat. Base plan includes 1 store; each additional is +$100/mo
   * on the MOCK billing ledger (no real card charge).
   */
  app.post(
    "/stores",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = AddStoreRequest.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "Invalid add-store payload",
          code: "validation_error",
          details: parsed.error.flatten(),
        });
      }

      // Org manage from any active owner/manager membership
      const memberships = await app.prisma.storeMembership.findMany({
        where: {
          userId: request.actor.userId,
          active: true,
          store: {
            organizationId: request.actor.organizationId,
            active: true,
          },
        },
      });
      const canManage = memberships.some((m) =>
        hasCapability(capabilitiesForRole(m.role), "org:manage"),
      );
      if (!canManage && memberships.length > 0) {
        return reply.code(403).send({
          error: "Missing capability: org:manage",
          code: "capability_denied",
        });
      }
      if (!canManage && memberships.length === 0) {
        const user = await app.prisma.user.findFirst({
          where: {
            id: request.actor.userId,
            organizationId: request.actor.organizationId,
            active: true,
          },
        });
        if (!user) {
          return reply
            .code(401)
            .send({ error: "Unauthorized", code: "unauthorized" });
        }
      }

      const { code, name, storeType } = parsed.data;
      const normalizedCode = code.toUpperCase();

      await ensureOrgPlan(app.prisma, request.actor.organizationId);

      const existing = await app.prisma.store.findUnique({
        where: {
          organizationId_code: {
            organizationId: request.actor.organizationId,
            code: normalizedCode,
          },
        },
      });
      if (existing) {
        return reply.code(409).send({
          error: "Store code already exists in this organization",
          code: "store_code_conflict",
        });
      }

      const before = await getOrgPlanView(
        app.prisma,
        request.actor.organizationId,
      );

      const store = await app.prisma.store.create({
        data: {
          organizationId: request.actor.organizationId,
          code: normalizedCode,
          name,
          storeType,
          configJson: {},
          memberships: {
            create: {
              userId: request.actor.userId,
              role: "owner",
              active: true,
            },
          },
        },
      });

      const plan = await getOrgPlanView(
        app.prisma,
        request.actor.organizationId,
      );

      await appendAudit(app.prisma, {
        organizationId: request.actor.organizationId,
        storeId: store.id,
        actorUserId: request.actor.userId,
        action: "store.add_mock_billed",
        entityType: "Store",
        entityId: store.id,
        payloadJson: {
          code: store.code,
          billingMode: "MOCK",
          additionalStorePriceMinor: plan.additionalStorePriceMinor,
          billableExtraStoresBefore: before.billableExtraStores,
          billableExtraStoresAfter: plan.billableExtraStores,
          monthlyTotalMinorAfter: plan.monthlyTotalMinor,
          note: "MOCK ledger only — no Stripe charge",
        },
      });

      return {
        store: {
          id: store.id,
          code: store.code,
          name: store.name,
          storeType: store.storeType,
          role: "owner",
          capabilities: capabilitiesForRole("owner"),
        },
        plan,
        membership: {
          storeId: store.id,
          storeName: store.name,
          storeCode: store.code,
          role: "owner",
          capabilities: capabilitiesForRole("owner"),
        },
      };
    },
  );
};

export default storeRoutes;
