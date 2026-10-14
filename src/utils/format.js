// Money is kept in cents so balances never pick up floating point drift.
export function formatMoney(cents) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const rest = (abs % 100).toString().padStart(2, "0");
  return `${sign}$${dollars}.${rest}`;
}

// Parses user input like "12.5" into 1250 cents; returns null when invalid.
export function parseAmountToCents(input) {
  const text = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  return Math.round(parseFloat(text) * 100);
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatDate(iso) {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function formatDateTime(iso) {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${formatDate(iso)}, ${h % 12 || 12}:${m} ${h >= 12 ? "PM" : "AM"}`;
}
