import { useRef, useState, useCallback } from 'react'
import type { Route, AppAction, MapTransform, Terrain } from '../types'

const HIT_RADIUS_SCREEN_PX = 12
const DRAG_THRESHOLD_PX = 5
const LONG_PRESS_MS = 500

export interface ContextMenuState {
  screenX: number
  screenY: number
  waypointId: string
  isLastWaypoint: boolean
}

export interface TerrainMenuState {
  screenX: number
  screenY: number
  waypointId: string
  currentTerrain: Terrain
}

// Convert client coords → map-image-space coords
function clientToMap(clientX: number, clientY: number, transform: MapTransform) {
  return {
    x: (clientX - transform.x) / transform.zoom,
    y: (clientY - transform.y) / transform.zoom,
  }
}

// Find the first waypoint in the active route within hit radius (in map space)
function hitWaypoint(routes: Route[], activeRouteId: string, mapX: number, mapY: number, zoom: number) {
  const route = routes.find(r => r.id === activeRouteId)
  if (!route) return null
  const r = HIT_RADIUS_SCREEN_PX / zoom
  return route.waypoints.find(wp => {
    const dx = wp.x - mapX
    const dy = wp.y - mapY
    return dx * dx + dy * dy <= r * r
  }) ?? null
}

// Find a segment midpoint in the active route within hit radius
function hitSegmentMidpoint(routes: Route[], activeRouteId: string, mapX: number, mapY: number, zoom: number) {
  const route = routes.find(r => r.id === activeRouteId)
  if (!route || route.waypoints.length < 2) return null
  const r = HIT_RADIUS_SCREEN_PX / zoom
  for (let i = 0; i < route.waypoints.length - 1; i++) {
    const wp = route.waypoints[i]
    const next = route.waypoints[i + 1]
    const mx = (wp.x + next.x) / 2
    const my = (wp.y + next.y) / 2
    const dx = mx - mapX
    const dy = my - mapY
    if (dx * dx + dy * dy <= r * r) {
      return { waypointId: wp.id, terrain: wp.terrainToNext }
    }
  }
  return null
}

interface Options {
  routes: Route[]
  activeRouteId: string
  transform: MapTransform
  dispatch: React.Dispatch<AppAction>
  enabled: boolean
  applyPinch: (ratio: number, midX: number, midY: number) => void
}

export function useCanvasInteraction({ routes, activeRouteId, transform, dispatch, enabled, applyPinch }: Options) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [terrainMenu, setTerrainMenu] = useState<TerrainMenuState | null>(null)

  const pointerDownPos = useRef<{ clientX: number; clientY: number } | null>(null)
  const draggingId = useRef<string | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFired = useRef(false)

  // Multi-pointer tracking for pinch zoom in waypoint mode
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map())
  const prevPinchDist = useRef<number | null>(null)

  function clearLongPress() {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!enabled) return
    e.currentTarget.setPointerCapture(e.pointerId)
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    // Second finger — switch to pinch zoom, cancel any waypoint interaction
    if (activePointers.current.size >= 2) {
      draggingId.current = null
      clearLongPress()
      pointerDownPos.current = null
      const pts = [...activePointers.current.values()]
      prevPinchDist.current = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      return
    }

    pointerDownPos.current = { clientX: e.clientX, clientY: e.clientY }
    longPressFired.current = false

    const { x: mapX, y: mapY } = clientToMap(e.clientX, e.clientY, transform)
    const hit = hitWaypoint(routes, activeRouteId, mapX, mapY, transform.zoom)

    if (hit) {
      draggingId.current = hit.id

      // Long press → context menu (mobile)
      const waypointId = hit.id
      const activeRoute = routes.find(r => r.id === activeRouteId)
      longPressTimer.current = setTimeout(() => {
        longPressFired.current = true
        draggingId.current = null
        setContextMenu({
          screenX: e.clientX,
          screenY: e.clientY,
          waypointId,
          isLastWaypoint: (activeRoute?.waypoints.length ?? 0) <= 1,
        })
      }, LONG_PRESS_MS)
    }
  }, [enabled, routes, activeRouteId, transform])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!enabled) return
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    // Pinch zoom — two fingers active
    if (activePointers.current.size >= 2) {
      const pts = [...activePointers.current.values()]
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      if (prevPinchDist.current !== null) {
        const ratio = dist / prevPinchDist.current
        const midX = (pts[0].x + pts[1].x) / 2
        const midY = (pts[0].y + pts[1].y) / 2
        applyPinch(ratio, midX, midY)
      }
      prevPinchDist.current = dist
      return
    }

    // Cancel long press if pointer has drifted
    if (pointerDownPos.current) {
      const dx = e.clientX - pointerDownPos.current.clientX
      const dy = e.clientY - pointerDownPos.current.clientY
      if (dx * dx + dy * dy > DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) {
        clearLongPress()
      }
    }

    if (!draggingId.current) return

    const { x, y } = clientToMap(e.clientX, e.clientY, transform)
    dispatch({ type: 'UPDATE_WAYPOINT', waypointId: draggingId.current, x, y })
  }, [enabled, transform, dispatch, applyPinch])

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!enabled) return
    activePointers.current.delete(e.pointerId)
    if (activePointers.current.size < 2) prevPinchDist.current = null
    if (activePointers.current.size >= 1) return // Still have fingers down, don't process tap
    clearLongPress()

    // Long press already handled
    if (longPressFired.current) {
      longPressFired.current = false
      pointerDownPos.current = null
      draggingId.current = null
      return
    }

    const wasDragging = draggingId.current !== null
    draggingId.current = null

    if (wasDragging) {
      pointerDownPos.current = null
      return // position already committed via pointermove
    }

    // Tap: only act if pointer barely moved
    if (pointerDownPos.current) {
      const dx = e.clientX - pointerDownPos.current.clientX
      const dy = e.clientY - pointerDownPos.current.clientY
      if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) {
        const { x: mapX, y: mapY } = clientToMap(e.clientX, e.clientY, transform)

        // Waypoint takes priority over midpoint
        const waypointHit = hitWaypoint(routes, activeRouteId, mapX, mapY, transform.zoom)
        if (!waypointHit) {
          const midHit = hitSegmentMidpoint(routes, activeRouteId, mapX, mapY, transform.zoom)
          if (midHit) {
            setTerrainMenu({
              screenX: e.clientX,
              screenY: e.clientY,
              waypointId: midHit.waypointId,
              currentTerrain: midHit.terrain,
            })
          } else {
            dispatch({ type: 'ADD_WAYPOINT', x: mapX, y: mapY })
          }
        }
      }
    }

    pointerDownPos.current = null
  }, [enabled, routes, activeRouteId, transform, dispatch])

  const onContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!enabled) return
    e.preventDefault()
    const { x: mapX, y: mapY } = clientToMap(e.clientX, e.clientY, transform)
    const hit = hitWaypoint(routes, activeRouteId, mapX, mapY, transform.zoom)
    if (hit) {
      const activeRoute = routes.find(r => r.id === activeRouteId)
      setContextMenu({
        screenX: e.clientX,
        screenY: e.clientY,
        waypointId: hit.id,
        isLastWaypoint: (activeRoute?.waypoints.length ?? 0) <= 1,
      })
    }
  }, [enabled, routes, activeRouteId, transform])

  return {
    canvasHandlers: { onPointerDown, onPointerMove, onPointerUp, onContextMenu },
    contextMenu,
    closeContextMenu: () => setContextMenu(null),
    terrainMenu,
    closeTerrainMenu: () => setTerrainMenu(null),
  }
}
