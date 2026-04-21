import { useRef, useState, type DragEvent, type ChangeEvent } from 'react'
import type { MapImage } from '../../types'
import { useMapUpload } from '../../hooks/useMapUpload'
import './EmptyState.css'

interface EmptyStateProps {
  onMapLoaded: (map: MapImage) => void
}

export default function EmptyState({ onMapLoaded }: EmptyStateProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const jsonInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const { handleFile, error, warning, pendingFile, confirmLargeFile, reset } = useMapUpload(onMapLoaded)

  function handleDragOver(e: DragEvent) {
    e.preventDefault()
    setIsDragOver(true)
  }

  function handleDragLeave() {
    setIsDragOver(false)
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  function handleZoneClick() {
    if (warning) return
    reset()
    fileInputRef.current?.click()
  }

  const hasStatus = !!(error || warning)

  return (
    <div className="empty-state">
      <header className="empty-state__header">
        <span className="empty-state__wordmark">Arkyvist</span>
        <h1 className="empty-state__title">Journey Planner</h1>
        <p className="empty-state__subtitle">Plan routes across any custom map</p>
      </header>

      <main className="empty-state__main">
        <div
          className={[
            'upload-zone',
            isDragOver && 'upload-zone--dragover',
            error && 'upload-zone--error',
            warning && 'upload-zone--warning',
          ].filter(Boolean).join(' ')}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleZoneClick}
          role="button"
          tabIndex={0}
          aria-label="Upload map image"
          onKeyDown={(e) => e.key === 'Enter' && handleZoneClick()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={handleInputChange}
            style={{ display: 'none' }}
            aria-hidden="true"
          />

          {!hasStatus && (
            <>
              <div className="upload-zone__icon" aria-hidden="true">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className="upload-zone__prompt">Drop your map here</p>
              <button
                className="upload-zone__browse"
                type="button"
                onClick={(e) => { e.stopPropagation(); reset(); fileInputRef.current?.click() }}
              >
                Browse files
              </button>
              <p className="upload-zone__types">PNG · JPG · WebP · SVG</p>
            </>
          )}

          {error && (
            <div className="upload-zone__feedback">
              <p className="upload-zone__feedback-msg">{error}</p>
              <button
                className="upload-zone__feedback-btn upload-zone__feedback-btn--primary"
                type="button"
                onClick={(e) => { e.stopPropagation(); reset(); fileInputRef.current?.click() }}
              >
                Try again
              </button>
            </div>
          )}

          {warning && pendingFile && (
            <div className="upload-zone__feedback">
              <p className="upload-zone__feedback-msg">{warning}</p>
              <div className="upload-zone__feedback-actions">
                <button
                  className="upload-zone__feedback-btn upload-zone__feedback-btn--primary"
                  type="button"
                  onClick={(e) => { e.stopPropagation(); confirmLargeFile() }}
                >
                  Continue anyway
                </button>
                <button
                  className="upload-zone__feedback-btn upload-zone__feedback-btn--ghost"
                  type="button"
                  onClick={(e) => { e.stopPropagation(); reset() }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="empty-state__import">
          <span className="empty-state__import-or">or</span>
          <button
            className="empty-state__import-btn"
            type="button"
            onClick={() => jsonInputRef.current?.click()}
          >
            Import a saved session (.json)
          </button>
          <input
            ref={jsonInputRef}
            type="file"
            accept=".json,application/json"
            onChange={() => {/* JSON import — future task */}}
            style={{ display: 'none' }}
            aria-hidden="true"
          />
        </div>
      </main>
    </div>
  )
}
