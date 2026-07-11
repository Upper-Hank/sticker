import { useState, useEffect } from 'react'

export function useIsMobile(breakpoint = 768) {
  const query = `(max-width: ${breakpoint}px), (max-height: 500px) and (pointer: coarse)`
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const mql = window.matchMedia(query)
    const handler = (e) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])

  return isMobile
}
