/// <reference types="expo/types" />

declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_API_URL?: string;
    EXPO_PUBLIC_CAMPUS_ID?: string;
    EXPO_PUBLIC_APP_NAME?: string;
    EXPO_PUBLIC_APP_SLUG?: string;
    EXPO_PUBLIC_DEV_PORT?: string;
  }
}
