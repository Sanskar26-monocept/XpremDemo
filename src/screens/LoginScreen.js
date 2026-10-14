import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Observe } from "expo-observe";
import { useBank } from "../context/BankContext";
import { appVersion } from "../context/UpdatesContext";
import { Button, Field } from "../components/ui";
import { colors, spacing } from "../theme";

export default function LoginScreen() {
  const { login } = useBank();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  function onLogin() {
    if (!username.trim() || !pin) {
      setError("Enter your username and PIN.");
      return;
    }
    if (login(username, pin)) {
      setError("");
      Observe.logEvent("login_success");
    } else {
      setError("Incorrect username or PIN.");
      Observe.logEvent("login_failed");
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logo}>
            <Text style={styles.logoText}>R</Text>
          </View>
          <Text style={styles.title}>ReleaseX Bank</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>

          <Field
            label="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="demo"
          />
          <Field
            label="PIN"
            value={pin}
            onChangeText={setPin}
            secureTextEntry
            keyboardType="number-pad"
            maxLength={4}
            placeholder="4-digit PIN"
            error={error}
          />
          <Button title="Sign in" onPress={onLogin} />

          <Text style={styles.hint}>Demo login: demo / 1234</Text>
          <Text style={styles.version}>v{appVersion}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", padding: spacing.lg },
  logo: {
    alignSelf: "center",
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  logoText: { color: "#fff", fontSize: 34, fontWeight: "700" },
  title: { fontSize: 26, fontWeight: "700", textAlign: "center", color: colors.text },
  subtitle: {
    textAlign: "center",
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: spacing.xl,
  },
  hint: { textAlign: "center", color: colors.textMuted, marginTop: spacing.lg },
  version: { textAlign: "center", color: colors.textMuted, marginTop: spacing.sm, fontSize: 12 },
});
