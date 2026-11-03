import { IconRotate } from '@tabler/icons-react'
import { cn } from 'cn'
import { useState } from 'react'

import { Button } from '#/components/ui/button'
import * as m from '#/paraglide/messages'

interface PatternLockInputProps {
  value: string
  onChange: (nextPattern: string) => void
}

const DOTS = [
  { id: 1, row: 0, col: 0 },
  { id: 2, row: 0, col: 1 },
  { id: 3, row: 0, col: 2 },
  { id: 4, row: 1, col: 0 },
  { id: 5, row: 1, col: 1 },
  { id: 6, row: 1, col: 2 },
  { id: 7, row: 2, col: 0 },
  { id: 8, row: 2, col: 1 },
  { id: 9, row: 2, col: 2 },
]

export function PatternLockInput({ value, onChange }: PatternLockInputProps) {
  const [isDrawing, setIsDrawing] = useState(false)

  const selectedNodes = value
    ? value
        .split('-')
        .map((n) => Number(n))
        .filter((n) => n >= 1 && n <= 9)
    : []

  const addNode = (id: number) => {
    if (selectedNodes.includes(id)) return
    const next = [...selectedNodes, id]
    onChange(next.join('-'))
  }

  const startDraw = (id: number) => {
    setIsDrawing(true)
    onChange(String(id))
  }

  const enterNode = (id: number) => {
    if (!isDrawing) return
    addNode(id)
  }

  const stopDraw = () => {
    setIsDrawing(false)
  }

  const getCoord = (id: number) => {
    const dot = DOTS.find((d) => d.id === id)!
    return {
      x: dot.col * 48 + 24,
      y: dot.row * 48 + 24,
    }
  }

  return (
    <div
      className="border-border bg-muted/30 flex items-center gap-3 rounded-lg border p-2.5 select-none"
      onMouseUp={stopDraw}
      onMouseLeave={stopDraw}
    >
      <div className="border-border bg-background relative size-36 shrink-0 rounded-md border">
        <svg className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 144 144">
          {selectedNodes.map((nodeId, idx) => {
            if (idx === 0) return null
            const prev = getCoord(selectedNodes[idx - 1]!)
            const curr = getCoord(nodeId)
            return (
              <line
                key={`${selectedNodes[idx - 1]}-${nodeId}`}
                x1={prev.x}
                y1={prev.y}
                x2={curr.x}
                y2={curr.y}
                stroke="currentColor"
                className="text-primary"
                strokeWidth="3"
                strokeLinecap="round"
              />
            )
          })}
        </svg>

        <div className="relative z-10 grid size-full grid-cols-3 grid-rows-3 place-items-center">
          {DOTS.map((dot) => {
            const activeIndex = selectedNodes.indexOf(dot.id)
            const isSelected = activeIndex !== -1
            return (
              <button
                key={dot.id}
                type="button"
                onMouseDown={() => startDraw(dot.id)}
                onMouseEnter={() => enterNode(dot.id)}
                onClick={() => {
                  if (!isDrawing) addNode(dot.id)
                }}
                className={cn(
                  'flex size-7 items-center justify-center rounded-full border text-xs font-medium transition-colors',
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-muted/60 text-muted-foreground hover:border-foreground/40',
                )}
              >
                {isSelected ? activeIndex + 1 : dot.id}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-2 text-xs">
        <div className="text-foreground font-mono text-xs">{value || m.pattern_not_drawn()}</div>
        <Button type="button" variant="outline" size="xs" onClick={() => onChange('')}>
          <IconRotate data-icon="inline-start" />
          {m.clear()}
        </Button>
      </div>
    </div>
  )
}
