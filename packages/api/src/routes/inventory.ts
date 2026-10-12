import type { FastifyPluginAsync } from "fastify";
import { AuthzError, requireStoreCapability } from "../services/authz.js";

const inventoryRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/stores/:storeId/inventory",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { storeId } = request.params as { storeId: string };
      try {
        await requireStoreCapability(
          app.prisma,
          request.actor,
          storeId,
          "inventory:read",
        );
      } catch (err) {
        if (err instanceof AuthzError) {
          return reply.code(err.statusCode).send({ error: err.message, code: err.code });
        }
        throw err;
      }

      const items = await app.prisma.inventoryItem.findMany({
        where: { storeId },
        orderBy: { skuCode: "asc" },
      });

      return {
        items: items.map((i) => ({
          id: i.id,
          storeId: i.storeId,
          skuCode: i.skuCode,
          name: i.name,
          onHandEaches: i.onHandEaches,
        })),
      };
    },
  );
};

export default inventoryRoutes;
