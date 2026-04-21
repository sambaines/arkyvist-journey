import { useState } from 'react'
import type { Scale, DistanceUnit, AppMode, Route, AppAction } from '../../types'
import type { CalibrationPoint } from '../canvas/renderCanvas'
import RoutePanel from './RoutePanel'
import './ControlPanel.css'

const UNIT_OPTIONS: { value: DistanceUnit; label: string }[] = [
  { value: 'miles',          label: 'Miles' },
  { value: 'km',             label: 'Kilometres' },
  { value: 'leagues',        label: 'Leagues' },
  { value: 'nautical-miles', label: 'Nautical Miles' },
  { value: 'hexes',          label: 'Hexes' },
  { value: 'custom',         label: 'Custom…' },
]

function unitLabel(scale: Scale): string {
  if (scale.unit === 'custom') return scale.customUnitLabel || 'units'
  return UNIT_OPTIONS.find(o => o.value === scale.unit)?.label.toLowerCase() ?? scale.unit
}

interface ControlPanelProps {
  scale: Scale
  mode: AppMode
  calibrationPoints: CalibrationPoint[]
  routes: Route[]
  activeRouteId: string
  dispatch: React.Dispatch<AppAction>
  onEnterCalibration: () => void
  onCancelCalibration: () => void
  onConfirmCalibration: (distance: number) => void
  onManualCalibration: (pixels: number, distance: number) => void
  onUnitChanged: (unit: DistanceUnit, customUnitLabel?: string) => void
}

export default function ControlPanel({
  scale,
  mode,
  calibrationPoints,
  routes,
  activeRouteId,
  dispatch,
  onEnterCalibration,
  onCancelCalibration,
  onConfirmCalibration,
  onManualCalibration,
  onUnitChanged,
}: ControlPanelProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Unit selector state
  const [customLabel, setCustomLabel] = useState(scale.customUnitLabel ?? '')

  // Calibration confirmation input
  const [calibrationDistance, setCalibrationDistance] = useState('')

  // Manual fallback inputs
  const [manualPixels, setManualPixels] = useState('')
  const [manualDistance, setManualDistance] = useState('')

  const isCalibrating = mode === 'calibrating'
  const isCalibrated = scale.pixelsPerUnit > 0

  const manualPixelsNum = parseFloat(manualPixels)
  const manualDistanceNum = parseFloat(manualDistance)
  const manualValid = manualPixelsNum > 0 && manualDistanceNum > 0
  const manualRatio = manualValid ? manualPixelsNum / manualDistanceNum : null

  const calibrationDistanceNum = parseFloat(calibrationDistance)
  const calibrationDistanceValid = calibrationDistanceNum > 0

  function handleUnitChange(value: DistanceUnit) {
    if (value === 'custom') {
      onUnitChanged('custom', customLabel || undefined)
    } else {
      onUnitChanged(value)
    }
  }

  function handleCustomLabelBlur() {
    onUnitChanged('custom', customLabel || undefined)
  }

  return (
    // stopPropagation prevents pointer events bubbling to the map-view pan/calibration handlers
    <div
      className={`control-panel${isOpen ? ' control-panel--open' : ''}`}
      onPointerDown={e => e.stopPropagation()}
    >
      {/* Mobile handle — hidden on desktop */}
      <button
        className="control-panel__handle"
        type="button"
        onClick={() => setIsOpen(p => !p)}
        aria-label={isOpen ? 'Collapse panel' : 'Expand panel'}
        aria-expanded={isOpen}
      >
        <div className="control-panel__handle-bar" />
      </button>

      <div className="control-panel__body">

        {/* ── Routes (ARK-MAP-20 + ARK-MAP-21) ──────────────────────────── */}
        <section className="panel-section">
          <h3 className="panel-section__label">Routes</h3>
          <RoutePanel
            routes={routes}
            activeRouteId={activeRouteId}
            scale={scale}
            dispatch={dispatch}
          />
        </section>

        <div className="panel-divider" />

        {/* ── Unit selector (ARK-MAP-17) ─────────────────────────────────── */}
        <section className="panel-section">
          <h3 className="panel-section__label">Unit</h3>
          <select
            className="panel-select"
            value={scale.unit}
            onChange={e => handleUnitChange(e.target.value as DistanceUnit)}
          >
            {UNIT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {scale.unit === 'custom' && (
            <input
              className="panel-input"
              type="text"
              placeholder="Unit name (e.g. days march)"
              value={customLabel}
              onChange={e => setCustomLabel(e.target.value)}
              onBlur={handleCustomLabelBlur}
            />
          )}
        </section>

        <div className="panel-divider" />

        {/* ── Scale / Calibration (ARK-MAP-15 + ARK-MAP-16) ─────────────── */}
        <section className="panel-section">
          <h3 className="panel-section__label">Scale</h3>

          {/* Status indicator */}
          <p className={`panel-scale-status ${isCalibrated ? 'panel-scale-status--set' : ''}`}>
            {isCalibrated
              ? `1 px = ${(1 / scale.pixelsPerUnit).toLocaleString(undefined, { maximumSignificantDigits: 4 })} ${unitLabel(scale)}`
              : 'Not set'}
          </p>

          {isCalibrating ? (
            /* Calibration in-progress UI */
            <div className="panel-calibration">
              <p className="panel-calibration__instruction">
                Click two points on the map that represent a known distance.
              </p>
              <div className="panel-calibration__points">
                <span className={`panel-calibration__dot ${calibrationPoints.length >= 1 ? 'panel-calibration__dot--placed' : ''}`} />
                <span className="panel-calibration__point-label">Point 1</span>
                <span className={`panel-calibration__dot ${calibrationPoints.length >= 2 ? 'panel-calibration__dot--placed' : ''}`} />
                <span className="panel-calibration__point-label">Point 2</span>
              </div>

              {calibrationPoints.length === 2 && (
                <div className="panel-calibration__confirm">
                  <label className="panel-label">Distance between points</label>
                  <div className="panel-row">
                    <input
                      className="panel-input panel-input--sm"
                      type="number"
                      min="0.001"
                      step="any"
                      placeholder="0"
                      value={calibrationDistance}
                      onChange={e => setCalibrationDistance(e.target.value)}
                      autoFocus
                    />
                    <span className="panel-unit-tag">{unitLabel(scale)}</span>
                  </div>
                  <button
                    className="panel-btn panel-btn--primary"
                    type="button"
                    disabled={!calibrationDistanceValid}
                    onClick={() => {
                      onConfirmCalibration(calibrationDistanceNum)
                      setCalibrationDistance('')
                    }}
                  >
                    Confirm
                  </button>
                </div>
              )}

              <button
                className="panel-btn panel-btn--ghost"
                type="button"
                onClick={onCancelCalibration}
              >
                Cancel calibration
              </button>
            </div>
          ) : (
            <>
              {/* Two-point calibration trigger */}
              <button
                className="panel-btn panel-btn--secondary"
                type="button"
                onClick={onEnterCalibration}
              >
                {isCalibrated ? 'Re-calibrate scale' : 'Calibrate scale'}
              </button>

              {/* Manual fallback (ARK-MAP-16) */}
              <div className="panel-manual">
                <label className="panel-label">Or set manually</label>
                <div className="panel-row panel-row--manual">
                  <input
                    className="panel-input panel-input--sm"
                    type="number"
                    min="0.001"
                    step="any"
                    placeholder="px"
                    value={manualPixels}
                    onChange={e => setManualPixels(e.target.value)}
                  />
                  <span className="panel-unit-tag">px =</span>
                  <input
                    className="panel-input panel-input--sm"
                    type="number"
                    min="0.001"
                    step="any"
                    placeholder="dist"
                    value={manualDistance}
                    onChange={e => setManualDistance(e.target.value)}
                  />
                  <span className="panel-unit-tag">{unitLabel(scale)}</span>
                </div>
                {manualRatio !== null && (
                  <p className="panel-manual__preview">
                    1 px = {(1 / manualRatio).toLocaleString(undefined, { maximumSignificantDigits: 4 })} {unitLabel(scale)}
                  </p>
                )}
                <button
                  className="panel-btn panel-btn--secondary"
                  type="button"
                  disabled={!manualValid}
                  onClick={() => {
                    onManualCalibration(manualPixelsNum, manualDistanceNum)
                    setManualPixels('')
                    setManualDistance('')
                  }}
                >
                  Set scale
                </button>
              </div>
            </>
          )}
        </section>

      </div>
    </div>
  )
}
