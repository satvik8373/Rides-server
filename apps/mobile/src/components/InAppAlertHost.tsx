import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { appAlertBus, type AppAlertButton, type AppAlertRequest, type AppAlertTone } from "../services/app-alert";
import { theme } from "../theme";
import { AppText } from "./AppText";

interface ToastState {
  title: string;
  message?: string;
  tone: AppAlertTone;
  durationMs: number;
}

interface ConfirmState {
  title: string;
  message?: string;
  buttons: AppAlertButton[];
}

const TOAST_DURATION_MS = 2800;

export const InAppAlertHost = () => {
  const insets = useSafeAreaInsets();
  const [toastQueue, setToastQueue] = useState<ToastState[]>([]);
  const [activeToast, setActiveToast] = useState<ToastState | null>(null);
  const [confirmQueue, setConfirmQueue] = useState<ConfirmState[]>([]);
  const [activeConfirm, setActiveConfirm] = useState<ConfirmState | null>(null);

  useEffect(() => {
    return appAlertBus.subscribe((request: AppAlertRequest) => {
      if (request.type === "toast") {
        setToastQueue((current) => [
          ...current,
          {
            title: request.title,
            message: request.message,
            tone: request.tone,
            durationMs: request.durationMs ?? TOAST_DURATION_MS
          }
        ]);
        return;
      }

      setConfirmQueue((current) => [
        ...current,
        {
          title: request.title,
          message: request.message,
          buttons: request.buttons
        }
      ]);
    });
  }, []);

  useEffect(() => {
    if (activeToast || toastQueue.length === 0) {
      return;
    }
    const [next, ...rest] = toastQueue;
    setToastQueue(rest);
    setActiveToast(next);
  }, [activeToast, toastQueue]);

  useEffect(() => {
    if (!activeToast) {
      return;
    }
    const timer = setTimeout(() => {
      setActiveToast(null);
    }, activeToast.durationMs);
    return () => clearTimeout(timer);
  }, [activeToast]);

  useEffect(() => {
    if (activeConfirm || confirmQueue.length === 0) {
      return;
    }

    const [next, ...rest] = confirmQueue;
    setConfirmQueue(rest);
    setActiveConfirm(next);
  }, [activeConfirm, confirmQueue]);

  const toastColors = useMemo(() => {
    if (!activeToast) {
      return { background: theme.colors.surfaceContainerHighest, text: theme.colors.onSurface };
    }
    if (activeToast.tone === "success") {
      return { background: theme.colors.primaryContainer, text: theme.colors.onPrimary };
    }
    if (activeToast.tone === "warning") {
      return { background: theme.colors.secondaryFixed, text: theme.colors.onSecondaryFixed };
    }
    if (activeToast.tone === "error") {
      return { background: theme.colors.error, text: theme.colors.onError };
    }
    return { background: theme.colors.tertiaryContainer, text: theme.colors.onPrimary };
  }, [activeToast]);

  const handleConfirmPress = (button?: AppAlertButton) => {
    setActiveConfirm(null);
    button?.onPress?.();
  };

  const resolveConfirmDismissButton = (confirm: ConfirmState | null): AppAlertButton | undefined => {
    if (!confirm) return undefined;
    return confirm.buttons.find((item) => item.style === "cancel") ?? confirm.buttons[0];
  };

  return (
    <>
      {activeToast ? (
        <View style={[styles.toastWrap, { top: insets.top + theme.spacing.sm }]}>
          <Pressable
            style={[styles.toast, { backgroundColor: toastColors.background }]}
            onPress={() => setActiveToast(null)}
            accessibilityRole="button"
            accessibilityLabel="Dismiss notification"
            accessibilityHint="Closes this notification"
          >
            <AppText variant="title" style={{ color: toastColors.text }}>
              {activeToast.title}
            </AppText>
            {activeToast.message ? (
              <AppText variant="bodyMd" style={{ color: toastColors.text, opacity: 0.92 }}>
                {activeToast.message}
              </AppText>
            ) : null}
          </Pressable>
        </View>
      ) : null}

      <Modal
        transparent
        visible={Boolean(activeConfirm)}
        animationType="fade"
        onRequestClose={() => handleConfirmPress(resolveConfirmDismissButton(activeConfirm))}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalBackdropPressable} onPress={() => handleConfirmPress(resolveConfirmDismissButton(activeConfirm))} />
          <View style={styles.modalCard}>
            <AppText variant="headline">{activeConfirm?.title}</AppText>
            {activeConfirm?.message ? (
              <AppText variant="bodyMd" tone="muted">
                {activeConfirm.message}
              </AppText>
            ) : null}
            <View style={styles.buttonRow}>
              {(activeConfirm?.buttons ?? [{ text: "OK" }]).map((button, index) => {
                const tone = button.style === "destructive" ? "error" : button.style === "cancel" ? "muted" : "primary";
                return (
                  <Pressable
                    key={`${button.text ?? "button"}-${index}`}
                    onPress={() => handleConfirmPress(button)}
                    style={[styles.modalButton, button.style === "destructive" ? styles.destructiveButton : null]}
                  >
                    <AppText variant="title" tone={tone === "error" ? "error" : tone === "primary" ? "primary" : "muted"}>
                      {button.text ?? "OK"}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  toastWrap: {
    position: "absolute",
    left: theme.spacing.md,
    right: theme.spacing.md,
    zIndex: 999
  },
  toast: {
    borderRadius: 16,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.xs,
    ...theme.shadows.ambient
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.28)",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg
  },
  modalBackdropPressable: {
    ...StyleSheet.absoluteFillObject
  },
  modalCard: {
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceContainerLowest,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    ...theme.shadows.ambient
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  modalButton: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(190,201,195,0.4)",
    paddingHorizontal: theme.spacing.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceContainerLow
  },
  destructiveButton: {
    borderColor: "rgba(186,26,26,0.35)"
  }
});
