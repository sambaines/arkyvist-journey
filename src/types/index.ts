export type DistanceUnit = 'miles' | 'km' | 'leagues' | 'nautical-miles' | 'hexes' | 'custom';

export type Terrain =
  | 'road'
  | 'open'
  | 'forest'
  | 'mountains'
  | 'marsh'
  | 'water-river'
  | 'water-open';

export interface Point {
  x: number;
  y: number;
}

export interface Waypoint {
  id: string;
  x: number;           // px on original image
  y: number;           // px on original image
  terrainToNext: Terrain; // terrain of the segment TO the next waypoint
}

export interface Scale {
  pixelsPerUnit: number;
  unit: DistanceUnit;
  customUnitLabel?: string;
}

export interface Route {
  id: string;
  name: string;
  visible: boolean;
  colour: string;
  waypoints: Waypoint[];
}

export interface TravelMode {
  id: string;
  label: string;
  category: 'land' | 'water';
  baseSpeedPerDay: number; // in the active distance unit
}

export interface SpeedSettings {
  modes: TravelMode[];
}

export interface TravelTime {
  days: number;
  hours: number;
}

export interface MapSession {
  mapFilename: string;
  mapWidth: number;    // px, inferred on upload
  mapHeight: number;   // px, inferred on upload
  scale: Scale;
  routes: Route[];
  activeRouteId: string;
  speedSettings: SpeedSettings;
}

// ─── App state ───────────────────────────────────────────────────────────────

export type AppStatus = 'empty' | 'loaded';

export type AppMode = 'default' | 'calibrating';

export interface MapImage {
  objectUrl: string;
  width: number;    // natural image width in px
  height: number;   // natural image height in px
  filename: string;
}

export interface MapTransform {
  x: number;    // pan offset px (translate X)
  y: number;    // pan offset px (translate Y)
  zoom: number; // scale factor (1 = natural size)
}

export interface AppState {
  status: AppStatus;
  map: MapImage | null;
  scale: Scale;
  routes: Route[];
  activeRouteId: string;
}

export type AppAction =
  | { type: 'MAP_LOADED'; map: MapImage }
  | { type: 'SESSION_CLEARED' }
  | { type: 'SCALE_CHANGED'; scale: Scale }
  // ── Route actions ──────────────────────────────────────────────────────────
  | { type: 'CREATE_ROUTE' }
  | { type: 'RENAME_ROUTE'; routeId: string; name: string }
  | { type: 'DELETE_ROUTE'; routeId: string }
  | { type: 'TOGGLE_ROUTE_VISIBILITY'; routeId: string }
  | { type: 'SET_ACTIVE_ROUTE'; routeId: string }
  | { type: 'SET_ROUTE_COLOUR'; routeId: string; colour: string }
  // ── Waypoint actions (operate on the active route) ─────────────────────────
  | { type: 'ADD_WAYPOINT'; x: number; y: number }
  | { type: 'UPDATE_WAYPOINT'; waypointId: string; x: number; y: number }
  | { type: 'DELETE_WAYPOINT'; waypointId: string }
  | { type: 'SET_SEGMENT_TERRAIN'; waypointId: string; terrain: Terrain };
