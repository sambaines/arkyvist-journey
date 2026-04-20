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
