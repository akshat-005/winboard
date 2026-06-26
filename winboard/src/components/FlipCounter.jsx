import { useEffect, useRef, useState } from 'react'

// Renders a number as individually-flipping scoreboard digits.
// Only digits that change trigger the flip animation.
export default function FlipCounter({ value, minDigits = 2 }) {
  const digits = String(value).padStart(minDigits, '0').split('')
  const prevDigits = useRef(digits)
  const [flippingIndexes, setFlippingIndexes] = useState(new Set())

  useEffect(() => {
    const prev = prevDigits.current
    const changed = new Set()
    digits.forEach((d, i) => {
      if (prev[i] !== d) changed.add(i)
    })
    if (changed.size > 0) {
      setFlippingIndexes(changed)
      const t = setTimeout(() => setFlippingIndexes(new Set()), 450)
      prevDigits.current = digits
      return () => clearTimeout(t)
    }
    prevDigits.current = digits
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flip-counter" aria-label={`${value} points today`}>
      {digits.map((d, i) => (
        <span key={i} className={`flip-digit${flippingIndexes.has(i) ? ' flip' : ''}`}>
          {d}
        </span>
      ))}
    </div>
  )
}
