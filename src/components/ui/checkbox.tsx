'use client'

import { IconCheck } from '@tabler/icons-react'
import { cn } from 'cn'
import { Checkbox as CheckboxPrimitive } from 'radix-ui'
import * as React from 'react'

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer group-has-[:focus-visible]/field-label:not-data-checked:border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground group-has-[:focus-visible]/field-label:data-checked:border-primary dark:data-checked:bg-primary relative flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-[5px] border border-slate-950/[0.15] bg-white/90 shadow-[0_1px_2px_rgba(15,23,42,0.03),inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-150 outline-none group-has-disabled/field:opacity-45 group-has-[:focus-visible]/field-label:ring-0 after:absolute after:-inset-x-3 after:-inset-y-2 hover:border-slate-950/[0.25] focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-45 aria-invalid:ring-3 data-checked:shadow-[0_1px_2px_rgba(79,70,229,0.25),inset_0_1px_0_rgba(255,255,255,0.2)] dark:border-white/[0.16] dark:bg-white/[0.04] dark:shadow-none dark:hover:border-white/[0.25]',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-3.5"
      >
        <IconCheck />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
