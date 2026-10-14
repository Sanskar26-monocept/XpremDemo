import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useBank } from "../context/BankContext";
import { Button, Field, SectionTitle } from "../components/ui";
import { PAYEES } from "../data";
import { colors, spacing } from "../theme";
import { formatMoney, parseAmountToCents } from "../utils/format";

export default function TransferScreen({ navigation, route }) {
  const { balance } = useBank();
  const [payeeId, setPayeeId] = useState(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState({});

  // The confirm screen sends back a fresh `cleared` value after a transfer.
  useEffect(() => {
    if (route.params?.cleared) {
      setPayeeId(null);
      setAmount("");
      setNote("");
      setErrors({});
    }
  }, [route.params?.cleared]);

  function onContinue() {
    const next = {};
    const cents = parseAmountToCents(amount);
    if (!payeeId) next.payee = "Choose who to pay.";
    if (cents === null || cents <= 0) next.amount = "Enter a valid amount, like 25.50.";
    else if (cents > balance) next.amount = `Insufficient balance. You have ${formatMoney(balance)}.`;
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    navigation.navigate("TransferConfirm", { payeeId, amount: cents, note: note.trim() });
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.balance}>Available: {formatMoney(balance)}</Text>

      <SectionTitle>Pay to</SectionTitle>
      {PAYEES.map((p) => {
        const selected = p.id === payeeId;
        return (
          <Pressable
            key={p.id}
            onPress={() => setPayeeId(p.id)}
            style={[styles.payee, selected && styles.payeeSelected]}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{p.name[0]}</Text>
            </View>
            <View style={styles.payeeInfo}>
              <Text style={styles.payeeName}>{p.name}</Text>
              <Text style={styles.payeeAccount}>{p.account}</Text>
            </View>
            <View style={[styles.radio, selected && styles.radioOn]} />
          </Pressable>
        );
      })}
      {errors.payee ? <Text style={styles.error}>{errors.payee}</Text> : null}

      <View style={styles.form}>
        <Field
          label="Amount ($)"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
          error={errors.amount}
        />
        <Field
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
          placeholder="What is this for?"
          maxLength={60}
        />
        <Button title="Continue" onPress={onContinue} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  balance: { color: colors.textMuted, marginBottom: spacing.md },
  payee: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  payeeSelected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  payeeInfo: { flex: 1 },
  payeeName: { fontSize: 16, fontWeight: "500", color: colors.text },
  payeeAccount: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
  },
  radioOn: { borderColor: colors.accent, backgroundColor: colors.accent },
  error: { color: colors.debit, fontSize: 13, marginBottom: 8 },
  form: { marginTop: spacing.lg },
});
