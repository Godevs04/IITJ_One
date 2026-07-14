import { useCallback, useMemo, useState, useRef } from 'react';
import { Pressable, StyleSheet, Text, View, Modal, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/EmptyState';
import { ScreenShell } from '@/components/ScreenShell';
import { useCampusSync } from '@/hooks/useCampusSync';
import { useCampusModule } from '@/hooks/useCampusModule';
import type { CalendarDoc, CalendarEvent } from '@/types/campus';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

const FILTERS = ['all', 'holiday', 'exam', 'academic', 'event'] as const;

function formatRange(start: string, end: string): string {
  if (start === end) return start;
  return `${start} → ${end}`;
}

const WebViewComponent = WebView as any;

export default function CalendarScreen() {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const { syncing, sync } = useCampusSync(false);
  const calendar = useCampusModule<CalendarDoc>('calendar');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const [showPdf, setShowPdf] = useState(false);
  const webViewRef = useRef<any>(null);

  const events = useMemo(() => {
    const list = [...(calendar?.events ?? [])];
    list.sort((a, b) => a.startDate.localeCompare(b.startDate));
    if (filter === 'all') return list;
    return list.filter((e) => e.type.toLowerCase() === filter);
  }, [calendar, filter]);

  const onRefresh = useCallback(async () => {
    await sync();
  }, [sync]);

  // Derive static PDF URL from LAN API hostname
  const pdfUrl = useMemo(() => {
    const apiBase = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:6002').replace(/\/api\/v1\/?$/, '');
    return `${apiBase}/uploads/Academic-Calendar-AY-2026-27.pdf`;
  }, []);

  const htmlSource = useMemo(() => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"></script>
        <style>
          body { margin: 0; padding: 0; background-color: #f5f5f7; display: flex; flex-direction: column; align-items: center; }
          #canvas-container { width: 100%; display: flex; flex-direction: column; align-items: center; padding: 10px 0; }
          canvas { width: 95%; max-width: 800px; height: auto; margin-bottom: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-radius: 8px; background-color: white; }
          #loading { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #666; margin-top: 50px; font-size: 16px; }
        </style>
      </head>
      <body>
        <div id="loading">Loading Academic Calendar PDF...</div>
        <div id="canvas-container"></div>
        <script>
          const pdfUrl = "${pdfUrl}";
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
          
          let pdfDoc = null;
          let currentScale = 1.5;

          function renderAllPages() {
            const container = document.getElementById('canvas-container');
            container.innerHTML = '';
            
            let renderPage = (pageNum) => {
              if (pageNum > pdfDoc.numPages) return;
              
              pdfDoc.getPage(pageNum).then(page => {
                const viewport = page.getViewport({ scale: currentScale });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                container.appendChild(canvas);
                
                page.render({
                  canvasContext: context,
                  viewport: viewport
                }).promise.then(() => {
                  renderPage(pageNum + 1);
                });
              });
            };
            
            renderPage(1);
          }

          pdfjsLib.getDocument(pdfUrl).promise.then(pdf => {
            pdfDoc = pdf;
            document.getElementById('loading').style.display = 'none';
            renderAllPages();
          }).catch(err => {
            document.getElementById('loading').innerText = "Failed to load PDF calendar: " + err.message;
          });

          window.addEventListener('message', (event) => {
            try {
              const msg = JSON.parse(event.data);
              if (msg.type === 'zoomIn') {
                currentScale = Math.min(3.0, currentScale + 0.25);
                renderAllPages();
              } else if (msg.type === 'zoomOut') {
                currentScale = Math.max(0.75, currentScale - 0.25);
                renderAllPages();
              }
            } catch (e) {
              // ignore
            }
          });
        </script>
      </body>
      </html>
    `;
  }, [pdfUrl]);

  return (
    <ScreenShell
      title="Academic Calendar"
      subtitle={calendar?.semester || 'Semester events'}
      onRefresh={onRefresh}
      refreshing={syncing}
    >
      <Pressable
        onPress={() => setShowPdf(true)}
        style={({ pressed }) => [
          styles.pdfBanner,
          { backgroundColor: theme.primaryTint, borderColor: theme.primary },
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="document-text-outline" size={24} color={theme.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.pdfBannerTitle, { color: theme.primary }]}>
            View Official PDF Calendar
          </Text>
          <Text style={[styles.pdfBannerSubtitle, { color: theme.textMuted }]}>
            Open AY 2026-27 official calendar with zoom & search
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.primary} />
      </Pressable>

      <View style={styles.filters}>
        {FILTERS.map((f) => {
          const active = filter === f;
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? theme.primaryTint : theme.surface,
                  borderColor: active ? theme.primary : theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: active ? theme.primary : theme.textMuted },
                ]}
              >
                {f}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {events.length > 0 ? (
        <View style={{ gap: AppSpacing.sm }}>
          {events.map((event, index) => (
            <EventRow key={`${event.title}-${index}`} event={event} />
          ))}
        </View>
      ) : (
        <EmptyState
          icon="calendar-outline"
          title="No events"
          message="Pull down to sync the academic calendar."
        />
      )}

      <Modal
        visible={showPdf}
        animationType="slide"
        onRequestClose={() => setShowPdf(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border, paddingTop: insets.top || 16 }]}>
            <Pressable
              onPress={() => setShowPdf(false)}
              style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
            >
              <Ionicons name="close-outline" size={28} color={theme.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              AY 2026-27 Academic Calendar
            </Text>
            <View style={styles.zoomControls}>
              <Pressable
                onPress={() => webViewRef.current?.postMessage(JSON.stringify({ type: 'zoomOut' }))}
                style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
              >
                <Ionicons name="remove-circle-outline" size={24} color={theme.text} />
              </Pressable>
              <Pressable
                onPress={() => webViewRef.current?.postMessage(JSON.stringify({ type: 'zoomIn' }))}
                style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
              >
                <Ionicons name="add-circle-outline" size={24} color={theme.text} />
              </Pressable>
            </View>
          </View>
          <WebViewComponent
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: htmlSource }}
            style={{ flex: 1 }}
            scalesPageToFit
            startInLoadingState
            renderLoading={() => (
              <ActivityIndicator
                size="large"
                color={theme.primary}
                style={StyleSheet.absoluteFillObject}
              />
            )}
          />
        </View>
      </Modal>
    </ScreenShell>
  );
}

function EventRow({ event }: { event: CalendarEvent }) {
  const theme = useThemeColors();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      <Text style={[styles.type, { color: theme.primary }]}>
        {event.type.toUpperCase()}
      </Text>
      <Text style={[styles.title, { color: theme.text }]}>{event.title}</Text>
      <Text style={[styles.dates, { color: theme.textMuted }]}>
        {formatRange(event.startDate, event.endDate)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AppSpacing.sm,
    marginBottom: AppSpacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderRadius: AppRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    ...AppTypography.caption,
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  card: {
    borderWidth: 1,
    borderRadius: AppRadius.lg,
    padding: AppSpacing.md,
    gap: 4,
  },
  type: {
    ...AppTypography.caption,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  title: {
    ...AppTypography.body,
    fontWeight: '600',
  },
  dates: {
    ...AppTypography.caption,
  },
  pdfBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: AppRadius.lg,
    padding: AppSpacing.md,
    gap: AppSpacing.md,
    marginBottom: AppSpacing.md,
  },
  pdfBannerTitle: {
    ...AppTypography.body,
    fontWeight: '700',
  },
  pdfBannerSubtitle: {
    ...AppTypography.caption,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.7,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AppSpacing.md,
    paddingBottom: AppSpacing.sm,
    borderBottomWidth: 1,
  },
  modalTitle: {
    ...AppTypography.body,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: AppSpacing.sm,
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.xs,
  },
  headerBtn: {
    padding: AppSpacing.xs,
  },
});
