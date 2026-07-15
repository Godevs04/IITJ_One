import { useEffect, useState, useMemo } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing } from '@/theme/tokens';
import { ScreenShell } from '@/components/ScreenShell';
import { useCampusModule } from '@/hooks/useCampusModule';
import { useCampusSync } from '@/hooks/useCampusSync';
import type { TransportAlertsDoc, TransportAlert } from '@/types/campus';
import { isAlertActive } from '@/transport/services/ScheduleEngine';
import { isHttpUrl } from '@/utils/urlSafety';

const CategoryLabels: Record<string, string> = {
  service_update: 'Service Update',
  breakdown: 'Bus Breakdown',
  maintenance: 'Maintenance',
  holiday: 'Holiday Service',
  emergency: 'Emergency',
  info: 'Information',
  other: 'Other',
};

export default function TransportAlertsScreen() {
  const { colors: theme, darkMode } = useTheme();
  const { syncing, sync } = useCampusSync(false);
  const alertsDoc = useCampusModule<TransportAlertsDoc>('transportAlerts');
  
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000); // 30s tick
    return () => clearInterval(timer);
  }, []);

  const activeAlerts = useMemo(() => {
    if (!alertsDoc?.alerts) return [];
    return alertsDoc.alerts
      .filter((a) => isAlertActive(a, now))
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [alertsDoc, now]);

  const handleOpenLink = async (url: string) => {
    if (!isHttpUrl(url)) return;
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      console.error('Failed to open web browser link', e);
    }
  };

  const getPriorityStyle = (priority: TransportAlert['priority']) => {
    switch (priority) {
      case 'critical':
        return {
          borderLeftColor: '#EF4444',
          backgroundColor: darkMode ? '#251616' : '#FDF2F2',
          icon: 'warning' as const,
          iconColor: '#EF4444',
          accentColor: '#EF4444',
        };
      case 'warning':
        return {
          borderLeftColor: '#F59E0B',
          backgroundColor: darkMode ? '#251E13' : '#FFFBEB',
          icon: 'alert-circle' as const,
          iconColor: '#F59E0B',
          accentColor: '#F59E0B',
        };
      case 'info':
        return {
          borderLeftColor: '#3B82F6',
          backgroundColor: darkMode ? '#131A28' : '#EFF6FF',
          icon: 'information-circle' as const,
          iconColor: '#3B82F6',
          accentColor: '#3B82F6',
        };
      default:
        return {
          borderLeftColor: theme.border,
          backgroundColor: theme.surface,
          icon: 'chatbubble-ellipses-outline' as const,
          iconColor: theme.textMuted,
          accentColor: theme.textMuted,
        };
    }
  };

  const formatAlertTime = (dateStr: string): string => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return (
      d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
      ' at ' +
      d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    );
  };

  return (
    <ScreenShell
      title="Transport Alerts"
      subtitle="Latest alerts, emergency schedules, and route updates"
      onRefresh={sync}
      refreshing={syncing}
    >
      <View style={styles.container}>
        {activeAlerts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: theme.primaryTint }]}>
              <Ionicons name="notifications-off-outline" size={32} color={theme.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>All Clear</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
              There are no active service alerts or emergency timetable overrides at the moment.
            </Text>
          </View>
        ) : (
          <View style={styles.alertList}>
            {activeAlerts.map((alert) => {
              const priorityStyle = getPriorityStyle(alert.priority);
              return (
                <View
                  key={alert.id}
                  style={[
                    styles.alertCard,
                    {
                      backgroundColor: priorityStyle.backgroundColor,
                      borderColor: theme.border,
                      borderLeftColor: priorityStyle.borderLeftColor,
                    },
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.headerTitleContainer}>
                      <Ionicons
                        name={priorityStyle.icon}
                        size={20}
                        color={priorityStyle.iconColor}
                        style={styles.alertIcon}
                      />
                      <Text style={[styles.alertTitle, { color: theme.text }]} numberOfLines={2}>
                        {alert.title}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                      ]}
                    >
                      <Text style={[styles.badgeText, { color: priorityStyle.accentColor }]}>
                        {CategoryLabels[alert.category] ?? 'Service Update'}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.alertMessage, { color: theme.text }]}>
                    {alert.message}
                  </Text>

                  <View style={styles.cardFooter}>
                    <Text style={[styles.timestamp, { color: theme.textMuted }]}>
                      Updated: {formatAlertTime(alert.startDate)}
                    </Text>

                    {isHttpUrl(alert.link) ? (
                      <Pressable
                        onPress={() => handleOpenLink(alert.link!)}
                        style={({ pressed }) => [
                          styles.linkButton,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text style={[styles.linkText, { color: theme.primary }]}>Read More</Text>
                        <Ionicons name="open-outline" size={14} color={theme.primary} />
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  alertList: {
    gap: AppSpacing.md,
  },
  alertCard: {
    borderRadius: AppRadius.md,
    borderWidth: 1,
    borderLeftWidth: 5,
    padding: AppSpacing.md,
    gap: AppSpacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: AppSpacing.sm,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: AppSpacing.xs,
  },
  alertIcon: {
    marginTop: 1,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: AppRadius.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  alertMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: AppSpacing.xs,
    paddingTop: AppSpacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  timestamp: {
    fontSize: 11,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: AppSpacing.lg,
    gap: AppSpacing.md,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.7,
  },
});
