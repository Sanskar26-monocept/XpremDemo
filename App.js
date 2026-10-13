import { useEffect, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  Animated,
  AppState,
  Button,
  Pressable,
  StyleSheet,
  Text,
  View,
  Alert,
} from "react-native";
import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { Observe, useObserve } from "expo-observe";

// expoConfig comes from the running update's manifest, so otaVersion reflects
// the OTA release actually loaded (or the embedded one on first install).
const appVersion = Constants.expoConfig?.version ?? "unknown";

// expo-updates extra params persist across launches without a native storage
// module. Keys must be lowercase. Holds the id of an update that was downloaded
// from this screen, so the next launch can tell it was applied.
const DOWNLOADED_KEY = "downloaded-update-id";

const PENDING_NOTICE =
  "Update downloaded successfully. It will be applied on next app restart or user can reload manually.";

export default function App() {
  const {
    currentlyRunning,
    isUpdatePending: nativeUpdatePending,
    downloadedUpdate,
  } = Updates.useUpdates();
  // expo-updates keeps isUpdatePending true after a cold start that downloaded
  // an update during startup and launched straight into it, so the flag alone
  // reports an already running update as waiting. A downloaded update only
  // counts as pending while it differs from the one running.
  const isUpdatePending =
    nativeUpdatePending &&
    (!downloadedUpdate?.updateId ||
      downloadedUpdate.updateId !== currentlyRunning.updateId);
  const [status, setStatus] = useState("idle"); // idle | checking | downloading
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState("");
  const toastOpacity = useRef(new Animated.Value(0)).current;
  // Id of an update found by "Check for update" that was not downloaded yet
  // (the user chose LATER). Drives the "New Update Available" card.
  const [availableId, setAvailableId] = useState(null);

  const { markInteractive } = useObserve();
  const [sending, setSending] = useState(false);

  const busy = status === "checking" || status === "downloading";

  // The screen is usable as soon as it renders: that moment is the app's
  // time to interactive on the Metrics page.
  useEffect(() => {
    markInteractive();
    Observe.logEvent("app_opened", {
      attributes: {
        appVersion,
        source: currentlyRunning.isEmbeddedLaunch ? "embedded" : "ota",
      },
    });
    // Send right away instead of waiting for the library's own flush.
    Observe.dispatchEvents().catch((error) => Observe.reportError(error));
  }, []);

  // The toast view stays mounted (opacity 0 while hidden) so the fade never
  // starts on a view that has not been laid out yet.
  function showToast(text, holdMs = 4000) {
    setToast(text);
    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: false,
      }),
      Animated.delay(holdMs),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: false,
      }),
    ]).start();
  }

  // An update downloaded from this screen was applied by a reload or restart:
  // say so once, then forget it. A stale id (neither running nor pending) is
  // dropped too. expo-updates launches the newest downloaded update on a cold
  // start, so a fully closed and reopened app lands here.
  useEffect(() => {
    if (!Updates.isEnabled) return;
    (async () => {
      try {
        const params = await Updates.getExtraParamsAsync();
        const savedId = params[DOWNLOADED_KEY];
        console.log(
          `[update-toast] saved=${savedId} running=${currentlyRunning.updateId} pending=${isUpdatePending}`,
        );
        if (!savedId) return;
        if (savedId === currentlyRunning.updateId) {
          showToast(PENDING_NOTICE, 6000);
          await Updates.setExtraParamAsync(DOWNLOADED_KEY, null);
        } else if (!isUpdatePending) {
          await Updates.setExtraParamAsync(DOWNLOADED_KEY, null);
        }
      } catch (error) {
        Observe.reportError(error);
      }
    })();
  }, []);

  // A downloaded update that has not been applied yet is announced when it
  // arrives in the background (slow launch) and each time the app comes back
  // to the foreground. The dialog flow below announces its own downloads.
  const ownDownload = useRef(false);
  const pendingRef = useRef(false);
  pendingRef.current = isUpdatePending;

  useEffect(() => {
    if (isUpdatePending && !ownDownload.current) {
      showToast(PENDING_NOTICE, 6000);
    }
  }, [isUpdatePending]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && pendingRef.current) {
        showToast(PENDING_NOTICE, 6000);
      }
    });
    return () => subscription.remove();
  }, []);

  // expo-observe sends on its own when the app goes to the background; this
  // sends right away, handy when checking the Events page.
  async function onSendPress() {
    setSending(true);
    try {
      Observe.logEvent("telemetry_sent_manually");
      await Observe.dispatchEvents();
      setMessage("Telemetry sent.");
    } catch (e) {
      Observe.reportError(e);
      setMessage(e?.message ?? String(e));
    } finally {
      setSending(false);
    }
  }

  function showLatestDialog() {
    Alert.alert(
      "You Are Using the Latest Version",
      `Current version: ${appVersion}\n` +
        `Runtime version: ${currentlyRunning.runtimeVersion ?? "-"}\n` +
        `Current update ID: ${currentlyRunning.updateId ?? "-"}`,
      [{ text: "OK" }],
    );
  }

  function promptDownload(id) {
    Alert.alert(
      "Update Available",
      `A new update is available.\nUpdate ID: ${id}\nWould you like to download it now?`,
      [
        { text: "Later", style: "cancel" },
        { text: "Download", onPress: () => downloadUpdate(id) },
      ],
    );
  }

  function promptReload(id) {
    Alert.alert(
      "Update Downloaded",
      `The update has been downloaded successfully!\nUpdate ID: ${id}\nWould you like to reload the app now to apply the update?`,
      [
        { text: "Later", style: "cancel" },
        { text: "Reload Now", onPress: reloadNow },
      ],
    );
  }

  async function reloadNow() {
    try {
      await Updates.reloadAsync();
    } catch (e) {
      Observe.reportError(e);
      Alert.alert("Reload Failed", e?.message ?? String(e), [{ text: "OK" }]);
    }
  }

  async function downloadUpdate(knownId) {
    ownDownload.current = true;
    setStatus("downloading");
    try {
      const result = await Updates.fetchUpdateAsync();
      setStatus("idle");
      if (!result.isNew && !result.isRollBackToEmbedded) {
        // Nothing new after all: another device or a republish changed it.
        ownDownload.current = false;
        setAvailableId(null);
        showLatestDialog();
        return;
      }
      const id = result.manifest?.id ?? knownId;
      console.log(`[update-toast] downloaded id=${id} known=${knownId}`);
      setAvailableId(null);
      // Saved so a cold restart can report that the update was applied.
      await Updates.setExtraParamAsync(DOWNLOADED_KEY, id).catch((error) =>
        Observe.reportError(error),
      );
      Observe.logEvent("update_downloaded", { attributes: { updateId: id } });
      Observe.dispatchEvents().catch((error) => Observe.reportError(error));
      promptReload(id);
    } catch (e) {
      ownDownload.current = false;
      Observe.reportError(e);
      setStatus("idle");
      Alert.alert("Download Failed", e?.message ?? String(e), [{ text: "OK" }]);
    }
  }

  async function onUpdatePress() {
    if (!Updates.isEnabled) {
      Alert.alert(
        "Updates Unavailable",
        "Updates are disabled in development builds.",
        [{ text: "OK" }],
      );
      return;
    }
    // Already downloaded: never offer the same update again.
    if (isUpdatePending) {
      showLatestDialog();
      return;
    }
    setStatus("checking");
    try {
      const check = await Updates.checkForUpdateAsync();
      Observe.logEvent("update_checked", {
        attributes: { available: check.isAvailable },
      });
      Observe.dispatchEvents().catch((error) => Observe.reportError(error));
      setStatus("idle");
      if (!check.isAvailable) {
        setAvailableId(null);
        showLatestDialog();
        return;
      }
      const id = check.manifest?.id ?? "rollback to embedded update";
      setAvailableId(id);
      // Remembered so that if LATER is chosen and the next launch downloads and
      // applies this update, that launch can announce it too.
      if (check.manifest?.id) {
        Updates.setExtraParamAsync(DOWNLOADED_KEY, id).catch((error) =>
          Observe.reportError(error),
        );
      }
      promptDownload(id);
    } catch (e) {
      Observe.reportError(e);
      setStatus("idle");
      Alert.alert("Update Check Failed", e?.message ?? String(e), [
        { text: "OK" },
      ]);
    }
  }

  const source = currentlyRunning.isEmbeddedLaunch
    ? "Embedded build"
    : "OTA update";
  const updateId = currentlyRunning.updateId?.slice(0, 8) ?? "-";
  const publishedAt = currentlyRunning.createdAt?.toLocaleString() ?? "-";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>OTAA TEST 42</Text>

      <View style={styles.card}>
        <Text style={styles.version}>v{appVersion}</Text>
        <Button
          title="Send telemetry now"
          onPress={() => Alert.alert("Telemetry sent!")}
        ></Button>
        <Row label="Runtime" value={currentlyRunning.runtimeVersion ?? "-"} />
        <Row label="Channel" value={currentlyRunning.channel ?? "-"} />
        <Row label="Source" value={source} />
        <Row label="Update ID" value={updateId} />
        <Row label="Published" value={publishedAt} />
      </View>

      {isUpdatePending ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Update Downloaded</Text>
          <Text style={styles.cardSubtitle}>
            {downloadedUpdate?.updateId
              ? `Update ID: ${downloadedUpdate.updateId}\n`
              : ""}
            Reload the app to apply the update.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonDim,
            ]}
            onPress={reloadNow}
          >
            <Text style={styles.buttonText}>Reload Now</Text>
          </Pressable>
        </View>
      ) : availableId ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>New Update Available</Text>
          <Text style={styles.cardSubtitle}>New update available</Text>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              (pressed || busy) && styles.buttonDim,
            ]}
            onPress={() => downloadUpdate(availableId)}
            disabled={busy}
          >
            {status === "downloading" ? (
              <View style={styles.buttonRow}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.buttonText}> Downloading…</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Download Update</Text>
            )}
          </Pressable>
        </View>
      ) : null}

      <Pressable
        style={({ pressed }) => [
          styles.button,
          (pressed || busy) && styles.buttonDim,
        ]}
        onPress={onUpdatePress}
        disabled={busy}
      >
        {status === "checking" ? (
          <View style={styles.buttonRow}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.buttonText}> Checking…</Text>
          </View>
        ) : (
          <Text style={styles.buttonText}>Check for update</Text>
        )}
      </Pressable>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <Animated.View
        pointerEvents="none"
        style={[styles.toast, { opacity: toastOpacity }]}
      >
        <Text style={styles.toastText}>{toast}</Text>
      </Animated.View>

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
  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
  },
  cardSubtitle: {
    color: "#666",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 14,
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
    alignSelf: "center",
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
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2f6fed",
    minWidth: 220,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#2f6fed",
    fontSize: 16,
    fontWeight: "600",
  },
  message: {
    marginTop: 16,
    color: "#333",
    textAlign: "center",
  },
  toast: {
    position: "absolute",
    bottom: 60,
    left: 24,
    right: 24,
    backgroundColor: "#323232",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  toastText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
  },
});
