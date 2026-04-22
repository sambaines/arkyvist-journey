import type { Route, MapTransform, Terrain } from '../../types'
import { TERRAIN_INFO } from '../../lib/constants'

// Hard-coded token values — CSS vars cannot be used in Canvas API
const BRAND_TEAL = '#068A84'
const CALIBRATION_RADIUS = 6

export interface CalibrationPoint {
  x: number
  y: number
}

export interface CanvasRenderState {
  calibrationPoints: CalibrationPoint[]
  routes: Route[]
  activeRouteId: string
  transform: MapTransform
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export function renderCanvas(ctx: CanvasRenderingContext2D, state: CanvasRenderState): void {
  const { canvas } = ctx
  const dpr = window.devicePixelRatio || 1
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.save()
  // Scale for device pixel ratio, then apply map pan/zoom transform
  ctx.scale(dpr, dpr)
  ctx.translate(state.transform.x, state.transform.y)
  ctx.scale(state.transform.zoom, state.transform.zoom)
  drawRoutes(ctx, state.routes, state.activeRouteId, state.transform.zoom)
  drawCalibrationMarkers(ctx, state.calibrationPoints, state.transform.zoom)
  ctx.restore()
}

// ─── Routes ───────────────────────────────────────────────────────────────────

function drawRoutes(ctx: CanvasRenderingContext2D, routes: Route[], activeRouteId: string, zoom: number) {
  const visible = routes.filter(r => r.visible)
  // Inactive routes first, active route on top
  for (const route of visible) {
    if (route.id !== activeRouteId) drawRoute(ctx, route, false, zoom)
  }
  const active = visible.find(r => r.id === activeRouteId)
  if (active) drawRoute(ctx, active, true, zoom)
}

function drawRoute(ctx: CanvasRenderingContext2D, route: Route, isActive: boolean, zoom: number) {
  const { waypoints, colour } = route
  if (waypoints.length === 0) return

  const lineWidth = (isActive ? 3 : 2) / zoom
  const dotRadius = (isActive ? 8 : 6) / zoom
  const outlineWidth = 1.5 / zoom
  const alpha = isActive ? 1 : 0.75

  if (waypoints.length >= 2) {
    if (isActive) {
      // Draw each segment individually with terrain-specific line style
      for (let i = 0; i < waypoints.length - 1; i++) {
        const wp = waypoints[i]
        const next = waypoints[i + 1]
        drawSegment(ctx, wp.x, wp.y, next.x, next.y, wp.terrainToNext, colour, lineWidth, alpha, zoom)
      }
    } else {
      // Single solid polyline for inactive routes
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(waypoints[0].x, waypoints[0].y)
      for (let i = 1; i < waypoints.length; i++) {
        ctx.lineTo(waypoints[i].x, waypoints[i].y)
      }
      ctx.strokeStyle = colour
      ctx.lineWidth = lineWidth
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.globalAlpha = alpha
      ctx.stroke()
      ctx.restore()
    }
  }

  // Terrain midpoint indicators (active route only)
  if (isActive && waypoints.length >= 2) {
    for (let i = 0; i < waypoints.length - 1; i++) {
      const wp = waypoints[i]
      const next = waypoints[i + 1]
      const mx = (wp.x + next.x) / 2
      const my = (wp.y + next.y) / 2
      drawMidpointIndicator(ctx, mx, my, wp.terrainToNext, zoom)
    }
  }

  // Waypoint dots
  for (const wp of waypoints) {
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.beginPath()
    ctx.arc(wp.x, wp.y, dotRadius, 0, Math.PI * 2)
    ctx.fillStyle = colour
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.lineWidth = outlineWidth
    ctx.stroke()
    ctx.restore()
  }

  // Route label near first waypoint
  drawRouteLabel(ctx, route.name, waypoints[0].x, waypoints[0].y, isActive, zoom)
}

function drawSegment(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  terrain: Terrain,
  colour: string,
  lineWidth: number,
  alpha: number,
  zoom: number,
) {
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.strokeStyle = colour
  ctx.lineWidth = lineWidth
  ctx.lineCap = 'round'
  ctx.globalAlpha = alpha

  if (terrain === 'water-river' || terrain === 'water-open') {
    ctx.setLineDash([8 / zoom, 5 / zoom])
  } else if (terrain === 'forest' || terrain === 'mountains' || terrain === 'marsh') {
    ctx.setLineDash([3 / zoom, 4 / zoom])
  }

  ctx.stroke()
  ctx.restore()
}

function drawMidpointIndicator(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  terrain: Terrain,
  zoom: number,
) {
  const radius = 5 / zoom
  const fillColour = TERRAIN_INFO[terrain].colour

  ctx.save()
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fillStyle = fillColour
  ctx.globalAlpha = terrain === 'road' || terrain === 'open' ? 0.5 : 0.85
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'
  ctx.lineWidth = 1 / zoom
  ctx.globalAlpha = terrain === 'road' || terrain === 'open' ? 0.4 : 0.8
  ctx.stroke()
  ctx.restore()
}

function drawRouteLabel(
  ctx: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  isActive: boolean,
  zoom: number,
) {
  // All sizes in screen pixels, divided by zoom to stay constant on screen
  const FONT_SIZE = 11 / zoom
  const PAD_X = 6 / zoom
  const PAD_Y = 3 / zoom
  const ABOVE = 18 / zoom
  const RADIUS = 4 / zoom

  ctx.save()
  ctx.font = `${isActive ? 600 : 400} ${FONT_SIZE}px system-ui, sans-serif`

  const textW = ctx.measureText(name).width
  const bgW = textW + PAD_X * 2
  const bgH = FONT_SIZE + PAD_Y * 2
  const bgX = x - bgW / 2
  const bgY = y - ABOVE - bgH

  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'
  ctx.beginPath()
  ctx.roundRect(bgX, bgY, bgW, bgH, RADIUS)
  ctx.fill()

  ctx.fillStyle = '#FFFFFF'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(name, x, bgY + bgH / 2)
  ctx.restore()
}

// ─── Calibration markers ─────────────────────────────────────────────────────

function drawCalibrationMarkers(ctx: CanvasRenderingContext2D, points: CalibrationPoint[], zoom: number) {
  // Dashed line between two calibration points
  if (points.length === 2) {
    ctx.save()
    ctx.beginPath()
    ctx.setLineDash([6 / zoom, 4 / zoom])
    ctx.strokeStyle = BRAND_TEAL
    ctx.lineWidth = 1.5 / zoom
    ctx.moveTo(points[0].x, points[0].y)
    ctx.lineTo(points[1].x, points[1].y)
    ctx.stroke()
    ctx.restore()
  }

  // Filled teal circles
  for (const pt of points) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(pt.x, pt.y, CALIBRATION_RADIUS / zoom, 0, Math.PI * 2)
    ctx.fillStyle = BRAND_TEAL
    ctx.fill()
    ctx.restore()
  }
}
