import { useReducer } from 'react'
import type { AppState, AppAction, MapImage, Scale } from './types'
import EmptyState from './components/ui/EmptyState'
import MapView from './components/canvas/MapView'

const DEFAULT_SCALE: Scale = { pixelsPerUnit: 0, unit: 'miles' }

const initialState: AppState = {
  status: 'empty',
  map: null,
  scale: DEFAULT_SCALE,
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'MAP_LOADED':
      return { ...state, status: 'loaded', map: action.map }
    case 'SESSION_CLEARED': {
      if (state.map) URL.revokeObjectURL(state.map.objectUrl)
      return { ...initialState }
    }
    case 'SCALE_CHANGED':
      return { ...state, scale: action.scale }
    default:
      return state
  }
}

export default function App() {
  const [state, dispatch] = useReducer(appReducer, initialState)

  if (state.status === 'loaded' && state.map) {
    return (
      <MapView
        map={state.map}
        scale={state.scale}
        onClear={() => dispatch({ type: 'SESSION_CLEARED' })}
        onScaleChanged={scale => dispatch({ type: 'SCALE_CHANGED', scale })}
      />
    )
  }

  return <EmptyState onMapLoaded={(map: MapImage) => dispatch({ type: 'MAP_LOADED', map })} />
}
