import { ScrollView, StyleSheet, Text } from "react-native";
import { useBank } from "../context/BankContext";
import { Card, Row } from "../components/ui";
import { colors, spacing } from "../theme";
import { formatDateTime, formatMoney } from "../utils/format";

export default function TransactionDetailScreen({ route }) {
  const { transactions } = useBank();
  const tx = transactions.find((t) => t.id === route.params.id);

  if (!tx) {
    return <Text style={styles.missing}>Transaction not found.</Text>;
  }
  const credit = tx.type === "credit";

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.amount, { color: credit ? colors.credit : colors.text }]}>
        {credit ? "+" : "-"}
        {formatMoney(tx.amount)}
      </Text>
      <Text style={styles.title}>{tx.title}</Text>
      <Card style={styles.card}>
        <Row label="Type" value={credit ? "Credit" : "Debit"} />
        <Row label="Category" value={tx.category} />
        <Row label="Date" value={formatDateTime(tx.date)} />
        <Row label="Note" value={tx.note || "-"} />
        <Row label="Reference" value={tx.id.toUpperCase()} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md },
  amount: { fontSize: 40, fontWeight: "700", textAlign: "center", marginTop: spacing.lg },
  title: { fontSize: 18, textAlign: "center", color: colors.textMuted, marginVertical: spacing.md },
  card: { marginTop: spacing.sm },
  missing: { textAlign: "center", marginTop: spacing.xl, color: colors.textMuted },
});
