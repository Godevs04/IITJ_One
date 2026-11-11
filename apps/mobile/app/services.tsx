import { useCallback, useMemo, useState } from 'react';
import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import { Alert, StyleSheet, TextInput, View } from 'react-native';
import { DirectoryRow } from '@/components/DirectoryRow';
import { EmptyState } from '@/components/EmptyState';
import { ScreenShell } from '@/components/ScreenShell';
import { useCampusSync } from '@/hooks/useCampusSync';
import { useCampusModule } from '@/hooks/useCampusModule';
import type { ServicesDoc } from '@/types/campus';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing } from '@/theme/tokens';
import { debugListKeys } from '@/debug/listDebug';

const SECURITY_SERVICES = [
  {
    name: 'ID Card & No Dues Clearance',
    category: 'ID Card Cell · Office of Security',
    description: 'Contact Mr. Raghuveer Singh Bhati for new, lost, renewed, or replacement Institute ID cards and No Dues clearance. Email the ID Card Cell directly. Do not send or CC these requests to security@iitj.ac.in.',
    email: 'idcard@iitj.ac.in',
    phone: '0291-2801594',
  },
  {
    name: 'Lost & Found and CCTV Requests',
    category: 'Office of Security',
    description: 'Use this email for lost or found items, related enquiries, and requests to view CCTV footage (viewing only). Include your name, Institute ID or roll number, contact number, date, approximate time, location, and a brief description as applicable. Do not send or CC these requests to security@iitj.ac.in.',
    email: 'lost_found@iitj.ac.in',
  },
];

export default function ServicesScreen() {
  const theme = useThemeColors();
  const { syncing, sync, error } = useCampusSync(false);
  const services = useCampusModule<ServicesDoc>('services');
  const { query: initialQuery } = useLocalSearchParams<{ query?: string }>();
  const [editedQuery, setQuery] = useState<string>();
  const query = editedQuery ?? initialQuery ?? '';
  const searchTerm = query.trim().toLowerCase();
  const securityEntries = SECURITY_SERVICES.filter((entry) =>
    [entry.name, entry.category, entry.description, entry.email].some((field) =>
      field.toLowerCase().includes(searchTerm),
    ),
  );

  const entries = useMemo(() => {
    const list = services?.entries ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        (e.description?.toLowerCase().includes(q) ?? false),
    );
  }, [services, query]);

  debugListKeys('ServicesScreen', 'entries', entries, (entry) => `${entry.name}-${entry.category}`);

  const onRefresh = useCallback(async () => {
    await sync();
  }, [sync]);

  return (
    <ScreenShell
      hideTitle
      subtitle="Directory of useful services"
      onRefresh={onRefresh}
      refreshing={syncing}
      error={error}
    >
      <TextInput
        placeholder="Search services..."
        placeholderTextColor={theme.textMuted}
        value={query}
        onChangeText={setQuery}
        style={[
          styles.search,
          {
            backgroundColor: theme.inputBackground,
            borderColor: theme.border,
            color: theme.text,
          },
        ]}
      />

      {securityEntries.length > 0 || entries.length > 0 ? (
        <View style={{ gap: AppSpacing.sm }}>
          {securityEntries.map((entry) => (
            <DirectoryRow
              key={entry.email}
              title={entry.name}
              subtitle={`${entry.category}\n${entry.email}\n${entry.description}`}
              phone={entry.phone}
              onPress={() => {
                void Linking.openURL(`mailto:${entry.email}`).catch(() => {
                  Alert.alert('Could not open email', `You can email ${entry.email} directly.`);
                });
              }}
            />
          ))}
          {entries.map((entry) => (
            <DirectoryRow
              key={`${entry.name}-${entry.category}`}
              title={entry.name}
              subtitle={[entry.category, entry.hours, entry.description]
                .filter(Boolean)
                .join(' · ')}
              phone={entry.phone}
              onPress={
                entry.lat && entry.lng
                  ? () =>
                      Linking.openURL(
                        `https://www.google.com/maps/search/?api=1&query=${entry.lat},${entry.lng}`,
                      )
                  : undefined
              }
            />
          ))}
        </View>
      ) : (
        <EmptyState
          icon="business-outline"
          title="No services found"
          message={query ? 'Try a different search.' : 'Pull down to sync.'}
        />
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  search: {
    borderRadius: AppRadius.md,
    borderWidth: 1,
    padding: AppSpacing.md,
  },
});
