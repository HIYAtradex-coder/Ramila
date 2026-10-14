import type { FastifyPluginAsync } from "fastify";
import {
  ApproveInvoiceRequest,
  CreateInvoiceProposalRequest,
  InvoiceScanProposeRequest,
} from "@hiya/contracts";
import { AuthzError, requireStoreCapability } from "../services/authz.js";
import {
  approveAndPostInvoice,
  createInvoiceProposal,
} from "../services/invoice.js";
import { proposeInvoiceFromScan } from "../services/invoice-scan.js";

const invoiceRoutes: FastifyPluginAsync = async (app) => {
  /** Camera/file → DEMO AI propose → invoice proposal. Never posts inventory/money. */
  app.post(
    "/invoices/scan/propose",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = InvoiceScanProposeRequest.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "Invalid invoice scan",
          code: "validation_error",
          details: parsed.error.flatten(),
        });
      }

      try {
        await requireStoreCapability(
          app.prisma,
          request.actor,
          parsed.data.storeId,
          "invoice:ingest",
        );
        const result = await proposeInvoiceFromScan(
          app.prisma,
          request.actor,
          parsed.data,
        );
        return reply.code(201).send(result);
      } catch (err) {
        if (err instanceof AuthzError) {
          return reply.code(err.statusCode).send({ error: err.message, code: err.code });
        }
        throw err;
      }
    },
  );

  app.post(
    "/invoices/proposals",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = CreateInvoiceProposalRequest.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "Invalid invoice proposal",
          code: "validation_error",
          details: parsed.error.flatten(),
        });
      }

      try {
        await requireStoreCapability(
          app.prisma,
          request.actor,
          parsed.data.storeId,
          "invoice:ingest",
        );
        const invoice = await createInvoiceProposal(
          app.prisma,
          request.actor,
          parsed.data,
        );
        return reply.code(201).send({
          id: invoice.id,
          storeId: invoice.storeId,
          vendorName: invoice.vendorName,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          totalMinor: invoice.totalMinor,
          currency: invoice.currency,
          lineCount: invoice.lines.length,
          inventoryPosted: false,
        });
      } catch (err) {
        if (err instanceof AuthzError) {
          return reply.code(err.statusCode).send({ error: err.message, code: err.code });
        }
        throw err;
      }
    },
  );

  app.get(
    "/stores/:storeId/invoices",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { storeId } = request.params as { storeId: string };
      try {
        await requireStoreCapability(
          app.prisma,
          request.actor,
          storeId,
          "invoice:review",
        );
      } catch (err) {
        if (err instanceof AuthzError) {
          return reply.code(err.statusCode).send({ error: err.message, code: err.code });
        }
        throw err;
      }

      const invoices = await app.prisma.invoiceDocument.findMany({
        where: {
          storeId,
          organizationId: request.actor.organizationId,
        },
        include: { _count: { select: { lines: true } } },
        orderBy: { createdAt: "desc" },
      });

      return {
        invoices: invoices.map((inv) => ({
          id: inv.id,
          storeId: inv.storeId,
          vendorName: inv.vendorName,
          invoiceNumber: inv.invoiceNumber,
          status: inv.status,
          totalMinor: inv.totalMinor,
          currency: inv.currency,
          lineCount: inv._count.lines,
          postedAt: inv.postedAt,
        })),
      };
    },
  );

  app.post(
    "/invoices/:invoiceId/approve",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { invoiceId } = request.params as { invoiceId: string };
      const parsed = ApproveInvoiceRequest.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "Invalid approve payload",
          code: "validation_error",
          details: parsed.error.flatten(),
        });
      }

      const invoice = await app.prisma.invoiceDocument.findFirst({
        where: {
          id: invoiceId,
          organizationId: request.actor.organizationId,
        },
      });
      if (!invoice) {
        return reply.code(404).send({ error: "Invoice not found", code: "not_found" });
      }

      try {
        await requireStoreCapability(
          app.prisma,
          request.actor,
          invoice.storeId,
          "invoice:approve",
        );
        const posted = await approveAndPostInvoice(
          app.prisma,
          request.actor,
          invoiceId,
          parsed.data.approvalPin,
          parsed.data.idempotencyKey,
        );
        return {
          id: posted.id,
          status: posted.status,
          postedAt: posted.postedAt,
          inventoryPosted: posted.status === "posted",
          humanApproved: true,
        };
      } catch (err) {
        if (err instanceof AuthzError) {
          return reply.code(err.statusCode).send({ error: err.message, code: err.code });
        }
        throw err;
      }
    },
  );
};

export default invoiceRoutes;
