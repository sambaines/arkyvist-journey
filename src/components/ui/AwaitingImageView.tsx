import { useRef, type DragEvent } from 'react'
import type { Scale, Route, AppAction, SpeedSettings, MapImage } from '../../types'
import { useMapUpload } from '../../hooks/useMapUpload'
import ControlPanel from './ControlPanel'
import './AwaitingImageView.css'

interface AwaitingImageViewProps {
  expectedFilename: string
  scale: Scale
  routes: Route[]
  activeRouteId: string
  speedSettings: SpeedSettings
  dispatch: React.Dispatch<AppAction>
  onScaleChanged: (scale: Scale) => void
  onExportSession: () => void
  onCopyShareLink: () => Promise<void>
}

export default function AwaitingImageView({
  expectedFilename,
  scale,
  routes,
  activeRouteId,
  speedSettings,
  dispatch,
  onScaleChanged,
  onExportSession,
  onCopyShareLink,
}: AwaitingImageViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleMapLoaded(map: MapImage) {
    dispatch({ type: 'MAP_LOADED', map })
  }

  const { handleFile } = useMapUpload(handleMapLoaded)

  function handleDragOver(e: DragEvent) {
    e.preventDefault()
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  return (
    <div
      className="awaiting-image-view"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="awaiting-image__center">
        <div className="awaiting-image__icon" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>

        <h2 className="awaiting-image__title">Upload your map to continue</h2>

        <p className="awaiting-image__hint">
          This session requires the map image:
        </p>
        <p className="awaiting-image__filename">{expectedFilename}</p>

        <button
          className="awaiting-image__browse"
          type="button"
          onClick={() => fileInputRef.current?.click()}
        >
          Browse files
        </button>

        <p className="awaiting-image__types">PNG · JPG · WebP · SVG</p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={handleInputChange}
          style={{ display: 'none' }}
          aria-hidden="true"
        />
      </div>

      <ControlPanel
        scale={scale}
        mode="default"
        calibrationPoints={[]}
        routes={routes}
        activeRouteId={activeRouteId}
        speedSettings={speedSettings}
        dispatch={dispatch}
        showCalibration={false}
        onEnterCalibration={() => {}}
        onCancelCalibration={() => {}}
        onConfirmCalibration={() => {}}
        onManualCalibration={() => {}}
        onUnitChanged={(unit, customUnitLabel) => onScaleChanged({ ...scale, unit, customUnitLabel })}
        onExportSession={onExportSession}
        onCopyShareLink={onCopyShareLink}
      />
    </div>
  )
}
