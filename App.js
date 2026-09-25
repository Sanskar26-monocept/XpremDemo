import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Constants from "expo-constants";
import * as Updates from "expo-updates";

// expoConfig comes from the running update's manifest, so otaVersion reflects
// the OTA release actually loaded (or the embedded one on first install).
const appVersion = Constants.expoConfig?.version ?? "unknown";
const otaVersion = Constants.expoConfig?.extra?.otaVersion ?? 0;

export default function App() {
  const { currentlyRunning } = Updates.useUpdates();
  const [status, setStatus] = useState("idle"); // idle | checking | downloading | upToDate | error
  const [message, setMessage] = useState("");

  const busy = status === "checking" || status === "downloading";

  async function onUpdatePress() {
    if (!Updates.isEnabled) {
      setStatus("error");
      setMessage("Updates are disabled in development builds.");
      return;
    }
    try {
      setStatus("checking");
      setMessage("");
      const check = await Updates.checkForUpdateAsync();
      if (!check.isAvailable) {
        setStatus("upToDate");
        setMessage("You're on the latest version.");
        return;
      }
      setStatus("downloading");
      const result = await Updates.fetchUpdateAsync();
      if (result.isNew) {
        await Updates.reloadAsync();
      } else {
        setStatus("upToDate");
        setMessage("You're on the latest version.");
      }
    } catch (e) {
      setStatus("error");
      setMessage(e?.message ?? String(e));
    }
  }

  const source = currentlyRunning.isEmbeddedLaunch
    ? "Embedded build"
    : "OTA update";
  const updateId = currentlyRunning.updateId?.slice(0, 8) ?? "-";
  const publishedAt = currentlyRunning.createdAt?.toLocaleString() ?? "-";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>OTA TEST 6</Text>

      <View style={styles.card}>
        <Text style={styles.version}>
          v{appVersion} (OTA {otaVersion})
        </Text>
        <Row label="Runtime" value={currentlyRunning.runtimeVersion ?? "-"} />
        <Row label="Channel" value={currentlyRunning.channel ?? "-"} />
        <Row label="Source" value={source} />
        <Row label="Update ID" value={updateId} />
        <Row label="Published" value={publishedAt} />
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          (pressed || busy) && styles.buttonDim,
        ]}
        onPress={onUpdatePress}
        disabled={busy}
      >
        {busy ? (
          <View style={styles.buttonRow}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.buttonText}>
              {status === "checking" ? "  Checking…" : "  Downloading…"}
            </Text>
          </View>
        ) : (
          <Text style={styles.buttonText}>Check for update</Text>
        )}
      </Pressable>

      {message ? (
        <Text style={[styles.message, status === "error" && styles.error]}>
          {message}
        </Text>
      ) : null}

      <StatusBar style="auto" />
    </View>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 24,
  },
  card: {
    alignSelf: "stretch",
    backgroundColor: "#f4f5f7",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  version: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  label: {
    color: "#666",
  },
  value: {
    fontWeight: "500",
  },
  button: {
    backgroundColor: "#2f6fed",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
    minWidth: 220,
    alignItems: "center",
  },
  buttonDim: {
    opacity: 0.7,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  message: {
    marginTop: 16,
    color: "#333",
    textAlign: "center",
  },
  error: {
    color: "#c62828",
  },
});
