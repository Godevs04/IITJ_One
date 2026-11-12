import { Alert } from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { isHttpUrl } from '@/utils/urlSafety';
import type { HomeService } from './homeServices';

/**
 * Opens a service: internal ones navigate within the app, external ones open the institute's site in the
 * in-app browser. Only HTTPS addresses are opened, no app credentials are ever passed along, and a service
 * without a usable destination says so instead of going somewhere unrelated.
 */
export async function openService(service: Pick<HomeService, 'label' | 'destination'>): Promise<void> {
  const { destination } = service;
  if (destination.type === 'internal') {
    router.push(destination.route);
    return;
  }
  if (!destination.url.startsWith('https://') || !isHttpUrl(destination.url)) {
    Alert.alert('Service currently unavailable', `${service.label} has no valid link configured.`);
    return;
  }
  try {
    await WebBrowser.openBrowserAsync(destination.url);
  } catch {
    Alert.alert('Could not open the link', `You can visit ${destination.url} in your browser.`);
  }
}
