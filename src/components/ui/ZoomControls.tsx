import './ZoomControls.css'

interface ZoomControlsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  canZoomIn: boolean
  canZoomOut: boolean
  isPanMode: boolean
  onTogglePan: () => void
}

export default function ZoomControls({
  onZoomIn,
  onZoomOut,
  onReset,
  canZoomIn,
  canZoomOut,
  isPanMode,
  onTogglePan,
}: ZoomControlsProps) {
  return (
    // stopPropagation prevents pointer events bubbling to the map-view pan handler
    <div
      className="zoom-controls"
      role="group"
      aria-label="Map controls"
      onPointerDown={e => e.stopPropagation()}
    >
      <button
        className="zoom-btn"
        type="button"
        onClick={onZoomIn}
        disabled={!canZoomIn}
        data-tooltip="Zoom in"
        aria-label="Zoom in"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="11" y1="8" x2="11" y2="14" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      </button>

      <div className="zoom-controls__divider" />

      <button
        className="zoom-btn"
        type="button"
        onClick={onZoomOut}
        disabled={!canZoomOut}
        data-tooltip="Zoom out"
        aria-label="Zoom out"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      </button>

      <div className="zoom-controls__divider" />

      <button
        className="zoom-btn"
        type="button"
        onClick={onReset}
        data-tooltip="Reset view"
        aria-label="Reset view"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      </button>

      <div className="zoom-controls__divider" />

      <button
        className={`zoom-btn${isPanMode ? ' zoom-btn--active' : ''}`}
        type="button"
        onClick={onTogglePan}
        data-tooltip={isPanMode ? 'Pan mode: on' : 'Pan mode: off'}
        aria-label="Toggle pan mode"
        aria-pressed={isPanMode}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="5 9 2 12 5 15" />
          <polyline points="9 5 12 2 15 5" />
          <polyline points="15 19 12 22 9 19" />
          <polyline points="19 9 22 12 19 15" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <line x1="12" y1="2" x2="12" y2="22" />
        </svg>
      </button>
    </div>
  )
}
