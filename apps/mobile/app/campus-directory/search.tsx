import { useMemo, useRef, useState, useEffect } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { EmptyState } from '@/components/EmptyState';
import { useCampusModule } from '@/hooks/useCampusModule';
import type { DepartmentDoc, OrganizationDoc, PersonDoc, RoleDoc } from '@/types/campus';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

interface DirectoryResult {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  typeLabel: string;
  title: string;
  subtitle?: string;
}

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

function matches(query: string, ...fields: (string | undefined)[]): boolean {
  return fields.some((f) => f && normalize(f).includes(query));
}

export default function CampusDirectorySearchScreen() {
  const theme = useThemeColors();
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);

  const departments = useCampusModule<DepartmentDoc[]>('campusDirectoryDepartments') ?? [];
  const people = useCampusModule<PersonDoc[]>('campusDirectoryPeople') ?? [];
  const organizations = useCampusModule<OrganizationDoc[]>('campusDirectoryOrganizations') ?? [];
  const roles = useCampusModule<RoleDoc[]>('campusDirectoryRoles') ?? [];

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(timer);
  }, []);

  const results = useMemo<DirectoryResult[]>(() => {
    const q = normalize(query);
    if (!q) return [];

    const personById = new Map(people.map((p) => [p._id, p]));
    const orgById = new Map(organizations.map((o) => [o._id, o]));

    const departmentResults: DirectoryResult[] = departments
      .filter((d) => matches(q, d.name, d.shortName))
      .map((d) => ({
        id: `department-${d._id}`,
        icon: 'business-outline',
        typeLabel: 'Department',
        title: d.name,
        subtitle: d.building,
      }));

    const peopleResults: DirectoryResult[] = people
      .filter((p) => matches(q, p.name, p.designation, p.email))
      .map((p) => ({
        id: `person-${p._id}`,
        icon: 'person-outline',
        typeLabel: 'Person',
        title: p.name,
        subtitle: [p.designation, p.departmentId ? departments.find((d) => d._id === p.departmentId)?.name : undefined]
          .filter(Boolean)
          .join(' · '),
      }));

    const organizationResults: DirectoryResult[] = organizations
      .filter((o) => matches(q, o.name, o.category))
      .map((o) => ({
        id: `organization-${o._id}`,
        icon: 'people-outline',
        typeLabel: 'Organization',
        title: o.name,
        subtitle: o.category,
      }));

    const roleResults: DirectoryResult[] = roles
      .filter((r) => matches(q, r.title, r.category))
      .map((r) => ({
        id: `role-${r._id}`,
        icon: 'ribbon-outline',
        typeLabel: 'Role',
        title: r.title,
        subtitle: [personById.get(r.personId)?.name, r.organizationId ? orgById.get(r.organizationId)?.name : undefined]
          .filter(Boolean)
          .join(' · '),
      }));

    return [...peopleResults, ...departmentResults, ...organizationResults, ...roleResults];
  }, [query, departments, people, organizations, roles]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safe, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.searchRow, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </Pressable>
        <Ionicons name="search-outline" size={18} color={theme.textMuted} />
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={setQuery}
          placeholder="Search people, departments, organizations…"
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { color: theme.text }]}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 ? (
          <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={20} color={theme.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={[styles.resultRow, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <View style={[styles.resultIcon, { backgroundColor: theme.surfaceMuted }]}>
              <Ionicons name={item.icon} size={18} color={theme.iconMuted} />
            </View>
            <View style={styles.resultText}>
              <Text style={[styles.resultTitle, { color: theme.text }]} numberOfLines={1}>
                {item.title}
              </Text>
              {item.subtitle ? (
                <Text style={[styles.resultSubtitle, { color: theme.textMuted }]} numberOfLines={1}>
                  {item.subtitle}
                </Text>
              ) : null}
            </View>
            <Text style={[styles.resultType, { color: theme.textMuted }]}>{item.typeLabel}</Text>
          </View>
        )}
        ListEmptyComponent={
          query.trim().length === 0 ? (
            <EmptyState
              icon="search-outline"
              title="Search Campus Directory"
              message="Find people, departments, organizations, and roles across IIT Jodhpur."
            />
          ) : (
            <EmptyState icon="file-tray-outline" title="No results found" message={`Nothing matches "${query.trim()}".`} />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    marginHorizontal: AppSpacing.lg,
    marginTop: AppSpacing.sm,
    paddingHorizontal: AppSpacing.md,
    height: 48,
    borderRadius: AppRadius.lg,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    ...AppTypography.body,
    paddingVertical: 0,
  },
  listContent: {
    padding: AppSpacing.lg,
    gap: AppSpacing.sm,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    borderWidth: 1,
    borderRadius: AppRadius.md,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
    marginBottom: AppSpacing.sm,
  },
  resultIcon: {
    width: 36,
    height: 36,
    borderRadius: AppRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultText: {
    flex: 1,
    gap: 2,
  },
  resultTitle: {
    ...AppTypography.body,
    fontWeight: '600',
  },
  resultSubtitle: {
    ...AppTypography.caption,
  },
  resultType: {
    ...AppTypography.caption,
  },
});
