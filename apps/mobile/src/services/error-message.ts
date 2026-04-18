export const getApiErrorMessage = (error: unknown, fallback = "Try again"): string => {
  if (error && typeof error === "object") {
    const response = (error as { response?: { data?: { error?: { message?: string } } } }).response;
    const apiMessage = response?.data?.error?.message;
    if (typeof apiMessage === "string" && apiMessage.trim().length > 0) {
      return apiMessage;
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
};
