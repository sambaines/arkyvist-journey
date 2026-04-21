import { useReducer } from 'react'
import type { AppState, AppAction, MapImage, Route, Scale, Waypoint } from './types'
import { ROUTE_PALETTE } from './lib/constants'
import EmptyState from './components/ui/EmptyState'
import MapView from './components/canvas/MapView'

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
  }
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {

    case 'MAP_LOADED':
      return { ...state, status: 'loaded', map: action.map }

    case 'SESSION_CLEARED': {
      if (state.map) URL.revokeObjectURL(state.map.objectUrl)
      return makeInitialState()
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

    default:
      return state
  }
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [state, dispatch] = useReducer(appReducer, undefined, makeInitialState)

  if (state.status === 'loaded' && state.map) {
    return (
      <MapView
        map={state.map}
        scale={state.scale}
        routes={state.routes}
        activeRouteId={state.activeRouteId}
        dispatch={dispatch}
        onClear={() => dispatch({ type: 'SESSION_CLEARED' })}
        onScaleChanged={scale => dispatch({ type: 'SCALE_CHANGED', scale })}
      />
    )
  }

  return <EmptyState onMapLoaded={(map: MapImage) => dispatch({ type: 'MAP_LOADED', map })} />
}
