import type { FastifyPluginAsync } from "fastify";

const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/health", async () => ({
    ok: true as const,
    service: "hiya-api" as const,
    version: "0.1.0",
  }));
};

export default healthRoutes;
