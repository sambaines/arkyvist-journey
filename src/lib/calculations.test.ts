import { describe, it, expect } from 'vitest'
import { twoPointCalibration, pixelsToUnits } from './calculations'

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

describe('pixelsToUnits', () => {
  it('250 pixels at 10 px/unit → 25 units', () => {
    expect(pixelsToUnits(250, { pixelsPerUnit: 10, unit: 'miles' })).toBe(25)
  })

  it('floating point: 100px at 3.7 px/unit → correct to 2dp', () => {
    expect(pixelsToUnits(100, { pixelsPerUnit: 3.7, unit: 'miles' })).toBeCloseTo(27.03, 2)
  })
})
