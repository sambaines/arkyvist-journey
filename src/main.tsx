import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if (import.meta.env.DEV) {
  import('agentation').then(({ Agentation }) => {
    const el = document.createElement('div')
    el.id = 'agentation-root'
    document.body.appendChild(el)
    createRoot(el).render(<Agentation />)
  })
}
