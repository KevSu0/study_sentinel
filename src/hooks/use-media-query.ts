
'use client'

import * as React from "react"

export function useMediaQuery(query: string) {
  const [value, setValue] = React.useState(false)

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      setValue(false)
      return
    }
    function onChange(event: MediaQueryListEvent) {
      setValue(event.matches)
    }

    const result = window.matchMedia(query)
    if (!result) {
      setValue(false)
      return
    }
    const add = (result as any).addEventListener || (result as any).addListener?.bind(result)
    const remove = (result as any).removeEventListener || (result as any).removeListener?.bind(result)
    if (add) add("change", onChange)
    setValue(!!(result as any).matches)

    return () => {
      if (remove) remove("change", onChange)
    }
  }, [query])

  return value
}
