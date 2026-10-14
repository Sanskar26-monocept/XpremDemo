export const DEMO_USER = {
  username: "demo",
  pin: "1234",
  name: "Alex Morgan",
  email: "alex.morgan@example.com",
  accountNumber: "•••• 4821",
};

export const PAYEES = [
  { id: "p1", name: "Jordan Lee", account: "•••• 1190" },
  { id: "p2", name: "Sam Rivera", account: "•••• 7342" },
  { id: "p3", name: "City Power & Water", account: "•••• 5521" },
  { id: "p4", name: "Maple Street Landlord", account: "•••• 9087" },
];

const DAY = 24 * 60 * 60 * 1000;

export function seedState() {
  const now = Date.now();
  const tx = (id, daysAgo, type, title, cents, category) => ({
    id,
    date: new Date(now - daysAgo * DAY).toISOString(),
    type,
    title,
    amount: cents,
    category,
    note: "",
  });
  return {
    balance: 425075,
    transactions: [
      tx("t1", 1, "debit", "Grocery Mart", 8420, "Groceries"),
      tx("t2", 2, "credit", "Salary - Acme Corp", 320000, "Income"),
      tx("t3", 4, "debit", "Metro Transit Pass", 6500, "Transport"),
      tx("t4", 6, "debit", "Coffee Corner", 475, "Dining"),
      tx("t5", 8, "debit", "Streamly Subscription", 1299, "Entertainment"),
      tx("t6", 11, "credit", "Refund - Online Store", 4550, "Refund"),
      tx("t7", 14, "debit", "City Power & Water", 9830, "Utilities"),
      tx("t8", 20, "debit", "Fitness Club", 3500, "Health"),
    ],
  };
}
