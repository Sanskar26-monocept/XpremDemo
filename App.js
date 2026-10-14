import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BankProvider } from "./src/context/BankContext";
import { UpdatesProvider } from "./src/context/UpdatesContext";
import Navigation from "./src/navigation";

export default function App() {
  return (
    <SafeAreaProvider>
      <UpdatesProvider>
        <BankProvider>
          <Navigation />
          <StatusBar style="auto" />
        </BankProvider>
      </UpdatesProvider>
    </SafeAreaProvider>
  );
}
