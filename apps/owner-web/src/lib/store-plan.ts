/**
 * Client helpers for org store-seat plan.
 * Prefer API `/billing/plan` + `POST /stores`. Session MOCK ledger is a
 * fallback when API/DB is unavailable — always labeled MOCK.
 */

export const INCLUDED_STORE_SEATS = 1;
export const EXTRA_STORE_PRICE_MINOR = 10_000;

export type OrgPlan = {
  organizationId: string;
  includedStoreSeats: number;
  additionalStorePriceMinor: number;
  currency: string;
  billingMode: "MOCK";
  activeStoreCount: number;
  billableExtraStores: number;
  monthlyTotalMinor: number;
  honesty: string;
  source: "api" | "session-mock";
};

const PLAN_KEY = "hiya.org.plan.mock";

export function computePlan(
  organizationId: string,
  activeStoreCount: number,
  source: "api" | "session-mock" = "session-mock",
): OrgPlan {
  const billableExtraStores = Math.max(
    0,
    activeStoreCount - INCLUDED_STORE_SEATS,
  );
  return {
    organizationId,
    includedStoreSeats: INCLUDED_STORE_SEATS,
    additionalStorePriceMinor: EXTRA_STORE_PRICE_MINOR,
    currency: "USD",
    billingMode: "MOCK",
    activeStoreCount,
    billableExtraStores,
    monthlyTotalMinor: billableExtraStores * EXTRA_STORE_PRICE_MINOR,
    honesty:
      "MOCK billing — no Stripe/card charge. Base 1 store included; each additional store +$100/mo on the plan ledger only.",
    source,
  };
}

export function formatUsdMinor(minor: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

export function readMockPlanNote(): string | null {
  try {
    return sessionStorage.getItem(PLAN_KEY);
  } catch {
    return null;
  }
}

export function writeMockPlanNote(note: string) {
  sessionStorage.setItem(PLAN_KEY, note);
}
