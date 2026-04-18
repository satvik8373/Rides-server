export const colors = {
  background: "#f9f9f7",
  surface: "#f9f9f7",
  surfaceBright: "#f9f9f7",
  surfaceContainer: "#eeeeec",
  surfaceContainerLow: "#f4f4f1",
  surfaceContainerLowest: "#ffffff",
  surfaceContainerHigh: "#e8e8e6",
  surfaceContainerHighest: "#e2e3e0",
  surfaceDim: "#dadad8",
  surfaceTint: "#086b53",
  surfaceVariant: "#e2e3e0",
  onSurface: "#1a1c1b",
  onSurfaceVariant: "#3f4944",
  onPrimaryFixed: "#002117",
  primary: "#005440",
  primaryContainer: "#0f6e56",
  onPrimary: "#ffffff",
  secondary: "#9f4121",
  secondaryContainer: "#fd8862",
  tertiary: "#4238a5",
  tertiaryContainer: "#5b52bf",
  primaryFixed: "#a0f3d4",
  secondaryFixed: "#ffdbd0",
  secondaryFixedDim: "#ffb59e",
  onSecondaryFixed: "#3a0b00",
  error: "#ba1a1a",
  onError: "#ffffff",
  outline: "#6f7a74",
  outlineVariant: "#bec9c3",
  verified: "#0f6e56",
  warning: "#9f4121"
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 20
};

export const typography = {
  displayLg: { fontSize: 40, lineHeight: 48, fontWeight: "800" as const, letterSpacing: -0.8 },
  displayMd: { fontSize: 34, lineHeight: 40, fontWeight: "800" as const, letterSpacing: -0.68 },
  displaySm: { fontSize: 30, lineHeight: 36, fontWeight: "700" as const, letterSpacing: -0.6 },
  headline: { fontSize: 22, lineHeight: 28, fontWeight: "700" as const, letterSpacing: -0.2 },
  title: { fontSize: 18, lineHeight: 24, fontWeight: "700" as const },
  bodyLg: { fontSize: 16, lineHeight: 24, fontWeight: "400" as const },
  bodyMd: { fontSize: 14, lineHeight: 20, fontWeight: "400" as const },
  label: { fontSize: 12, lineHeight: 16, fontWeight: "700" as const }
};

export const shadows = {
  ambient: {
    shadowColor: "#1a1c1b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4
  }
};
