import type {
  CreateExpenseRequest,
  ExpenseCategory,
  ExpenseSourceType,
  ExpenseStatus,
} from "@hiya/contracts";
import type { OperatingExpense, PrismaClient } from "@hiya/db";
import { AuthzError, type ActorContext, requireStoreCapability } from "./authz.js";
import { appendAudit } from "./audit.js";

export type ExpenseViewModel = {
  id: string;
  storeId: string;
  category: ExpenseCategory;
  amountMinor: number;
  incurredDate: string;
  description: string;
  sourceType: ExpenseSourceType;
  status: ExpenseStatus;
  vendorName: string | null;
  paymentMethod: string | null;
  receiptUrl: string | null;
  sourceReference: string | null;
  attachmentId: string | null;
  recurring: boolean;
  postedAt: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  createdAt: string;
};

function toDateOnly(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00.000Z`);
  }
  return new Date(value);
}

function dateOnlyIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function toExpenseView(row: OperatingExpense): ExpenseViewModel {
  return {
    id: row.id,
    storeId: row.storeId,
    category: row.category as ExpenseCategory,
    amountMinor: row.amountMinor,
    incurredDate: dateOnlyIso(row.incurredDate),
    description: row.description,
    sourceType: row.sourceType as ExpenseSourceType,
    status: row.status as ExpenseStatus,
    vendorName: row.vendorName,
    paymentMethod: row.paymentMethod,
    receiptUrl: row.receiptUrl,
    sourceReference: row.sourceReference,
    attachmentId: row.attachmentId,
    recurring: row.recurring,
    postedAt: row.postedAt?.toISOString() ?? null,
    voidedAt: row.voidedAt?.toISOString() ?? null,
    voidReason: row.voidReason,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createExpenseDraft(
  db: PrismaClient,
  actor: ActorContext,
  input: CreateExpenseRequest,
): Promise<ExpenseViewModel> {
  await requireStoreCapability(db, actor, input.storeId, "expense:draft");

  if (input.amountMinor <= 0) {
    throw new AuthzError("Expense amount must be positive", 400, "validation_error");
  }

  const existing = await db.operatingExpense.findUnique({
    where: {
      organizationId_idempotencyKey: {
        organizationId: actor.organizationId,
        idempotencyKey: input.idempotencyKey,
      },
    },
  });
  if (existing) {
    return toExpenseView(existing);
  }

  const incurredDate = toDateOnly(input.incurredDate);
  const row = await db.operatingExpense.create({
    data: {
      organizationId: actor.organizationId,
      storeId: input.storeId,
      category: input.category,
      amountMinor: input.amountMinor,
      incurredDate,
      description: input.description,
      sourceType: input.sourceType,
      idempotencyKey: input.idempotencyKey,
      createdById: actor.userId,
      status: "draft",
      vendorName: input.vendorName ?? null,
      paymentMethod: input.paymentMethod ?? null,
      receiptUrl: input.receiptUrl ?? null,
      sourceReference: input.sourceReference ?? null,
      attachmentId: input.attachmentId ?? null,
      recurring: input.recurring ?? false,
    },
  });

  await appendAudit(db, {
    organizationId: actor.organizationId,
    storeId: input.storeId,
    actorUserId: actor.userId,
    action: "expense.created",
    entityType: "OperatingExpense",
    entityId: row.id,
    payloadJson: {
      category: row.category,
      amountMinor: row.amountMinor,
      status: row.status,
      sourceType: row.sourceType,
    },
  });

  return toExpenseView(row);
}

export async function postExpense(
  db: PrismaClient,
  actor: ActorContext,
  expenseId: string,
): Promise<ExpenseViewModel> {
  const expense = await db.operatingExpense.findFirst({
    where: { id: expenseId, organizationId: actor.organizationId },
  });
  if (!expense) {
    throw new AuthzError("Expense not found", 404, "not_found");
  }

  await requireStoreCapability(db, actor, expense.storeId, "expense:post");

  if (expense.status === "posted") {
    return toExpenseView(expense);
  }
  if (expense.status === "voided") {
    throw new AuthzError("Cannot post a voided expense", 409, "expense_voided");
  }
  if (expense.status !== "draft") {
    throw new AuthzError("Expense is not draft", 409, "invalid_status");
  }

  const posted = await db.operatingExpense.update({
    where: { id: expense.id },
    data: {
      status: "posted",
      postedAt: new Date(),
      postedById: actor.userId,
    },
  });

  await appendAudit(db, {
    organizationId: actor.organizationId,
    storeId: expense.storeId,
    actorUserId: actor.userId,
    action: "expense.posted",
    entityType: "OperatingExpense",
    entityId: posted.id,
    payloadJson: {
      category: posted.category,
      amountMinor: posted.amountMinor,
      status: posted.status,
    },
  });

  return toExpenseView(posted);
}

export async function voidExpense(
  db: PrismaClient,
  actor: ActorContext,
  expenseId: string,
  reason: string,
): Promise<ExpenseViewModel> {
  const expense = await db.operatingExpense.findFirst({
    where: { id: expenseId, organizationId: actor.organizationId },
  });
  if (!expense) {
    throw new AuthzError("Expense not found", 404, "not_found");
  }

  await requireStoreCapability(db, actor, expense.storeId, "expense:void");

  if (expense.status === "voided") {
    return toExpenseView(expense);
  }

  const voided = await db.operatingExpense.update({
    where: { id: expense.id },
    data: {
      status: "voided",
      voidedAt: new Date(),
      voidedById: actor.userId,
      voidReason: reason,
    },
  });

  await appendAudit(db, {
    organizationId: actor.organizationId,
    storeId: expense.storeId,
    actorUserId: actor.userId,
    action: "expense.voided",
    entityType: "OperatingExpense",
    entityId: voided.id,
    payloadJson: {
      category: voided.category,
      amountMinor: voided.amountMinor,
      status: voided.status,
      reason,
      priorStatus: expense.status,
    },
  });

  return toExpenseView(voided);
}
