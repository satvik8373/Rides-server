import { useEffect } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { AppAlert } from "../../services/app-alert";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { AppButton, AppCard, AppScreen, AppText, EmptyState } from "../../components";
import type { MainTabParamList } from "../../navigation/types";
import { api } from "../../services/api";
import { getApiErrorMessage } from "../../services/error-message";
import { useAppStore } from "../../store";
import { theme } from "../../theme";

type Props = BottomTabScreenProps<MainTabParamList, "Wallet"> & {
  openWithdraw: () => void;
};

export const WalletScreen = ({ openWithdraw }: Props) => {
  const wallet = useAppStore((state) => state.wallet);
  const setWallet = useAppStore((state) => state.setWallet);

  const refreshWallet = async () => {
    try {
      const response = await api.getWallet();
      setWallet(response);
    } catch (error) {
      AppAlert.alert("Wallet fetch failed", getApiErrorMessage(error));
    }
  };

  useEffect(() => {
    void refreshWallet();
  }, []);

  return (
    <AppScreen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppText variant="displaySm">Wallet</AppText>

        <View style={styles.balanceCard}>
          <View style={styles.balanceTop}>
            <View>
              <AppText variant="label" tone="white">
                AVAILABLE BALANCE
              </AppText>
              <AppText variant="displaySm" tone="white">
                INR {wallet?.wallet.availableBalance ?? 0}
              </AppText>
            </View>
            <View style={styles.walletIconWrap}>
              <Ionicons name="wallet" size={20} color={theme.colors.onPrimary} />
            </View>
          </View>
          <AppText variant="bodyMd" tone="white" style={styles.balanceSub}>
            Escrow Balance: INR {wallet?.wallet.escrowBalance ?? 0}
          </AppText>
        </View>

        <View style={styles.actionRow}>
          <View style={styles.actionItem}>
            <AppButton label="Withdraw to UPI" onPress={openWithdraw} />
          </View>
          <View style={styles.actionItem}>
            <AppButton label="Refresh Wallet" onPress={refreshWallet} variant="secondary" />
          </View>
        </View>

        <AppCard style={styles.card}>
          <AppText variant="title">Recent Transactions</AppText>
          {wallet?.transactions.length ? (
            wallet.transactions.slice(0, 10).map((item) => (
              <View key={item.id} style={styles.txn}>
                <View style={styles.txnTop}>
                  <AppText variant="bodyLg">{item.type}</AppText>
                  <AppText variant="title" tone={item.amount >= 0 ? "primary" : "error"}>
                    {item.amount >= 0 ? "+" : ""}
                    {item.amount}
                  </AppText>
                </View>
                <AppText variant="bodyMd" tone="muted">
                  {new Date(item.createdAt).toLocaleString()}
                </AppText>
                {item.note ? (
                  <AppText variant="bodyMd" tone="muted">
                    {item.note}
                  </AppText>
                ) : null}
              </View>
            ))
          ) : (
            <EmptyState title="No transactions" message="Your wallet history will appear here." />
          )}
        </AppCard>
      </ScrollView>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl
  },
  balanceCard: {
    borderRadius: 28,
    backgroundColor: theme.colors.primaryContainer,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm
  },
  balanceTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  walletIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)"
  },
  balanceSub: {
    opacity: 0.86
  },
  actionRow: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  actionItem: {
    flex: 1
  },
  card: {
    gap: theme.spacing.md
  },
  txn: {
    gap: 2,
    padding: theme.spacing.sm,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceContainerLow
  },
  txnTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing.sm
  }
});


