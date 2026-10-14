import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text } from "react-native";
import { Observe } from "expo-observe";
import { useBank } from "../context/BankContext";
import { appVersion, useAppUpdates } from "../context/UpdatesContext";
import UpdateCard from "../components/UpdateCard";
import { Button, Card, Row, SectionTitle } from "../components/ui";
import { colors, spacing } from "../theme";

export default function ProfileScreen() {
  const { user, logout, resetData } = useBank();
  const { currentlyRunning, status, busy, checkForUpdate } = useAppUpdates();
  const [sending, setSending] = useState(false);

  const source = currentlyRunning.isEmbeddedLaunch ? "Embedded build" : "OTA update";
  const updateId = currentlyRunning.updateId?.slice(0, 8) ?? "-";
  const publishedAt = currentlyRunning.createdAt?.toLocaleString() ?? "-";

  // expo-observe sends on its own when the app goes to the background; this
  // sends right away, handy when checking the Events page.
  async function onSendTelemetry() {
    setSending(true);
    try {
      Observe.logEvent("telemetry_sent_manually");
      await Observe.dispatchEvents();
      Alert.alert("Telemetry sent", "Events were dispatched to the server.");
    } catch (e) {
      Observe.reportError(e);
      Alert.alert("Telemetry failed", e?.message ?? String(e));
    } finally {
      setSending(false);
    }
  }

  function onSimulateError() {
    Observe.reportError(new Error("Simulated error from Profile screen"));
    Alert.alert("Error reported", "A simulated error was sent to Observe.");
  }

  function onReset() {
    Alert.alert("Reset demo data", "Restore the starting balance and transactions?", [
      { text: "Cancel", style: "cancel" },
      { text: "Reset", style: "destructive", onPress: resetData },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.name}>{user.name}</Text>
      <Text style={styles.email}>{user.email}</Text>

      <SectionTitle>App updates</SectionTitle>
      <UpdateCard />
      <Card>
        <Text style={styles.version}>v{appVersion}</Text>
        <Row label="Runtime" value={currentlyRunning.runtimeVersion ?? "-"} />
        <Row label="Channel" value={currentlyRunning.channel ?? "-"} />
        <Row label="Source" value={source} />
        <Row label="Update ID" value={updateId} />
        <Row label="Published" value={publishedAt} />
      </Card>
      <Button
        title={status === "checking" ? "Checking…" : "Check for update"}
        onPress={checkForUpdate}
        loading={status === "checking"}
        disabled={busy}
        style={styles.gap}
      />

      <SectionTitle>Developer tools</SectionTitle>
      <Button
        title="Send telemetry now"
        variant="secondary"
        onPress={onSendTelemetry}
        loading={sending}
      />
      <Button
        title="Simulate error"
        variant="secondary"
        onPress={onSimulateError}
        style={styles.gapSmall}
      />
      <Button
        title="Reset demo data"
        variant="secondary"
        onPress={onReset}
        style={styles.gapSmall}
      />

      <Button title="Log out" variant="danger" onPress={logout} style={styles.logout} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  name: { fontSize: 24, fontWeight: "700", color: colors.text },
  email: { color: colors.textMuted, marginTop: 2, marginBottom: spacing.lg },
  version: { fontSize: 18, fontWeight: "600", textAlign: "center", marginBottom: 12 },
  gap: { marginTop: spacing.md, marginBottom: spacing.lg },
  gapSmall: { marginTop: 12 },
  logout: { marginTop: spacing.xl },
});
