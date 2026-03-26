import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Chat() {
  const [message, setMessage] = useState("");

  return (
    <SafeAreaView className="flex-1" edges={["top"]}>
      
      {/* Header */}
      <View className="p-4 border-b border-gray-200">
        <Text className="text-xl font-semibold">Chat Screen</Text>
      </View>

      {/* This pushes the input up when keyboard opens */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Messages list */}
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingVertical: 16 }}
        >
          {/* Your messages go here */}
        </ScrollView>

        {/* Input bar — stays above keyboard */}
        <View className="flex-row items-center m-5 px-4 py-3 border-t border-gray-200 bg-white">
          <TextInput
            className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-base"
            placeholder="Type a message..."
            placeholderTextColor="#666666"
            value={message}
            onChangeText={setMessage}
            multiline
          />
          <TouchableOpacity className="ml-3 bg-blue-500 rounded-full px-4 py-2">
            <Text className="text-white font-semibold">Send</Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}