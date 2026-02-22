/**
 * Lumora Studio Pro — Map View
 * 
 * Interactive map displaying geotagged photos as markers.
 * Uses Leaflet with OpenStreetMap tiles (free, no API key required).
 */

import React, { useEffect, useRef, useMemo, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import L from 'leaflet';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon path issue in bundled apps
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const photoIcon = L.divIcon({
  className: 'lumora-map-marker',
  html: `<div style="
    width: 28px; height: 28px; border-radius: 50%; 
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    display: flex; align-items: center; justify-content: center;
  ">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -16],
});

const clusterIcon = (count: number) => L.divIcon({
  className: 'lumora-map-cluster',
  html: `<div style="
    width: 36px; height: 36px; border-radius: 50%; 
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 600; color: white;
  ">${count}</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

export const MapView: React.FC = () => {
  const { images, setActiveImageId, setCurrentModule } = useAppStore();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const [selectedImage, setSelectedImage] = useState<any>(null);

  const geotaggedImages = useMemo(() =>
    images.filter((img) => img.gps_lat != null && img.gps_lng != null),
    [images]
  );

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    // Initialize map
    const map = L.map(mapRef.current, {
      center: [20, 0],
      zoom: 2,
      zoomControl: false,
      attributionControl: true,
    });

    // Dark-themed tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    leafletMap.current = map;

    return () => {
      map.remove();
      leafletMap.current = null;
    };
  }, []);

  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    if (geotaggedImages.length === 0) return;

    const bounds = L.latLngBounds([]);

    geotaggedImages.forEach((img) => {
      const lat = img.gps_lat as number;
      const lng = img.gps_lng as number;
      const latlng = L.latLng(lat, lng);
      bounds.extend(latlng);

      const marker = L.marker(latlng, { icon: photoIcon }).addTo(map);
      marker.bindPopup(`
        <div style="text-align:center; min-width:150px;">
          <div style="font-weight:600; font-size:12px; margin-bottom:4px; color:#e2e8f0;">${img.file_name}</div>
          <div style="font-size:11px; color:#94a3b8;">
            ${lat.toFixed(4)}, ${lng.toFixed(4)}
          </div>
          ${img.camera_model ? `<div style="font-size:10px; color:#64748b; margin-top:2px;">${img.camera_model}</div>` : ''}
          ${img.date_taken ? `<div style="font-size:10px; color:#64748b;">${new Date(img.date_taken).toLocaleDateString()}</div>` : ''}
        </div>
      `, { className: 'lumora-popup' });

      marker.on('click', () => setSelectedImage(img));
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [geotaggedImages]);

  const handleOpenInDevelop = () => {
    if (!selectedImage) return;
    setActiveImageId(selectedImage.id);
    setCurrentModule('develop');
  };

  return (
    <div className="flex-1 flex flex-col bg-surface-950 relative">
      {/* Map container */}
      <div ref={mapRef} className="flex-1" style={{ minHeight: 0 }} />

      {/* Stats bar */}
      <div className="absolute top-3 left-3 z-[1000] bg-surface-900/90 backdrop-blur-md rounded-lg px-3 py-2 border border-surface-800/60">
        <div className="text-xs text-surface-300 flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-lumora-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          <span>{geotaggedImages.length} geotagged photo{geotaggedImages.length !== 1 ? 's' : ''}</span>
          <span className="text-surface-600 mx-1">|</span>
          <span className="text-surface-500">{images.length} total</span>
        </div>
      </div>

      {/* Empty state overlay */}
      {geotaggedImages.length === 0 && (
        <div className="absolute inset-0 z-[999] flex items-center justify-center pointer-events-none">
          <div className="text-center bg-surface-900/95 backdrop-blur-xl rounded-xl px-8 py-6 border border-surface-800/60 shadow-2xl">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-surface-800 flex items-center justify-center">
              <svg className="w-7 h-7 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-surface-300 mb-1">No Geotagged Photos</h3>
            <p className="text-xs text-surface-500 max-w-[200px] leading-relaxed">
              Import photos with GPS data to see them on the map
            </p>
          </div>
        </div>
      )}

      {/* Selected image panel */}
      {selectedImage && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-surface-900/95 backdrop-blur-xl rounded-xl border border-surface-800/60 shadow-2xl p-4 min-w-[280px] animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-surface-800 flex items-center justify-center overflow-hidden flex-shrink-0">
              <svg className="w-6 h-6 text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M6.75 7.5l.75-.75" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-surface-200 truncate">{selectedImage.file_name}</p>
              <p className="text-2xs text-surface-500">
                {selectedImage.gps_lat?.toFixed(4)}, {selectedImage.gps_lng?.toFixed(4)}
              </p>
              {selectedImage.camera_model && (
                <p className="text-2xs text-surface-600">{selectedImage.camera_model}</p>
              )}
            </div>
            <button onClick={handleOpenInDevelop}
              className="btn-primary text-xs px-3 py-1.5 flex-shrink-0">
              Open
            </button>
            <button onClick={() => setSelectedImage(null)}
              className="text-surface-500 hover:text-surface-300 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Leaflet popup style override for dark theme */}
      <style>{`
        .lumora-popup .leaflet-popup-content-wrapper {
          background: #1e1e2e;
          color: #e2e8f0;
          border-radius: 8px;
          border: 1px solid #334155;
          box-shadow: 0 4px 16px rgba(0,0,0,0.4);
        }
        .lumora-popup .leaflet-popup-tip {
          background: #1e1e2e;
          border-color: #334155;
        }
        .lumora-popup .leaflet-popup-close-button {
          color: #94a3b8;
        }
        .leaflet-control-attribution {
          background: rgba(15,15,23,0.8) !important;
          color: #64748b !important;
          font-size: 10px !important;
        }
        .leaflet-control-attribution a {
          color: #818cf8 !important;
        }
        .leaflet-control-zoom a {
          background: #1e1e2e !important;
          color: #e2e8f0 !important;
          border-color: #334155 !important;
        }
        .leaflet-control-zoom a:hover {
          background: #2d2d3f !important;
        }
      `}</style>
    </div>
  );
};
