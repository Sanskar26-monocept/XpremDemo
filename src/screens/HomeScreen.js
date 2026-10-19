import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useBank } from "../context/BankContext";
import { Button, SectionTitle } from "../components/ui";
import TransactionRow from "../components/TransactionRow";
import UpdateCard from "../components/UpdateCard";
import { colors, spacing } from "../theme";
import { formatMoney } from "../utils/format";

export default function HomeScreen({ navigation }) {
  const { user, balance, transactions } = useBank();
  const recent = transactions.slice(0, 3);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>
        Good Afternoon, {user.name.split(" ")[0]}
      </Text>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Available balance</Text>
        <Text style={styles.balance}>{formatMoney(balance)}</Text>
        <Text style={styles.account}>Checking {user.accountNumber}</Text>
      </View>

      <UpdateCard />

      <View style={styles.actions}>
        <Button
          title="Send money"
          onPress={() => navigation.navigate("Transfer")}
          style={styles.action}
        />
        <Button
          title="View history"
          variant="secondary"
          onPress={() => navigation.navigate("History")}
          style={styles.action}
        />
      </View>

      <SectionTitle>Recent activity</SectionTitle>
      <View style={styles.list}>
        {recent.map((tx) => (
          <TransactionRow
            key={tx.id}
            tx={tx}
            onPress={() =>
              navigation.navigate("TransactionDetail", { id: tx.id })
            }
          />
        ))}
        {recent.length === 0 ? (
          <Text style={styles.empty}>No transactions yet.</Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  greeting: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.md,
  },
  balanceCard: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  balanceLabel: { color: "#dbe6ff", fontSize: 14 },
  balance: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "700",
    marginVertical: 6,
  },
  account: { color: "#dbe6ff", fontSize: 14 },
  actions: { flexDirection: "row", gap: 12, marginBottom: spacing.lg },
  action: { flex: 1, paddingHorizontal: 8 },
  list: { marginHorizontal: -spacing.md },
  empty: { color: colors.textMuted, paddingHorizontal: spacing.md },
});
