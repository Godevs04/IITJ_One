/**
 * Type declarations for @react-native-firebase packages.
 * These provide minimal typing for dynamic imports.
 * Full types are available when packages are installed via npm install.
 */

declare module '@react-native-firebase/app' {
  interface FirebaseApp {
    name: string;
  }
  interface FirebaseModule {
    apps: FirebaseApp[];
  }
  const firebase: FirebaseModule;
  export default firebase;
}

declare module '@react-native-firebase/analytics' {
  interface AnalyticsModule {
    setAnalyticsCollectionEnabled(enabled: boolean): Promise<void>;
    logScreenView(params: { screen_name: string; screen_class: string }): Promise<void>;
    logEvent(name: string, params?: Record<string, string | number | boolean>): Promise<void>;
    setUserId(id: string | null): Promise<void>;
    setUserProperty(name: string, value: string | null): Promise<void>;
    setUserProperties(props: Record<string, string | null>): Promise<void>;
    resetAnalyticsData(): Promise<void>;
  }
  function analytics(): AnalyticsModule;
  export default analytics;
}

declare module '@react-native-firebase/crashlytics' {
  interface CrashlyticsModule {
    setCrashlyticsCollectionEnabled(enabled: boolean): Promise<void>;
    recordError(error: Error): Promise<void>;
    log(message: string): Promise<void>;
    setAttribute(key: string, value: string): Promise<void>;
    setAttributes(attrs: Record<string, string>): Promise<void>;
    setUserId(id: string): Promise<void>;
    crash(): void;
  }
  function crashlytics(): CrashlyticsModule;
  export default crashlytics;
}

declare module '@react-native-firebase/perf' {
  interface Trace {
    start(): Promise<void>;
    stop(): Promise<void>;
    putMetric(name: string, value: number): void;
    putAttribute(name: string, value: string): void;
  }
  interface PerfModule {
    newTrace(name: string): Promise<Trace>;
  }
  function perf(): PerfModule;
  export default perf;
}

declare module '@react-native-firebase/remote-config' {
  interface RemoteConfigModule {
    setDefaults(defaults: Record<string, string | number | boolean>): Promise<void>;
    setConfigSettings(settings: { minimumFetchIntervalMillis: number }): Promise<void>;
    fetchAndActivate(): Promise<boolean>;
    getBoolean(key: string): boolean;
    getString(key: string): string;
    getNumber(key: string): number;
  }
  function remoteConfig(): RemoteConfigModule;
  export default remoteConfig;
}

declare module '@react-native-firebase/messaging' {
  interface RemoteMessage {
    messageId?: string;
    notification?: { title?: string; body?: string; };
    data?: Record<string, string>;
    sentTime?: number;
  }
  interface MessagingModule {
    getToken(): Promise<string>;
    deleteToken(): Promise<void>;
    onTokenRefresh(listener: (token: string) => void): () => void;
    onMessage(listener: (message: RemoteMessage) => unknown): () => void;
    setBackgroundMessageHandler(handler: (message: RemoteMessage) => Promise<void>): void;
    getInitialNotification(): Promise<RemoteMessage | null>;
    onNotificationOpenedApp(listener: (message: RemoteMessage) => void): () => void;
    subscribeToTopic(topic: string): Promise<void>;
    unsubscribeFromTopic(topic: string): Promise<void>;
    requestPermission(settings?: object): Promise<number>;
    hasPermission(): Promise<number>;
  }
  function messaging(): MessagingModule;
  export default messaging;
}
