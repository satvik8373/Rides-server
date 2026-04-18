import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { AppAlert } from "../../services/app-alert";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppButton, AppCard, AppInput, AppScreen, AppText } from "../../components";
import type { RootStackParamList } from "../../navigation/types";
import { api } from "../../services/api";
import { getApiErrorMessage } from "../../services/error-message";
import { useAppStore } from "../../store";
import { theme } from "../../theme";

type Props = NativeStackScreenProps<RootStackParamList, "WalletWithdraw">;

export const WalletWithdrawScreen = ({ navigation }: Props) => {
  const wallet = useAppStore((state) => state.wallet);
  const setWallet = useAppStore((state) => state.setWallet);
  const [amount, setAmount] = useState("");
  const [upiId, setUpiId] = useState("");
  const [loading, setLoading] = useState(false);

  const onWithdraw = async () => {
    setLoading(true);
    try {
      const response = await api.withdrawWallet({
        amount: Number(amount),
        upiId
      });
      setWallet(response);
      AppAlert.alert("Withdrawal initiated");
      navigation.goBack();
    } catch (error) {
      AppAlert.alert("Withdrawal failed", getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppText variant="displaySm">Withdraw Wallet</AppText>
        <AppCard style={styles.card}>
          <AppText variant="bodyLg">Available Balance: INR {wallet?.wallet.availableBalance ?? 0}</AppText>
          <AppInput label="Amount (INR)" value={amount} onChangeText={setAmount} keyboardType="number-pad" />
          <AppInput label="UPI ID" value={upiId} onChangeText={setUpiId} autoCapitalize="none" placeholder="example@upi" />
          <AppButton label="Withdraw" onPress={onWithdraw} loading={loading} />
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
  card: {
    gap: theme.spacing.md
  }
});


