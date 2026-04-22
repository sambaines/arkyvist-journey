import { useEffect } from 'react'
import type { Terrain } from '../../types'
import { TERRAIN_INFO } from '../../lib/constants'
import './TerrainPicker.css'

const TERRAIN_ORDER: Terrain[] = [
  'road', 'open', 'forest', 'mountains', 'marsh', 'water-river', 'water-open',
]

export interface TerrainPickerProps {
  screenX: number
  screenY: number
  currentTerrain: Terrain
  onSelect: (terrain: Terrain) => void
  onClose: () => void
}

export default function TerrainPicker({ screenX, screenY, currentTerrain, onSelect, onClose }: TerrainPickerProps) {
  useEffect(() => {
    const handler = () => onClose()
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [onClose])

  // Nudge left/up if it would overflow the viewport
  const menuW = 200
  const menuH = TERRAIN_ORDER.length * 34 + 28
  const x = screenX + menuW > window.innerWidth ? screenX - menuW : screenX
  const y = screenY + menuH > window.innerHeight ? screenY - menuH : screenY

  return (
    <div
      className="terrain-picker"
      style={{ left: x, top: y }}
      onPointerDown={e => e.stopPropagation()}
    >
      <p className="terrain-picker__title">Segment terrain</p>
      {TERRAIN_ORDER.map(terrain => (
        <button
          key={terrain}
          className={`terrain-picker__item${terrain === currentTerrain ? ' terrain-picker__item--active' : ''}`}
          type="button"
          onClick={() => { onSelect(terrain); onClose() }}
        >
          <span
            className="terrain-picker__dot"
            style={{ background: TERRAIN_INFO[terrain].colour }}
          />
          {TERRAIN_INFO[terrain].label}
        </button>
      ))}
    </div>
  )
}
