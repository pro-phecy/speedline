// src/app/(tabs)/home.tsx
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
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

function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  } else {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }
}

function sortConversations(convos: Conversation[]): Conversation[] {
  return [...convos].sort((a, b) => {
    const aTime = a.last_message?.created_at ?? a.created_at;
    const bTime = b.last_message?.created_at ?? b.created_at;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });
}

export default function Home() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);

  const setConversationsRef = useRef(setConversations);
  setConversationsRef.current = setConversations;

  const fetchConversations = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await getConversations();
      setConversations(sortConversations(data));
    } catch (e: any) {
      Alert.alert("Error loading conversations", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [fetchConversations])
  );

  useEffect(() => {
    const handler = (data: any) => {
      const msg = data.payload;
      if (!msg) return;
      setConversationsRef.current((prev) => {
        const updated = prev.map((c) => {
          if (c.id === msg.conversation_id) {
            return {
              ...c,
              last_message: {
                content: msg.content,
                created_at: msg.created_at,
                sender_id: msg.sender_id,
              },
            };
          }
          return c;
        });
        return sortConversations(updated);
      });
    };

    socketManager.on("new_message", handler);
    return () => socketManager.off("new_message", handler);
  }, []);

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
      setSearchQuery("");
      setSearchResults([]);
      router.push({
        pathname: "/(tabs)/chatscreen",
        params: { conversationId: convo.id, name: targetUser.username },
      });
    } catch (e: any) {
      Alert.alert("Error starting chat", e.message);
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

  const isSearching = searchQuery.trim().length > 0;

  function renderConversation({ item }: { item: Conversation }) {
    const name =
      item.type === "group"
        ? item.name
        : item.members?.[0]?.username ?? "Unknown";
    const preview = item.last_message?.content ?? "No messages yet";
    const timeStr = formatTime(item.last_message?.created_at ?? item.created_at);
    const hasMessage = !!item.last_message;

    return (
      <TouchableOpacity
        className="flex-row items-center px-4 py-3 border-b border-gray-100"
        onPress={() => openConversation(item)}
        activeOpacity={0.7}
      >
        <View className="w-12 h-12 rounded-full bg-yellow-400 items-center justify-center mr-3 shrink-0">
          <Text className="text-white font-bold text-lg">
            {((name ?? "?")[0] ?? "?").toUpperCase()}
          </Text>
        </View>
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center justify-between mb-0.5">
            <Text
              className="font-semibold text-base text-gray-900 flex-1 mr-2"
              numberOfLines={1}
            >
              {name}
            </Text>
            <Text className="text-xs text-gray-400 shrink-0">{timeStr}</Text>
          </View>
          <Text
            className={`text-sm ${hasMessage ? "text-gray-500" : "text-gray-400 italic"}`}
            numberOfLines={1}
          >
            {preview}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  function renderUserResult({ item }: { item: User }) {
    return (
      <TouchableOpacity
        className="flex-row items-center px-4 py-3 border-b border-gray-100"
        onPress={() => openDM(item)}
        activeOpacity={0.7}
      >
        <View className="w-12 h-12 rounded-full bg-yellow-400 items-center justify-center mr-3 shrink-0">
          <Text className="text-white font-bold text-lg">
            {item.username[0].toUpperCase()}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-900">
            {item.username}
          </Text>
          <Text className="text-sm text-gray-400">Tap to message</Text>
        </View>
        <Text className="text-yellow-400 font-semibold text-sm">→</Text>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
        <View>
          <Text className="font-bold text-2xl text-gray-900">SpeedLine</Text>
          {user && (
            <Text className="text-xs text-gray-400 mt-0.5">@{user.username}</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={logout}
          className="px-3 py-1.5 rounded-full border border-gray-200"
        >
          <Text className="text-gray-500 font-medium text-sm">Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View className="px-4 py-3 border-b border-gray-100 bg-white">
        <View className="flex-row items-center bg-gray-100 rounded-2xl px-4 py-2.5">
          <Text className="text-gray-400 mr-2">🔍</Text>
          <TextInput
            className="flex-1 text-base text-gray-900"
            placeholder="Search users to message…"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                setSearchResults([]);
              }}
            >
              <Text className="text-gray-400 ml-2 text-base">✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Body */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#EAB308" />
          <Text className="text-gray-400 mt-3 text-sm">Loading conversations…</Text>
        </View>
      ) : isSearching ? (
        searching ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#EAB308" />
          </View>
        ) : searchResults.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-gray-400 text-sm text-center">
              No users found for "{searchQuery}"
            </Text>
          </View>
        ) : (
          <FlatList
            data={searchResults}
            keyExtractor={(u) => u.id}
            renderItem={renderUserResult}
          />
        )
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => c.id}
          renderItem={renderConversation}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchConversations(true)}
              tintColor="#EAB308"
              colors={["#EAB308"]}
            />
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center mt-24 px-8">
              <Text className="text-4xl mb-4">💬</Text>
              <Text className="text-gray-700 text-lg font-semibold text-center mb-2">
                No conversations yet
              </Text>
              <Text className="text-gray-400 text-sm text-center">
                Search for a username above to start chatting.
              </Text>
            </View>
          }
          contentContainerStyle={
            conversations.length === 0 ? { flex: 1 } : undefined
          }
        />
      )}
    </SafeAreaView>
  );
}