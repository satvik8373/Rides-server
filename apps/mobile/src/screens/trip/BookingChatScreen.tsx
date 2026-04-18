import { useEffect, useMemo, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import type { ChatMessage } from "@ahmedabadcar/shared";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { AppButton, AppCard, AppInput, AppScreen, AppText, LoadingState } from "../../components";
import type { RootStackParamList } from "../../navigation/types";
import { api } from "../../services/api";
import { firebaseService } from "../../services/firebase";
import { useAppStore } from "../../store";
import { theme } from "../../theme";

type Props = NativeStackScreenProps<RootStackParamList, "BookingChat">;

export const BookingChatScreen = ({ route }: Props) => {
  const user = useAppStore((state) => state.user);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let mounted = true;
    api
      .getChat(route.params.bookingId)
      .then((chat) => {
        if (!mounted) return;
        setMessages(chat.messages);
      })
      .finally(() => setLoading(false));

    const unsubscribe = firebaseService.subscribeChat(route.params.bookingId, (incoming) => {
      setMessages(incoming);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [route.params.bookingId]);

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [messages]
  );

  const send = async () => {
    if (!text.trim()) {
      return;
    }
    setSending(true);
    try {
      const message = await api.sendChat(route.params.bookingId, text.trim());
      setMessages((current) => [...current, message]);
      setText("");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <AppScreen>
        <LoadingState message="Loading chat..." />
      </AppScreen>
    );
  }

  return (
    <AppScreen style={styles.screen}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={styles.iconWrap}>
              <Ionicons name="chatbubble-ellipses" size={17} color={theme.colors.onPrimary} />
            </View>
            <AppText variant="label" tone="white">
              BOOKING CHAT
            </AppText>
          </View>
          <AppText variant="title" tone="white">
            Coordinate pickup and trip details
          </AppText>
        </View>

        <FlatList
          data={sortedMessages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <AppCard style={styles.emptyCard}>
              <AppText variant="bodyMd" tone="muted">
                No messages yet. Start the conversation.
              </AppText>
            </AppCard>
          }
          renderItem={({ item }) => {
            const mine = item.senderId === user?.id;
            return (
              <View style={[styles.messageWrap, mine ? styles.mineWrap : styles.otherWrap]}>
                <AppCard style={[styles.messageCard, mine ? styles.mineCard : styles.otherCard]}>
                  <AppText variant="bodyMd" tone={mine ? "white" : "default"}>
                    {item.message}
                  </AppText>
                  <AppText variant="label" tone={mine ? "white" : "muted"} style={styles.messageTime}>
                    {new Date(item.createdAt).toLocaleTimeString()}
                  </AppText>
                </AppCard>
              </View>
            );
          }}
        />

        <View style={styles.composer}>
          <AppInput value={text} onChangeText={setText} placeholder="Type message..." />
          <AppButton label="Send" onPress={send} loading={sending} />
        </View>
      </KeyboardAvoidingView>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0
  },
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg
  },
  headerCard: {
    borderRadius: 24,
    backgroundColor: theme.colors.primaryContainer,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.xs
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)"
  },
  list: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.md
  },
  messageWrap: {
    width: "100%"
  },
  mineWrap: {
    alignItems: "flex-end"
  },
  otherWrap: {
    alignItems: "flex-start"
  },
  messageCard: {
    maxWidth: "84%",
    gap: theme.spacing.xs
  },
  mineCard: {
    backgroundColor: theme.colors.primaryContainer
  },
  otherCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: "rgba(190,201,195,0.24)"
  },
  messageTime: {
    opacity: 0.85
  },
  emptyCard: {
    marginTop: theme.spacing.xs
  },
  composer: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.sm
  }
});
