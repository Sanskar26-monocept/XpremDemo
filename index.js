import { registerRootComponent } from 'expo';
import { ObserveRoot } from 'expo-observe';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
// ObserveRoot records the launch timings (first render, time to interactive)
// that expo-observe sends to the xprem server's Observe pages.
registerRootComponent(ObserveRoot.wrap(App));
