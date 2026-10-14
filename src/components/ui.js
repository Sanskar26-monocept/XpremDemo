import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors, spacing } from "../theme";

export function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
  style,
}) {
  const secondary = variant === "secondary";
  const danger = variant === "danger";
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.buttonSecondary,
        danger && styles.buttonDanger,
        (pressed || inactive) && styles.dim,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? colors.accent : "#fff"} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            secondary && styles.buttonTextSecondary,
            danger && styles.buttonTextDanger,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Field({ label, error, style, ...inputProps }) {
  return (
    <View style={[styles.field, style]}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        {...inputProps}
        style={[styles.input, error && styles.inputError]}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export function SectionTitle({ children }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  buttonSecondary: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  buttonDanger: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.debit,
  },
  dim: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  buttonTextSecondary: { color: colors.accent },
  buttonTextDanger: { color: colors.debit },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
  },
  field: { marginBottom: spacing.md },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
  },
  inputError: { borderColor: colors.debit },
  errorText: { color: colors.debit, fontSize: 13, marginTop: spacing.xs },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  rowLabel: { color: colors.textMuted },
  rowValue: { fontWeight: "500", color: colors.text, flexShrink: 1, textAlign: "right" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
});
