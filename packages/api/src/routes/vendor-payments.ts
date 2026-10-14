import type { FastifyPluginAsync } from "fastify";
import { RecordVendorPaymentRequest } from "@hiya/contracts";
import { AuthzError, requireStoreCapability } from "../services/authz.js";
import {
  recordVendorPayment,
  toVendorPaymentView,
} from "../services/vendor-payment.js";

const vendorPaymentRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/vendor-payments",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = RecordVendorPaymentRequest.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "Invalid vendor payment",
          code: "validation_error",
          details: parsed.error.flatten(),
        });
      }

      try {
        await requireStoreCapability(
          app.prisma,
          request.actor,
          parsed.data.storeId,
          "payment:record",
        );
        const payment = await recordVendorPayment(
          app.prisma,
          request.actor,
          parsed.data,
        );
        return reply.code(201).send(toVendorPaymentView(payment));
      } catch (err) {
        if (err instanceof AuthzError) {
          return reply.code(err.statusCode).send({ error: err.message, code: err.code });
        }
        throw err;
      }
    },
  );

  app.get(
    "/stores/:storeId/vendor-payments",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { storeId } = request.params as { storeId: string };
      try {
        await requireStoreCapability(
          app.prisma,
          request.actor,
          storeId,
          "payment:read",
        );
      } catch (err) {
        if (err instanceof AuthzError) {
          return reply.code(err.statusCode).send({ error: err.message, code: err.code });
        }
        throw err;
      }

      const rows = await app.prisma.vendorPayment.findMany({
        where: {
          storeId,
          organizationId: request.actor.organizationId,
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      });

      return {
        payments: rows.map(toVendorPaymentView),
        honesty:
          "Vendor payout ledger — cash/check recorded in-app. No bank rail connected for ach_stub/card_stub.",
      };
    },
  );
};

export default vendorPaymentRoutes;
