import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

/**
 * Minimal bootable staff shell. Wire API auth + receive flows in the next increment.
 */
export default function StaffHome() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.brand}>HIYA SmartPOS</Text>
      <Text style={styles.sub}>Staff / manager mobile shell (Expo)</Text>
      <Text style={styles.body}>
        Pilot focus is API authz + invoice approve-before-post. This app package
        boots; feature screens land after the vertical API slice hardens.
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
});
