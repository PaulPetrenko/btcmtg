import { useEffect, useState } from 'react'
import { Led } from './Led'
import './Stale.css'

/**
 * Stale mark for one data group (MVP §7.2, AC-09.2): "Stale · 14 s" with an
 * amber light. It is shown only while the group is stale, and counts the
 * seconds since the group's last update with its own 1-second timer, so the
 * rest of the page doesn't re-render for the count.
 */
export function Stale({ since }: { since: number | null }) {
  const now = useNow()
  const seconds = since === null ? null : Math.max(0, Math.floor((now - since) / 1000))

  return (
    <span className="stale">
      {seconds === null ? 'Stale' : `Stale · ${seconds} s`}
      <Led color="amber" small />
    </span>
  )
}

function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  return now
}
