import { describe, it, expect } from 'vitest'
import { importSession, encodeSessionToHash, decodeHashToSession } from './serialise'
import type { MapSession } from '../types'

const sampleSession: MapSession = {
  mapFilename: 'test-map.png',
  mapWidth: 1000,
  mapHeight: 800,
  scale: { pixelsPerUnit: 10, unit: 'miles' },
  routes: [{ id: 'r1', name: 'Route 1', colour: '#E63946', visible: true, waypoints: [{ id: 'w1', x: 100, y: 200, terrainToNext: 'open' }] }],
  activeRouteId: 'r1',
  speedSettings: { modes: [{ id: 'foot-normal', label: 'On Foot (Normal)', category: 'land', baseSpeedPerDay: 24 }] },
}

describe('encodeSessionToHash / decodeHashToSession', () => {
  it('round-trip: encode then decode returns equivalent session', async () => {
    const hash = await encodeSessionToHash(sampleSession)
    expect(hash).toMatch(/^#data=/)
    const decoded = await decodeHashToSession(hash)
    expect(decoded).not.toBeNull()
    expect(decoded!.mapFilename).toBe(sampleSession.mapFilename)
    expect(decoded!.scale).toEqual(sampleSession.scale)
    expect(decoded!.routes).toEqual(sampleSession.routes)
    expect(decoded!.speedSettings).toEqual(sampleSession.speedSettings)
  })

  it('malformed base64 → returns null', async () => {
    expect(await decodeHashToSession('#data=!!!not-valid!!!')).toBeNull()
  })

  it('valid base64 but non-gzip bytes → returns null', async () => {
    // base64url of "not json" — not gzip compressed, so decompress will fail
    const b64 = Buffer.from('not json').toString('base64url')
    expect(await decodeHashToSession('#data=' + b64)).toBeNull()
  })

  it('empty string → returns null', async () => {
    expect(await decodeHashToSession('')).toBeNull()
  })
})

describe('importSession', () => {
  it('valid JSON session → correctly parsed', () => {
    const json = JSON.stringify({
      version: '1.0',
      mapFilename: 'map.png',
      mapWidth: 800,
      mapHeight: 600,
      scale: { pixelsPerUnit: 10, unit: 'miles' },
      routes: [],
      activeRouteId: '',
      speedSettings: { modes: [] },
    })
    const result = importSession(json)
    expect(result).not.toBeNull()
    expect(result!.mapFilename).toBe('map.png')
  })

  it('malformed JSON → returns null', () => {
    expect(importSession('{ not json')).toBeNull()
  })

  it('missing required fields → returns null', () => {
    expect(importSession(JSON.stringify({ version: '1.0' }))).toBeNull()
  })

  it('extra unknown fields → ignored gracefully', () => {
    const json = JSON.stringify({
      version: '1.0',
      mapFilename: 'map.png',
      mapWidth: 800,
      mapHeight: 600,
      scale: { pixelsPerUnit: 10, unit: 'miles' },
      routes: [],
      activeRouteId: '',
      speedSettings: { modes: [] },
      unknownField: 'ignored',
    })
    expect(importSession(json)).not.toBeNull()
  })
})
