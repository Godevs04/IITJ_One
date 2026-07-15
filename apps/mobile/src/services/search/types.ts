import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import type { Href } from 'expo-router';

export type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface SearchEntry {
  /** Unique across the whole index — prefix with the provider id. */
  id: string;
  title: string;
  subtitle?: string;
  /** Human-readable module name shown as the badge, e.g. "Mess", "Transport". */
  module: string;
  icon: IoniconName;
  category?: string;
  /** Extra terms that should match (aliases, dish names, stop names, ...). */
  keywords?: string[];
  route: Href;
}

export interface SearchProvider {
  id: string;
  getEntries(): SearchEntry[];
}
