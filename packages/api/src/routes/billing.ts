import type { FastifyPluginAsync } from "fastify";
import { getOrgPlanView } from "../services/plan.js";

const billingRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/billing/plan",
    { preHandler: [app.authenticate] },
    async (request) => {
      return getOrgPlanView(app.prisma, request.actor.organizationId);
    },
  );
};

export default billingRoutes;
