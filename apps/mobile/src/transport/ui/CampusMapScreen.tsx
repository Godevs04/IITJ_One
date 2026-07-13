import { StyleSheet, Text, View, Pressable } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppSpacing, AppTypography } from '@/theme/tokens';
import type { TripWithStatus } from '../models/BusTypes';
import { BUS_STOPS, getNormalizedStopName, openStopInMaps } from '../utils/coordinates';

interface CampusMapScreenProps {
  tripsWithStatus: TripWithStatus[];
  onBack: () => void;
}

export function CampusMapScreen({ tripsWithStatus, onBack }: CampusMapScreenProps) {
  const theme = useThemeColors();

  // Determine next bus times for each stop
  const stopNextTimes: Record<string, { bus: string; time: string }> = {};
  for (const t of tripsWithStatus) {
    if (t.status === 'upcoming' || t.status === 'boarding' || t.status === 'transit') {
      for (const stop of t.stops) {
        const norm = getNormalizedStopName(stop);
        if (!stopNextTimes[norm]) {
          stopNextTimes[norm] = {
            bus: t.trip.bus,
            time: t.trip.startTime,
          };
        }
      }
    }
  }

  // Convert stop list for MapLibre WebView
  const mapStops = Object.keys(BUS_STOPS).map((key) => {
    const stop = BUS_STOPS[key];
    const nextInfo = stopNextTimes[key]
      ? `${stopNextTimes[key].bus} at ${stopNextTimes[key].time}`
      : 'No upcoming bus today';
    return {
      name: stop.name,
      lat: stop.latitude,
      lng: stop.longitude,
      desc: stop.description,
      nextBus: nextInfo,
    };
  });

  // Polyline coordinates for B1 and B2 routes
  const b1Coords = [
    [BUS_STOPS['Main Gate Parking'].longitude, BUS_STOPS['Main Gate Parking'].latitude],
    [BUS_STOPS['IITJ'].longitude, BUS_STOPS['IITJ'].latitude],
    [BUS_STOPS['Mandore'].longitude, BUS_STOPS['Mandore'].latitude],
    [BUS_STOPS['Paota'].longitude, BUS_STOPS['Paota'].latitude],
    [BUS_STOPS['Railway Station'].longitude, BUS_STOPS['Railway Station'].latitude],
    [BUS_STOPS['GPRA'].longitude, BUS_STOPS['GPRA'].latitude],
    [BUS_STOPS['MBM'].longitude, BUS_STOPS['MBM'].latitude],
  ];

  const b2Coords = [
    [BUS_STOPS['Old Mess'].longitude, BUS_STOPS['Old Mess'].latitude],
    [BUS_STOPS['Shamiyana'].longitude, BUS_STOPS['Shamiyana'].latitude],
    [BUS_STOPS['Paota'].longitude, BUS_STOPS['Paota'].latitude],
    [BUS_STOPS['MBM'].longitude, BUS_STOPS['MBM'].latitude],
    [BUS_STOPS['Riktiya Bheruji Circle'].longitude, BUS_STOPS['Riktiya Bheruji Circle'].latitude],
    [BUS_STOPS['Jaljog Circle'].longitude, BUS_STOPS['Jaljog Circle'].latitude],
    [BUS_STOPS['AIIMS Jodhpur'].longitude, BUS_STOPS['AIIMS Jodhpur'].latitude],
  ];

  // WebView message handler (for navigating to stop in external Google Maps)
  const onMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'navigate') {
        openStopInMaps(data.name, data.lat, data.lng);
      }
    } catch (e) {
      console.log('Error parsing map message', e);
    }
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>IITJ Campus Map</title>
      <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" />
      <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
      <link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet" />
      <style>
        body { margin: 0; padding: 0; }
        #map { position: absolute; top: 0; bottom: 0; width: 100%; }
        .stop-marker {
          width: 12px;
          height: 12px;
          border-radius: 6px;
          background-color: #1D3F5E;
          border: 2px solid #FFFFFF;
          box-shadow: 0 0 4px rgba(0,0,0,0.5);
          cursor: pointer;
        }
        .stop-label {
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid #DCD4C4;
          border-radius: 8px;
          padding: 2px 6px;
          font-family: sans-serif;
          font-size: 9px;
          font-weight: 600;
          color: #1D3F5E;
          pointer-events: none;
          white-space: nowrap;
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
        .mapboxgl-popup-content, .maplibregl-popup-content {
          border-radius: 12px;
          padding: 12px;
          font-family: sans-serif;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          border: 1px solid #DCD4C4;
        }
        .popup-title {
          font-size: 13px;
          font-weight: 700;
          color: #1D3F5E;
          margin-bottom: 4px;
        }
        .popup-desc {
          font-size: 11px;
          color: #5C6570;
          margin-bottom: 6px;
        }
        .popup-bus {
          font-size: 10px;
          font-weight: bold;
          color: #E2703A;
          margin-bottom: 8px;
        }
        .popup-btn {
          display: block;
          text-align: center;
          background-color: #1D3F5E;
          color: #FFFFFF;
          padding: 6px;
          border-radius: 6px;
          font-size: 11px;
          text-decoration: none;
          font-weight: bold;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const stops = ${JSON.stringify(mapStops)};
        const b1Path = ${JSON.stringify(b1Coords)};
        const b2Path = ${JSON.stringify(b2Coords)};

        const map = new maplibregl.Map({
          container: 'map',
          style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
          center: [73.075, 26.38], // Midpoint Jodhpur -> Karwar
          zoom: 11
        });

        map.addControl(new maplibregl.NavigationControl());

        map.on('load', () => {
          // 1. Add Route B1 source & layers (Indigo)
          map.addSource('route-b1', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: [] }
            }
          });

          map.addLayer({
            id: 'line-b1',
            type: 'line',
            source: 'route-b1',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#1D3F5E', 'line-width': 4, 'line-opacity': 0.85 }
          });

          // Direction arrows for B1
          map.addLayer({
            id: 'arrows-b1',
            type: 'symbol',
            source: 'route-b1',
            layout: {
              'symbol-placement': 'line',
              'text-field': '▶',
              'text-size': 12,
              'text-keep-upright': false,
              'symbol-spacing': 80
            },
            paint: { 'text-color': '#1D3F5E' }
          });

          // 2. Add Route B2 source & layers (Sandstone)
          map.addSource('route-b2', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: [] }
            }
          });

          map.addLayer({
            id: 'line-b2',
            type: 'line',
            source: 'route-b2',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#C68642', 'line-width': 4, 'line-opacity': 0.85 }
          });

          // Direction arrows for B2
          map.addLayer({
            id: 'arrows-b2',
            type: 'symbol',
            source: 'route-b2',
            layout: {
              'symbol-placement': 'line',
              'text-field': '▶',
              'text-size': 12,
              'text-keep-upright': false,
              'symbol-spacing': 80
            },
            paint: { 'text-color': '#C68642' }
          });

          // 3. Animate route line drawing
          function animateRoute(sourceId, coordinates) {
            let step = 0;
            const tempCoords = [];
            function draw() {
              if (step >= coordinates.length) return;
              tempCoords.push(coordinates[step]);
              const source = map.getSource(sourceId);
              if (source) {
                source.setData({
                  type: 'Feature',
                  properties: {},
                  geometry: { type: 'LineString', coordinates: tempCoords }
                });
              }
              step++;
              setTimeout(draw, 100);
            }
            draw();
          }

          animateRoute('route-b1', b1Path);
          setTimeout(() => animateRoute('route-b2', b2Path), 500);

          // 4. Add stop markers & popups
          stops.forEach((stop) => {
            // Main marker element
            const el = document.createElement('div');
            el.className = 'stop-marker';
            
            // Render stop name badge
            const labelEl = document.createElement('div');
            labelEl.className = 'stop-label';
            labelEl.innerText = stop.name;

            // Stop popup
            const popup = new maplibregl.Popup({ offset: 15 }).setHTML(\`
              <div class="popup-title">\${stop.name}</div>
              <div class="popup-desc">\${stop.desc}</div>
              <div class="popup-bus">⚡ \${stop.nextBus}</div>
              <div class="popup-btn" onclick="sendNavigation('\${stop.name}', \${stop.lat}, \${stop.lng})">
                Directions
              </div>
            \`);

            new maplibregl.Marker({ element: el })
              .setLngLat([stop.lng, stop.lat])
              .setPopup(popup)
              .addTo(map);

            new maplibregl.Marker({ element: labelEl, position: 'top' })
              .setLngLat([stop.lng, stop.lat])
              .setOffset([0, -14])
              .addTo(map);
          });
        });

        function sendNavigation(name, lat, lng) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'navigate',
            name: name,
            lat: lat,
            lng: lng
          }));
        }
      </script>
    </body>
    </html>
  `;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header Bar */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={onBack} style={styles.backButton} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>IITJ Transport Map</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Map WebView */}
      <View style={styles.mapContainer}>
        <WebView
          originWhitelist={['*']}
          source={{ html: htmlContent }}
          onMessage={onMessage}
          style={styles.webView}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AppSpacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...AppTypography.h2,
    fontWeight: '700',
  },
  placeholder: {
    width: 40,
  },
  mapContainer: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
});
