import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";

/**
 * Staff/owner mobile profitability shell.
 * Talks to GET /v1/reports/profitability when EXPO_PUBLIC_API_URL + token exist.
 * AI never posts money — post remains owner/bookkeeper on web or future mobile post UI.
 */

type Period = "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "YEARLY";

type Report = {
  summary: {
    totalSalesMinor: number | null;
    grossProfitMinor: number | null;
    totalOperatingExpensesMinor: number;
    netProfitBeforeTaxMinor: number | null;
    netMarginPct: number | null;
    postedPurchasesMinor: number;
  };
  counts: { draftExpenses: number; postedExpenses: number };
  dataQuality: { salesDataComplete: boolean; honestyTags: string[] };
  accountingNotice: string;
};

const PERIODS: Period[] = ["WEEKLY", "BIWEEKLY", "MONTHLY", "YEARLY"];
const API = process.env.EXPO_PUBLIC_API_URL ?? "";

function money(minor: number | null | undefined): string {
  if (minor === null || minor === undefined) return "INCOMPLETE";
  const sign = minor < 0 ? "-" : "";
  return `${sign}$${(Math.abs(minor) / 100).toFixed(2)}`;
}

export default function ProfitabilityScreen() {
  const [period, setPeriod] = useState<Period>("WEEKLY");
  const [report, setReport] = useState<Report | null>(null);
  const [status, setStatus] = useState("Set EXPO_PUBLIC_API_URL + token to load live P&L");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const token = process.env.EXPO_PUBLIC_DEMO_TOKEN;
    if (!API || !token) {
      setStatus(
        "Shell ready · wire EXPO_PUBLIC_API_URL and EXPO_PUBLIC_DEMO_TOKEN for live report",
      );
      setReport(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `${API}/v1/reports/profitability?period=${period}`,
        { headers: { authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as Report;
      setReport(body);
      setStatus("");
    } catch (e) {
      setReport(null);
      setStatus(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.brand}>HIYA</Text>
      <Text style={styles.title}>Profitability</Text>
      <Text style={styles.sub}>
        Gross profit from SalesDaily (COGS included). Draft expenses never
        change net. Purchases shown cash-flow only.
      </Text>

      <View style={styles.periodRow}>
        {PERIODS.map((p) => (
          <Pressable
            key={p}
            onPress={() => setPeriod(p)}
            style={[styles.chip, period === p && styles.chipOn]}
          >
            <Text style={styles.chipText}>
              {p === "BIWEEKLY" ? "14-day" : p}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading && <ActivityIndicator color="#00d54b" />}
      {!!status && <Text style={styles.status}>{status}</Text>}

      {report && (
        <View style={styles.netCard}>
          <Text style={styles.netLabel}>Net profit before tax</Text>
          <Text style={styles.netValue}>
            {money(report.summary.netProfitBeforeTaxMinor)}
          </Text>
          <Text style={styles.meta}>
            Sales {money(report.summary.totalSalesMinor)} · GP{" "}
            {money(report.summary.grossProfitMinor)} · Opex{" "}
            {money(report.summary.totalOperatingExpensesMinor)}
          </Text>
          <Text style={styles.meta}>
            Purchases {money(report.summary.postedPurchasesMinor)} (not
            subtracted again)
          </Text>
          {report.counts.draftExpenses > 0 && (
            <Text style={styles.warn}>
              {report.counts.draftExpenses} draft(s) excluded from net
            </Text>
          )}
          <Text style={styles.notice}>{report.accountingNotice}</Text>
          <Text style={styles.demo}>
            {report.dataQuality.honestyTags.join(" · ")}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#09090b",
    padding: 20,
    paddingTop: 56,
    gap: 10,
  },
  brand: { color: "#00d54b", fontWeight: "700", fontSize: 14, letterSpacing: 2 },
  title: { color: "#f4f4f5", fontSize: 28, fontWeight: "700" },
  sub: { color: "#8b8b92", fontSize: 14, lineHeight: 20, marginBottom: 8 },
  periodRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: "#26262c",
    backgroundColor: "#1c1c20",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  chipOn: { borderColor: "#00d54b", backgroundColor: "#12321f" },
  chipText: { color: "#f4f4f5", fontSize: 12, fontWeight: "600" },
  status: { color: "#8b8b92", fontSize: 13 },
  netCard: {
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#121214",
    borderWidth: 1,
    borderColor: "#1f3d2a",
    gap: 6,
  },
  netLabel: {
    color: "#8b8b92",
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  netValue: { color: "#f4f4f5", fontSize: 32, fontWeight: "700" },
  meta: { color: "#c4c4c8", fontSize: 13 },
  warn: { color: "#ed8b3b", fontSize: 13, fontWeight: "600", marginTop: 4 },
  notice: { color: "#8b8b92", fontSize: 12, lineHeight: 18, marginTop: 8 },
  demo: { color: "#5a6b62", fontSize: 11, marginTop: 4 },
});
