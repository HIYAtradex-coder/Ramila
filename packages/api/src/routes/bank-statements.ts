import type { FastifyPluginAsync } from "fastify";
import { UploadBankStatementRequest } from "@hiya/contracts";
import { AuthzError, requireStoreCapability } from "../services/authz.js";
import {
  BANK_SYNC_STUB,
  proposeBankStatementMatches,
  toBankStatementView,
  uploadBankStatement,
} from "../services/bank-statement.js";

const bankStatementRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/bank-sync/status",
    { preHandler: [app.authenticate] },
    async () => BANK_SYNC_STUB,
  );

  app.post(
    "/bank-statements",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = UploadBankStatementRequest.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "Invalid bank statement upload",
          code: "validation_error",
          details: parsed.error.flatten(),
        });
      }

      try {
        await requireStoreCapability(
          app.prisma,
          request.actor,
          parsed.data.storeId,
          "attachment:upload",
        );
        const row = await uploadBankStatement(
          app.prisma,
          request.actor,
          parsed.data,
        );
        return reply.code(201).send(toBankStatementView(row));
      } catch (err) {
        if (err instanceof AuthzError) {
          return reply.code(err.statusCode).send({ error: err.message, code: err.code });
        }
        throw err;
      }
    },
  );

  app.get(
    "/stores/:storeId/bank-statements",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { storeId } = request.params as { storeId: string };
      try {
        await requireStoreCapability(
          app.prisma,
          request.actor,
          storeId,
          "attachment:read",
        );
      } catch (err) {
        if (err instanceof AuthzError) {
          return reply.code(err.statusCode).send({ error: err.message, code: err.code });
        }
        throw err;
      }

      const rows = await app.prisma.bankStatementAttachment.findMany({
        where: {
          storeId,
          organizationId: request.actor.organizationId,
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      });

      return {
        attachments: rows.map(toBankStatementView),
        bankSync: BANK_SYNC_STUB,
      };
    },
  );

  app.get(
    "/bank-statements/:attachmentId",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { attachmentId } = request.params as { attachmentId: string };
      const row = await app.prisma.bankStatementAttachment.findFirst({
        where: {
          id: attachmentId,
          organizationId: request.actor.organizationId,
        },
      });
      if (!row) {
        return reply.code(404).send({ error: "Attachment not found", code: "not_found" });
      }

      try {
        await requireStoreCapability(
          app.prisma,
          request.actor,
          row.storeId,
          "attachment:read",
        );
      } catch (err) {
        if (err instanceof AuthzError) {
          return reply.code(err.statusCode).send({ error: err.message, code: err.code });
        }
        throw err;
      }

      return toBankStatementView(row);
    },
  );

  /** DEMO AI propose matches — never posts money/expenses */
  app.post(
    "/bank-statements/:attachmentId/propose-matches",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { attachmentId } = request.params as { attachmentId: string };
      const row = await app.prisma.bankStatementAttachment.findFirst({
        where: {
          id: attachmentId,
          organizationId: request.actor.organizationId,
        },
      });
      if (!row) {
        return reply.code(404).send({ error: "Attachment not found", code: "not_found" });
      }

      try {
        await requireStoreCapability(
          app.prisma,
          request.actor,
          row.storeId,
          "attachment:read",
        );
      } catch (err) {
        if (err instanceof AuthzError) {
          return reply.code(err.statusCode).send({ error: err.message, code: err.code });
        }
        throw err;
      }

      return proposeBankStatementMatches(row);
    },
  );
};

export default bankStatementRoutes;
