import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

/** Separate customer rewards/order app shell — out of pilot v1 functional scope. */
export default function CustomerHome() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.brand}>HIYA Rewards</Text>
      <Text style={styles.body}>
        Customer app package scaffold only. Ordering, loyalty, and payments are
        not implemented in pilot slice v1.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff8f0",
    padding: 24,
    justifyContent: "center",
    gap: 10,
  },
  brand: {
    fontSize: 32,
    fontWeight: "700",
    color: "#8a4b12",
  },
  body: {
    fontSize: 15,
    color: "#6b5344",
    lineHeight: 22,
  },
});
