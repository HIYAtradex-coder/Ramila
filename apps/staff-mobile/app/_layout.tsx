import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0f1a14" },
          headerTintColor: "#00d54b",
          headerTitleStyle: { fontWeight: "600" },
          contentStyle: { backgroundColor: "#f3f7f2" },
        }}
      />
    </>
  );
}
