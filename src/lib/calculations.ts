import type { Waypoint, Scale, Route, TravelMode, TravelTime, Terrain, Point } from '../types';
import { TERRAIN_MODIFIERS, WATER_TERRAINS } from './constants';

export function pixelDistanceBetween(a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function pixelsToUnits(pixels: number, scale: Scale): number {
  return pixels / scale.pixelsPerUnit;
}

export function segmentDistance(a: Waypoint, b: Waypoint, scale: Scale): number {
  return pixelsToUnits(pixelDistanceBetween(a, b), scale);
}

export function routeTotalDistance(route: Route, scale: Scale): number {
  const { waypoints } = route;
  if (waypoints.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    total += segmentDistance(waypoints[i], waypoints[i + 1], scale);
  }
  return total;
}

export function travelTime(distanceInUnits: number, speedPerDay: number): TravelTime {
  const totalDays = distanceInUnits / speedPerDay;
  const days = Math.floor(totalDays);
  const hours = Math.round((totalDays - days) * 24);
  return { days, hours };
}

export function twoPointCalibration(p1: Point, p2: Point, realWorldDistance: number): number {
  const pixels = pixelDistanceBetween(p1, p2);
  return pixels / realWorldDistance;
}

export type TravelTimeResult =
  | { blocked: false; time: TravelTime }
  | { blocked: true; reason: 'land-mode-on-water' | 'water-mode-on-land' };

export function travelTimeForRoute(
  route: Route,
  scale: Scale,
  mode: TravelMode,
  terrainModifiers: Record<Terrain, number> = TERRAIN_MODIFIERS,
): TravelTime | null {
  const { waypoints } = route;
  if (waypoints.length < 2) return { days: 0, hours: 0 };

  let totalDistance = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const wp = waypoints[i];
    const terrain = wp.terrainToNext;
    const isWaterTerrain = WATER_TERRAINS.includes(terrain);

    if (mode.category === 'land' && isWaterTerrain) return null;
    if (mode.category === 'water' && !isWaterTerrain) return null;

    const modifier = terrainModifiers[terrain] ?? 1.0;
    const dist = segmentDistance(wp, waypoints[i + 1], scale);
    const effectiveSpeed = mode.baseSpeedPerDay * modifier;
    totalDistance += dist / effectiveSpeed;
  }

  const days = Math.floor(totalDistance);
  const hours = Math.round((totalDistance - days) * 24);
  return { days, hours };
}
