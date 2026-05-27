import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      reg.onupdatefound = () => {
        const newWorker = reg.installing
        newWorker.onstatechange = () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            if (confirm('系統有新版本，是否立即更新？')) {
              newWorker.postMessage({ type: 'SKIP_WAITING' })
              window.location.reload()
            }
          }
        }
      }
    })
  })
}
