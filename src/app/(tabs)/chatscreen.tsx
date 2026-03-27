// src/app/(tabs)/chatscreen.tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { Message, getMessages } from "../../services/api";
import { socketManager } from "../../services/socket";

export default function Chat() {
  const { conversationId, name } = useLocalSearchParams<{
    conversationId: string;
    name: string;
  }>();
  const { user } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const flatRef = useRef<FlatList>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadMessages = useCallback(async () => {
    if (!conversationId) return;
    try {
      const msgs = await getMessages(conversationId);
      setMessages(msgs);
    } catch (e: any) {
      Alert.alert("Error loading messages", e.message);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    loadMessages();

    // Listen for new messages on this conversation
    const onNewMessage = (data: any) => {
      if (data.payload?.conversation_id === conversationId) {
        setMessages((prev) => [...prev, data.payload as Message]);
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
      }
    };

    // Listen for typing indicators
    const onTyping = (data: any) => {
      if (
        data.conversationId === conversationId &&
        data.userId !== user?.id
      ) {
        setTypingUser(data.username);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTypingUser(null), 3000);
      }
    };

    socketManager.on("new_message", onNewMessage);
    socketManager.on("typing", onTyping);

    return () => {
      socketManager.off("new_message", onNewMessage);
      socketManager.off("typing", onTyping);
    };
  }, [conversationId, loadMessages, user?.id]);

  function handleSend() {
    const content = text.trim();
    if (!content || !conversationId) return;
    socketManager.sendMessage(conversationId, content);
    setText("");
  }

  function handleTyping(val: string) {
    setText(val);
    if (conversationId && val.length > 0) {
      socketManager.sendTyping(conversationId);
    }
  }

  function renderMessage({ item }: { item: Message }) {
    const isMe = item.sender?.id === user?.id;
    return (
      <View
        className={`my-1 mx-3 max-w-[75%] px-4 py-2 rounded-2xl ${
          isMe
            ? "self-end bg-yellow-400 rounded-br-sm"
            : "self-start bg-gray-100 rounded-bl-sm"
        }`}
      >
        {!isMe && (
          <Text className="text-xs text-gray-500 mb-1 font-semibold">
            {item.sender?.username}
          </Text>
        )}
        <Text className={isMe ? "text-white" : "text-gray-800"}>
          {item.content}
        </Text>
        <Text
          className={`text-xs mt-1 ${isMe ? "text-yellow-100" : "text-gray-400"}`}
        >
          {new Date(item.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Text className="text-yellow-500 text-base font-semibold">← Back</Text>
        </TouchableOpacity>
        <View className="w-9 h-9 rounded-full bg-yellow-400 items-center justify-center mr-2">
          <Text className="text-white font-bold">
            {(name ?? "?")[0].toUpperCase()}
          </Text>
        </View>
        <Text className="text-lg font-semibold flex-1">{name}</Text>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#EAB308" />
          </View>
        ) : (
          <FlatList
            ref={flatRef}
            className="flex-1"
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderMessage}
            contentContainerStyle={{ paddingVertical: 12 }}
            onContentSizeChange={() =>
              flatRef.current?.scrollToEnd({ animated: false })
            }
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center mt-20">
                <Text className="text-gray-400">
                  No messages yet. Say hello! 👋
                </Text>
              </View>
            }
          />
        )}

        {typingUser && (
          <Text className="text-gray-400 text-xs px-4 pb-1">
            {typingUser} is typing…
          </Text>
        )}

        {/* Input bar */}
        <View className="flex-row items-end px-4 py-3 border-t border-gray-200 bg-white">
          <TextInput
            className="flex-1 bg-gray-100 rounded-2xl px-4 py-3 text-base max-h-28"
            placeholder="Type a message..."
            placeholderTextColor="#666666"
            value={text}
            onChangeText={handleTyping}
            multiline
            returnKeyType="default"
          />
          <TouchableOpacity
            className="ml-3 bg-yellow-400 rounded-full px-4 py-3"
            onPress={handleSend}
            disabled={!text.trim()}
          >
            <Text className="text-white font-bold">Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}