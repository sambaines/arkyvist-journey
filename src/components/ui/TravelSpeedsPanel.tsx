import type { SpeedSettings, TravelMode, Scale, AppAction } from '../../types'
import './TravelSpeedsPanel.css'

function unitLabel(scale: Scale): string {
  if (scale.unit === 'custom') return scale.customUnitLabel || 'units'
  const labels: Record<string, string> = {
    miles: 'miles', km: 'km', leagues: 'leagues',
    'nautical-miles': 'nmi', hexes: 'hexes',
  }
  return labels[scale.unit] ?? scale.unit
}

interface SpeedRowProps {
  mode: TravelMode
  unit: string
  dispatch: React.Dispatch<AppAction>
}

function SpeedRow({ mode, unit, dispatch }: SpeedRowProps) {
  return (
    <div className="speed-row">
      <span className="speed-row__label">{mode.label}</span>
      <input
        className="speed-row__input"
        type="number"
        min="0.1"
        step="1"
        value={mode.baseSpeedPerDay}
        onChange={e => {
          const val = parseFloat(e.target.value)
          if (val > 0) dispatch({ type: 'SET_TRAVEL_SPEED', modeId: mode.id, speedPerDay: val })
        }}
      />
      <span className="speed-row__unit">{unit}/day</span>
    </div>
  )
}

interface TravelSpeedsPanelProps {
  speedSettings: SpeedSettings
  scale: Scale
  dispatch: React.Dispatch<AppAction>
}

export default function TravelSpeedsPanel({ speedSettings, scale, dispatch }: TravelSpeedsPanelProps) {
  const unit = unitLabel(scale)
  const land = speedSettings.modes.filter(m => m.category === 'land')
  const water = speedSettings.modes.filter(m => m.category === 'water')

  return (
    <div className="travel-speeds">
      <div className="travel-speeds__section">
        <span className="travel-speeds__section-label">Land</span>
        {land.map(mode => (
          <SpeedRow key={mode.id} mode={mode} unit={unit} dispatch={dispatch} />
        ))}
        <button
          className="travel-speeds__reset"
          type="button"
          onClick={() => dispatch({ type: 'RESET_TRAVEL_SPEEDS', category: 'land' })}
        >
          Reset to defaults
        </button>
      </div>

      <div className="travel-speeds__section">
        <span className="travel-speeds__section-label">Water</span>
        {water.map(mode => (
          <SpeedRow key={mode.id} mode={mode} unit={unit} dispatch={dispatch} />
        ))}
        <button
          className="travel-speeds__reset"
          type="button"
          onClick={() => dispatch({ type: 'RESET_TRAVEL_SPEEDS', category: 'water' })}
        >
          Reset to defaults
        </button>
      </div>
    </div>
  )
}
