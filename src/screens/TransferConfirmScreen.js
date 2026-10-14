import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Observe } from "expo-observe";
import { useBank } from "../context/BankContext";
import { Button, Card, Row } from "../components/ui";
import { PAYEES } from "../data";
import { colors, spacing } from "../theme";
import { formatMoney } from "../utils/format";

export default function TransferConfirmScreen({ navigation, route }) {
  const { payeeId, amount, note } = route.params;
  const payee = PAYEES.find((p) => p.id === payeeId);
  const { transfer, balance } = useBank();
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function onConfirm() {
    const result = transfer({ payee, amount, note });
    if (result) {
      setError(result);
      Observe.logEvent("transfer_failed", { attributes: { reason: result } });
      return;
    }
    Observe.logEvent("transfer_completed", {
      attributes: { amountCents: amount, payee: payee.name },
    });
    Observe.dispatchEvents().catch((e) => Observe.reportError(e));
    setDone(true);
    // The transfer is final: no way back into the confirm step.
    navigation.setOptions({ headerBackVisible: false, gestureEnabled: false });
  }

  function onDone() {
    navigation.popTo("TransferForm", { cleared: Date.now() });
    navigation.getParent()?.navigate("Home");
  }

  if (done) {
    return (
      <View style={styles.successWrap}>
        <View style={styles.check}>
          <Text style={styles.checkText}>✓</Text>
        </View>
        <Text style={styles.successTitle}>Transfer complete</Text>
        <Text style={styles.successBody}>
          {formatMoney(amount)} sent to {payee.name}.
        </Text>
        <Text style={styles.successBody}>New balance: {formatMoney(balance)}</Text>
        <Button title="Done" onPress={onDone} style={styles.done} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.amount}>{formatMoney(amount)}</Text>
      <Card>
        <Row label="To" value={payee.name} />
        <Row label="Account" value={payee.account} />
        <Row label="Note" value={note || "-"} />
        <Row label="Balance after" value={formatMoney(balance - amount)} />
      </Card>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Confirm transfer" onPress={onConfirm} style={styles.confirm} />
      <Button
        title="Edit"
        variant="secondary"
        onPress={() => navigation.goBack()}
        style={styles.edit}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md },
  amount: {
    fontSize: 40,
    fontWeight: "700",
    textAlign: "center",
    color: colors.text,
    marginVertical: spacing.lg,
  },
  error: { color: colors.debit, marginTop: spacing.md, textAlign: "center" },
  confirm: { marginTop: spacing.lg },
  edit: { marginTop: 12 },
  successWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  check: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.credit,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  checkText: { color: "#fff", fontSize: 38, fontWeight: "700" },
  successTitle: { fontSize: 24, fontWeight: "700", color: colors.text, marginBottom: 8 },
  successBody: { fontSize: 16, color: colors.textMuted, marginTop: 4, textAlign: "center" },
  done: { marginTop: spacing.xl, alignSelf: "stretch" },
});
