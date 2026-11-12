import { useSyncExternalStore } from 'react'
import { marketFeed, type MarketSnapshot } from './feed'

/**
 * Reads the market feed's current snapshot. React re-renders the component
 * whenever the feed publishes a new snapshot (TD-08).
 */
export function useMarket(): MarketSnapshot {
  return useSyncExternalStore(marketFeed.subscribe, marketFeed.getSnapshot)
}
