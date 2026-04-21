import { useRef, useEffect } from 'react'
import { renderCanvas } from './renderCanvas'
import type { CanvasRenderState } from './renderCanvas'
import './CanvasOverlay.css'

type CanvasHandlers = Pick<
  React.CanvasHTMLAttributes<HTMLCanvasElement>,
  'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onContextMenu'
>

interface CanvasOverlayProps {
  renderState: CanvasRenderState
  interactive?: boolean
  handlers?: CanvasHandlers
}

export default function CanvasOverlay({
  renderState,
  interactive = false,
  handlers,
}: CanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Keep canvas buffer sized to container × devicePixelRatio for crisp rendering
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver(entries => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
    })
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rafId = requestAnimationFrame(() => renderCanvas(ctx, renderState))
    return () => cancelAnimationFrame(rafId)
  }, [renderState])

  return (
    <canvas
      ref={canvasRef}
      className="canvas-overlay"
      style={interactive ? { pointerEvents: 'auto' } : undefined}
      {...handlers}
    />
  )
}
