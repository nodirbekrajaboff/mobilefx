import { cn } from 'cn'
import * as React from 'react'

function Card({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<'div'> & { size?: 'default' | 'sm' }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        'group/card bg-card/95 text-card-foreground dark:bg-card/90 flex flex-col gap-(--card-spacing) overflow-hidden rounded-2xl py-(--card-spacing) text-sm shadow-[0_2px_10px_-3px_rgba(15,23,42,0.05),0_1px_2px_0_rgba(15,23,42,0.03),inset_0_1px_0_0_rgba(255,255,255,0.85)] ring-1 ring-slate-950/[0.06] backdrop-blur-xs [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-data-[slot=card-header]:gap-0 has-data-[slot=card-header]:pt-0 has-[>[data-slot=card-content].p-0]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 data-[size=sm]:has-data-[slot=card-header]:pt-0 dark:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.05)] dark:ring-white/[0.08] *:[img:first-child]:rounded-t-2xl *:[img:last-child]:rounded-b-2xl',
        className,
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-2xl px-(--card-spacing) pt-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)',
        className,
      )}
      {...props}
    />
  )
}

interface ParsedStat {
  prefix: string
  value: number
  decimals: number
  locale: 'en-US' | 'ru-RU'
  suffix: string
}

function parseAnimatedStat(text: string): ParsedStat | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  const match = trimmed.match(
    /^([+\-−$€¥\s]*)(\d[\d\s\u00A0\u202F.,]*?)(\s*(?:so'm|ta|nafar|dona|₽|%)?)$/i,
  )
  if (!match) return null

  const [, rawPrefix, rawNumber, rawSuffix] = match
  const hasDollar = rawPrefix.includes('$')
  const locale: 'en-US' | 'ru-RU' = hasDollar ? 'en-US' : 'ru-RU'

  let normalized = rawNumber.replace(/[\s\u00A0\u202F]/g, '')
  let decimals = 0

  if (locale === 'en-US') {
    normalized = normalized.replace(/,/g, '')
    const dotIdx = normalized.indexOf('.')
    if (dotIdx !== -1) {
      decimals = normalized.length - dotIdx - 1
    }
  } else {
    const commaIdx = normalized.lastIndexOf(',')
    if (commaIdx !== -1) {
      decimals = normalized.length - commaIdx - 1
      normalized =
        normalized.slice(0, commaIdx).replace(/,/g, '') + '.' + normalized.slice(commaIdx + 1)
    }
  }

  const value = Number.parseFloat(normalized)
  if (!Number.isFinite(value)) return null

  return {
    prefix: rawPrefix,
    value,
    decimals,
    locale,
    suffix: rawSuffix,
  }
}

function formatAnimatedStat(stat: ParsedStat, currentValue: number): string {
  const factor = 10 ** stat.decimals
  const rounded =
    stat.decimals > 0 ? Math.round(currentValue * factor) / factor : Math.round(currentValue)

  const formattedNum = rounded.toLocaleString(stat.locale, {
    minimumFractionDigits: stat.decimals,
    maximumFractionDigits: stat.decimals,
  })

  return `${stat.prefix}${formattedNum}${stat.suffix}`
}

function extractPlainText(children: React.ReactNode): string | null {
  const parts = React.Children.toArray(children)
  if (parts.length === 0) return null
  let result = ''
  for (const part of parts) {
    if (typeof part === 'string' || typeof part === 'number') {
      result += String(part)
    } else {
      return null
    }
  }
  return result
}

function CardTitle({ className, children, ...props }: React.ComponentProps<'div'>) {
  const plainText = extractPlainText(children)
  const parsedStat = React.useMemo(
    () => (plainText !== null ? parseAnimatedStat(plainText) : null),
    [plainText],
  )

  const [displayValue, setDisplayValue] = React.useState<number>(0)
  const currentValRef = React.useRef<number>(0)
  const unitKeyRef = React.useRef<string>('')

  React.useEffect(() => {
    if (!parsedStat) return

    const unitKey = `${parsedStat.prefix}|${parsedStat.suffix}|${parsedStat.locale}`
    const unitChanged = unitKeyRef.current !== unitKey
    unitKeyRef.current = unitKey

    const startValue = unitChanged ? 0 : currentValRef.current
    const endValue = parsedStat.value

    if (startValue === endValue) {
      setDisplayValue(endValue)
      return
    }

    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      currentValRef.current = endValue
      setDisplayValue(endValue)
      return
    }

    const duration = 650
    const startTime = performance.now()
    let rafId = 0

    const tick = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Quartic ease-out for crisp deceleration
      const eased = 1 - (1 - progress) ** 4
      const nextVal = startValue + (endValue - startValue) * eased

      currentValRef.current = nextVal
      setDisplayValue(nextVal)

      if (progress < 1) {
        rafId = window.requestAnimationFrame(tick)
      } else {
        currentValRef.current = endValue
        setDisplayValue(endValue)
      }
    }

    rafId = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(rafId)
  }, [parsedStat])

  const renderedChildren = parsedStat ? formatAnimatedStat(parsedStat, displayValue) : children

  return (
    <div
      data-slot="card-title"
      className={cn(
        'font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm',
        className,
      )}
      {...props}
    >
      {renderedChildren}
    </div>
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="card-content" className={cn('px-(--card-spacing)', className)} {...props} />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        'bg-muted/50 flex items-center rounded-b-xl border-t p-(--card-spacing)',
        className,
      )}
      {...props}
    />
  )
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent }
