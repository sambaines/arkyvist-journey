// Hard-coded token values for canvas (CSS vars cannot be used in Canvas API)
const BRAND_TEAL = '#068A84'
const CALIBRATION_RADIUS = 6

export interface CalibrationPoint {
  x: number
  y: number
}

export interface CanvasRenderState {
  calibrationPoints: CalibrationPoint[]
}

export function renderCanvas(ctx: CanvasRenderingContext2D, state: CanvasRenderState): void {
  const { canvas } = ctx
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const { calibrationPoints } = state

  // Dashed line between two calibration points
  if (calibrationPoints.length === 2) {
    const [a, b] = calibrationPoints
    ctx.save()
    ctx.beginPath()
    ctx.setLineDash([6, 4])
    ctx.strokeStyle = BRAND_TEAL
    ctx.lineWidth = 1.5
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
    ctx.restore()
  }

  // Filled teal circles at each calibration point
  for (const pt of calibrationPoints) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(pt.x, pt.y, CALIBRATION_RADIUS, 0, Math.PI * 2)
    ctx.fillStyle = BRAND_TEAL
    ctx.fill()
    ctx.restore()
  }
}
