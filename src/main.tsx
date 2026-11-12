import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/global.css'
import App from './App.tsx'
import { marketFeed } from './market/feed'

// Start the market feed once, outside React, so React's development-mode
// double rendering can't open duplicate connections (TECHNICAL_SPEC §7).
// Data starts loading at once, while the font below is still arriving.
marketFeed.start()

/*
 * Stable typography (owner requirement, Stage 1): the app is shown only after
 * its font is ready, so text never appears in one font and then switches.
 *
 * Inter is registered from code instead of an @font-face rule. That keeps the
 * browser from swapping it in late: if it fails or takes longer than
 * FONT_TIMEOUT_MS, it is never added, and the app is shown once in the
 * metric-matched fallback (global.css) for the whole visit. index.html
 * preloads the same file, so this usually just picks up the finished download.
 */
const FONT_FAMILY = 'btcmtg Inter'
const FALLBACK_FAMILY = 'btcmtg Inter Fallback'
const FONT_URL = `${import.meta.env.BASE_URL}fonts/Inter-Regular.woff2`
const FONT_TIMEOUT_MS = 5000

async function loadFont(): Promise<void> {
  const face = new FontFace(FONT_FAMILY, `url(${FONT_URL}) format('woff2')`, {
    weight: '400',
    style: 'normal',
  })
  const loading = face.load()
  loading.catch(() => {}) // a late failure after the timeout needs no handling

  try {
    await Promise.race([
      loading,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), FONT_TIMEOUT_MS)),
    ])
    document.fonts.add(face)
  } catch (error) {
    if (import.meta.env.DEV) console.warn('Inter could not be loaded; using the fallback font.', error)
    // Load the local fallback face too, so the chart's canvas text uses it
    // from its first drawing.
    await document.fonts.load(`400 16px "${FALLBACK_FAMILY}"`).catch(() => {})
  }
}

loadFont().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
