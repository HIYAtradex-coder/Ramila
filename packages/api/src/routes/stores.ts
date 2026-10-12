import type { FastifyPluginAsync } from "fastify";

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
          // Fuel modules hidden for non-fuel via config — clients should respect this
          config: m.store.configJson,
        })),
      };
    },
  );
};

export default storeRoutes;
