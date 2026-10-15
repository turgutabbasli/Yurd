import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { ApplicationLocation } from '../types';
import { addBaseLayers } from '../mapLayers';
import { formatDecimal } from '../labels';
import { MapPin, AlertCircle, Trash2, Crosshair, PenLine, Check, X } from 'lucide-react';

// Karabakh and East Zangezur
export const REGION_CENTER: [number, number] = [39.75, 46.85];
const REGION_ZOOM = 9;

// Approximate bounding box of Azerbaijan
const AZ_BOUNDS = { minLat: 38.38, maxLat: 41.92, minLon: 44.76, maxLon: 50.4 };

export function validateCoordinates(latText: string, lonText: string): { error: string | null; warning: string | null } {
  if (!latText.trim() || !lonText.trim()) {
    return { error: 'Torpağın koordinatlarını daxil edin və ya xəritəyə klik edərək pin qoyun.', warning: null };
  }
  const coordRe = /^-?\d{1,3}([.,]\d+)?$/;
  if (!coordRe.test(latText.trim()) || !coordRe.test(lonText.trim())) {
    return { error: 'Koordinat formatı yanlışdır. Nümunə: enlik 39.6012, uzunluq 47.1450', warning: null };
  }
  const lat = parseCoord(latText);
  const lon = parseCoord(lonText);
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return { error: 'Enlik −90…90, uzunluq −180…180 aralığında olmalıdır.', warning: null };
  }
  const insideAz = lat >= AZ_BOUNDS.minLat && lat <= AZ_BOUNDS.maxLat && lon >= AZ_BOUNDS.minLon && lon <= AZ_BOUNDS.maxLon;
  return {
    error: null,
    warning: insideAz ? null : 'Diqqət: göstərilən nöqtə Azərbaycan ərazisindən kənardadır. Koordinatları yoxlayın.'
  };
}

export function geodesicAreaM2(points: Array<[number, number]>): number {
  const R = 6378137;
  const d2r = Math.PI / 180;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const [lat1, lon1] = points[i];
    const [lat2, lon2] = points[(i + 1) % points.length];
    area += (lon2 - lon1) * d2r * (2 + Math.sin(lat1 * d2r) + Math.sin(lat2 * d2r));
  }
  return Math.abs((area * R * R) / 2);
}

export function parseCoord(text: string): number {
  return Number(text.trim().replace(',', '.'));
}

const pinIcon = L.divIcon({
  className: '',
  html: `<svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg"><path d="M15 1C7.3 1 1 7.2 1 14.9 1 25.3 15 39 15 39s14-13.7 14-24.1C29 7.2 22.7 1 15 1z" fill="#2F6B3A" stroke="#fff" stroke-width="2"/><circle cx="15" cy="15" r="5" fill="#fff"/></svg>`,
  iconSize: [30, 40],
  iconAnchor: [15, 39]
});

export { pinIcon };

interface LocationPickerProps {
  latText: string;
  lonText: string;
  polygon: Array<[number, number]> | null;
  polygonAreaHa: number | null;
  onChange: (next: { latText: string; lonText: string; polygon: Array<[number, number]> | null; polygonAreaHa: number | null }) => void;
  fallbackCenter?: [number, number]; // parcel centroid for the "use parcel coordinates" helper
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  latText,
  lonText,
  polygon,
  polygonAreaHa,
  onChange,
  fallbackCenter
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const drawnRef = useRef<L.FeatureGroup | null>(null);
  // Boundary drawing: clicks add vertices while active
  const [drawing, setDrawing] = useState(false);
  const drawingRef = useRef(false);
  const draftPointsRef = useRef<Array<[number, number]>>([]);
  const draftLayerRef = useRef<L.LayerGroup | null>(null);
  const [draftCount, setDraftCount] = useState(0);

  // Latest values for Leaflet callbacks, which are bound once
  const stateRef = useRef({ latText, lonText, polygon, polygonAreaHa, onChange });
  stateRef.current = { latText, lonText, polygon, polygonAreaHa, onChange };

  const emit = (patch: Partial<{ latText: string; lonText: string; polygon: Array<[number, number]> | null; polygonAreaHa: number | null }>) => {
    const cur = stateRef.current;
    cur.onChange({
      latText: cur.latText,
      lonText: cur.lonText,
      polygon: cur.polygon,
      polygonAreaHa: cur.polygonAreaHa,
      ...patch
    });
  };

  const placeMarker = (lat: number, lon: number) => {
    const map = mapRef.current;
    if (!map) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lon]);
    } else {
      const marker = L.marker([lat, lon], { draggable: true, icon: pinIcon }).addTo(map);
      marker.on('dragend', () => {
        const p = marker.getLatLng();
        emit({ latText: p.lat.toFixed(6), lonText: p.lng.toFixed(6) });
      });
      markerRef.current = marker;
    }
  };

  // Map setup
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current).setView(REGION_CENTER, REGION_ZOOM);
    addBaseLayers(map);
    mapRef.current = map;

    const drawn = new L.FeatureGroup().addTo(map);
    drawnRef.current = drawn;

    const draftLayer = L.layerGroup().addTo(map);
    draftLayerRef.current = draftLayer;

    map.on('click', (e: L.LeafletMouseEvent) => {
      // Clicks while drawing add boundary vertices instead of moving the pin
      if (drawingRef.current) {
        const pts = draftPointsRef.current;
        const last = pts[pts.length - 1];
        // Ignore repeated clicks on the same spot
        if (last && map.latLngToContainerPoint(last).distanceTo(e.containerPoint) < 6) return;
        draftPointsRef.current = [...pts, [e.latlng.lat, e.latlng.lng]];
        renderDraft();
        return;
      }
      placeMarker(e.latlng.lat, e.latlng.lng);
      emit({ latText: e.latlng.lat.toFixed(6), lonText: e.latlng.lng.toFixed(6) });
    });

    // Restore existing values (e.g. after going back a step)
    const cur = stateRef.current;
    if (!validateCoordinates(cur.latText, cur.lonText).error) {
      const lat = parseCoord(cur.latText);
      const lon = parseCoord(cur.lonText);
      placeMarker(lat, lon);
      map.setView([lat, lon], 13, { animate: false });
    }
    if (cur.polygon && cur.polygon.length >= 3) {
      L.polygon(cur.polygon, { color: '#D98E04', weight: 3, fillOpacity: 0.25 }).addTo(drawn);
    }

    // The map lives inside an animated modal: re-measure once it has settled
    const t = setTimeout(() => map.invalidateSize(), 250);

    return () => {
      clearTimeout(t);
      map.stop();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      drawnRef.current = null;
      draftLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Typed coordinates move the pin
  const handleCoordInput = (field: 'latText' | 'lonText', value: string) => {
    const next = { latText, lonText, [field]: value };
    emit({ [field]: value });
    if (!validateCoordinates(next.latText, next.lonText).error) {
      const lat = parseCoord(next.latText);
      const lon = parseCoord(next.lonText);
      placeMarker(lat, lon);
      mapRef.current?.panTo([lat, lon], { animate: false });
    }
  };

  const clearPolygon = () => {
    drawnRef.current?.clearLayers();
    emit({ polygon: null, polygonAreaHa: null });
  };

  // Preview of the boundary being drawn
  const renderDraft = () => {
    const layer = draftLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    const pts = draftPointsRef.current;
    pts.forEach(p => L.circleMarker(p, { radius: 5, color: '#fff', weight: 2, fillColor: '#D98E04', fillOpacity: 1 }).addTo(layer));
    if (pts.length >= 2) {
      const shape = pts.length >= 3 ? L.polygon(pts, { color: '#D98E04', weight: 2, dashArray: '6 4', fillOpacity: 0.15 }) : L.polyline(pts, { color: '#D98E04', weight: 2, dashArray: '6 4' });
      shape.addTo(layer);
    }
    setDraftCount(pts.length);
  };

  const setDrawingMode = (on: boolean) => {
    drawingRef.current = on;
    setDrawing(on);
    draftPointsRef.current = [];
    renderDraft();
    const el = containerRef.current;
    if (el) el.style.cursor = on ? 'crosshair' : '';
    const map = mapRef.current;
    if (map) {
      if (on) map.doubleClickZoom.disable();
      else map.doubleClickZoom.enable();
    }
  };

  const finishDrawing = () => {
    const pts = draftPointsRef.current;
    if (pts.length < 3) return;
    const vertices = pts.map(p => [Number(p[0].toFixed(6)), Number(p[1].toFixed(6))] as [number, number]);
    drawnRef.current?.clearLayers();
    const poly = L.polygon(vertices, { color: '#D98E04', weight: 3, fillOpacity: 0.25 });
    if (drawnRef.current) poly.addTo(drawnRef.current);
    const patch: Parameters<typeof emit>[0] = {
      polygon: vertices,
      polygonAreaHa: Math.round((geodesicAreaM2(vertices) / 10000) * 100) / 100
    };
    // Without a pin yet, the boundary centre becomes the land's point
    const c = stateRef.current;
    if (validateCoordinates(c.latText, c.lonText).error) {
      const center = poly.getBounds().getCenter();
      placeMarker(center.lat, center.lng);
      patch.latText = center.lat.toFixed(6);
      patch.lonText = center.lng.toFixed(6);
    }
    emit(patch);
    setDrawingMode(false);
  };

  const useParcelCenter = () => {
    if (!fallbackCenter) return;
    const [lat, lon] = fallbackCenter;
    placeMarker(lat, lon);
    // Instant jump: an animated zoom throws if the step changes before it ends
    mapRef.current?.setView([lat, lon], 13, { animate: false });
    emit({ latText: lat.toFixed(6), lonText: lon.toFixed(6) });
  };

  const { error, warning } = validateCoordinates(latText, lonText);
  const touched = latText !== '' || lonText !== '';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <label className="font-bold text-[#7A5230] flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-[#2F6B3A]" />
          <span>Torpağın yeri xəritədə *</span>
        </label>
        {fallbackCenter && (
          <button
            type="button"
            onClick={useParcelCenter}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2F6B3A] hover:underline cursor-pointer"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Seçilmiş sahənin mərkəzini götür</span>
          </button>
        )}
      </div>
      <p className="text-[11px] text-[#7A5230]">
        Xəritəyə klik edərək pin qoyun (pini sürüşdürmək olar) və ya koordinatları əl ilə yazın.
 İstəyə bağlı: &ldquo;Sərhəd çək&rdquo; ilə sahənin sərhədlərini poliqon kimi çəkin.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {!drawing ? (
          <button
            type="button"
            onClick={() => setDrawingMode(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D98E04]/40 text-[#7A5230] text-[11px] font-bold hover:bg-[#D98E04]/10 cursor-pointer"
          >
            <PenLine className="w-3.5 h-3.5 text-[#D98E04]" />
            <span>{polygon ? 'Sərhədi yenidən çək' : 'Sərhəd çək'}</span>
          </button>
        ) : (
          <>
            <span className="text-[11px] font-bold text-[#D98E04]">
              Sahənin künclərinə ardıcıl klik edin ({draftCount} nöqtə)
            </span>
            <button
              type="button"
              onClick={finishDrawing}
              disabled={draftCount < 3}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#2F6B3A] text-white text-[11px] font-bold cursor-pointer disabled:opacity-40"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Bitir</span>
            </button>
            <button
              type="button"
              onClick={() => setDrawingMode(false)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#EADBC8] text-[#1F2A24] text-[11px] font-bold cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Ləğv et</span>
            </button>
          </>
        )}
      </div>

      <div ref={containerRef} className="w-full h-64 rounded-2xl border border-[#EADBC8] overflow-hidden z-0" />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="font-bold text-[#7A5230] block mb-1">Enlik (latitude) *</label>
          <input
            type="text"
            inputMode="decimal"
            value={latText}
            onChange={e => handleCoordInput('latText', e.target.value)}
            placeholder="39.601200"
            className="w-full p-3 rounded-xl border border-[#EADBC8] bg-white font-mono font-bold text-[#1F2A24]"
          />
        </div>
        <div>
          <label className="font-bold text-[#7A5230] block mb-1">Uzunluq (longitude) *</label>
          <input
            type="text"
            inputMode="decimal"
            value={lonText}
            onChange={e => handleCoordInput('lonText', e.target.value)}
            placeholder="47.145000"
            className="w-full p-3 rounded-xl border border-[#EADBC8] bg-white font-mono font-bold text-[#1F2A24]"
          />
        </div>
      </div>

      {touched && error && (
        <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-[11px] font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {!error && warning && (
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{warning}</span>
        </div>
      )}

      {polygon && polygon.length >= 3 && (
        <div className="p-3 rounded-xl bg-[#D98E04]/10 border border-[#D98E04]/30 text-xs flex items-center justify-between gap-2">
          <span className="text-[#1F2A24]">
            Çəkilmiş sərhəd: <b>{polygon.length} nöqtə</b> · Sahə: <b>{formatDecimal(polygonAreaHa || 0, 2)} ha</b>
          </span>
          <button
            type="button"
            onClick={clearPolygon}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#C8553D] hover:underline cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Sərhədi sil</span>
          </button>
        </div>
      )}
    </div>
  );
};

// Read-only map of an application's land location
export const LocationMapView: React.FC<{ location: ApplicationLocation }> = ({ location }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView([location.lat, location.lon], 13);
    addBaseLayers(map);
    L.marker([location.lat, location.lon], { icon: pinIcon }).addTo(map);
    if (location.polygon && location.polygon.length >= 3) {
      const poly = L.polygon(location.polygon, { color: '#D98E04', weight: 3, fillOpacity: 0.25 }).addTo(map);
      map.fitBounds(poly.getBounds(), { padding: [30, 30], animate: false });
    }
    return () => {
      map.stop();
      map.remove();
    };
  }, [location.lat, location.lon, location.polygon]);

  return <div ref={containerRef} className="w-full h-56 rounded-2xl border border-[#EADBC8] overflow-hidden z-0" />;
};
