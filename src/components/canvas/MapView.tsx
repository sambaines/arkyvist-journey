import { useRef, useState, useMemo } from 'react'
import type { MapImage, Scale, AppMode, Route, AppAction, SpeedSettings } from '../../types'
import type { CalibrationPoint } from './renderCanvas'
import { twoPointCalibration } from '../../lib/calculations'
import { useMapTransform } from '../../hooks/useMapTransform'
import { useCanvasInteraction } from '../../hooks/useCanvasInteraction'
import CanvasOverlay from './CanvasOverlay'
import ZoomControls from '../ui/ZoomControls'
import ControlPanel from '../ui/ControlPanel'
import WaypointContextMenu from '../ui/WaypointContextMenu'
import TerrainPicker from '../ui/TerrainPicker'
import './MapView.css'

interface MapViewProps {
  map: MapImage
  scale: Scale
  routes: Route[]
  activeRouteId: string
  speedSettings: SpeedSettings
  dispatch: React.Dispatch<AppAction>
  onClear: () => void
  onScaleChanged: (scale: Scale) => void
  onExportSession: () => void
  onCopyShareLink: () => Promise<void>
}

export default function MapView({ map, scale, routes, activeRouteId, speedSettings, dispatch, onScaleChanged, onExportSession, onCopyShareLink }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPanMode, setIsPanMode] = useState(true)
  const [mode, setMode] = useState<AppMode>('default')
  const [calibrationPoints, setCalibrationPoints] = useState<CalibrationPoint[]>([])

  const { transform, canZoomIn, canZoomOut, zoomIn, zoomOut, resetView, handlers } = useMapTransform(
    map.width,
    map.height,
    containerRef,
  )

  // ── Derived mode flags ───────────────────────────────────────────────────
  const isCalibrating = mode === 'calibrating'
  const isPanning = isPanMode && !isCalibrating
  const isWaypointMode = !isPanMode && !isCalibrating

  // ── Calibration handlers ─────────────────────────────────────────────────
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

  function handleCalibrationPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (calibrationPoints.length >= 2) return
    const x = (e.clientX - transform.x) / transform.zoom
    const y = (e.clientY - transform.y) / transform.zoom
    setCalibrationPoints(pts => [...pts, { x, y }])
  }

  // ── Waypoint interaction ─────────────────────────────────────────────────
  const { canvasHandlers: waypointHandlers, contextMenu, closeContextMenu, terrainMenu, closeTerrainMenu } = useCanvasInteraction({
    routes,
    activeRouteId,
    transform,
    dispatch,
    enabled: isWaypointMode,
  })

  // Canvas handlers are mode-dependent
  const activeCanvasHandlers = isCalibrating
    ? { onPointerUp: handleCalibrationPointerUp }
    : isWaypointMode
    ? waypointHandlers
    : {}

  // ── Render state (memoized to avoid spurious canvas redraws) ─────────────
  const renderState = useMemo(() => ({
    calibrationPoints,
    routes,
    activeRouteId,
    transform,
  }), [calibrationPoints, routes, activeRouteId, transform])

  // ── CSS class ────────────────────────────────────────────────────────────
  let mapViewClass = 'map-view'
  if (isCalibrating) mapViewClass += ' map-view--calibrating'
  else if (!isPanning) mapViewClass += ' map-view--no-pan'

  const cssTransform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`

  return (
    <div
      ref={containerRef}
      className={mapViewClass}
      {...(isPanning ? handlers : {})}
    >
      <div className="map-view__content" style={{ transform: cssTransform }}>
        <img
          className="map-view__image"
          src={map.objectUrl}
          width={map.width}
          height={map.height}
          alt={map.filename}
          draggable={false}
        />
      </div>
      <CanvasOverlay
        renderState={renderState}
        interactive={isCalibrating || !isPanMode}
        handlers={activeCanvasHandlers}
      />

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
        routes={routes}
        activeRouteId={activeRouteId}
        speedSettings={speedSettings}
        dispatch={dispatch}
        onEnterCalibration={handleEnterCalibration}
        onCancelCalibration={handleCancelCalibration}
        onConfirmCalibration={handleConfirmCalibration}
        onManualCalibration={(pixels, distance) =>
          onScaleChanged({ ...scale, pixelsPerUnit: pixels / distance })
        }
        onUnitChanged={(unit, customUnitLabel) =>
          onScaleChanged({ ...scale, unit, customUnitLabel })
        }
        onExportSession={onExportSession}
        onCopyShareLink={onCopyShareLink}
      />

      {contextMenu && (
        <WaypointContextMenu
          screenX={contextMenu.screenX}
          screenY={contextMenu.screenY}
          waypointId={contextMenu.waypointId}
          isLastWaypoint={contextMenu.isLastWaypoint}
          onDelete={() => dispatch({ type: 'DELETE_WAYPOINT', waypointId: contextMenu.waypointId })}
          onClose={closeContextMenu}
        />
      )}

      {terrainMenu && (
        <TerrainPicker
          screenX={terrainMenu.screenX}
          screenY={terrainMenu.screenY}
          currentTerrain={terrainMenu.currentTerrain}
          onSelect={terrain => dispatch({ type: 'SET_SEGMENT_TERRAIN', waypointId: terrainMenu.waypointId, terrain })}
          onClose={closeTerrainMenu}
        />
      )}
    </div>
  )
}
