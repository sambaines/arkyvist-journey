import { useState, useRef, useCallback, useEffect, type RefObject } from 'react'
import type { MapTransform } from '../types'

export const ZOOM_STEP = 1.2
export const MAX_ZOOM = 8

// Min zoom: map cannot become smaller than the viewport in either axis
function computeMinZoom(mapWidth: number, mapHeight: number, vw: number, vh: number): number {
  return Math.max(vw / mapWidth, vh / mapHeight)
}

// Clamp pan so the map always fully covers the viewport — no black bars.
// When a dimension is smaller than the viewport (only possible if zoom < minZoom,
// which shouldn't occur), centre it as a safe fallback.
//
// Coverage constraint: x ∈ [vw − sw, 0]  (left edge ≤ 0, right edge ≥ vw)
//                      y ∈ [vh − sh, 0]  (top edge  ≤ 0, bottom edge ≥ vh)
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
    : Math.max(vw - sw, Math.min(0, x))

  const cy = sh <= vh
    ? (vh - sh) / 2
    : Math.max(vh - sh, Math.min(0, y))

  return { x: cx, y: cy }
}

function centredPan(mapWidth: number, mapHeight: number, zoom: number, vw: number, vh: number) {
  return {
    x: (vw - mapWidth * zoom) / 2,
    y: (vh - mapHeight * zoom) / 2,
  }
}

export interface UseMapTransformResult {
  transform: MapTransform
  canZoomIn: boolean
  canZoomOut: boolean
  zoomIn: () => void
  zoomOut: () => void
  resetView: () => void
  applyPinch: (ratio: number, midX: number, midY: number) => void
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
  const [minZoom, setMinZoom] = useState(() =>
    computeMinZoom(mapWidth, mapHeight, window.innerWidth, window.innerHeight),
  )

  const [transform, setTransform] = useState<MapTransform>(() => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const zoom = computeMinZoom(mapWidth, mapHeight, vw, vh)
    return { ...centredPan(mapWidth, mapHeight, zoom, vw, vh), zoom }
  })

  // Stable ref so pointer handlers always read the latest transform
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

  // Keep minZoom in sync if the viewport is resized
  useEffect(() => {
    const update = () => {
      const el = containerRef.current
      setMinZoom(computeMinZoom(
        mapWidth, mapHeight,
        el?.clientWidth ?? window.innerWidth,
        el?.clientHeight ?? window.innerHeight,
      ))
    }
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [mapWidth, mapHeight, containerRef])

  // Non-passive touch listener to prevent browser scroll/pinch interfering
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const prevent = (e: TouchEvent) => e.preventDefault()
    el.addEventListener('touchmove', prevent, { passive: false })
    return () => el.removeEventListener('touchmove', prevent)
  }, [containerRef])

  // ─── Zoom controls ──────────────────────────────────────────────────────

  function applyZoom(dir: number, focalX: number, focalY: number, vw: number, vh: number) {
    setTransformStable(current => {
      const minZoom = computeMinZoom(mapWidth, mapHeight, vw, vh)
      const newZoom = Math.max(minZoom, Math.min(MAX_ZOOM, current.zoom * dir))
      const ratio = newZoom / current.zoom
      const newX = focalX - ratio * (focalX - current.x)
      const newY = focalY - ratio * (focalY - current.y)
      const { x, y } = clampPan(newX, newY, newZoom, mapWidth, mapHeight, vw, vh)
      return { x, y, zoom: newZoom }
    })
  }

  function getViewport() {
    const el = containerRef.current
    return {
      vw: el?.clientWidth ?? window.innerWidth,
      vh: el?.clientHeight ?? window.innerHeight,
    }
  }

  const applyPinch = useCallback((ratio: number, midX: number, midY: number) => {
    const el = containerRef.current
    const vw = el?.clientWidth ?? window.innerWidth
    const vh = el?.clientHeight ?? window.innerHeight
    setTransformStable(current => {
      const newZoom = Math.max(computeMinZoom(mapWidth, mapHeight, vw, vh), Math.min(MAX_ZOOM, current.zoom * ratio))
      const zoomRatio = newZoom / current.zoom
      const newX = midX - zoomRatio * (midX - current.x)
      const newY = midY - zoomRatio * (midY - current.y)
      const { x, y } = clampPan(newX, newY, newZoom, mapWidth, mapHeight, vw, vh)
      return { x, y, zoom: newZoom }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapWidth, mapHeight, containerRef, setTransformStable])

  const zoomIn = useCallback(() => {
    const { vw, vh } = getViewport()
    applyZoom(ZOOM_STEP, vw / 2, vh / 2, vw, vh)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapWidth, mapHeight, containerRef, setTransformStable])

  const zoomOut = useCallback(() => {
    const { vw, vh } = getViewport()
    applyZoom(1 / ZOOM_STEP, vw / 2, vh / 2, vw, vh)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapWidth, mapHeight, containerRef, setTransformStable])

  const resetView = useCallback(() => {
    const { vw, vh } = getViewport()
    const zoom = computeMinZoom(mapWidth, mapHeight, vw, vh)
    const { x, y } = centredPan(mapWidth, mapHeight, zoom, vw, vh)
    setTransformStable(() => ({ x, y, zoom }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapWidth, mapHeight, containerRef, setTransformStable])

  // ─── Pointer events (pan + pinch) ───────────────────────────────────────

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

  const EPSILON = 0.001
  const canZoomIn = transform.zoom < MAX_ZOOM - EPSILON
  const canZoomOut = transform.zoom > minZoom + EPSILON

  return {
    transform,
    canZoomIn,
    canZoomOut,
    zoomIn,
    zoomOut,
    resetView,
    applyPinch,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  }
}
