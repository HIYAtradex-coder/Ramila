import type { FastifyPluginAsync } from "fastify";
import { ProfitabilityQuery } from "@hiya/contracts";
import { AuthzError } from "../services/authz.js";
import { analyzeProfitabilityReport } from "../services/profitability-analysis.js";
import { buildProfitabilityReport } from "../services/profitability.js";

const profitabilityRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/v1/reports/profitability",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = ProfitabilityQuery.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "Invalid profitability query",
          code: "validation_error",
          details: parsed.error.flatten(),
        });
      }

      try {
        const report = await buildProfitabilityReport(
          app.prisma,
          request.actor,
          {
            period: parsed.data.period,
            locationId: parsed.data.locationId,
            anchor: parsed.data.anchor,
          },
        );
        return report;
      } catch (err) {
        if (err instanceof AuthzError) {
          return reply
            .code(err.statusCode)
            .send({ error: err.message, code: err.code });
        }
        throw err;
      }
    },
  );

  /** Proposal-only auto analysis — same query as the profitability report; never mutates. */
  app.get(
    "/v1/reports/profitability/analysis",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = ProfitabilityQuery.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "Invalid profitability analysis query",
          code: "validation_error",
          details: parsed.error.flatten(),
        });
      }

      try {
        const report = await buildProfitabilityReport(
          app.prisma,
          request.actor,
          {
            period: parsed.data.period,
            locationId: parsed.data.locationId,
            anchor: parsed.data.anchor,
          },
        );
        return analyzeProfitabilityReport(report);
      } catch (err) {
        if (err instanceof AuthzError) {
          return reply
            .code(err.statusCode)
            .send({ error: err.message, code: err.code });
        }
        throw err;
      }
    },
  );
};

export default profitabilityRoutes;
