import type { GroupError, MarketSnapshot } from '../market/feed'
import { Led, type LedColor } from './Led'
import './Notice.css'

/*
 * Notices (MVP §8.2) for the space reserved above the chart. The space has a
 * fixed height, so a notice appearing or going away never moves anything.
 *
 * At most one page-level notice is shown (offline first). Section messages
 * (E-05, E-06) are shown only when there is no page notice, so the same
 * problem is never reported twice. Draft wording from MVP §6 and §8.2,
 * unchanged. Final copy is the project owner's decision.
 */

interface PageNotice {
  led: LedColor
  text: string
}

/** The page-level notice, if any (MVP §8.2). Offline comes first. */
function pageNotice(market: MarketSnapshot): PageNotice | null {
  if (market.connection === 'offline') {
    return { led: 'off', text: "You're offline. Data resumes when your connection returns." } // E-02
  }
  if (market.restProblem === 'E-01') {
    return {
      led: 'red',
      text: 'Market data is unavailable in your region because Binance restricts access in some locations.',
    }
  }
  if (market.restProblem === 'E-04') {
    return { led: 'amber', text: 'Binance is temporarily limiting requests. Data resumes shortly.' }
  }
  if (market.connection === 'unavailable') {
    // E-03
    return {
      led: 'red',
      text: "Binance market data can't be reached right now. This may be temporary, or access may be restricted in your region. Retrying automatically.",
    }
  }
  return null
}

const GROUP_MESSAGES: Record<GroupError, string> = {
  'E-05': "Some data couldn't be displayed.",
  'E-06': "This section's data couldn't be loaded. Retrying automatically.",
}

const GROUP_LEDS: Record<GroupError, LedColor> = { 'E-05': 'amber', 'E-06': 'red' }

export function Notice({ market }: { market: MarketSnapshot }) {
  const page = pageNotice(market)
  if (page) {
    return (
      <p className="notice" role="alert">
        <Led color={page.led} />
        <span>{page.text}</span>
      </p>
    )
  }

  // Each section names itself, because its message appears here rather than inside it.
  const sections = [
    { name: '24h statistics', error: market.statsGroup.error ?? (market.statsGroup.status === 'error' && !market.stats ? 'E-06' : null) },
    { name: 'Chart', error: market.candlesGroup.error },
  ].filter((section): section is { name: string; error: GroupError } => section.error !== null)

  if (sections.length === 0) return null
  return (
    <ul className="notice-sections">
      {sections.map((section) => (
        <li key={section.name} className="notice-sections__item">
          <Led color={GROUP_LEDS[section.error]} />
          <span>
            <span className="notice-sections__name">{section.name}</span> {GROUP_MESSAGES[section.error]}
          </span>
        </li>
      ))}
    </ul>
  )
}
