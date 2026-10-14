import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Observe } from "expo-observe";
import { DEMO_USER, seedState } from "../data";

const STORAGE_KEY = "releasex-bank-state-v1";

const BankContext = createContext(null);

export function BankProvider({ children }) {
  const [hydrated, setHydrated] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);

  // Restore the saved session and data, or start from the seed data.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const saved = raw ? JSON.parse(raw) : null;
        const initial = saved ?? { ...seedState(), loggedIn: false };
        setBalance(initial.balance);
        setTransactions(initial.transactions);
        setLoggedIn(Boolean(initial.loggedIn));
      } catch (error) {
        Observe.reportError(error);
        const seed = seedState();
        setBalance(seed.balance);
        setTransactions(seed.transactions);
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  // Persist after every change once the initial load has finished.
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ loggedIn, balance, transactions }),
    ).catch((error) => Observe.reportError(error));
  }, [hydrated, loggedIn, balance, transactions]);

  const login = useCallback((username, pin) => {
    const ok =
      username.trim().toLowerCase() === DEMO_USER.username &&
      pin === DEMO_USER.pin;
    if (ok) setLoggedIn(true);
    return ok;
  }, []);

  const logout = useCallback(() => setLoggedIn(false), []);

  // Returns an error string, or null on success.
  const transfer = useCallback(
    ({ payee, amount, note }) => {
      if (amount <= 0) return "Enter an amount greater than zero.";
      if (amount > balance) return "Insufficient balance for this transfer.";
      const tx = {
        id: `t${Date.now()}`,
        date: new Date().toISOString(),
        type: "debit",
        title: `Transfer to ${payee.name}`,
        amount,
        category: "Transfer",
        note,
      };
      setBalance((b) => b - amount);
      setTransactions((list) => [tx, ...list]);
      return null;
    },
    [balance],
  );

  // Back to the seed data, handy to repeat a demo.
  const resetData = useCallback(() => {
    const seed = seedState();
    setBalance(seed.balance);
    setTransactions(seed.transactions);
  }, []);

  const value = useMemo(
    () => ({
      hydrated,
      loggedIn,
      user: DEMO_USER,
      balance,
      transactions,
      login,
      logout,
      transfer,
      resetData,
    }),
    [hydrated, loggedIn, balance, transactions, login, logout, transfer, resetData],
  );

  return <BankContext.Provider value={value}>{children}</BankContext.Provider>;
}

export function useBank() {
  const ctx = useContext(BankContext);
  if (!ctx) throw new Error("useBank must be used inside BankProvider");
  return ctx;
}
