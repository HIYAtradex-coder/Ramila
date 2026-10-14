import type { FastifyPluginAsync } from "fastify";
import {
  capabilitiesForRole,
  hasCapability,
} from "../lib/capabilities.js";
import { getOrgPlanView } from "../services/plan.js";

const billingRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/billing/plan",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
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
      const canRead = memberships.some((m) =>
        hasCapability(capabilitiesForRole(m.role), "org:read"),
      );
      if (!canRead) {
        return reply.code(403).send({
          error: "Missing capability: org:read",
          code: "capability_denied",
        });
      }

      return getOrgPlanView(app.prisma, request.actor.organizationId);
    },
  );
};

export default billingRoutes;
