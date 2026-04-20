import type { TravelMode, Terrain } from '../types';

export const ROUTE_PALETTE: string[] = [
  '#E63946', // red
  '#457B9D', // blue
  '#2A9D8F', // teal
  '#E9C46A', // yellow
  '#F4A261', // orange
  '#A8DADC', // light blue
  '#6A4C93', // purple
  '#95D5B2', // green
];

export const DEFAULT_TRAVEL_MODES: TravelMode[] = [
  { id: 'foot-normal', label: 'On Foot (Normal)', category: 'land', baseSpeedPerDay: 24 },
  { id: 'foot-fast',   label: 'On Foot (Fast)',   category: 'land', baseSpeedPerDay: 30 },
  { id: 'foot-slow',   label: 'On Foot (Slow)',   category: 'land', baseSpeedPerDay: 18 },
  { id: 'horse-trot',  label: 'Horse (Trot)',      category: 'land', baseSpeedPerDay: 30 },
  { id: 'horse-sprint',label: 'Horse (Sprint)',    category: 'land', baseSpeedPerDay: 48 },
  { id: 'cart',        label: 'Cart / Wagon',      category: 'land', baseSpeedPerDay: 18 },
  { id: 'rowboat',     label: 'Rowboat',           category: 'water', baseSpeedPerDay: 15 },
  { id: 'sailing-ship',label: 'Sailing Ship',      category: 'water', baseSpeedPerDay: 90 },
  { id: 'galley',      label: 'Galley',            category: 'water', baseSpeedPerDay: 90 },
  { id: 'keelboat',    label: 'Keelboat',          category: 'water', baseSpeedPerDay: 18 },
];

export const TERRAIN_MODIFIERS: Record<Terrain, number> = {
  road:        1.0,
  open:        1.0,
  forest:      0.5,
  mountains:   0.5,
  marsh:       0.5,
  'water-river': 1.0,
  'water-open':  1.0,
};

export const WATER_TERRAINS: Terrain[] = ['water-river', 'water-open'];

export const FILE_SIZE_WARN_BYTES  = 5  * 1024 * 1024; // 5 MB
export const FILE_SIZE_LIMIT_BYTES = 15 * 1024 * 1024; // 15 MB

export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
