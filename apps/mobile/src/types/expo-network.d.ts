/**
 * Minimal type declaration for expo-network.
 * Full types available when package is installed via npm install.
 */
declare module 'expo-network' {
  interface NetworkState {
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
    type: string;
  }
  export function getNetworkStateAsync(): Promise<NetworkState>;
}
