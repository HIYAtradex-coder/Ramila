import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack } from "expo-router";

const API = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";

/** Tiny PNG for DEMO propose when no ImagePicker dep is wired yet */
const DEMO_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

/**
 * Mobile invoice capture → POST /invoices/scan/propose.
 * DEMO AI proposes only; never posts inventory. Approve stays on PIN path.
 */
export default function InvoiceScanScreen() {
  const [token, setToken] = useState("");
  const [storeId, setStoreId] = useState("");
  const [handwriting, setHandwriting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function proposeFromCapture(opts?: {
    contentBase64?: string;
    fileName?: string;
    mimeType?: string;
  }) {
    if (!token || !storeId) {
      setError("Set access token + store UUID (from owner login /memberships).");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API}/invoices/scan/propose`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          storeId,
          fileName: opts?.fileName ?? "mobile-capture.jpg",
          mimeType: opts?.mimeType ?? "image/png",
          contentBase64: opts?.contentBase64 ?? DEMO_PNG_B64,
          handwriting,
          captureSource: "mobile",
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof body === "object" && body && "error" in body
            ? String((body as { error: unknown }).error)
            : `Scan failed (${res.status})`,
        );
      }
      const b = body as {
        invoiceId: string;
        status: string;
        inventoryPosted: boolean;
        moneyPosted: boolean;
        aiMode: string;
      };
      setResult(
        `Proposed ${b.invoiceId.slice(0, 8)}… status=${b.status} ai=${b.aiMode}. inventoryPosted=${b.inventoryPosted} moneyPosted=${b.moneyPosted}. Approve with PIN on Invoices — AI cannot post.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Invoice scan" }} />
      <Text style={styles.title}>Camera / AI propose</Text>
      <Text style={styles.body}>
        Capture feeds DEMO AI field proposals into the invoice pipeline. Printed
        and handwritten invoices are supported as proposes only — human review +
        PIN approve still required before stock posts.
      </Text>

      <Text style={styles.label}>API access token</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        value={token}
        onChangeText={setToken}
        placeholder="Bearer from /auth/login"
      />
      <Text style={styles.label}>Store ID</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        value={storeId}
        onChangeText={setStoreId}
        placeholder="UUID"
      />

      <View style={styles.switchRow}>
        <Text style={styles.label}>Handwriting mode</Text>
        <Switch value={handwriting} onValueChange={setHandwriting} />
      </View>

      <Pressable
        style={[styles.btn, busy && styles.btnDisabled]}
        disabled={busy}
        onPress={() => void proposeFromCapture()}
      >
        {busy ? (
          <ActivityIndicator color="#052010" />
        ) : (
          <Text style={styles.btnText}>DEMO AI propose from capture</Text>
        )}
      </Pressable>

      <Text style={styles.honesty}>
        Device camera ImagePicker can replace the DEMO bytes later. Owner-web
        already uses capture=&quot;environment&quot;. No OCR vendor claimed.
      </Text>

      {result ? <Text style={styles.ok}>{result}</Text> : null}
      {error ? <Text style={styles.err}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 10 },
  title: { fontSize: 22, fontWeight: "700", color: "#1f4d3a" },
  body: { fontSize: 14, color: "#5a6b62", lineHeight: 20, marginBottom: 8 },
  label: { fontSize: 12, fontWeight: "600", color: "#3a4a42" },
  input: {
    borderWidth: 1,
    borderColor: "#c5d0c8",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 6,
  },
  btn: {
    marginTop: 8,
    backgroundColor: "#00d54b",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontWeight: "700", color: "#052010" },
  honesty: { fontSize: 12, color: "#7a8a80", marginTop: 8 },
  ok: { fontSize: 13, color: "#1f4d3a", marginTop: 8 },
  err: { fontSize: 13, color: "#b42318", marginTop: 8 },
});
