import { useState, useEffect } from 'react'
import './WaypointContextMenu.css'

interface WaypointContextMenuProps {
  screenX: number
  screenY: number
  waypointId: string
  isLastWaypoint: boolean
  onDelete: () => void
  onClose: () => void
}

export default function WaypointContextMenu({
  screenX,
  screenY,
  isLastWaypoint,
  onDelete,
  onClose,
}: WaypointContextMenuProps) {
  const [confirmingLastDelete, setConfirmingLastDelete] = useState(false)

  // Close on any outside pointer event
  useEffect(() => {
    const handler = () => onClose()
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [onClose])

  function handleDelete() {
    if (isLastWaypoint && !confirmingLastDelete) {
      setConfirmingLastDelete(true)
      return
    }
    onDelete()
    onClose()
  }

  // Nudge menu left/up if it would overflow the viewport
  const menuW = 180
  const menuH = confirmingLastDelete ? 130 : 100
  const x = screenX + menuW > window.innerWidth ? screenX - menuW : screenX
  const y = screenY + menuH > window.innerHeight ? screenY - menuH : screenY

  return (
    <div
      className="waypoint-ctx-menu"
      style={{ left: x, top: y }}
      onPointerDown={e => e.stopPropagation()}
    >
      {confirmingLastDelete ? (
        <>
          <p className="waypoint-ctx-menu__confirm-text">
            Remove the last waypoint on this route?
          </p>
          <button
            className="waypoint-ctx-menu__item waypoint-ctx-menu__item--danger"
            type="button"
            onClick={handleDelete}
          >
            Yes, remove it
          </button>
          <button
            className="waypoint-ctx-menu__item"
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <button
            className="waypoint-ctx-menu__item waypoint-ctx-menu__item--danger"
            type="button"
            onClick={handleDelete}
          >
            Delete waypoint
          </button>
          <div className="waypoint-ctx-menu__divider" />
          <button className="waypoint-ctx-menu__item waypoint-ctx-menu__item--disabled" type="button" disabled>
            Insert before (V2)
          </button>
          <button className="waypoint-ctx-menu__item waypoint-ctx-menu__item--disabled" type="button" disabled>
            Insert after (V2)
          </button>
        </>
      )}
    </div>
  )
}
