import { useRef, useState, useCallback } from 'react'
import type { Route, AppAction, MapTransform } from '../types'

const HIT_RADIUS_SCREEN_PX = 12
const DRAG_THRESHOLD_PX = 5
const LONG_PRESS_MS = 500

export interface ContextMenuState {
  screenX: number
  screenY: number
  waypointId: string
  isLastWaypoint: boolean
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

interface Options {
  routes: Route[]
  activeRouteId: string
  transform: MapTransform
  dispatch: React.Dispatch<AppAction>
  enabled: boolean
}

export function useCanvasInteraction({ routes, activeRouteId, transform, dispatch, enabled }: Options) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  const pointerDownPos = useRef<{ clientX: number; clientY: number } | null>(null)
  const draggingId = useRef<string | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFired = useRef(false)

  function clearLongPress() {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!enabled) return
    e.currentTarget.setPointerCapture(e.pointerId)
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
  }, [enabled, transform, dispatch])

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!enabled) return
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

    // Tap: only add waypoint if pointer barely moved
    if (pointerDownPos.current) {
      const dx = e.clientX - pointerDownPos.current.clientX
      const dy = e.clientY - pointerDownPos.current.clientY
      if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) {
        const { x: mapX, y: mapY } = clientToMap(e.clientX, e.clientY, transform)
        // Don't add a waypoint if we tapped an existing one
        const hit = hitWaypoint(routes, activeRouteId, mapX, mapY, transform.zoom)
        if (!hit) {
          dispatch({ type: 'ADD_WAYPOINT', x: mapX, y: mapY })
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
  }
}
