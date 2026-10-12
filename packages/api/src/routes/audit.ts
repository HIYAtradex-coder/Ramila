import type { FastifyPluginAsync } from "fastify";
import { AuthzError, requireStoreCapability } from "../services/authz.js";

const auditRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/stores/:storeId/audit",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { storeId } = request.params as { storeId: string };
      try {
        await requireStoreCapability(
          app.prisma,
          request.actor,
          storeId,
          "audit:read",
        );
      } catch (err) {
        if (err instanceof AuthzError) {
          return reply.code(err.statusCode).send({ error: err.message, code: err.code });
        }
        throw err;
      }

      const events = await app.prisma.auditEvent.findMany({
        where: {
          organizationId: request.actor.organizationId,
          storeId,
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      return {
        events: events.map((e) => ({
          id: e.id,
          action: e.action,
          entityType: e.entityType,
          entityId: e.entityId,
          actorUserId: e.actorUserId,
          payload: e.payloadJson,
          createdAt: e.createdAt,
        })),
      };
    },
  );
};

export default auditRoutes;
