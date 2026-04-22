import { useState, useRef } from 'react'
import type { Route, Scale, AppAction, SpeedSettings } from '../../types'
import { routeTotalDistance, travelTimeForRoute } from '../../lib/calculations'
import { TERRAIN_MODIFIERS } from '../../lib/constants'
import './RoutePanel.css'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function unitLabel(scale: Scale): string {
  if (scale.unit === 'custom') return scale.customUnitLabel || 'units'
  const labels: Record<string, string> = {
    miles: 'miles', km: 'km', leagues: 'leagues',
    'nautical-miles': 'nautical miles', hexes: 'hexes',
  }
  return labels[scale.unit] ?? scale.unit
}

function formatDistance(route: Route, scale: Scale): string {
  if (scale.pixelsPerUnit === 0) return '— set scale to calculate'
  if (route.waypoints.length < 2) return '— add waypoints'
  const dist = routeTotalDistance(route, scale)
  const formatted = dist >= 10 ? dist.toFixed(1) : dist.toFixed(2)
  return `${formatted} ${unitLabel(scale)}`
}

function formatTravelTime(days: number, hours: number): string {
  if (days === 0 && hours === 0) return '< 1 hr'
  if (days === 0) return `${hours} hr${hours !== 1 ? 's' : ''}`
  if (hours === 0) return `${days} day${days !== 1 ? 's' : ''}`
  return `${days}d ${hours}h`
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

// ─── Travel times sub-section ─────────────────────────────────────────────────

interface TravelTimesProps {
  route: Route
  scale: Scale
  speedSettings: SpeedSettings
}

function TravelTimes({ route, scale, speedSettings }: TravelTimesProps) {
  const [open, setOpen] = useState(false)

  const noScale = scale.pixelsPerUnit === 0
  const noWaypoints = route.waypoints.length < 2

  return (
    <div className="travel-times">
      <button
        className={`travel-times__toggle${open ? ' travel-times__toggle--open' : ''}`}
        type="button"
        onClick={() => setOpen(o => !o)}
      >
        <span>Travel times</span>
        <ChevronDownIcon />
      </button>

      {open && (
        <div className="travel-times__body">
          {noScale ? (
            <p className="travel-times__hint">— set scale to calculate</p>
          ) : noWaypoints ? (
            <p className="travel-times__hint">— add waypoints</p>
          ) : (
            <>
              {(['land', 'water'] as const).map(category => {
                const modes = speedSettings.modes.filter(m => m.category === category)
                return (
                  <div key={category} className="travel-times__group">
                    <span className="travel-times__group-label">{category === 'land' ? 'Land' : 'Water'}</span>
                    {modes.map(mode => {
                      const result = travelTimeForRoute(route, scale, mode, TERRAIN_MODIFIERS)
                      let display: string
                      if (result === null) {
                        display = mode.category === 'land' ? 'N/A — water crossing' : 'N/A — land route'
                      } else {
                        display = formatTravelTime(result.days, result.hours)
                      }
                      return (
                        <div key={mode.id} className="travel-times__row">
                          <span className="travel-times__mode">{mode.label}</span>
                          <span className={`travel-times__value${result === null ? ' travel-times__value--na' : ''}`}>
                            {display}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface RoutePanelProps {
  routes: Route[]
  activeRouteId: string
  scale: Scale
  speedSettings: SpeedSettings
  dispatch: React.Dispatch<AppAction>
}

export default function RoutePanel({ routes, activeRouteId, scale, speedSettings, dispatch }: RoutePanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const colourInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  function startEditing(route: Route) {
    setEditingId(route.id)
    setEditingName(route.name)
    setConfirmDeleteId(null)
  }

  function commitEdit(routeId: string) {
    if (editingName.trim()) {
      dispatch({ type: 'RENAME_ROUTE', routeId, name: editingName.trim() })
    }
    setEditingId(null)
  }

  function handleDelete(route: Route) {
    if (route.waypoints.length === 0 || confirmDeleteId === route.id) {
      dispatch({ type: 'DELETE_ROUTE', routeId: route.id })
      setConfirmDeleteId(null)
    } else {
      setConfirmDeleteId(route.id)
    }
  }

  return (
    <div className="route-panel">
      {routes.length === 0 ? (
        <p className="route-panel__empty">No routes yet.</p>
      ) : (
        <ul className="route-list">
          {routes.map(route => {
            const isActive = route.id === activeRouteId
            const isEditing = editingId === route.id
            const isConfirmingDelete = confirmDeleteId === route.id

            return (
              <li
                key={route.id}
                className={`route-item${isActive ? ' route-item--active' : ''}`}
                onClick={() => {
                  if (editingId !== route.id) {
                    dispatch({ type: 'SET_ACTIVE_ROUTE', routeId: route.id })
                  }
                }}
              >
                {/* Colour swatch — clicking opens native colour picker */}
                <button
                  className="route-item__swatch"
                  type="button"
                  style={{ background: route.colour }}
                  aria-label="Change route colour"
                  onClick={e => {
                    e.stopPropagation()
                    colourInputRefs.current[route.id]?.click()
                  }}
                />
                <input
                  ref={el => { colourInputRefs.current[route.id] = el }}
                  type="color"
                  className="route-item__colour-input"
                  value={route.colour}
                  onChange={e => dispatch({ type: 'SET_ROUTE_COLOUR', routeId: route.id, colour: e.target.value })}
                  onClick={e => e.stopPropagation()}
                />

                {/* Name + distance + travel times */}
                <div
                  className="route-item__info"
                  onClick={e => e.stopPropagation()}
                >
                  {isEditing ? (
                    <input
                      className="route-item__name-input"
                      value={editingName}
                      autoFocus
                      onChange={e => setEditingName(e.target.value)}
                      onBlur={() => commitEdit(route.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitEdit(route.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                    />
                  ) : (
                    <span
                      className="route-item__name"
                      onDoubleClick={() => startEditing(route)}
                      title="Double-click to rename"
                    >
                      {route.name}
                    </span>
                  )}
                  <span className="route-item__distance">{formatDistance(route, scale)}</span>
                  {isActive && (
                    <TravelTimes route={route} scale={scale} speedSettings={speedSettings} />
                  )}
                </div>

                {/* Actions */}
                <div className="route-item__actions" onClick={e => e.stopPropagation()}>
                  <button
                    className="route-item__btn"
                    type="button"
                    onClick={() => dispatch({ type: 'TOGGLE_ROUTE_VISIBILITY', routeId: route.id })}
                    aria-label={route.visible ? 'Hide route' : 'Show route'}
                  >
                    {route.visible ? <EyeIcon /> : <EyeOffIcon />}
                  </button>

                  {isConfirmingDelete ? (
                    <>
                      <button
                        className="route-item__btn route-item__btn--confirm"
                        type="button"
                        onClick={() => handleDelete(route)}
                        aria-label="Confirm delete"
                      >
                        ✓
                      </button>
                      <button
                        className="route-item__btn"
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        aria-label="Cancel delete"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <button
                      className="route-item__btn route-item__btn--danger"
                      type="button"
                      onClick={() => handleDelete(route)}
                      aria-label="Delete route"
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <button
        className="panel-btn panel-btn--secondary"
        type="button"
        onClick={() => dispatch({ type: 'CREATE_ROUTE' })}
      >
        + Add route
      </button>
    </div>
  )
}
