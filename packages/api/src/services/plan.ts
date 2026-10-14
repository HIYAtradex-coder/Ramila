import type { PrismaClient } from "@hiya/db";
import {
  EXTRA_STORE_PRICE_MINOR,
  INCLUDED_STORE_SEATS,
  type OrgPlanView,
} from "@hiya/contracts";

export async function ensureOrgPlan(
  db: PrismaClient,
  organizationId: string,
) {
  return db.organizationPlan.upsert({
    where: { organizationId },
    update: {},
    create: {
      organizationId,
      includedStoreSeats: INCLUDED_STORE_SEATS,
      additionalStorePriceMinor: EXTRA_STORE_PRICE_MINOR,
      currency: "USD",
      billingMode: "MOCK",
    },
  });
}

export async function getOrgPlanView(
  db: PrismaClient,
  organizationId: string,
): Promise<OrgPlanView> {
  const plan = await ensureOrgPlan(db, organizationId);
  const activeStoreCount = await db.store.count({
    where: { organizationId, active: true },
  });
  const billableExtraStores = Math.max(
    0,
    activeStoreCount - plan.includedStoreSeats,
  );
  const monthlyTotalMinor =
    billableExtraStores * plan.additionalStorePriceMinor;

  return {
    organizationId,
    includedStoreSeats: plan.includedStoreSeats,
    additionalStorePriceMinor: plan.additionalStorePriceMinor,
    currency: plan.currency,
    billingMode: "MOCK",
    activeStoreCount,
    billableExtraStores,
    monthlyTotalMinor,
    honesty:
      "MOCK billing — no Stripe/card charge. Base 1 store included; each additional store +$100/mo on the plan ledger only.",
  };
}
