import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { DietMark } from '@/components/DietMark';
import { useModalOverlayLock } from '@/services/overlayGate';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';
import { debugListKeys } from '@/debug/listDebug';
import { MESS_PRICING_MEALS, priceWithGst, type MessPricingMeal } from '@iitj1/types';
import { useMessPricing } from '../useMessPricing';

const MEAL_LABELS: Record<MessPricingMeal, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snacks: 'Snacks',
  dinner: 'Dinner',
};

function rupees(amount: number): string {
  return `₹${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
}

function formatDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Mess charges (regular plan, pay & use) and the Mess Office contact. Prices come from the admin-managed
 * `messPricing` module (useMessPricing), with the standard prices as an offline fallback.
 */
export function MessChargesSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useThemeColors();
  useModalOverlayLock(visible);
  const { pricing, source } = useMessPricing();
  const mealPrices = MESS_PRICING_MEALS.map((meal) => ({
    meal: MEAL_LABELS[meal],
    veg: rupees(pricing.payAndUse[meal].veg),
    nonVeg: rupees(pricing.payAndUse[meal].nonVeg),
  }));
  const gst = pricing.regularGstPercent;
  const regularRows = [
    { type: 'veg' as const, label: 'Veg mess', amount: pricing.regular.veg },
    { type: 'nonVeg' as const, label: 'Non-veg mess', amount: pricing.regular.nonVeg },
  ].map((row) => ({
    ...row,
    price: gst > 0 ? `${rupees(row.amount)} + GST` : rupees(row.amount),
    approx: gst > 0 ? `≈ ${rupees(priceWithGst(row.amount, gst))} / day` : 'per day',
  }));
  const sourceNote =
    source === 'server'
      ? `Prices effective from ${formatDate(pricing.effectiveFrom)}`
      : source === 'loading'
        ? 'Loading the latest prices…'
        : "Showing standard prices — couldn't load the latest from the server.";
  debugListKeys('MessChargesSheet', 'mealCharges', mealPrices, (item) => item.meal);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => onClose()}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => onClose()}
          accessibilityRole="button"
          accessibilityLabel="Close dialog"
        />

        <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Mess Charges</Text>
            <Pressable
              onPress={() => onClose()}
              style={styles.modalCloseButton}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <MaterialIcons name="close" size={24} color={theme.textMuted} />
            </Pressable>
          </View>
          <Text
            style={[styles.sourceNote, { color: source === 'fallback' ? theme.countdownUrgent : theme.textMuted }]}
            accessibilityLiveRegion="polite"
          >
            {sourceNote}
          </Text>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            bounces={true}
          >
            {/* Option 1 — regular (monthly) users */}
            <View style={[styles.planCard, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}>
              <View style={styles.planHeader}>
                <MaterialIcons name="calendar-today" size={18} color={theme.linkText} />
                <Text style={[styles.planTitle, { color: theme.text }]}>Regular plan</Text>
                <View style={[styles.planBadge, { backgroundColor: theme.primaryTint }]}>
                  <Text style={[styles.planBadgeText, { color: theme.linkText }]}>PER DAY · ALL MEALS</Text>
                </View>
              </View>
              <Text style={[styles.sectionDescription, { color: theme.textMuted }]}>
                For students, staff and faculty who eat every meal in the mess. Billed per day via ERP or register.
              </Text>
              {regularRows.map((row) => (
                <View key={row.type} style={[styles.planRow, { borderTopColor: theme.border }]}>
                  <DietMark type={row.type} size={14} />
                  <Text style={[styles.priceLabel, { color: theme.text, flex: 1 }]}>{row.label}</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.priceVal, { color: row.type === 'veg' ? theme.veg : theme.nonVeg }]}>{row.price}</Text>
                    <Text style={[styles.planApprox, { color: theme.textMuted }]}>{row.approx}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Option 2 — pay & use, per meal */}
            <View style={[styles.planCard, { borderColor: theme.border, backgroundColor: theme.surfaceMuted, marginTop: AppSpacing.md }]}>
              <View style={styles.planHeader}>
                <MaterialIcons name="account-balance-wallet" size={18} color={theme.secondary} />
                <Text style={[styles.planTitle, { color: theme.text }]}>Pay & Use</Text>
                <View style={[styles.planBadge, { backgroundColor: theme.secondaryTint }]}>
                  <Text style={[styles.planBadgeText, { color: theme.secondary }]}>PER MEAL</Text>
                </View>
              </View>
              <Text style={[styles.sectionDescription, { color: theme.textMuted }]}>
                For anyone eating only some meals — students, staff, faculty or visitors. Prices include GST.
              </Text>

              <View style={[styles.tableHeader, { borderBottomColor: theme.border }]}>
                <Text style={[styles.th, { flex: 2, color: theme.textMuted }]}>Meal</Text>
                <View style={[styles.thCell, { flex: 1.5 }]}>
                  <DietMark type="veg" size={12} />
                  <Text style={[styles.th, { color: theme.veg }]}>Veg</Text>
                </View>
                <View style={[styles.thCell, { flex: 1.5 }]}>
                  <DietMark type="nonVeg" size={12} />
                  <Text style={[styles.th, { color: theme.nonVeg }]}>Non-veg</Text>
                </View>
              </View>

              {mealPrices.map((item) => (
                <View key={item.meal} style={[styles.tableRow, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.td, { flex: 2, fontWeight: '600', color: theme.text }]}>{item.meal}</Text>
                  <Text style={[styles.td, { flex: 1.5, textAlign: 'right', color: theme.veg, fontWeight: '700' }]}>{item.veg}</Text>
                  <Text style={[styles.td, { flex: 1.5, textAlign: 'right', color: theme.nonVeg, fontWeight: '700' }]}>{item.nonVeg}</Text>
                </View>
              ))}
            </View>

            {/* Footer / Queries */}
            <Pressable
              style={[styles.queryContainer, { backgroundColor: theme.primaryTint }]}
              onPress={() => void Linking.openURL('mailto:mess@iitj.ac.in')}
              accessibilityRole="link"
              accessibilityLabel="Email Mess Office at mess@iitj.ac.in"
            >
              <MaterialIcons name="mail-outline" size={18} color={theme.linkText} />
              <Text style={[styles.queryText, { color: theme.linkText }]}>
                For queries, contact Mess Office at{' '}
                <Text style={styles.queryEmail}>mess@iitj.ac.in</Text>
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '85%',
    borderRadius: AppRadius.lg,
    paddingTop: AppSpacing.lg,
    paddingHorizontal: AppSpacing.lg,
    paddingBottom: AppSpacing.sm,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  sourceNote: {
    ...AppTypography.caption,
    marginTop: -AppSpacing.sm,
    marginBottom: AppSpacing.sm,
  },
  modalScroll: {
    flexShrink: 1,
  },
  modalScrollContent: {
    paddingBottom: AppSpacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AppSpacing.md,
  },
  modalTitle: {
    ...AppTypography.h2,
    fontWeight: '700',
  },
  modalCloseButton: {
    padding: 4,
  },
  sectionDescription: {
    ...AppTypography.caption,
    fontSize: 12,
    marginBottom: AppSpacing.sm,
    lineHeight: 16,
  },
  planCard: {
    borderWidth: 1,
    borderRadius: AppRadius.md,
    padding: AppSpacing.md,
    gap: AppSpacing.sm,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    flexWrap: 'wrap',
  },
  planTitle: {
    ...AppTypography.h2,
    fontSize: 17,
  },
  planBadge: {
    borderRadius: AppRadius.full,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 2,
  },
  planBadgeText: {
    ...AppTypography.caption,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    borderTopWidth: 1,
    paddingTop: AppSpacing.sm,
  },
  planApprox: {
    ...AppTypography.caption,
  },
  thCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  priceLabel: {
    ...AppTypography.bodySmall,
    fontWeight: '600',
  },
  priceVal: {
    ...AppTypography.bodySmall,
    fontWeight: '700',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  th: {
    ...AppTypography.caption,
    fontWeight: '700',
    fontSize: 12,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: AppSpacing.sm,
    borderBottomWidth: 1,
  },
  td: {
    ...AppTypography.bodySmall,
    fontSize: 13,
  },
  queryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    borderRadius: AppRadius.sm,
    padding: AppSpacing.md,
    marginTop: AppSpacing.lg,
    marginBottom: AppSpacing.xs,
  },
  queryText: {
    ...AppTypography.caption,
    flex: 1,
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 18,
  },
  queryEmail: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
