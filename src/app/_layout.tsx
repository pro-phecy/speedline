// src/app/_layout.tsx
import { Stack } from "expo-router";
import "../../global.css";
import { AuthProvider } from "../context/AuthContext";

function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function Layout() {
  return (
    <AuthProvider>
      <RootLayout />
    </AuthProvider>
  );
}