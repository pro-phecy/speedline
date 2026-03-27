// src/app/(tabs)/_layout.tsx
import { Stack } from "expo-router";
import "../../../global.css";

export default function Layout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="home" />
      <Stack.Screen name="chatscreen" />
    </Stack>
  );
}