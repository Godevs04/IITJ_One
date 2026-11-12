import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { qrCollection, uriFor, useSavedQrs, type SavedQr } from '@/qr/qrCollection';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppTypography, spacing } from '@/theme/tokens';

const formatAdded = (iso: string) => {
  const d = new Date(iso);
  return `Added ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
};

/** A QR whose file is missing or unreadable shows an error instead of a broken image. */
function QrImage({ qr, style }: { qr: SavedQr; style: object }) {
  const theme = useThemeColors();
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <View style={[style, styles.broken, { backgroundColor: theme.surfaceMuted }]} accessibilityLabel="Image unavailable">
        <MaterialIcons name="broken-image" size={24} color={theme.textMuted} />
      </View>
    );
  }
  return <Image source={{ uri: uriFor(qr) }} resizeMode="contain" style={style} onError={() => setFailed(true)} />;
}

/** "Redeem": every saved QR in its own row; tapping one opens it full size for scanning. */
export default function SavedQrScreen() {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const { items, ready } = useSavedQrs();
  const [open, setOpen] = useState<SavedQr | null>(null);

  const confirmDelete = (qr: SavedQr) =>
    Alert.alert('Delete this QR?', `"${qr.caption}" will be removed from this device.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setOpen(null);
          void qrCollection.remove(qr.id);
        },
      },
    ]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {!ready ? (
        <ActivityIndicator style={styles.center} color={theme.linkText} />
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <MaterialIcons name="qr-code-2" size={64} color={theme.iconMuted} />
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>No QR codes added yet.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(q) => q.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setOpen(item)}
              accessibilityRole="button"
              accessibilityLabel={`${item.caption}. View QR`}
              style={({ pressed }) => [styles.row, { backgroundColor: theme.surface, borderColor: theme.border }, pressed && styles.pressed]}
            >
              <QrImage qr={item} style={styles.thumb} />
              <View style={styles.rowText}>
                <Text style={[styles.caption, { color: theme.text }]} numberOfLines={1}>{item.caption}</Text>
                <Text style={[styles.meta, { color: theme.textMuted }]}>{formatAdded(item.addedAt)}</Text>
              </View>
              <Text style={[styles.view, { color: theme.linkText }]}>View</Text>
            </Pressable>
          )}
        />
      )}

      <View style={[styles.footer, { backgroundColor: theme.background, paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Pressable
          onPress={() => router.push('/qr/add')}
          accessibilityRole="button"
          accessibilityLabel="Add QR"
          style={({ pressed }) => [styles.add, { backgroundColor: theme.primary }, pressed && styles.pressed]}
        >
          <MaterialIcons name="add" size={22} color={theme.onPrimary} />
          <Text style={[styles.addText, { color: theme.onPrimary }]}>Add QR</Text>
        </Pressable>
      </View>

      <Modal visible={open != null} animationType="fade" onRequestClose={() => setOpen(null)} statusBarTranslucent>
        {open ? (
          // A white sheet with the QR centred and nothing drawn over it — what scanners read best.
          <View style={[styles.viewer, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.md }]}>
            <View style={styles.viewerBar}>
              <Text style={styles.viewerCaption} numberOfLines={1}>{open.caption}</Text>
              <Pressable onPress={() => confirmDelete(open)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Delete this QR" style={styles.viewerIcon}>
                <MaterialIcons name="delete-outline" size={24} color="#000000" />
              </Pressable>
              <Pressable onPress={() => setOpen(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close" style={styles.viewerIcon}>
                <MaterialIcons name="close" size={26} color="#000000" />
              </Pressable>
            </View>
            <QrImage qr={open} style={styles.viewerImage} />
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  emptyText: { ...AppTypography.body },
  list: { padding: spacing.screenMargin },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 80,
    padding: spacing.sm,
    borderRadius: AppRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  thumb: { width: 64, height: 64, borderRadius: AppRadius.sm, backgroundColor: '#FFFFFF' },
  broken: { alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, minWidth: 0, gap: spacing.xs },
  caption: { ...AppTypography.bodyHeader },
  meta: { ...AppTypography.bodySmall },
  view: { ...AppTypography.bodyHeader },
  footer: { paddingHorizontal: spacing.screenMargin, paddingTop: spacing.sm },
  add: {
    minHeight: 56,
    borderRadius: AppRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  addText: { ...AppTypography.button },
  viewer: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: spacing.screenMargin },
  viewerBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  viewerCaption: { ...AppTypography.h2, color: '#000000', flex: 1 },
  viewerIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  viewerImage: { flex: 1, width: '100%', marginTop: spacing.md },
  pressed: { opacity: 0.85 },
});
