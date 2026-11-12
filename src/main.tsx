import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App.tsx'
import { marketFeed } from './market/feed'

// Start the market feed once, outside React, so React's development-mode
// double rendering can't open duplicate connections (TECHNICAL_SPEC §7).
marketFeed.start()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
