'use client'

import { IconCalendar } from '@tabler/icons-react'
import { cn } from 'cn'
import * as React from 'react'

import { Button } from '#/components/ui/button'
import { Calendar } from '#/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover'
import * as m from '#/paraglide/messages'

interface DatePickerProps {
  value: string
  onChange: (nextIsoDate: string) => void
  placeholder?: string
  className?: string
}

function toIsoDateString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function DatePicker({ value, onChange, placeholder, className }: DatePickerProps) {
  const effectivePlaceholder = placeholder ?? m.pick_date()
  const [open, setOpen] = React.useState(false)

  const parsedDate = React.useMemo(() => {
    if (!value) return undefined
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? undefined : d
  }, [value])

  const formattedLabel = React.useMemo(() => {
    if (!parsedDate) return null
    return parsedDate.toLocaleDateString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }, [parsedDate])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'w-full justify-start bg-white text-left font-normal',
            !formattedLabel && 'text-muted-foreground',
            className,
          )}
        >
          <IconCalendar data-icon="inline-start" className="text-muted-foreground" />
          <span className="truncate text-xs font-medium">
            {formattedLabel ?? effectivePlaceholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={parsedDate}
          onSelect={(date) => {
            if (date) {
              onChange(toIsoDateString(date))
              setOpen(false)
            }
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
