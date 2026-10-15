import L from 'leaflet';

// A zoom animation that ends after its map was removed (e.g. the user navigates away mid-zoom) makes
// Leaflet 1.9 throw "_leaflet_pos of undefined". Ignore that late callback on removed maps.
const mapProto = L.Map.prototype as any;
if (!mapProto._yurdZoomGuard) {
  const original = mapProto._onZoomTransitionEnd;
  mapProto._onZoomTransitionEnd = function (this: any, ...args: unknown[]) {
    if (!this._mapPane) return;
    return original.apply(this, args);
  };
  mapProto._yurdZoomGuard = true;
}

// Shared base layers for every map: OpenStreetMap ("Xəritə") and Esri imagery with labels ("Peyk").
export type MapMode = 'map' | 'satellite';

const MODE_KEY = 'yurd_map_mode';

export function getMapMode(): MapMode {
  try {
    return sessionStorage.getItem(MODE_KEY) === 'satellite' ? 'satellite' : 'map';
  } catch {
    return 'map';
  }
}

function saveMapMode(mode: MapMode) {
  try {
    sessionStorage.setItem(MODE_KEY, mode);
  } catch {
    // Storage may be unavailable (private mode); the toggle still works for this map
  }
}

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';

const ACTIVE_BTN = 'background:#2F6B3A;color:#fff;';
const IDLE_BTN = 'background:#fff;color:#1F2A24;';
const BTN_BASE =
  'border:0;padding:6px 12px;font:700 12px "Plus Jakarta Sans",sans-serif;cursor:pointer;line-height:1.2;';

/**
 * Adds OSM / satellite base layers and a "Xəritə | Peyk" switcher in the top-right corner.
 * The chosen mode is remembered for the browser session and applied to every new map.
 */
export function addBaseLayers(map: L.Map): void {
  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap töhfəçiləri',
    maxZoom: 19
  });
  const satellite = L.layerGroup([
    L.tileLayer(`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`, {
      attribution: 'Peyk görüntüsü &copy; Esri, Maxar, Earthstar Geographics',
      maxZoom: 19
    }),
    // Road and place-name labels on top of the imagery
    L.tileLayer(`${ESRI}/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}`, { maxZoom: 19 }),
    L.tileLayer(`${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`, { maxZoom: 19 })
  ]);

  let mode = getMapMode();
  const buttons: Record<MapMode, HTMLButtonElement | null> = { map: null, satellite: null };

  const apply = () => {
    if (mode === 'satellite') {
      if (map.hasLayer(osm)) map.removeLayer(osm);
      if (!map.hasLayer(satellite)) satellite.addTo(map);
    } else {
      if (map.hasLayer(satellite)) map.removeLayer(satellite);
      if (!map.hasLayer(osm)) osm.addTo(map);
    }
    (Object.keys(buttons) as MapMode[]).forEach(key => {
      const btn = buttons[key];
      if (btn) btn.style.cssText = BTN_BASE + (key === mode ? ACTIVE_BTN : IDLE_BTN);
    });
  };

  const Switcher = L.Control.extend({
    onAdd() {
      const box = L.DomUtil.create('div', 'leaflet-bar');
      box.style.cssText = 'display:flex;overflow:hidden;border-radius:12px;border:1px solid #EADBC8;box-shadow:0 1px 4px rgba(0,0,0,.15);';
      const make = (key: MapMode, label: string) => {
        const btn = L.DomUtil.create('button', '', box) as HTMLButtonElement;
        btn.type = 'button';
        btn.textContent = label;
        btn.title = key === 'map' ? 'Xəritə görünüşü' : 'Peyk görünüşü';
        L.DomEvent.on(btn, 'click', e => {
          L.DomEvent.stop(e);
          mode = key;
          saveMapMode(mode);
          apply();
        });
        buttons[key] = btn;
      };
      make('map', 'Xəritə');
      make('satellite', 'Peyk');
      L.DomEvent.disableClickPropagation(box);
      L.DomEvent.disableScrollPropagation(box);
      return box;
    }
  });

  new Switcher({ position: 'topright' }).addTo(map);
  apply();
}
