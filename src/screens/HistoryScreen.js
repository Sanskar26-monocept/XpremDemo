import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useBank } from "../context/BankContext";
import TransactionRow from "../components/TransactionRow";
import { colors, spacing } from "../theme";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "credit", label: "Credit" },
  { key: "debit", label: "Debit" },
];

export default function HistoryScreen({ navigation }) {
  const { transactions } = useBank();
  const [filter, setFilter] = useState("all");
  const data = filter === "all" ? transactions : transactions.filter((t) => t.type === filter);

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        {FILTERS.map((f) => {
          const active = f.key === filter;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <FlatList
        data={data}
        keyExtractor={(tx) => tx.id}
        renderItem={({ item }) => (
          <TransactionRow
            tx={item}
            onPress={() => navigation.navigate("TransactionDetail", { id: item.id })}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={<Text style={styles.empty}>No transactions to show.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  filters: { flexDirection: "row", gap: 8, padding: spacing.md },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.accent },
  chipText: { color: colors.text, fontWeight: "500" },
  chipTextActive: { color: "#fff" },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 66 },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: spacing.xl },
});
