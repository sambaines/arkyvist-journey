import { describe, it, expect } from 'vitest'
import { twoPointCalibration, pixelsToUnits, pixelDistanceBetween, segmentDistance, routeTotalDistance } from './calculations'
import type { Waypoint, Route } from '../types'

function makeWaypoint(x: number, y: number, id = crypto.randomUUID()): Waypoint {
  return { id, x, y, terrainToNext: 'open' }
}

function makeRoute(waypoints: Waypoint[]): Route {
  return { id: crypto.randomUUID(), name: 'Test', colour: '#fff', visible: true, waypoints }
}

const scale = { pixelsPerUnit: 10, unit: 'miles' as const }

describe('twoPointCalibration', () => {
  it('100px apart horizontally, 10 miles → pixelsPerUnit = 10', () => {
    expect(twoPointCalibration({ x: 0, y: 0 }, { x: 100, y: 0 }, 10)).toBe(10)
  })

  it('vertical line: (0,0) to (0,50), 10 miles → pixelsPerUnit = 5', () => {
    expect(twoPointCalibration({ x: 0, y: 0 }, { x: 0, y: 50 }, 10)).toBe(5)
  })

  it('same points (zero pixel distance) → returns 0 without divide-by-zero', () => {
    expect(twoPointCalibration({ x: 5, y: 5 }, { x: 5, y: 5 }, 10)).toBe(0)
  })
})

describe('pixelDistanceBetween', () => {
  it('(0,0) to (3,4) → 5 (Pythagorean triple)', () => {
    expect(pixelDistanceBetween({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
  })

  it('same point → 0', () => {
    expect(pixelDistanceBetween({ x: 7, y: 7 }, { x: 7, y: 7 })).toBe(0)
  })

  it('large coordinates do not overflow', () => {
    const d = pixelDistanceBetween({ x: 0, y: 0 }, { x: 30000, y: 40000 })
    expect(d).toBe(50000)
  })
})

describe('segmentDistance', () => {
  it('converts pixel distance using pixelsPerUnit', () => {
    const a = makeWaypoint(0, 0)
    const b = makeWaypoint(100, 0)
    expect(segmentDistance(a, b, scale)).toBe(10) // 100px / 10 px-per-unit
  })
})

describe('routeTotalDistance', () => {
  it('empty waypoints → 0', () => {
    expect(routeTotalDistance(makeRoute([]), scale)).toBe(0)
  })

  it('one waypoint → 0', () => {
    expect(routeTotalDistance(makeRoute([makeWaypoint(0, 0)]), scale)).toBe(0)
  })

  it('two waypoints → correct single segment', () => {
    const route = makeRoute([makeWaypoint(0, 0), makeWaypoint(50, 0)])
    expect(routeTotalDistance(route, scale)).toBe(5) // 50px / 10
  })

  it('three waypoints → sum of two segments', () => {
    const route = makeRoute([makeWaypoint(0, 0), makeWaypoint(30, 40), makeWaypoint(60, 80)])
    // segment 1: (0,0)→(30,40) = 50px; segment 2: (30,40)→(60,80) = 50px → total 100px / 10 = 10
    expect(routeTotalDistance(route, scale)).toBeCloseTo(10, 5)
  })

  it('floating point accumulation stays within tolerance', () => {
    const waypoints = Array.from({ length: 10 }, (_, i) => makeWaypoint(i * 10, 0))
    const route = makeRoute(waypoints)
    // 9 segments × 10px each = 90px / 10 = 9 units
    expect(routeTotalDistance(route, scale)).toBeCloseTo(9, 10)
  })
})

describe('pixelsToUnits', () => {
  it('250 pixels at 10 px/unit → 25 units', () => {
    expect(pixelsToUnits(250, { pixelsPerUnit: 10, unit: 'miles' })).toBe(25)
  })

  it('floating point: 100px at 3.7 px/unit → correct to 2dp', () => {
    expect(pixelsToUnits(100, { pixelsPerUnit: 3.7, unit: 'miles' })).toBeCloseTo(27.03, 2)
  })
})
