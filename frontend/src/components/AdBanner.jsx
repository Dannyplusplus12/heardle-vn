import { useEffect, useRef } from 'react'

/**
 * Renders a Google AdSense ad unit.
 * Replace data-ad-slot with your actual slot ID from the AdSense dashboard.
 *
 * Props:
 *   slot      – AdSense data-ad-slot ID (required)
 *   format    – "auto" | "horizontal" | "rectangle" etc. (default "auto")
 *   responsive – boolean, enables full-width responsive (default true)
 *   className  – wrapper class
 */
export default function AdBanner({
  slot,
  format = 'auto',
  responsive = true,
  className = '',
}) {
  const insRef = useRef(null)

  useEffect(() => {
    if (!insRef.current) return
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {
      // adsbygoogle not yet loaded — script is async, safe to ignore
    }
  }, [slot])

  if (!slot) return null

  return (
    <div className={`overflow-hidden ${className}`}>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-2256877194801846"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  )
}
