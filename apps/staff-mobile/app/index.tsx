import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

/**
 * Staff / manager mobile shell. Invoice camera scan → DEMO AI propose is live
 * against the API when EXPO_PUBLIC_API_URL + token + storeId are set.
 */
export default function StaffHome() {
  return (
    <View style={styles.container}>
      <Text style={styles.brand}>HIYA SmartPOS</Text>
      <Text style={styles.sub}>Staff / manager mobile</Text>
      <Text style={styles.body}>
        Camera invoice capture proposes fields via DEMO AI. Human PIN approve on
        owner web (or API) still required before inventory posts. AI never posts
        stock or money.
      </Text>
      <Link href="/invoice-scan" style={styles.link}>
        Invoice scan (camera / AI propose) →
      </Link>
      <Text style={styles.honesty}>
        PARTIAL · Expo shell + scan propose API · no POS/bank connectors
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f7f2",
    padding: 24,
    justifyContent: "center",
    gap: 10,
  },
  brand: {
    fontSize: 34,
    fontWeight: "700",
    color: "#1f4d3a",
  },
  sub: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3a4a42",
  },
  body: {
    fontSize: 15,
    color: "#5a6b62",
    lineHeight: 22,
  },
  link: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "600",
    color: "#0a7a35",
  },
  honesty: {
    marginTop: 16,
    fontSize: 12,
    color: "#7a8a80",
  },
});
