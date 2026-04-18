export type AppAlertButtonStyle = "default" | "cancel" | "destructive";

export interface AppAlertButton {
  text?: string;
  onPress?: () => void;
  style?: AppAlertButtonStyle;
}

export type AppAlertTone = "info" | "success" | "warning" | "error";

interface ToastRequest {
  type: "toast";
  title: string;
  message?: string;
  tone: AppAlertTone;
  durationMs?: number;
}

interface ConfirmRequest {
  type: "confirm";
  title: string;
  message?: string;
  buttons: AppAlertButton[];
}

export type AppAlertRequest = ToastRequest | ConfirmRequest;

type AppAlertListener = (request: AppAlertRequest) => void;

const listeners = new Set<AppAlertListener>();

const inferToneFromText = (title: string, message?: string): AppAlertTone => {
  const text = `${title} ${message ?? ""}`.toLowerCase();
  if (/(fail|error|invalid|unable|cannot|denied)/.test(text)) {
    return "error";
  }
  if (/(warning|caution|cancel)/.test(text)) {
    return "warning";
  }
  if (/(success|submitted|updated|posted|completed|saved|thank)/.test(text)) {
    return "success";
  }
  return "info";
};

const emit = (request: AppAlertRequest) => {
  listeners.forEach((listener) => listener(request));
};

export const appAlertBus = {
  subscribe(listener: AppAlertListener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }
};

export const AppAlert = {
  alert(title: string, message?: string, buttons?: AppAlertButton[]) {
    const normalizedTitle = title?.trim() || "Notice";
    const normalizedMessage = message?.trim() || undefined;

    if (buttons && buttons.length > 1) {
      emit({
        type: "confirm",
        title: normalizedTitle,
        message: normalizedMessage,
        buttons
      });
      return;
    }

    emit({
      type: "toast",
      title: normalizedTitle,
      message: normalizedMessage,
      tone: inferToneFromText(normalizedTitle, normalizedMessage)
    });
  },
  success(title: string, message?: string) {
    emit({ type: "toast", title, message, tone: "success" });
  },
  error(title: string, message?: string) {
    emit({ type: "toast", title, message, tone: "error" });
  },
  warning(title: string, message?: string) {
    emit({ type: "toast", title, message, tone: "warning" });
  },
  info(title: string, message?: string) {
    emit({ type: "toast", title, message, tone: "info" });
  }
};
