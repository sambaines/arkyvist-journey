import { useReducer } from 'react'
import type { AppState, AppAction, MapImage } from './types'
import EmptyState from './components/ui/EmptyState'
import MapView from './components/canvas/MapView'

const initialState: AppState = {
  status: 'empty',
  map: null,
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'MAP_LOADED':
      return { status: 'loaded', map: action.map }
    case 'SESSION_CLEARED': {
      if (state.map) URL.revokeObjectURL(state.map.objectUrl)
      return { ...initialState }
    }
    default:
      return state
  }
}

export default function App() {
  const [state, dispatch] = useReducer(appReducer, initialState)

  function handleMapLoaded(map: MapImage) {
    dispatch({ type: 'MAP_LOADED', map })
  }

  if (state.status === 'loaded' && state.map) {
    return (
      <MapView
        map={state.map}
        onClear={() => dispatch({ type: 'SESSION_CLEARED' })}
      />
    )
  }

  return <EmptyState onMapLoaded={handleMapLoaded} />
}
