const DIGITS_ONLY = /[^\d]/g;

export const normalizePhoneNumber = (input: string): string => {
  const trimmed = input.trim();
  const digits = trimmed.replace(DIGITS_ONLY, "");

  if (!digits) {
    return "";
  }

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    return `+91${digits.slice(1)}`;
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }

  if (digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  return trimmed.startsWith("+") ? `+${digits}` : digits;
};
