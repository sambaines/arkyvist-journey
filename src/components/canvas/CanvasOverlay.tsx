import { useRef, useEffect } from 'react'
import './CanvasOverlay.css'

interface CanvasOverlayProps {
  width: number
  height: number
}

export default function CanvasOverlay({ width, height }: CanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, width, height)
  }, [width, height])

  return (
    <canvas
      ref={canvasRef}
      className="canvas-overlay"
      width={width}
      height={height}
    />
  )
}
