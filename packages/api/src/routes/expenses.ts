import type { FastifyPluginAsync } from "fastify";
import {
  CreateExpenseRequest,
  PostExpenseRequest,
  VoidExpenseRequest,
} from "@hiya/contracts";
import { AuthzError, requireStoreCapability } from "../services/authz.js";
import {
  createExpenseDraft,
  postExpense,
  toExpenseView,
  voidExpense,
} from "../services/expense.js";

const expenseRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/v1/expenses",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const parsed = CreateExpenseRequest.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "Invalid expense payload",
          code: "validation_error",
          details: parsed.error.flatten(),
        });
      }

      try {
        const expense = await createExpenseDraft(
          app.prisma,
          request.actor,
          parsed.data,
        );
        return reply.code(201).send(expense);
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

  app.get(
    "/v1/expenses",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const q = request.query as {
        locationId?: string;
        status?: string;
      };
      const locationId = q.locationId;
      if (!locationId) {
        return reply.code(400).send({
          error: "locationId is required",
          code: "validation_error",
        });
      }

      try {
        await requireStoreCapability(
          app.prisma,
          request.actor,
          locationId,
          "expense:draft",
        );
      } catch (err) {
        // Readers with report access can list; draft capability covers owner/mgr/bookkeeper
        if (err instanceof AuthzError) {
          try {
            await requireStoreCapability(
              app.prisma,
              request.actor,
              locationId,
              "report:profitability",
            );
          } catch (err2) {
            if (err2 instanceof AuthzError) {
              return reply
                .code(err2.statusCode)
                .send({ error: err2.message, code: err2.code });
            }
            throw err2;
          }
        } else {
          throw err;
        }
      }

      const where: {
        organizationId: string;
        storeId: string;
        status?: string;
      } = {
        organizationId: request.actor.organizationId,
        storeId: locationId,
      };
      if (q.status) where.status = q.status;

      const rows = await app.prisma.operatingExpense.findMany({
        where,
        orderBy: [{ incurredDate: "desc" }, { createdAt: "desc" }],
      });
      return { expenses: rows.map(toExpenseView) };
    },
  );

  app.post(
    "/v1/expenses/:id/post",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = PostExpenseRequest.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({
          error: "Invalid post payload",
          code: "validation_error",
          details: parsed.error.flatten(),
        });
      }

      try {
        const expense = await postExpense(app.prisma, request.actor, id);
        return expense;
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

  app.post(
    "/v1/expenses/:id/void",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = VoidExpenseRequest.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "Void requires a written reason",
          code: "validation_error",
          details: parsed.error.flatten(),
        });
      }

      try {
        const expense = await voidExpense(
          app.prisma,
          request.actor,
          id,
          parsed.data.reason,
        );
        return expense;
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

export default expenseRoutes;
