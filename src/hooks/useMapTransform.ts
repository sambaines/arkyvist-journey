import { useState, useRef, useCallback, useEffect, type RefObject } from 'react'
import type { MapTransform } from '../types'

const ZOOM_STEP = 1.1
const MAX_ZOOM = 8

// Min zoom: map cannot become smaller than the viewport
function computeMinZoom(mapWidth: number, mapHeight: number, vw: number, vh: number): number {
  return Math.max(vw / mapWidth, vh / mapHeight)
}

// Clamp pan so at least half the map remains visible in each axis.
// When the map fits entirely in the viewport, centre it.
function clampPan(
  x: number,
  y: number,
  zoom: number,
  mapWidth: number,
  mapHeight: number,
  vw: number,
  vh: number,
): { x: number; y: number } {
  const sw = mapWidth * zoom
  const sh = mapHeight * zoom

  const cx = sw <= vw
    ? (vw - sw) / 2
    : Math.max(vw - sw * 0.5, Math.min(sw * 0.5, x))

  const cy = sh <= vh
    ? (vh - sh) / 2
    : Math.max(vh - sh * 0.5, Math.min(sh * 0.5, y))

  return { x: cx, y: cy }
}

export interface UseMapTransformResult {
  transform: MapTransform
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
    onPointerCancel: (e: React.PointerEvent) => void
  }
}

export function useMapTransform(
  mapWidth: number,
  mapHeight: number,
  containerRef: RefObject<HTMLElement | null>,
): UseMapTransformResult {
  const [transform, setTransform] = useState<MapTransform>(() => ({
    x: (window.innerWidth - mapWidth) / 2,
    y: (window.innerHeight - mapHeight) / 2,
    zoom: 1,
  }))

  // Stable ref so event listeners can read the latest transform without re-registering
  const transformRef = useRef(transform)
  const setTransformStable = useCallback((updater: (prev: MapTransform) => MapTransform) => {
    setTransform(prev => {
      const next = updater(prev)
      transformRef.current = next
      return next
    })
  }, [])

  // Pan state
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })
  const panOrigin = useRef({ x: 0, y: 0 })

  // Pinch state
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const prevPinchDist = useRef<number | null>(null)

  // Non-passive wheel listener — must use addEventListener to prevent page scroll
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const vw = el.clientWidth
      const vh = el.clientHeight
      const dir = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP

      setTransformStable(current => {
        const minZoom = computeMinZoom(mapWidth, mapHeight, vw, vh)
        const newZoom = Math.max(minZoom, Math.min(MAX_ZOOM, current.zoom * dir))
        const ratio = newZoom / current.zoom
        const newX = e.clientX - ratio * (e.clientX - current.x)
        const newY = e.clientY - ratio * (e.clientY - current.y)
        const { x, y } = clampPan(newX, newY, newZoom, mapWidth, mapHeight, vw, vh)
        return { x, y, zoom: newZoom }
      })
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [mapWidth, mapHeight, containerRef, setTransformStable])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)

    if (pointersRef.current.size === 1) {
      isPanning.current = true
      panStart.current = { x: e.clientX, y: e.clientY }
      panOrigin.current = { x: transformRef.current.x, y: transformRef.current.y }
    } else if (pointersRef.current.size === 2) {
      isPanning.current = false
      const pts = [...pointersRef.current.values()]
      prevPinchDist.current = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
    }
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    const el = containerRef.current
    const vw = el?.clientWidth ?? window.innerWidth
    const vh = el?.clientHeight ?? window.innerHeight

    if (pointersRef.current.size >= 2) {
      const pts = [...pointersRef.current.values()]
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      const midX = (pts[0].x + pts[1].x) / 2
      const midY = (pts[0].y + pts[1].y) / 2

      if (prevPinchDist.current !== null) {
        const pinchRatio = dist / prevPinchDist.current
        setTransformStable(current => {
          const minZoom = computeMinZoom(mapWidth, mapHeight, vw, vh)
          const newZoom = Math.max(minZoom, Math.min(MAX_ZOOM, current.zoom * pinchRatio))
          const zoomRatio = newZoom / current.zoom
          const newX = midX - zoomRatio * (midX - current.x)
          const newY = midY - zoomRatio * (midY - current.y)
          const { x, y } = clampPan(newX, newY, newZoom, mapWidth, mapHeight, vw, vh)
          return { x, y, zoom: newZoom }
        })
      }
      prevPinchDist.current = dist
      return
    }

    if (!isPanning.current) return

    const dx = e.clientX - panStart.current.x
    const dy = e.clientY - panStart.current.y
    const rawX = panOrigin.current.x + dx
    const rawY = panOrigin.current.y + dy

    setTransformStable(current => {
      const { x, y } = clampPan(rawX, rawY, current.zoom, mapWidth, mapHeight, vw, vh)
      return { ...current, x, y }
    })
  }, [mapWidth, mapHeight, containerRef, setTransformStable])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId)
    if (pointersRef.current.size < 2) prevPinchDist.current = null
    if (pointersRef.current.size === 0) isPanning.current = false
  }, [])

  return {
    transform,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  }
}
