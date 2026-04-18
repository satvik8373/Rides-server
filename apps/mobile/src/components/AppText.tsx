import { Text, type TextProps } from "react-native";
import { theme } from "../theme";

type Variant =
  | "displayLg"
  | "displayMd"
  | "displaySm"
  | "headline"
  | "title"
  | "bodyLg"
  | "bodyMd"
  | "label";

interface AppTextProps extends TextProps {
  variant?: Variant;
  tone?: "default" | "muted" | "primary" | "error" | "white";
}

export const AppText = ({ variant = "bodyMd", tone = "default", style, ...props }: AppTextProps) => {
  const color = {
    default: theme.colors.onSurface,
    muted: theme.colors.onSurfaceVariant,
    primary: theme.colors.primary,
    error: theme.colors.error,
    white: theme.colors.onPrimary
  }[tone];

  return <Text {...props} style={[theme.typography[variant], { color }, style]} />;
};

