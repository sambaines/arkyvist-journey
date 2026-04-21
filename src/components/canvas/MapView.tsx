import { useRef } from 'react'
import type { MapImage } from '../../types'
import { useMapTransform } from '../../hooks/useMapTransform'
import CanvasOverlay from './CanvasOverlay'
import './MapView.css'

interface MapViewProps {
  map: MapImage
  onClear: () => void
}

export default function MapView({ map }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { transform, handlers } = useMapTransform(map.width, map.height, containerRef)

  const cssTransform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`

  return (
    <div
      ref={containerRef}
      className="map-view"
      {...handlers}
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
        <CanvasOverlay width={map.width} height={map.height} />
      </div>
    </div>
  )
}
