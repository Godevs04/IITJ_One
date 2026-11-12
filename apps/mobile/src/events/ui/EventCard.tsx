import { useState } from 'react';
import { Alert, Image, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { hasSourceReminder } from '@/reminders/reminderLogic';
import { useReminders } from '@/reminders/reminderStore';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppTypography, spacing } from '@/theme/tokens';
import { formatEventWhen, reminderParamsFor, shareText, type EventItem } from '../eventsLogic';
import { toggleClubFollow, toggleSavedEvent, useFollowedClubs, useSavedEventIds } from '../eventsStore';

/** The club's logo, or its initial when it has none. */
export function ClubLogo({ name, logoUrl, size = 40 }: { name: string; logoUrl?: string; size?: number }) {
  const theme = useThemeColors();
  const [failed, setFailed] = useState(false);
  if (logoUrl && !failed) {
    return <Image source={{ uri: logoUrl }} onError={() => setFailed(true)} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: theme.primaryTint, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={[AppTypography.bodyHeader, { color: theme.linkText }]}>{name.trim().charAt(0).toUpperCase() || '?'}</Text>
    </View>
  );
}

/** "+ Follow" / "Following". One tap toggles; the same state shows on every card and in the Clubs list. */
export function ClubFollowButton({ clubId, clubName }: { clubId: string; clubName: string }) {
  const theme = useThemeColors();
  const following = useFollowedClubs().has(clubId);
  const [busy, setBusy] = useState(false);

  const press = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await toggleClubFollow(clubId);
    } catch {
      Alert.alert('Could not update', `Your follow of ${clubName} could not be saved. Please try again.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      onPress={() => void press()}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={following ? `Following ${clubName}. Tap to unfollow` : `Follow ${clubName}`}
      accessibilityState={{ selected: following, busy }}
      style={({ pressed }) => [
        styles.follow,
        following
          ? { backgroundColor: theme.chipActiveBackground, borderColor: theme.chipActiveBackground }
          : { backgroundColor: 'transparent', borderColor: theme.text },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.followText, { color: following ? theme.chipActiveText : theme.text }]}>
        {following ? 'Following' : '+ Follow'}
      </Text>
    </Pressable>
  );
}

/**
 * One event (Screens 11 and 13): organiser with Follow, title and description, poster, then Save · Share · Reminder.
 * Saving is independent of following; Reminder opens the existing New Reminder form pre-filled.
 */
export function EventCard({ event, now }: { event: EventItem; now: Date }) {
  const theme = useThemeColors();
  const saved = useSavedEventIds().has(event.id);
  const { reminders } = useReminders();
  const [posterFailed, setPosterFailed] = useState(false);
  const reminderSet = hasSourceReminder(reminders, 'event', event.id);
  const reminderParams = reminderParamsFor(event, now);

  const save = async () => {
    try {
      await toggleSavedEvent(event.id);
    } catch {
      Alert.alert('Could not update', 'Your saved events could not be updated. Please try again.');
    }
  };

  const share = async () => {
    try {
      await Share.share({ message: shareText(event), title: event.title });
    } catch {
      Alert.alert('Could not share', 'Sharing is not available right now.');
    }
  };

  const reminder = () => {
    if (reminderSet) router.push('/reminders');
    else if (reminderParams) router.push({ pathname: '/reminders/new', params: reminderParams });
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.header}>
        <ClubLogo name={event.clubName} />
        <Text style={[styles.clubName, { color: theme.text }]} numberOfLines={1}>{event.clubName}</Text>
        {event.clubId ? <ClubFollowButton clubId={event.clubId} clubName={event.clubName} /> : null}
      </View>

      <View style={styles.body}>
        <Text style={[styles.title, { color: theme.text }]}>{event.title}</Text>
        <Text style={[styles.when, { color: theme.linkText }]}>{formatEventWhen(event)}</Text>
        {event.venue ? <Text style={[styles.meta, { color: theme.textMuted }]}>{event.venue}</Text> : null}
        {event.description ? <Text style={[styles.description, { color: theme.text }]}>{event.description}</Text> : null}
      </View>

      {event.posterUrl && !posterFailed ? (
        <Image
          source={{ uri: event.posterUrl }}
          resizeMode="contain"
          onError={() => setPosterFailed(true)}
          accessibilityLabel={`${event.title} poster`}
          style={[styles.poster, { backgroundColor: theme.surfaceMuted }]}
        />
      ) : (
        <View style={[styles.poster, styles.noPoster, { backgroundColor: theme.surfaceMuted }]} accessibilityElementsHidden importantForAccessibility="no">
          <MaterialIcons name="event" size={40} color={theme.iconMuted} />
        </View>
      )}

      <View style={styles.actions}>
        <Pressable
          onPress={() => void save()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={saved ? `Remove ${event.title} from saved events` : `Save ${event.title}`}
          accessibilityState={{ selected: saved }}
          style={styles.action}
        >
          <MaterialIcons name={saved ? 'bookmark' : 'bookmark-border'} size={24} color={saved ? theme.linkText : theme.text} />
        </Pressable>
        <Pressable
          onPress={() => void share()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Share ${event.title}`}
          style={styles.action}
        >
          <MaterialIcons name="share" size={24} color={theme.text} />
        </Pressable>
        <Pressable
          onPress={reminder}
          disabled={!reminderSet && !reminderParams}
          accessibilityRole="button"
          accessibilityLabel={reminderSet ? `Reminder set for ${event.title}. View reminders` : `Set a reminder for ${event.title}`}
          accessibilityState={{ disabled: !reminderSet && !reminderParams }}
          style={[styles.reminder, { backgroundColor: reminderSet ? theme.primaryTint : 'transparent', borderColor: theme.border, opacity: !reminderSet && !reminderParams ? 0.4 : 1 }]}
        >
          <MaterialIcons name={reminderSet ? 'notifications-active' : 'notifications-none'} size={18} color={theme.linkText} />
          <Text style={[styles.reminderText, { color: theme.linkText }]}>{reminderSet ? 'Reminder set' : 'Reminder'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: AppRadius.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  clubName: { ...AppTypography.bodyHeader, flex: 1 },
  follow: { minHeight: 36, paddingHorizontal: spacing.md, borderRadius: AppRadius.full, borderWidth: 1.5, justifyContent: 'center' },
  followText: { ...AppTypography.bodySmall, fontWeight: '700' },
  body: { gap: spacing.xs },
  title: { ...AppTypography.h2 },
  when: { ...AppTypography.bodySmall, fontWeight: '600' },
  meta: { ...AppTypography.bodySmall },
  description: { ...AppTypography.body },
  poster: { width: '100%', aspectRatio: 4 / 3, borderRadius: AppRadius.md },
  noPoster: { alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  action: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  reminder: {
    marginLeft: 'auto',
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: AppRadius.full,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  reminderText: { ...AppTypography.bodySmall, fontWeight: '700' },
  pressed: { opacity: 0.8 },
});
