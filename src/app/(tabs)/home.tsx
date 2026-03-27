// src/app/(tabs)/home.tsx
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import {
  Conversation,
  User,
  getConversations,
  searchUsers,
  startDirectMessage,
} from "../../services/api";
import { socketManager } from "../../services/socket";

export default function Home() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const data = await getConversations();
      setConversations(data);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();

    // Refresh conversation list when a new message arrives
    const handler = () => loadConversations();
    socketManager.on("new_message", handler);
    return () => socketManager.off("new_message", handler);
  }, [loadConversations]);

  async function handleSearch(q: string) {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      setSearching(true);
      const results = await searchUsers(q.trim());
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function openDM(targetUser: User) {
    try {
      const convo = await startDirectMessage(targetUser.id);
      socketManager.joinConversation(convo.id);
      setShowSearch(false);
      setSearchQuery("");
      setSearchResults([]);
      router.push({
        pathname: "/(tabs)/chatscreen",
        params: {
          conversationId: convo.id,
          name: targetUser.username,
        },
      });
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  }

  function openConversation(convo: Conversation) {
    const name =
      convo.type === "group"
        ? convo.name
        : convo.members?.[0]?.username ?? "Chat";
    router.push({
      pathname: "/(tabs)/chatscreen",
      params: { conversationId: convo.id, name: name ?? "Chat" },
    });
  }

  function renderConversation({ item }: { item: Conversation }) {
    const name =
      item.type === "group"
        ? item.name
        : item.members?.[0]?.username ?? "Unknown";
    const preview = item.last_message?.content ?? "No messages yet";

    return (
      <TouchableOpacity
        className="flex-row items-center px-4 py-3 border-b border-gray-100"
        onPress={() => openConversation(item)}
      >
        <View className="w-12 h-12 rounded-full bg-yellow-400 items-center justify-center mr-3">
          <Text className="text-white font-bold text-lg">
            {(name ?? "?")[0].toUpperCase()}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="font-semibold text-base">{name}</Text>
          <Text className="text-gray-500 text-sm" numberOfLines={1}>
            {preview}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView className="flex w-full h-full bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
        <Text className="font-bold text-3xl">SpeedLine</Text>
        <TouchableOpacity onPress={logout}>
          <Text className="text-yellow-500 font-semibold">Logout</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#EAB308" />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => c.id}
          renderItem={renderConversation}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center mt-20">
              <Text className="text-gray-400 text-base">
                No conversations yet. Tap + to start one.
              </Text>
            </View>
          }
        />
      )}

      {/* New Chat FAB */}
      <TouchableOpacity
        className="bg-yellow-500 rounded-full w-16 h-16 items-center justify-center absolute bottom-10 right-6 shadow-lg"
        onPress={() => setShowSearch(true)}
      >
        <Text className="text-white text-4xl font-bold">+</Text>
      </TouchableOpacity>

      {/* User search modal */}
      <Modal visible={showSearch} animationType="slide" transparent>
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl p-6 h-3/4">
            <Text className="text-xl font-bold mb-4">New Chat</Text>
            <TextInput
              className="border border-gray-300 rounded-full px-4 py-3 mb-4"
              placeholder="Search by username..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={handleSearch}
              autoFocus
            />
            {searching && <ActivityIndicator color="#EAB308" />}
            <FlatList
              data={searchResults}
              keyExtractor={(u) => u.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="flex-row items-center py-3 border-b border-gray-100"
                  onPress={() => openDM(item)}
                >
                  <View className="w-10 h-10 rounded-full bg-yellow-400 items-center justify-center mr-3">
                    <Text className="text-white font-bold">
                      {item.username[0].toUpperCase()}
                    </Text>
                  </View>
                  <Text className="text-base font-medium">{item.username}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              className="mt-4 items-center"
              onPress={() => {
                setShowSearch(false);
                setSearchQuery("");
                setSearchResults([]);
              }}
            >
              <Text className="text-gray-400 text-base">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}