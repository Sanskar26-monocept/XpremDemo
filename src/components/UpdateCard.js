import { StyleSheet, Text } from "react-native";
import { useAppUpdates } from "../context/UpdatesContext";
import { Button, Card } from "./ui";
import { colors } from "../theme";

// Shown on Home when an update is waiting for a download or for a reload.
export default function UpdateCard() {
  const { isUpdatePending, downloadedUpdate, availableId, status, busy, downloadUpdate, reloadNow } =
    useAppUpdates();

  if (isUpdatePending) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>Update Downloaded</Text>
        <Text style={styles.subtitle}>
          {downloadedUpdate?.updateId ? `Update ID: ${downloadedUpdate.updateId}\n` : ""}
          Reload the app to apply the update.
        </Text>
        <Button title="Reload Now" onPress={reloadNow} />
      </Card>
    );
  }
  if (availableId) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>New Update Available</Text>
        <Text style={styles.subtitle}>A new version of the app is ready to download.</Text>
        <Button
          title="Download Update"
          onPress={() => downloadUpdate(availableId)}
          loading={status === "downloading"}
          disabled={busy}
        />
      </Card>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.accentSoft, marginBottom: 16 },
  title: { fontSize: 17, fontWeight: "600", textAlign: "center", color: colors.text },
  subtitle: { color: colors.textMuted, textAlign: "center", marginTop: 4, marginBottom: 14 },
});
