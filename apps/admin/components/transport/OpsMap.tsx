'use client';

import { useEffect, useRef } from 'react';
import { Map as MapLibreMap, Marker, NavigationControl, Popup } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { AdminTrip } from '@/lib/types';

interface OpsMapProps {
  trips: AdminTrip[];
}

const BASEMAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
// Midpoint between IITJ campus and Jodhpur city — same center used by the
// mobile CampusMapScreen's MapLibre instance, for visual consistency.
const CAMPUS_CENTER: [number, number] = [73.075, 26.38];

type MarkerKind = 'live' | 'estimated' | 'offline';

function markerKind(trip: AdminTrip): MarkerKind {
  if (trip.status === 'OFFLINE' || trip.status === 'NO_DATA') return 'offline';
  return trip.busState.positionSource === 'live' ? 'live' : 'estimated';
}

const KIND_COLOR: Record<MarkerKind, string> = {
  live: '#22C55E',
  estimated: '#F59E0B',
  offline: '#9CA3AF',
};

const KIND_LABEL: Record<MarkerKind, string> = {
  live: 'LIVE',
  estimated: 'ESTIMATED',
  offline: 'OFFLINE',
};

function popupHtml(trip: AdminTrip, kind: MarkerKind): string {
  const vehicleName = trip.vehicle?.displayName ?? 'Unassigned vehicle';
  const updated = new Date(trip.busState.lastUpdated).toLocaleTimeString();
  return `
    <div style="font-family: var(--font-ibm-plex-sans, sans-serif); font-size: 12px; min-width: 160px;">
      <div style="font-weight: 700; color: #22292F; margin-bottom: 2px;">${vehicleName}</div>
      <div style="color: #5C6570; text-transform: capitalize; margin-bottom: 4px;">${trip.direction} · ${trip.status}</div>
      <div style="display:flex; align-items:center; gap:4px; margin-bottom: 4px;">
        <span style="width:8px;height:8px;border-radius:4px;background:${KIND_COLOR[kind]};display:inline-block;"></span>
        <span style="font-weight:600; color:${KIND_COLOR[kind]};">${KIND_LABEL[kind]}</span>
        <span style="color:#5C6570;">· ${trip.busState.confidence} confidence</span>
      </div>
      <div style="color:#5C6570;">${trip.busState.contributors} sharing · updated ${updated}</div>
    </div>
  `;
}

interface MarkerEntry {
  marker: Marker;
  lng: number;
  lat: number;
}

/**
 * Live bus markers on a MapLibre GL JS map (the actual web library — not the
 * WebView+injectJavaScript bridge the mobile app needs, since this is a real
 * DOM environment). Position data comes from the `trips` prop, which the
 * parent page refreshes by polling GET /admin/trips (see the Phase 3 report
 * for why: `bus:update` sockets require a ride session admins don't have).
 */
export function OpsMap({ trips }: OpsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map());
  const readyRef = useRef(false);
  const pendingTripsRef = useRef<AdminTrip[]>(trips);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: BASEMAP_STYLE,
      center: CAMPUS_CENTER,
      zoom: 10.5,
    });
    map.addControl(new NavigationControl(), 'top-right');
    map.on('load', () => {
      readyRef.current = true;
      renderMarkers(pendingTripsRef.current);
    });
    mapRef.current = map;
    const markers = markersRef.current;

    return () => {
      map.remove();
      mapRef.current = null;
      markers.clear();
      readyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function animateMarkerTo(entry: MarkerEntry, lng: number, lat: number) {
    const startLng = entry.lng;
    const startLat = entry.lat;
    const duration = 800;
    const start = performance.now();
    function step(now: number) {
      const t = Math.min(1, (now - start) / duration);
      entry.marker.setLngLat([startLng + (lng - startLng) * t, startLat + (lat - startLat) * t]);
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        entry.lng = lng;
        entry.lat = lat;
      }
    }
    requestAnimationFrame(step);
  }

  function renderMarkers(nextTrips: AdminTrip[]) {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;

    const seen = new Set<string>();
    for (const trip of nextTrips) {
      seen.add(trip._id);
      const kind = markerKind(trip);
      const { latitude, longitude } = trip.busState;
      let entry = markersRef.current.get(trip._id);

      if (!entry) {
        const el = document.createElement('div');
        el.style.width = '22px';
        el.style.height = '22px';
        el.style.borderRadius = '11px';
        el.style.border = '2px solid #fff';
        el.style.boxShadow = '0 0 6px rgba(0,0,0,0.4)';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.fontSize = '11px';
        el.innerText = '🚌';
        const marker = new Marker({ element: el }).setLngLat([longitude, latitude]).addTo(map);
        entry = { marker, lng: longitude, lat: latitude };
        markersRef.current.set(trip._id, entry);
      }

      entry.marker.getElement().style.backgroundColor = KIND_COLOR[kind];
      entry.marker.setPopup(new Popup({ offset: 14 }).setHTML(popupHtml(trip, kind)));
      animateMarkerTo(entry, longitude, latitude);
    }

    for (const [tripId, entry] of markersRef.current.entries()) {
      if (!seen.has(tripId)) {
        entry.marker.remove();
        markersRef.current.delete(tripId);
      }
    }
  }

  useEffect(() => {
    pendingTripsRef.current = trips;
    renderMarkers(trips);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trips]);

  return <div ref={containerRef} className="h-[420px] w-full rounded-2xl border border-border" />;
}
