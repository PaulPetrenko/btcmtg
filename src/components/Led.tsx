import './Led.css'

export type LedColor = 'green' | 'amber' | 'red' | 'off'

/**
 * A flat status light: solid colour with a subtle inner shadow, no glow.
 * Decorative only: the text next to it always says the same thing.
 */
export function Led({ color, small = false }: { color: LedColor; small?: boolean }) {
  return <span className={`led led--${color}${small ? ' led--small' : ''}`} aria-hidden="true" />
}
