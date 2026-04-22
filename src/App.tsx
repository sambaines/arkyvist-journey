import { useReducer, useState, useEffect } from 'react'
import type { AppState, AppAction, MapImage, Route, Scale, Waypoint } from './types'
import { ROUTE_PALETTE, DEFAULT_TRAVEL_MODES } from './lib/constants'
import { saveSession, loadSession, clearSession } from './lib/storage'
import type { StoredSession } from './lib/storage'
import { exportSession, importSession, encodeSessionToHash, decodeHashToSession } from './lib/serialise'
import EmptyState from './components/ui/EmptyState'
import MapView from './components/canvas/MapView'
import AwaitingImageView from './components/ui/AwaitingImageView'

// ExportedSession is not exported from serialise.ts, so we define the local type shape we need
type PendingHashSession = {
  mapFilename: string
  mapWidth: number
  mapHeight: number
  scale: Scale
  routes: Route[]
  activeRouteId: string
  speedSettings: import('./types').SpeedSettings
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createRoute(name: string, colour: string): Route {
  return { id: crypto.randomUUID(), name, colour, visible: true, waypoints: [] }
}

function nextPaletteColour(routes: Route[]): string {
  return ROUTE_PALETTE[routes.length % ROUTE_PALETTE.length]
}

// ─── Initial state ────────────────────────────────────────────────────────────

const DEFAULT_SCALE: Scale = { pixelsPerUnit: 0, unit: 'miles' }

function makeInitialState(): AppState {
  const firstRoute = createRoute('Route 1', ROUTE_PALETTE[0])
  return {
    status: 'empty',
    map: null,
    scale: DEFAULT_SCALE,
    routes: [firstRoute],
    activeRouteId: firstRoute.id,
    speedSettings: { modes: DEFAULT_TRAVEL_MODES.map(m => ({ ...m })) },
    expectedMapFilename: null,
  }
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {

    case 'MAP_LOADED':
      return { ...state, status: 'loaded', map: action.map, expectedMapFilename: null }

    case 'SESSION_CLEARED': {
      if (state.map) URL.revokeObjectURL(state.map.objectUrl)
      return makeInitialState()
    }

    case 'AWAITING_IMAGE_SESSION':
      return {
        ...state,
        status: 'awaiting-image',
        map: null,
        scale: action.scale,
        routes: action.routes,
        activeRouteId: action.activeRouteId,
        speedSettings: action.speedSettings,
        expectedMapFilename: action.mapFilename,
      }

    case 'SESSION_RESTORED':
      return {
        ...state,
        status: 'loaded',
        map: action.map,
        scale: action.scale,
        routes: action.routes,
        activeRouteId: action.activeRouteId,
        speedSettings: action.speedSettings,
        expectedMapFilename: null,
      }

    case 'SCALE_CHANGED':
      return { ...state, scale: action.scale }

    // ── Routes ──────────────────────────────────────────────────────────────

    case 'CREATE_ROUTE': {
      const route = createRoute(
        `Route ${state.routes.length + 1}`,
        nextPaletteColour(state.routes),
      )
      return { ...state, routes: [...state.routes, route], activeRouteId: route.id }
    }

    case 'RENAME_ROUTE':
      return {
        ...state,
        routes: state.routes.map(r =>
          r.id === action.routeId ? { ...r, name: action.name } : r
        ),
      }

    case 'DELETE_ROUTE': {
      const remaining = state.routes.filter(r => r.id !== action.routeId)
      let newActiveId = state.activeRouteId
      if (state.activeRouteId === action.routeId) {
        const idx = state.routes.findIndex(r => r.id === action.routeId)
        newActiveId = remaining[idx]?.id ?? remaining[idx - 1]?.id ?? ''
      }
      return { ...state, routes: remaining, activeRouteId: newActiveId }
    }

    case 'TOGGLE_ROUTE_VISIBILITY':
      return {
        ...state,
        routes: state.routes.map(r =>
          r.id === action.routeId ? { ...r, visible: !r.visible } : r
        ),
      }

    case 'SET_ACTIVE_ROUTE':
      return { ...state, activeRouteId: action.routeId }

    case 'SET_ROUTE_COLOUR':
      return {
        ...state,
        routes: state.routes.map(r =>
          r.id === action.routeId ? { ...r, colour: action.colour } : r
        ),
      }

    // ── Waypoints (all operate on the active route) ──────────────────────────

    case 'ADD_WAYPOINT': {
      const waypoint: Waypoint = {
        id: crypto.randomUUID(),
        x: action.x,
        y: action.y,
        terrainToNext: 'open',
      }
      return {
        ...state,
        routes: state.routes.map(r =>
          r.id === state.activeRouteId
            ? { ...r, waypoints: [...r.waypoints, waypoint] }
            : r
        ),
      }
    }

    case 'UPDATE_WAYPOINT':
      return {
        ...state,
        routes: state.routes.map(r =>
          r.id === state.activeRouteId
            ? {
                ...r,
                waypoints: r.waypoints.map(wp =>
                  wp.id === action.waypointId ? { ...wp, x: action.x, y: action.y } : wp
                ),
              }
            : r
        ),
      }

    case 'DELETE_WAYPOINT':
      return {
        ...state,
        routes: state.routes.map(r =>
          r.id === state.activeRouteId
            ? { ...r, waypoints: r.waypoints.filter(wp => wp.id !== action.waypointId) }
            : r
        ),
      }

    case 'SET_SEGMENT_TERRAIN':
      return {
        ...state,
        routes: state.routes.map(r =>
          r.id === state.activeRouteId
            ? {
                ...r,
                waypoints: r.waypoints.map(wp =>
                  wp.id === action.waypointId ? { ...wp, terrainToNext: action.terrain } : wp
                ),
              }
            : r
        ),
      }

    // ── Travel speeds ────────────────────────────────────────────────────────

    case 'SET_TRAVEL_SPEED':
      return {
        ...state,
        speedSettings: {
          modes: state.speedSettings.modes.map(m =>
            m.id === action.modeId ? { ...m, baseSpeedPerDay: action.speedPerDay } : m
          ),
        },
      }

    case 'RESET_TRAVEL_SPEEDS':
      return {
        ...state,
        speedSettings: {
          modes: state.speedSettings.modes.map(m => {
            if (m.category !== action.category) return m
            const defaults = DEFAULT_TRAVEL_MODES.find(d => d.id === m.id)
            return defaults ? { ...m, baseSpeedPerDay: defaults.baseSpeedPerDay } : m
          }),
        },
      }

    default:
      return state
  }
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [state, dispatch] = useReducer(appReducer, undefined, makeInitialState)
  const [pendingRestore, setPendingRestore] = useState<StoredSession | null>(null)
  const [pendingHashSession, setPendingHashSession] = useState<PendingHashSession | null>(null)

  // ── Mount effect: check hash then IndexedDB ──────────────────────────────
  useEffect(() => {
    async function init() {
      const hash = window.location.hash
      if (hash.startsWith('#data=')) {
        const session = await decodeHashToSession(hash)
        if (session) {
          setPendingHashSession(session)
          return
        }
      }
      try {
        const stored = await loadSession()
        if (stored) setPendingRestore(stored)
      } catch (e) {
        console.warn('Failed to load IndexedDB session', e)
      }
    }
    init()
  }, [])

  // ── Debounced IndexedDB save ─────────────────────────────────────────────
  useEffect(() => {
    if (state.status !== 'loaded' || !state.map) return
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(state.map!.objectUrl)
        const blob = await res.blob()
        await saveSession({
          mapBlob: blob,
          mapMeta: { filename: state.map!.filename, width: state.map!.width, height: state.map!.height },
          scale: state.scale,
          routes: state.routes,
          activeRouteId: state.activeRouteId,
          speedSettings: state.speedSettings,
        })
      } catch (e) {
        console.warn('IndexedDB save failed', e)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [state])

  // ── Export / share callbacks ─────────────────────────────────────────────

  function handleExportSession() {
    if (!state.map) return
    exportSession({
      mapFilename: state.map.filename,
      mapWidth: state.map.width,
      mapHeight: state.map.height,
      scale: state.scale,
      routes: state.routes,
      activeRouteId: state.activeRouteId,
      speedSettings: state.speedSettings,
    })
  }

  async function handleCopyShareLink() {
    if (!state.map && state.status !== 'awaiting-image') return
    const session = {
      mapFilename: state.expectedMapFilename ?? state.map!.filename,
      mapWidth: state.map?.width ?? 0,
      mapHeight: state.map?.height ?? 0,
      scale: state.scale,
      routes: state.routes,
      activeRouteId: state.activeRouteId,
      speedSettings: state.speedSettings,
    }
    await encodeSessionToHash(session)
    await navigator.clipboard.writeText(window.location.href)
  }

  // ── Restore callbacks ────────────────────────────────────────────────────

  async function handleRestoreSession() {
    if (!pendingRestore) return
    const objectUrl = URL.createObjectURL(pendingRestore.mapBlob)
    const map: MapImage = {
      objectUrl,
      width: pendingRestore.mapMeta.width,
      height: pendingRestore.mapMeta.height,
      filename: pendingRestore.mapMeta.filename,
    }
    dispatch({
      type: 'SESSION_RESTORED',
      map,
      scale: pendingRestore.scale,
      routes: pendingRestore.routes,
      activeRouteId: pendingRestore.activeRouteId,
      speedSettings: pendingRestore.speedSettings,
    })
    setPendingRestore(null)
  }

  async function handleDismissRestore() {
    await clearSession().catch(() => {})
    setPendingRestore(null)
  }

  // ── Hash session callbacks ───────────────────────────────────────────────

  function handleLoadHashSession() {
    if (!pendingHashSession) return
    dispatch({
      type: 'AWAITING_IMAGE_SESSION',
      mapFilename: pendingHashSession.mapFilename,
      scale: pendingHashSession.scale,
      routes: pendingHashSession.routes,
      activeRouteId: pendingHashSession.activeRouteId,
      speedSettings: pendingHashSession.speedSettings,
    })
    setPendingHashSession(null)
    window.location.hash = ''
  }

  function handleDismissHashSession() {
    setPendingHashSession(null)
    window.location.hash = ''
  }

  // ── Import JSON ──────────────────────────────────────────────────────────

  async function handleImportJson(file: File) {
    const text = await file.text()
    const session = importSession(text)
    if (!session) {
      console.error('Failed to import session JSON')
      return
    }
    dispatch({
      type: 'AWAITING_IMAGE_SESSION',
      mapFilename: session.mapFilename,
      scale: session.scale,
      routes: session.routes,
      activeRouteId: session.activeRouteId,
      speedSettings: session.speedSettings,
    })
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (state.status === 'awaiting-image') {
    return (
      <AwaitingImageView
        expectedFilename={state.expectedMapFilename!}
        scale={state.scale}
        routes={state.routes}
        activeRouteId={state.activeRouteId}
        speedSettings={state.speedSettings}
        dispatch={dispatch}
        onScaleChanged={scale => dispatch({ type: 'SCALE_CHANGED', scale })}
        onExportSession={handleExportSession}
        onCopyShareLink={handleCopyShareLink}
      />
    )
  }

  if (state.status === 'loaded' && state.map) {
    return (
      <MapView
        map={state.map}
        scale={state.scale}
        routes={state.routes}
        activeRouteId={state.activeRouteId}
        speedSettings={state.speedSettings}
        dispatch={dispatch}
        onClear={async () => {
          await clearSession().catch(() => {})
          dispatch({ type: 'SESSION_CLEARED' })
        }}
        onScaleChanged={scale => dispatch({ type: 'SCALE_CHANGED', scale })}
        onExportSession={handleExportSession}
        onCopyShareLink={handleCopyShareLink}
      />
    )
  }

  const sessionBanner = pendingHashSession
    ? {
        type: 'shared' as const,
        mapFilename: pendingHashSession.mapFilename,
        routeCount: pendingHashSession.routes.length,
        onAccept: handleLoadHashSession,
        onDismiss: handleDismissHashSession,
      }
    : pendingRestore
    ? {
        type: 'restore' as const,
        mapFilename: pendingRestore.mapMeta.filename,
        routeCount: pendingRestore.routes.length,
        onAccept: handleRestoreSession,
        onDismiss: handleDismissRestore,
      }
    : null

  return (
    <EmptyState
      onMapLoaded={(map: MapImage) => dispatch({ type: 'MAP_LOADED', map })}
      onImportJson={handleImportJson}
      sessionBanner={sessionBanner}
    />
  )
}
