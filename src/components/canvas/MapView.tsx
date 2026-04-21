import { useRef, useState } from 'react'
import type { MapImage, Scale, AppMode } from '../../types'
import type { CalibrationPoint } from './renderCanvas'
import { twoPointCalibration } from '../../lib/calculations'
import { useMapTransform } from '../../hooks/useMapTransform'
import CanvasOverlay from './CanvasOverlay'
import ZoomControls from '../ui/ZoomControls'
import ControlPanel from '../ui/ControlPanel'
import './MapView.css'

interface MapViewProps {
  map: MapImage
  scale: Scale
  onClear: () => void
  onScaleChanged: (scale: Scale) => void
}

export default function MapView({ map, scale, onScaleChanged }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPanMode, setIsPanMode] = useState(true)
  const [mode, setMode] = useState<AppMode>('default')
  const [calibrationPoints, setCalibrationPoints] = useState<CalibrationPoint[]>([])

  const { transform, canZoomIn, canZoomOut, zoomIn, zoomOut, resetView, handlers } = useMapTransform(
    map.width,
    map.height,
    containerRef,
  )

  const cssTransform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`

  // Pan is only active in default mode when pan toggle is on
  const isPanning = isPanMode && mode === 'default'
  const isCalibrating = mode === 'calibrating'

  function handleEnterCalibration() {
    setCalibrationPoints([])
    setMode('calibrating')
  }

  function handleCancelCalibration() {
    setCalibrationPoints([])
    setMode('default')
  }

  function handleConfirmCalibration(distance: number) {
    if (calibrationPoints.length !== 2) return
    const pixelsPerUnit = twoPointCalibration(calibrationPoints[0], calibrationPoints[1], distance)
    onScaleChanged({ ...scale, pixelsPerUnit })
    setCalibrationPoints([])
    setMode('default')
  }

  function handleCanvasClick(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isCalibrating || calibrationPoints.length >= 2) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / transform.zoom
    const y = (e.clientY - rect.top) / transform.zoom
    setCalibrationPoints(pts => [...pts, { x, y }])
  }

  let mapViewClass = 'map-view'
  if (isCalibrating) mapViewClass += ' map-view--calibrating'
  else if (!isPanning) mapViewClass += ' map-view--no-pan'

  return (
    <div
      ref={containerRef}
      className={mapViewClass}
      {...(isPanning ? handlers : {})}
    >
      <div
        className="map-view__content"
        style={{ transform: cssTransform }}
      >
        <img
          className="map-view__image"
          src={map.objectUrl}
          width={map.width}
          height={map.height}
          alt={map.filename}
          draggable={false}
        />
        <CanvasOverlay
          width={map.width}
          height={map.height}
          renderState={{ calibrationPoints }}
          interactive={isCalibrating}
          onPointerUp={isCalibrating ? handleCanvasClick : undefined}
        />
      </div>

      <ZoomControls
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onReset={resetView}
        canZoomIn={canZoomIn}
        canZoomOut={canZoomOut}
        isPanMode={isPanMode}
        onTogglePan={() => setIsPanMode(p => !p)}
      />

      <ControlPanel
        scale={scale}
        mode={mode}
        calibrationPoints={calibrationPoints}
        onEnterCalibration={handleEnterCalibration}
        onCancelCalibration={handleCancelCalibration}
        onConfirmCalibration={handleConfirmCalibration}
        onManualCalibration={(pixels, distance) =>
          onScaleChanged({ ...scale, pixelsPerUnit: pixels / distance })
        }
        onUnitChanged={(unit, customUnitLabel) =>
          onScaleChanged({ ...scale, unit, customUnitLabel })
        }
      />
    </div>
  )
}
