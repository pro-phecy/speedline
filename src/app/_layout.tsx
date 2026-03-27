// src/app/(tabs)/_layout.tsx
import { Stack } from "expo-router";
import "../../global.css";

export default function Layout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}