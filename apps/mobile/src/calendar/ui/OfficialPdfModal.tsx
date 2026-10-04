import { useMemo, useRef } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Icon } from '@/components/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_BASE_URL } from '@/services/api';
import { useModalOverlayLock } from '@/services/overlayGate';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppSpacing, AppTypography } from '@/theme/tokens';

const WebViewComponent = WebView as any;

/**
 * The official PDF viewer, moved unchanged out of app/calendar.tsx. The timeline no longer depends on it —
 * it reads the synced, normalized calendar data and works offline; this is only "view the original".
 * Plan §2.5 / Phase 10: apps/api/uploads (served here), apps/mobile/assets and apps/admin/public all hold the
 * authoritative 1 Oct 2026 PDF (byte-identical to docs/calender/Academic-Calendar-AY-2026-27-639178076336417495.pdf).
 */
export function OfficialPdfModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<any>(null);
  useModalOverlayLock(visible);

  // Derive static PDF URL from the same validated API base every other request uses.
  const pdfUrl = useMemo(() => {
    const apiBase = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
    // `v` = the document date of the authoritative PDF. The static server ignores it; it only stops a WebView
    // or CDN from showing a previously cached copy of the superseded June 2026 file at the same path.
    return `${apiBase}/uploads/Academic-Calendar-AY-2026-27.pdf?v=2026-10-01`;
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
      <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: theme.surface }]}>
        <View style={[styles.modalHeader, { borderBottomColor: theme.border, paddingTop: insets.top || 16 }]}>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
          >
            <Icon name="close-outline" size={28} color={theme.text} />
          </Pressable>
          <Text style={[styles.modalTitle, { color: theme.text }]}>
            AY 2026-27 Academic Calendar
          </Text>
          <View style={styles.zoomControls}>
            <Pressable
              onPress={() => webViewRef.current?.postMessage(JSON.stringify({ type: 'zoomOut' }))}
              style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
            >
              <Icon name="remove-circle-outline" size={24} color={theme.text} />
            </Pressable>
            <Pressable
              onPress={() => webViewRef.current?.postMessage(JSON.stringify({ type: 'zoomIn' }))}
              style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
            >
              <Icon name="add-circle-outline" size={24} color={theme.text} />
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
              color={theme.linkText}
              style={StyleSheet.absoluteFill}
            />
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  pressed: {
    opacity: 0.7,
  },
});
