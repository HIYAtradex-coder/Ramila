import type { ProfitabilityPeriod } from "@hiya/contracts";

export type PeriodWindow = {
  period: ProfitabilityPeriod;
  start: Date;
  end: Date;
  anchor: Date;
};

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Period windows for profitability:
 * - WEEKLY: 7 UTC days ending on the anchor day (inclusive start, exclusive end+1d)
 * - BIWEEKLY: rolling 14 UTC days ending on the anchor day
 * - MONTHLY: calendar UTC month containing anchor
 * - YEARLY: calendar UTC year containing anchor
 *
 * Windows are [start, end) where end is exclusive.
 */
export function periodWindow(
  period: ProfitabilityPeriod,
  anchorInput: Date = new Date(),
): PeriodWindow {
  const anchor = startOfUtcDay(anchorInput);

  if (period === "WEEKLY") {
    const end = new Date(anchor.getTime() + 86_400_000);
    const start = new Date(end.getTime() - 7 * 86_400_000);
    return { period, start, end, anchor };
  }

  if (period === "BIWEEKLY") {
    const end = new Date(anchor.getTime() + 86_400_000);
    const start = new Date(end.getTime() - 14 * 86_400_000);
    return { period, start, end, anchor };
  }

  if (period === "MONTHLY") {
    const start = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
    const end = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 1));
    return { period, start, end, anchor };
  }

  // YEARLY
  const start = new Date(Date.UTC(anchor.getUTCFullYear(), 0, 1));
  const end = new Date(Date.UTC(anchor.getUTCFullYear() + 1, 0, 1));
  return { period, start, end, anchor };
}

export function parseAnchor(anchor?: string): Date {
  if (!anchor) return new Date();
  const d = new Date(anchor);
  if (Number.isNaN(d.getTime())) {
    throw new Error("INVALID_ANCHOR");
  }
  return d;
}
