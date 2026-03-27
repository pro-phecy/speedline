// src/app/(auth)/sign-up.tsx
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";

export default function SignUp() {
  const { register } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!username.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter a username and password.");
      return;
    }
    try {
      setLoading(true);
      await register(username.trim(), password);
      router.replace("/(tabs)/home");
    } catch (e: any) {
      Alert.alert("Sign up failed", e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="h-full w-full items-center justify-center bg-yellow-500">
      <View className="flex rounded-3xl bg-white pl-7 pr-7 pb-7">
        <View className="flex items-center justify-center">
          <Image
            source={require("../../../assets/images/icon.png")}
            className="w-60 h-40"
            resizeMode="stretch"
          />
          <Text className="text-4xl font-bold text-yellow-500 pb-7">Sign up</Text>
        </View>

        <Text className="font-semibold">Username</Text>
        <View className="p-2">
          <TextInput
            className="border border-gray-300 rounded-lg p-4"
            autoCapitalize="none"
            placeholder="Enter username"
            placeholderTextColor="#666666"
            value={username}
            onChangeText={setUsername}
          />
        </View>

        <Text className="font-semibold">Password</Text>
        <View className="p-2">
          <TextInput
            className="border border-gray-300 rounded-lg p-4"
            placeholder="Enter password"
            placeholderTextColor="#666666"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <Pressable onPress={handleSignUp} disabled={loading}>
          <View className="rounded-3xl bg-black p-4 items-center justify-center">
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-2xl">Sign up</Text>
            )}
          </View>
        </Pressable>

        <View className="items-center justify-center p-4">
          <Text className="text-xl font-semibold">Already have an account? </Text>
          <Pressable onPress={() => router.push("/")}>
            <Text className="text-yellow-500 font-bold text-xl pt-2">Sign in</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}