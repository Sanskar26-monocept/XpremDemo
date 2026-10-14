import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../theme";
import { formatDate, formatMoney } from "../utils/format";

export default function TransactionRow({ tx, onPress }) {
  const credit = tx.type === "credit";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.icon, credit ? styles.iconCredit : styles.iconDebit]}>
        <Text style={[styles.iconText, { color: credit ? colors.credit : colors.debit }]}>
          {credit ? "+" : "-"}
        </Text>
      </View>
      <View style={styles.middle}>
        <Text style={styles.title} numberOfLines={1}>
          {tx.title}
        </Text>
        <Text style={styles.meta}>
          {tx.category} · {formatDate(tx.date)}
        </Text>
      </View>
      <Text style={[styles.amount, { color: credit ? colors.credit : colors.text }]}>
        {credit ? "+" : "-"}
        {formatMoney(tx.amount)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  pressed: { backgroundColor: colors.surface },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconCredit: { backgroundColor: "#e3f4ec" },
  iconDebit: { backgroundColor: "#fbe9e9" },
  iconText: { fontSize: 20, fontWeight: "700" },
  middle: { flex: 1, marginRight: 8 },
  title: { fontSize: 16, fontWeight: "500", color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  amount: { fontSize: 16, fontWeight: "600" },
});
