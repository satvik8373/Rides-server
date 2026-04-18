import { useEffect, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { AppAlert } from "../../services/app-alert";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppButton, AppCard, AppInput, AppScreen, AppText, StatusPill } from "../../components";
import type { RootStackParamList } from "../../navigation/types";
import { api } from "../../services/api";
import { getApiErrorMessage } from "../../services/error-message";
import { useAppStore } from "../../store";
import { theme } from "../../theme";

type Props = NativeStackScreenProps<RootStackParamList, "KYCStatus">;

export const KYCStatusScreen = ({ navigation }: Props) => {
  const driverProfile = useAppStore((state) => state.driverProfile);
  const patchDriverProfile = useAppStore((state) => state.patchDriverProfile);
  const [aadhaar, setAadhaar] = useState(driverProfile?.aadhaarDocUrl ?? "");
  const [dl, setDl] = useState(driverProfile?.drivingLicenseDocUrl ?? "");
  const [rc, setRc] = useState(driverProfile?.vehicleRcDocUrl ?? "");
  const [vehicleNumber, setVehicleNumber] = useState(driverProfile?.vehicleNumber ?? "");
  const [vehicleModel, setVehicleModel] = useState(driverProfile?.vehicleModel ?? "");
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    try {
      const profile = await api.getKycStatus();
      patchDriverProfile(profile);
    } catch (error) {
      AppAlert.alert("Could not load KYC status", getApiErrorMessage(error));
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const submit = async () => {
    setLoading(true);
    try {
      const profile = await api.uploadKyc({
        aadhaarDocUrl: aadhaar,
        drivingLicenseDocUrl: dl,
        vehicleRcDocUrl: rc,
        vehicleNumber,
        vehicleModel
      });
      patchDriverProfile(profile);
      AppAlert.alert("KYC submitted", "Your documents are under review.");
      navigation.goBack();
    } catch (error) {
      AppAlert.alert("KYC upload failed", getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const verified = driverProfile?.kycStatus === "VERIFIED";

  return (
    <AppScreen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppText variant="displaySm">Driver Verification</AppText>

        <AppCard style={styles.card}>
          <StatusPill label={driverProfile?.kycStatus ?? "NOT_STARTED"} tone={verified ? "driver" : "rider"} />
          {driverProfile?.badgeLabel ? <AppText variant="title">{driverProfile.badgeLabel}</AppText> : null}
          <AppText variant="bodyMd" tone="muted">
            Upload Aadhaar, Driving License and RC documents. KYC is optional for posting rides but helps build rider trust.
          </AppText>
        </AppCard>

        <AppCard style={styles.card}>
          <AppInput label="Aadhaar URL" value={aadhaar} onChangeText={setAadhaar} autoCapitalize="none" />
          <AppInput label="Driving License URL" value={dl} onChangeText={setDl} autoCapitalize="none" />
          <AppInput label="Vehicle RC URL" value={rc} onChangeText={setRc} autoCapitalize="none" />
          <AppInput label="Vehicle Number" value={vehicleNumber} onChangeText={setVehicleNumber} />
          <AppInput label="Vehicle Model" value={vehicleModel} onChangeText={setVehicleModel} />
          <AppButton label="Submit KYC" onPress={submit} loading={loading} />
          <AppButton label="Refresh Status" onPress={refresh} variant="secondary" />
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


