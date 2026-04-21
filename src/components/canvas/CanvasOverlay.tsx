import { useRef, useEffect } from 'react'
import { renderCanvas } from './renderCanvas'
import type { CanvasRenderState } from './renderCanvas'
import './CanvasOverlay.css'

interface CanvasOverlayProps {
  width: number
  height: number
  renderState: CanvasRenderState
  interactive?: boolean
  onPointerUp?: (e: React.PointerEvent<HTMLCanvasElement>) => void
}

export default function CanvasOverlay({ width, height, renderState, interactive = false, onPointerUp }: CanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    renderCanvas(ctx, renderState)
  }, [width, height, renderState])

  return (
    <canvas
      ref={canvasRef}
      className="canvas-overlay"
      width={width}
      height={height}
      style={interactive ? { pointerEvents: 'auto' } : undefined}
      onPointerUp={onPointerUp}
    />
  )
}
